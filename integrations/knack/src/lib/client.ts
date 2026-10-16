import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export type KnackObject = Record<string, unknown>;
export const object = (value: unknown): KnackObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw createApiServiceError('Knack returned an invalid object.');
  return value as KnackObject;
};
export const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim())
    throw createApiServiceError(`Knack did not provide a valid ${label}.`);
  return value;
};
export const array = (value: unknown, label: string): KnackObject[] => {
  if (!Array.isArray(value)) throw createApiServiceError(`Knack did not provide ${label}.`);
  return value.map(object);
};
export const resolveApplicationId = (
  auth: { applicationId?: string },
  config: Record<string, unknown>
): string => {
  const value = auth.applicationId ?? config.applicationId;
  if (typeof value !== 'string' || !value.trim())
    throw createApiServiceError(
      'Provide the Knack Application ID with your credentials. Existing connections may use their saved application ID.'
    );
  return value;
};
const segment = (value: string) => encodeURIComponent(text(value, 'resource key or ID'));

export interface KnackClientConfig {
  applicationId: string;
  token: string;
  authMode: 'api_key' | 'view_based';
}
export interface KnackFilter {
  field: string;
  operator: string;
  value?: unknown;
  range?: number;
  type?: string;
}
export interface KnackFilterSet {
  match: 'and' | 'or';
  rules: KnackFilter[];
}
export interface ListRecordsOptions {
  page?: number;
  rowsPerPage?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: KnackFilterSet;
  parentPageSlug?: string;
  parentRecordId?: string;
}
export interface KnackRecordsResponse {
  records: KnackObject[];
  totalPages: number;
  totalRecords: number;
  currentPage: number;
  raw: KnackObject;
}

