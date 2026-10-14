import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  SlateError
} from 'slates';
import { z } from 'zod';
import { parseScimUser } from './scim-user';

let normalizeBaseUrl = (value: string, label: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError(`Provide a valid ${label} HTTPS base URL.`);
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw createApiServiceError(
      `The ${label} base URL must use HTTPS and must not contain credentials, a query, or a fragment.`
    );
  }

  return url.toString().replace(/\/+$/, '');
};

let requireToken = (token: string) => {
  if (!token?.trim()) {
    throw createApiServiceError('Configure an InVision API key or SCIM bearer token.');
  }
  return token.trim();
};

let createClient = (baseURL: string, token: string, isScim: boolean) =>
  createAuthenticatedAxios({
    baseURL,
    authHeader: isScim
      ? { value: `Bearer ${requireToken(token)}` }
      : { name: 'X-API-KEY', value: requireToken(token) },
    contentType: isScim ? 'application/scim+json' : false,
    headers: isScim ? { Accept: 'application/scim+json' } : undefined,
    timeout: 30_000,
    maxRedirects: 0,
    errorMapping: {
      mapAxiosError: (error, inferred) => {
        let data = error.response?.data;
        if (!isApiErrorRecord(data)) return undefined;
        return {
          message:
            typeof data.detail === 'string' && data.detail.trim()
              ? data.detail
              : inferred.message,
          upstream: {
            ...inferred.upstream,
            code: typeof data.scimType === 'string' ? data.scimType : inferred.upstream?.code
          }
        };
      }
    },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'InVision',
        reason: 'invision_api_error',
        extractUpstreamCode: (mappedError, response) =>
          SlateError.is(mappedError)
            ? mappedError.data.upstream?.code
            : isApiErrorRecord(response?.data) && typeof response.data.scimType === 'string'
              ? response.data.scimType
              : undefined
      })
  });

export interface DsmClientConfig {
  token: string;
  dsmBaseUrl: string;
}

export class DsmClient {
  private dsmBaseUrl: string;
  private axios: ReturnType<typeof createClient>;

  constructor(config: DsmClientConfig) {
    this.dsmBaseUrl = normalizeBaseUrl(config.dsmBaseUrl, 'DSM export');
    this.axios = createClient(this.dsmBaseUrl, config.token, false);
  }

  async getDesignTokens(format = 'json', exportFormat = 'lookup'): Promise<unknown> {
    let response = await this.axios.get(`/style-data.${format}`, {
      params: format === 'json' ? { exportFormat } : undefined
    });
    if (
      format === 'json' &&
      !isApiErrorRecord(response.data) &&
      !Array.isArray(response.data)
    ) {
      throw createApiServiceError('InVision returned an invalid DSM JSON token response.');
    }
    return response.data;
  }

  getStyleParamsUrl(type: string): string {
    return `${this.dsmBaseUrl}/_style-params.${type}`;
  }

  async getStyleParams(type: string): Promise<unknown> {
    let response = await this.axios.get(this.getStyleParamsUrl(type));
    return response.data;
  }
}

export interface ScimClientConfig {
  token: string;
  scimBaseUrl: string;
}

type ScimUserUpdates = {
  userName?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  active?: boolean;
};

type ScimPatchOperation = {
  op: 'replace' | 'add';
  path: string;
  value: string | boolean | Array<{ value: string; type: 'work' }>;
};

let scimListSchema = z.object({
  totalResults: z.number().int().nonnegative(),
  Resources: z.array(z.unknown()).optional(),
  startIndex: z.number().int().min(1).optional(),
  itemsPerPage: z.number().int().nonnegative().optional()
});

export class ScimClient {
  private axios: ReturnType<typeof createClient>;

  constructor(config: ScimClientConfig) {
    let scimBaseUrl = normalizeBaseUrl(config.scimBaseUrl, 'SCIM');
    this.axios = createClient(scimBaseUrl, config.token, true);
  }

  async listUsers(filter?: string, startIndex?: number, count?: number) {
    let response = await this.axios.get('/Users', {
      params: { filter, startIndex, count }
    });
    let result = scimListSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError('InVision returned an invalid SCIM user list.');
    }
    if (count !== 0 && result.data.totalResults > 0 && !result.data.Resources) {
      throw createApiServiceError('InVision omitted users from its SCIM list response.');
    }
    return result.data;
  }

  async getUser(userId: string): Promise<unknown> {
    let response = await this.axios.get(`/Users/${encodeURIComponent(userId)}`);
    return response.data;
  }

  async createUser(user: {
    userName: string;
    givenName: string;
    familyName: string;
    email: string;
    active?: boolean;
  }): Promise<unknown> {
    let response = await this.axios.post('/Users', {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: user.userName,
      name: {
        givenName: user.givenName,
        familyName: user.familyName
      },
      emails: [{ value: user.email, type: 'work', primary: true }],
      active: user.active ?? true
    });
    return response.data;
  }

  async updateUser(userId: string, updates: ScimUserUpdates): Promise<unknown> {
    let operations: ScimPatchOperation[] = [];
    let paths = {
      userName: 'userName',
      givenName: 'name.givenName',
      familyName: 'name.familyName',
      active: 'active'
    } as const;
    for (let key of Object.keys(paths) as Array<keyof typeof paths>) {
      let value = updates[key];
      if (value !== undefined) {
        operations.push({ op: 'replace', path: paths[key], value });
      }
    }

    if (updates.email !== undefined) {
      let user = parseScimUser(await this.getUser(userId));
      let hasWorkEmail = user.emails?.some(email => email.type?.toLowerCase() === 'work');
      operations.push(
        hasWorkEmail
          ? {
              op: 'replace',
              path: 'emails[type eq "work"].value',
              value: updates.email
            }
          : {
              op: 'add',
              path: 'emails',
              value: [{ value: updates.email, type: 'work' }]
            }
      );
    }

    if (operations.length === 0) {
      throw createApiServiceError('Provide at least one user attribute to update.');
    }

    await this.axios.patch(`/Users/${encodeURIComponent(userId)}`, {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: operations
    });

    return this.getUser(userId);
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.axios.patch(`/Users/${encodeURIComponent(userId)}`, {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{ op: 'replace', path: 'active', value: false }]
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.axios.delete(`/Users/${encodeURIComponent(userId)}`);
  }
}
