import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface BannerFile {
  id?: string;
  url?: string;
  status?: string;
  name?: string;
  type?: string;
  size?: number;
  width?: number;
  height?: number;
  raw: Record<string, unknown>;
}

export interface Banner {
  bannerId: string;
  status: string;
  templateId?: string;
  files: BannerFile[];
  createdAt?: string;
  updatedAt?: string;
  raw: Record<string, unknown>;
}

export interface CreateBannerParams {
  templateId: string;
  modes: Record<string, unknown>;
  sizeIds?: string | string[];
  overrides?: Record<string, unknown>;
  sizes?: Record<string, unknown>[];
  clicktag?: string;
  editable?: boolean;
  excludeBaseSize?: boolean;
}

export interface AccountInfo {
  userId: string;
  email?: string;
  name?: string;
  raw: Record<string, unknown>;
}

export interface UserAccessResponse {
  editorURL: string;
  embeddedEditorURL: string;
  raw: Record<string, unknown>;
}

let requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`Adrapid did not return a valid ${field}.`);
  }
  return value;
};

let optionalString = (value: unknown, field: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw createApiServiceError(`Adrapid returned an invalid ${field}.`);
  }
  return value;
};

let optionalNumber = (value: unknown, field: string): number | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(`Adrapid returned an invalid ${field}.`);
  }
  return value;
};

let responseObject = (value: unknown, resource: string): Record<string, unknown> => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Adrapid returned an invalid ${resource} response.`);
  }
  return value;
};

let resourceId = (value: string, label: string): string => {
  if (!value.trim()) throw createApiServiceError(`${label} is required.`);
  return encodeURIComponent(value);
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('An Adrapid API token is required.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.adrapid.com',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 60_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Adrapid',
          reason: 'adrapid_api_error',
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
        })
    });
  }

  async createBanner(params: CreateBannerParams): Promise<Banner> {
    resourceId(params.templateId, 'Template ID');
    let response = await this.axios.post('/v1/api/banners', pickDefined(params));
    return this.normalizeBanner(response.data);
  }

  async getBanner(bannerId: string): Promise<Banner> {
    let response = await this.axios.get(
      `/v1/api/banners/${resourceId(bannerId, 'Banner ID')}`
    );
    return this.normalizeBanner(response.data);
  }

  async listBanners(params: {
    offset?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{
    banners: Array<{
      bannerId: string;
      name?: string;
      status?: string;
      templateId?: string;
      raw: Record<string, unknown>;
    }>;
    count?: number;
    raw: Record<string, unknown>;
  }> {
    if (
      params.offset !== undefined &&
      (!Number.isInteger(params.offset) || params.offset < 0)
    ) {
      throw createApiServiceError('offset must be a non-negative integer.');
    }
    if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 10)) {
      throw createApiServiceError('limit must be an integer of at least 10.');
    }
    let response = await this.axios.get('/v1/api/banners', { params: pickDefined(params) });
    let data = responseObject(response.data, 'banner list');
    if (!Array.isArray(data.rows)) {
      throw createApiServiceError('Adrapid did not return the banner list rows.');
    }
    return {
      banners: data.rows.map(value => {
        let item = responseObject(value, 'banner list item');
        return {
          bannerId: requiredString(item.id ?? item._id, 'banner ID'),
          name: optionalString(item.name, 'banner name'),
          status: optionalString(item.status, 'banner status'),
          templateId: optionalString(item.templateId, 'template ID'),
          raw: item
        };
      }),
      count: optionalNumber(data.count, 'banner count'),
      raw: data
    };
  }

  async getAccount(): Promise<AccountInfo> {
    let response = await this.axios.get('/v1/api/me');
    let data = responseObject(response.data, 'account');
    let user = isApiErrorRecord(data.user) ? data.user : data;
    let email = user.email;
    if (email === undefined && Array.isArray(user.emails)) email = user.emails[0];
    return {
      userId: requiredString(user.id ?? user._id, 'account ID'),
      email: optionalString(email, 'account email'),
      name: optionalString(user.name ?? user.username, 'account name'),
      raw: data
    };
  }

  async getUserAccess(
    userId: string,
    options?: {
      templateId?: string;
      editorOptions?: Record<string, unknown>;
    }
  ): Promise<UserAccessResponse> {
    let response = await this.axios.get(
      `/v1/api/users/${resourceId(userId, 'User ID')}/access/`,
      {
        params: pickDefined({
          template_id: options?.templateId,
          options:
            options?.editorOptions === undefined
              ? undefined
              : JSON.stringify(options.editorOptions)
        })
      }
    );
    let data = responseObject(response.data, 'user access');
    return {
      editorURL: requiredString(data.editorURL, 'editor URL'),
      embeddedEditorURL: requiredString(data.embeddedEditorURL, 'embedded editor URL'),
      raw: data
    };
  }

  async pollBannerUntilReady(
    bannerId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<Banner> {
    for (let i = 0; i < maxAttempts; i++) {
      let banner = await this.getBanner(bannerId);
      if (banner.status === 'ready' || banner.status === 'failed') return banner;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return this.getBanner(bannerId);
  }

  private normalizeBanner(value: unknown): Banner {
    let data = responseObject(value, 'banner');
    // The documented asynchronous creation response uses files: null until export completes.
    if (data.files !== null && !Array.isArray(data.files)) {
      throw createApiServiceError('Adrapid did not return a valid banner files collection.');
    }
    return {
      bannerId: requiredString(data.id ?? data._id, 'banner ID'),
      status: requiredString(data.status, 'banner status'),
      templateId: optionalString(data.templateId, 'template ID'),
      files: (data.files ?? []).map((value: unknown) => {
        let file = responseObject(value, 'banner file');
        return {
          id: optionalString(file.id ?? file._id, 'file ID'),
          url: optionalString(file.url, 'file URL'),
          status: optionalString(file.status, 'file status'),
          name: optionalString(file.name, 'file name'),
          type: optionalString(file.type, 'file type'),
          size: optionalNumber(file.size, 'file size'),
          width: optionalNumber(file.width, 'file width'),
          height: optionalNumber(file.height, 'file height'),
          raw: file
        };
      }),
      createdAt: optionalString(data.createdAt ?? data.created_at, 'creation timestamp'),
      updatedAt: optionalString(data.updatedAt ?? data.updated_at, 'update timestamp'),
      raw: data
    };
  }
}