export class KnackClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;
  private applicationId: string;
  private token: string;
  private authMode: 'api_key' | 'view_based';

  constructor(config: KnackClientConfig) {
    this.applicationId = text(config.applicationId, 'Application ID');
    this.token = text(config.token, 'credential');
    this.authMode = config.authMode;
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.knack.com/v1',
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Knack',
          reason: 'knack_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
  }

  private getHeaders(view = false): Record<string, string> {
    if (!view && this.authMode !== 'api_key')
      throw createApiServiceError(
        'Object-based requests require API Key authentication. Use sceneKey and viewKey with a user token.'
      );
    return {
      'X-Knack-Application-Id': this.applicationId,
      'X-Knack-REST-API-Key': view ? 'knack' : this.token,
      ...(view && this.authMode === 'view_based' ? { Authorization: this.token } : {})
    };
  }

  async getApplicationMetadata(): Promise<KnackObject> {
    const response = await this.api.get(`/applications/${segment(this.applicationId)}`, {
      headers: this.getHeaders(this.authMode === 'view_based')
    });
    return object(object(response.data).application);
  }

  private params(options?: ListRecordsOptions) {
    for (const [name, value, max] of [
      ['page', options?.page, undefined],
      ['rowsPerPage', options?.rowsPerPage, 1000]
    ] as const) {
      if (
        value !== undefined &&
        (!Number.isInteger(value) || value < 1 || (max !== undefined && value > max))
      )
        throw createApiServiceError(
          `${name} must be a positive integer${max ? ` no greater than ${max}` : ''}.`
        );
    }
    if (!!options?.parentPageSlug !== !!options?.parentRecordId)
      throw createApiServiceError(
        'Provide both parentPageSlug and parentRecordId for a connected child view.'
      );
    const params: Record<string, unknown> = pickDefined({
      page: options?.page,
      rows_per_page: options?.rowsPerPage,
      sort_field: options?.sortField,
      sort_order: options?.sortOrder,
      filters: options?.filters === undefined ? undefined : JSON.stringify(options.filters)
    });
    if (options?.parentPageSlug && options.parentRecordId) {
      if (!/^[a-zA-Z0-9_-]+$/.test(options.parentPageSlug))
        throw createApiServiceError(
          'parentPageSlug must be the child page URL slug without slashes or query parameters.'
        );
      params[`${options.parentPageSlug}_id`] = options.parentRecordId;
    }
    return params;
  }

  private records(value: unknown): KnackRecordsResponse {
    const raw = object(value);
    const number = (key: string) => {
      const value = raw[key];
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw createApiServiceError(
          `Knack did not provide numeric ${key} pagination metadata.`
        );
      return value;
    };
    return {
      records: array(raw.records, 'records'),
      totalPages: number('total_pages'),
      totalRecords: number('total_records'),
      currentPage: number('current_page'),
      raw
    };
  }
  async listObjectRecords(objectKey: string, options?: ListRecordsOptions) {
    if (options?.parentPageSlug || options?.parentRecordId)
      throw createApiServiceError(
        'Parent page context is supported only for view-based record lists.'
      );
    const response = await this.api.get(`/objects/${segment(objectKey)}/records`, {
      headers: this.getHeaders(),
      params: this.params(options)
    });
    return this.records(response.data);
  }
  async listViewRecords(sceneKey: string, viewKey: string, options?: ListRecordsOptions) {
    // Knack documents the scenes route specifically for connected child pages.
    const route = options?.parentPageSlug || options?.parentRecordId ? 'scenes' : 'pages';
    const response = await this.api.get(
      `/${route}/${segment(sceneKey)}/views/${segment(viewKey)}/records`,
      {
        headers: this.getHeaders(true),
        params: this.params(options)
      }
    );
    return this.records(response.data);
  }
  async getObjectRecord(objectKey: string, recordId: string) {
    return object(
      (
        await this.api.get(`/objects/${segment(objectKey)}/records/${segment(recordId)}`, {
          headers: this.getHeaders()
        })
      ).data
    );
  }
  async getViewRecord(sceneKey: string, viewKey: string, recordId: string) {
    return object(
      (
        await this.api.get(
          `/pages/${segment(sceneKey)}/views/${segment(viewKey)}/records/${segment(recordId)}`,
          {
            headers: this.getHeaders(true)
          }
        )
      ).data
    );
  }
  async createObjectRecord(objectKey: string, fields: KnackObject) {
    return object(
      (
        await this.api.post(`/objects/${segment(objectKey)}/records`, fields, {
          headers: this.getHeaders()
        })
      ).data
    );
  }
  async createViewRecord(sceneKey: string, viewKey: string, fields: KnackObject) {
    return object(
      (
        await this.api.post(
          `/pages/${segment(sceneKey)}/views/${segment(viewKey)}/records`,
          fields,
          {
            headers: this.getHeaders(true)
          }
        )
      ).data
    );
  }
  async updateObjectRecord(objectKey: string, recordId: string, fields: KnackObject) {
    return object(
      (
        await this.api.put(
          `/objects/${segment(objectKey)}/records/${segment(recordId)}`,
          fields,
          {
            headers: this.getHeaders()
          }
        )
      ).data
    );
  }
  async updateViewRecord(
    sceneKey: string,
    viewKey: string,
    recordId: string,
    fields: KnackObject
  ) {
    return object(
      (
        await this.api.put(
          `/pages/${segment(sceneKey)}/views/${segment(viewKey)}/records/${segment(recordId)}`,
          fields,
          {
            headers: this.getHeaders(true)
          }
        )
      ).data
    );
  }
  private deletion(value: unknown) {
    const raw = object(value);
    if (typeof raw.delete !== 'boolean')
      throw createApiServiceError('Knack did not confirm the deletion result.');
    return { deleted: raw.delete, raw };
  }
  async deleteObjectRecord(objectKey: string, recordId: string) {
    return this.deletion(
      (
        await this.api.delete(`/objects/${segment(objectKey)}/records/${segment(recordId)}`, {
          headers: this.getHeaders()
        })
      ).data
    );
  }
  async deleteViewRecord(sceneKey: string, viewKey: string, recordId: string) {
    return this.deletion(
      (
        await this.api.delete(
          `/pages/${segment(sceneKey)}/views/${segment(viewKey)}/records/${segment(recordId)}`,
          {
            headers: this.getHeaders(true)
          }
        )
      ).data
    );
  }
  async uploadFile(
    _objectKey: string,
    _fieldKey: string,
    fileName: string,
    fileContent: string,
    contentType: string,
    assetType: 'file' | 'image' = 'file'
  ): Promise<string> {
    const base64 = fileContent.replace(/\s/g, '');
    const bytes = Buffer.from(base64, 'base64');
    if (
      !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) ||
      bytes.toString('base64').replace(/=+$/, '') !== base64.replace(/=+$/, '')
    )
      throw createApiServiceError('fileContent must contain valid base64-encoded file bytes.');
    const headers = this.getHeaders();
    const form = new FormData();
    form.append('files', new Blob([bytes], { type: contentType }), text(fileName, 'filename'));
    const response = await this.api.post(
      `/applications/${segment(this.applicationId)}/assets/${assetType}/upload`,
      form,
      {
        headers: { ...headers, 'Content-Type': undefined }
      }
    );
    return text(object(response.data).id, 'uploaded asset ID');
  }
}
