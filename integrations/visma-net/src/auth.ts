import { createAxios, normalizeOAuthTokenResponse, requestAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { vismaNetApiError, vismaNetServiceError } from './lib/errors';

let CONNECT_BASE_URL = 'https://connect.visma.com/connect';
let API_BASE_URL = 'https://api.finance.visma.net';

let authApi = createAxios({
  baseURL: CONNECT_BASE_URL,
  headers: {
    Accept: 'application/json'
  }
});

let vismaApi = createAxios({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json'
  }
});

let requestVismaAuth = <T>(operation: string, request: () => Promise<T>) =>
  requestAxios(operation, request as any, vismaNetApiError) as Promise<T>;

export type VismaNetAuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  grantedScopes?: string[];
  tenantId: string;
};

let normalizeTenantId = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export let resolveVismaNetTenantId = (
  config?: Record<string, unknown>,
  output?: Pick<VismaNetAuthOutput, 'tenantId'>
) => {
  let tenantId = normalizeTenantId(config?.tenantId) ?? normalizeTenantId(output?.tenantId);

  if (!tenantId) {
    throw vismaNetServiceError(
      'Visma Net tenantId is required to obtain or refresh a Visma Connect token.'
    );
  }

  return tenantId;
};

export let buildVismaTokenExchangeBody = (input: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
}) =>
  new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    tenant_id: input.tenantId
  }).toString();

export let buildVismaTokenRefreshBody = (input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
}) =>
  new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    tenant_id: input.tenantId
  }).toString();

let getGrantedScopes = (data: unknown, requestedScopes: string[]) => {
  if (typeof data === 'object' && data !== null && 'scope' in data) {
    let scope = (data as { scope?: unknown }).scope;
    if (typeof scope === 'string' && scope.trim()) {
      return scope.trim().split(/\s+/);
    }
  }

  return requestedScopes;
};

let getOrganizationProfile = async (token: string, tenantId: string) => {
  let response = await requestVismaAuth('profile lookup', () =>
    vismaApi.get('/v1/organization', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        pageNumber: 1,
        pageSize: 1
      }
    })
  );

  let organizations = Array.isArray(response.data) ? response.data : [];
  let organization = organizations[0];

  if (typeof organization !== 'object' || organization === null) {
    return {
      profile: {
        id: tenantId,
        name: 'Visma Net',
        tenantId
      }
    };
  }

  let record = organization as Record<string, unknown>;
  let id =
    typeof record.organizationNumber === 'string'
      ? record.organizationNumber
      : typeof record.number === 'string'
        ? record.number
        : 'visma-net';
  let name =
    typeof record.name === 'string'
      ? record.name
      : typeof record.description === 'string'
        ? record.description
        : 'Visma Net';

  return {
    profile: {
      id,
      name,
      tenantId
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('OAuth access token for Visma Connect.'),
      refreshToken: z.string().optional().describe('OAuth refresh token, when provided.'),
      expiresAt: z.string().optional().describe('Access token expiration timestamp.'),
      grantedScopes: z
        .array(z.string())
        .optional()
        .describe('Scopes returned by Visma Connect or requested during authorization.'),
      tenantId: z
        .string()
        .describe('Visma Net tenant/company ID used when obtaining the token.')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Visma Connect OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Visma Net ERP API',
        url: 'https://developer.visma.com/api/visma-net-erp/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'Visma.net ERP API Swagger',
        url: 'https://integration.visma.net/API-index/'
      }
    ],

    scopes: [
      {
        title: 'Read',
        description: 'Read Visma Net ERP records through the interactive API.',
        scope: 'vismanet_erp_interactive_api:read'
      },
      {
        title: 'Create',
        description: 'Create Visma Net ERP records through the interactive API.',
        scope: 'vismanet_erp_interactive_api:create'
      },
      {
        title: 'Update',
        description: 'Update Visma Net ERP records through the interactive API.',
        scope: 'vismanet_erp_interactive_api:update'
      },
      {
        title: 'Delete',
        description: 'Delete Visma Net ERP records through the interactive API.',
        scope: 'vismanet_erp_interactive_api:delete'
      },
      {
        title: 'UI Extension',
        description: 'Use Visma Net ERP UI extension access when enabled for the app.',
        scope: 'vismanet_erp_interactive_api:ui-extension'
      }
    ],

    getAuthorizationUrl: async ctx => {
      resolveVismaNetTenantId(ctx.config);

      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `${CONNECT_BASE_URL}/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let tenantId = resolveVismaNetTenantId(ctx.config);
      let response = await requestVismaAuth('OAuth token exchange', () =>
        authApi.post(
          '/token',
          buildVismaTokenExchangeBody({
            code: ctx.code,
            redirectUri: ctx.redirectUri,
            clientId: ctx.clientId,
            clientSecret: ctx.clientSecret,
            tenantId
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
      );

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Visma Net',
        operation: 'token exchange',
        accessTokenMessage:
          'Visma Connect OAuth token exchange did not return an access token.'
      });

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          grantedScopes: getGrantedScopes(response.data, ctx.scopes),
          tenantId
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw vismaNetServiceError('No Visma Net refresh token is available.');
      }

      let tenantId = resolveVismaNetTenantId(ctx.config, ctx.output);
      let response = await requestVismaAuth('OAuth token refresh', () =>
        authApi.post(
          '/token',
          buildVismaTokenRefreshBody({
            refreshToken: ctx.output.refreshToken,
            clientId: ctx.clientId,
            clientSecret: ctx.clientSecret,
            tenantId
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
      );

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Visma Net',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken,
        refreshTokenFallbackMode: 'falsy',
        accessTokenMessage: 'Visma Connect OAuth refresh did not return an access token.'
      });

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          grantedScopes: getGrantedScopes(response.data, ctx.output.grantedScopes ?? []),
          tenantId
        }
      };
    },

    getProfile: async (ctx: any) =>
      getOrganizationProfile(ctx.output.token, resolveVismaNetTenantId(ctx.config, ctx.output))
  });
