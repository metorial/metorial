import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData
} from 'slates';

let cmsAxios = createAxios({
  baseURL: 'https://data.plasmic.app/api/v1/cms'
});

let cmsError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Plasmic CMS',
    reason: 'plasmic_cms_api_error',
    operation
  });

type CmsRow = Record<string, unknown>;
type NewCmsRow = { data: Record<string, unknown>; identifier?: string };

export class CmsClient {
  private cmsId: string;
  private publicToken?: string;
  private secretToken?: string;

  constructor(config: { cmsId: string; publicToken?: string; secretToken?: string }) {
    this.cmsId = config.cmsId;
    this.publicToken = config.publicToken;
    this.secretToken = config.secretToken;
  }

  private get readHeaders() {
    let token = this.publicToken || this.secretToken;
    if (!token) {
      throw createApiServiceError('A CMS public or secret token is required to read items');
    }
    return { 'x-plasmic-api-cms-tokens': `${this.cmsId}:${token}` };
  }

  private get writeHeaders() {
    if (!this.secretToken) {
      throw createApiServiceError('CMS secret token is required for writes and draft reads');
    }
    return {
      'x-plasmic-api-cms-tokens': `${this.cmsId}:${this.secretToken}`,
      'Content-Type': 'application/json'
    };
  }

  async listModels(): Promise<{ tables: CmsRow[] }> {
    return requestAxiosData(
      'list models',
      () =>
        cmsAxios.get<{ tables: CmsRow[] }>(`/databases/${encodeURIComponent(this.cmsId)}`, {
          headers: this.readHeaders
        }),
      cmsError
    );
  }

  async queryItems(params: {
    modelId: string;
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
    order?: string;
    orderDirection?: 'asc' | 'desc';
    locale?: string;
    draft?: boolean;
  }): Promise<{ rows: CmsRow[] }> {
    if (params.limit !== undefined && !Number.isInteger(params.limit)) {
      throw createApiServiceError('Use an integer limit for CMS queries');
    }
    if (params.offset !== undefined && !Number.isInteger(params.offset)) {
      throw createApiServiceError('Use an integer offset for CMS queries');
    }
    if (params.orderDirection && !params.order) {
      throw createApiServiceError('Provide an order field when specifying orderDirection');
    }
    let q: Record<string, unknown> = {};
    if (params.where) q.where = params.where;
    if (params.limit !== undefined) q.limit = params.limit;
    if (params.offset !== undefined) q.offset = params.offset;
    if (params.order) q.order = [{ field: params.order, dir: params.orderDirection ?? 'asc' }];

    return requestAxiosData(
      'query items',
      () =>
        cmsAxios.get<{ rows: CmsRow[] }>(
          `/databases/${encodeURIComponent(this.cmsId)}/tables/${encodeURIComponent(params.modelId)}/query`,
          {
            headers: params.draft ? this.writeHeaders : this.readHeaders,
            params: {
              q: Object.keys(q).length ? JSON.stringify(q) : undefined,
              locale: params.locale,
              draft: params.draft ? '1' : undefined
            }
          }
        ),
      cmsError
    );
  }

  async countItems(params: {
    modelId: string;
    where?: Record<string, unknown>;
    locale?: string;
    draft?: boolean;
  }): Promise<{ count: number }> {
    return requestAxiosData(
      'count items',
      () =>
        cmsAxios.get<{ count: number }>(
          `/databases/${encodeURIComponent(this.cmsId)}/tables/${encodeURIComponent(params.modelId)}/count`,
          {
            headers: params.draft ? this.writeHeaders : this.readHeaders,
            params: {
              q: params.where ? JSON.stringify({ where: params.where }) : undefined,
              locale: params.locale,
              draft: params.draft ? '1' : undefined
            }
          }
        ),
      cmsError
    );
  }

  async createItems(params: {
    modelId: string;
    rows: NewCmsRow[];
    publish?: boolean;
  }): Promise<{ rows: CmsRow[] }> {
    return requestAxiosData(
      'create items',
      () =>
        cmsAxios.post<{ rows: CmsRow[] }>(
          `/databases/${encodeURIComponent(this.cmsId)}/tables/${encodeURIComponent(params.modelId)}/rows`,
          { rows: params.rows },
          {
            headers: this.writeHeaders,
            params: { publish: params.publish ? '1' : undefined }
          }
        ),
      cmsError
    );
  }

  async createItem(params: {
    modelId: string;
    data: Record<string, unknown>;
    identifier?: string;
    publish?: boolean;
  }): Promise<CmsRow> {
    let result = await this.createItems({
      modelId: params.modelId,
      rows: [{ data: params.data, identifier: params.identifier }],
      publish: params.publish
    });
    let row = result.rows[0];
    if (!row) {
      throw createApiServiceError('Plasmic CMS did not return the created item');
    }
    return row;
  }

  async updateItem(params: {
    modelId: string;
    rowId: string;
    data: Record<string, unknown>;
    identifier?: string;
    publish?: boolean;
  }): Promise<CmsRow> {
    return requestAxiosData(
      'update item',
      () =>
        cmsAxios.put<CmsRow>(
          `/rows/${encodeURIComponent(params.rowId)}`,
          { data: params.data, identifier: params.identifier },
          {
            headers: this.writeHeaders,
            params: { publish: params.publish ? '1' : undefined }
          }
        ),
      cmsError
    );
  }

  async deleteItem(params: { modelId: string; rowId: string }): Promise<void> {
    await requestAxiosData(
      'delete item',
      () =>
        cmsAxios.delete(`/rows/${encodeURIComponent(params.rowId)}`, {
          headers: this.writeHeaders
        }),
      cmsError
    );
  }

  async publishItem(params: { modelId: string; rowId: string }): Promise<CmsRow> {
    return requestAxiosData(
      'publish item',
      () =>
        cmsAxios.post<CmsRow>(
          `/rows/${encodeURIComponent(params.rowId)}/publish`,
          {},
          { headers: this.writeHeaders }
        ),
      cmsError
    );
  }
}
