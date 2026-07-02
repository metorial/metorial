import { createAxios } from 'slates';

let cmsAxios = createAxios({
  baseURL: 'https://data.plasmic.app/api/v1/cms/databases'
});

export class CmsClient {
  private cmsId: string;
  private publicToken: string;
  private secretToken?: string;

  constructor(config: { cmsId: string; publicToken: string; secretToken?: string }) {
    this.cmsId = config.cmsId;
    this.publicToken = config.publicToken;
    this.secretToken = config.secretToken;
  }

  private get readHeaders() {
    return {
      'x-plasmic-api-cms-tokens': `${this.cmsId}:${this.publicToken}`
    };
  }

  private get writeHeaders() {
    if (!this.secretToken) {
      throw new Error('CMS secret token is required for write operations');
    }
    return {
      'x-plasmic-api-cms-tokens': `${this.cmsId}:${this.secretToken}`,
      'Content-Type': 'application/json'
    };
  }

  async queryItems(params: {
    modelId: string;
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
    order?: string;
    locale?: string;
    draft?: boolean;
  }): Promise<{ rows: Record<string, unknown>[] }> {
    let q: Record<string, unknown> = {};
    if (params.where) q.where = params.where;
    if (params.limit !== undefined) q.limit = params.limit;
    if (params.offset !== undefined) q.offset = params.offset;
    if (params.order) q.order = params.order;

    let queryParams: Record<string, string> = {};
    if (Object.keys(q).length > 0) {
      queryParams.q = JSON.stringify(q);
    }
    if (params.locale) queryParams.locale = params.locale;
    if (params.draft) queryParams.draft = '1';

    let headers = params.draft ? this.writeHeaders : this.readHeaders;

    let response = await cmsAxios.get(`/${this.cmsId}/tables/${params.modelId}/query`, {
      headers,
      params: queryParams
    });

    return response.data;
  }

  async countItems(params: {
    modelId: string;
    where?: Record<string, unknown>;
    locale?: string;
    draft?: boolean;
  }): Promise<{ count: number }> {
    let q: Record<string, unknown> = {};
    if (params.where) q.where = params.where;

    let queryParams: Record<string, string> = {};
    if (Object.keys(q).length > 0) {
      queryParams.q = JSON.stringify(q);
    }
    if (params.locale) queryParams.locale = params.locale;
    if (params.draft) queryParams.draft = '1';

    let headers = params.draft ? this.writeHeaders : this.readHeaders;

    let response = await cmsAxios.get(`/${this.cmsId}/tables/${params.modelId}/count`, {
      headers,
      params: queryParams
    });

    return response.data;
  }

  async createItem(params: {
    modelId: string;
    data: Record<string, unknown>;
    publish?: boolean;
  }): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = {};
    if (params.publish) queryParams.publish = '1';

    let response = await cmsAxios.post(
      `/${this.cmsId}/tables/${params.modelId}/rows`,
      { data: params.data },
      {
        headers: this.writeHeaders,
        params: queryParams
      }
    );

    return response.data;
  }

  async updateItem(params: {
    modelId: string;
    rowId: string;
    data: Record<string, unknown>;
    publish?: boolean;
  }): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = {};
    if (params.publish) queryParams.publish = '1';

    let response = await cmsAxios.put(
      `/${this.cmsId}/tables/${params.modelId}/rows/${params.rowId}`,
      { data: params.data },
      {
        headers: this.writeHeaders,
        params: queryParams
      }
    );

    return response.data;
  }

  async deleteItem(params: { modelId: string; rowId: string }): Promise<void> {
    await cmsAxios.delete(`/${this.cmsId}/tables/${params.modelId}/rows/${params.rowId}`, {
      headers: this.writeHeaders
    });
  }

  async publishItem(params: {
    modelId: string;
    rowId: string;
  }): Promise<Record<string, unknown>> {
    let response = await cmsAxios.post(
      `/${this.cmsId}/tables/${params.modelId}/rows/${params.rowId}/publish`,
      {},
      {
        headers: this.writeHeaders
      }
    );

    return response.data;
  }
}
