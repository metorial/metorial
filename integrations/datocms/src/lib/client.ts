import { createAxios } from 'slates';

export class Client {
  private token: string;
  private environment?: string;

  constructor(config: { token: string; environment?: string }) {
    this.token = config.token;
    this.environment = config.environment;
  }

  private get axios() {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      'X-Api-Version': '3'
    };
    if (this.environment) {
      headers['X-Environment'] = this.environment;
    }
    return createAxios({
      baseURL: 'https://site-api.datocms.com',
      headers
    });
  }

  private get jsonApiHeaders() {
    return {
      'Content-Type': 'application/vnd.api+json'
    };
  }

  // ─── Site ─────────────────────────────────────────────────────────

  async getSite(): Promise<any> {
    let response = await this.axios.get('/site');
    return response.data;
  }

  // ─── Records (Items) ─────────────────────────────────────────────

  async listRecords(
    params: {
      filterType?: string;
      filterQuery?: string;
      filterIds?: string;
      version?: 'current' | 'published';
      locale?: string;
      orderBy?: string;
      nested?: boolean;
      pageOffset?: number;
      pageLimit?: number;
    } = {}
  ): Promise<{ data: any[]; totalCount: number }> {
    let queryParams: Record<string, string> = {};
    if (params.filterType) queryParams['filter[type]'] = params.filterType;
    if (params.filterQuery) queryParams['filter[query]'] = params.filterQuery;
    if (params.filterIds) queryParams['filter[ids]'] = params.filterIds;
    if (params.version) queryParams.version = params.version;
    if (params.locale) queryParams.locale = params.locale;
    if (params.orderBy) queryParams.order_by = params.orderBy;
    if (params.nested !== undefined) queryParams.nested = String(params.nested);
    if (params.pageOffset !== undefined)
      queryParams['page[offset]'] = String(params.pageOffset);
    if (params.pageLimit !== undefined) queryParams['page[limit]'] = String(params.pageLimit);

    let response = await this.axios.get('/items', { params: queryParams });
    return {
      data: response.data,
      totalCount: response.headers?.['x-api-total-count']
        ? Number.parseInt(response.headers['x-api-total-count'], 10)
        : Array.isArray(response.data)
          ? response.data.length
          : 0
    };
  }

  async getRecord(
    recordId: string,
    params: { version?: 'current' | 'published'; nested?: boolean } = {}
  ): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params.version) queryParams.version = params.version;
    if (params.nested !== undefined) queryParams.nested = String(params.nested);

    let response = await this.axios.get(`/items/${recordId}`, { params: queryParams });
    return response.data;
  }

  async createRecord(
    modelId: string,
    fields: Record<string, any>,
    meta?: { publishedAt?: string }
  ): Promise<any> {
    let body: Record<string, any> = {
      item_type: { type: 'item_type', id: modelId },
      ...fields
    };
    if (meta) {
      body.meta = meta;
    }
    let response = await this.axios.post('/items', body, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async updateRecord(recordId: string, fields: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/items/${recordId}`, fields, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async deleteRecord(recordId: string): Promise<any> {
    let response = await this.axios.delete(`/items/${recordId}`);
    return response.data;
  }

  async publishRecord(recordId: string): Promise<any> {
    let response = await this.axios.put(
      `/items/${recordId}/publish`,
      {},
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async unpublishRecord(recordId: string): Promise<any> {
    let response = await this.axios.put(
      `/items/${recordId}/unpublish`,
      {},
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  // ─── Models (Item Types) ─────────────────────────────────────────

  async listModels(): Promise<any[]> {
    let response = await this.axios.get('/item-types');
    return response.data;
  }

  async getModel(modelId: string): Promise<any> {
    let response = await this.axios.get(`/item-types/${modelId}`);
    return response.data;
  }

  async createModel(attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/item-types', attributes, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async updateModel(modelId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/item-types/${modelId}`, attributes, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async deleteModel(modelId: string): Promise<any> {
    let response = await this.axios.delete(`/item-types/${modelId}`);
    return response.data;
  }

  // ─── Fields ───────────────────────────────────────────────────────

  async listFields(modelId: string): Promise<any[]> {
    let response = await this.axios.get(`/item-types/${modelId}/fields`);
    return response.data;
  }

  async getField(fieldId: string): Promise<any> {
    let response = await this.axios.get(`/fields/${fieldId}`);
    return response.data;
  }

  async createField(modelId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/item-types/${modelId}/fields`, attributes, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async updateField(fieldId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/fields/${fieldId}`, attributes, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async deleteField(fieldId: string): Promise<any> {
    let response = await this.axios.delete(`/fields/${fieldId}`);
    return response.data;
  }

  // ─── Uploads ──────────────────────────────────────────────────────

  async listUploads(
    params: {
      pageOffset?: number;
      pageLimit?: number;
      filterType?: string;
      filterQuery?: string;
    } = {}
  ): Promise<{ data: any[]; totalCount: number }> {
    let queryParams: Record<string, string> = {};
    if (params.pageOffset !== undefined)
      queryParams['page[offset]'] = String(params.pageOffset);
    if (params.pageLimit !== undefined) queryParams['page[limit]'] = String(params.pageLimit);
    if (params.filterType) queryParams['filter[type]'] = params.filterType;
    if (params.filterQuery) queryParams['filter[query]'] = params.filterQuery;

    let response = await this.axios.get('/uploads', { params: queryParams });
    return {
      data: response.data,
      totalCount: response.headers?.['x-api-total-count']
        ? Number.parseInt(response.headers['x-api-total-count'], 10)
        : Array.isArray(response.data)
          ? response.data.length
          : 0
    };
  }

  async getUpload(uploadId: string): Promise<any> {
    let response = await this.axios.get(`/uploads/${uploadId}`);
    return response.data;
  }

  async updateUpload(uploadId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/uploads/${uploadId}`, attributes, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async deleteUpload(uploadId: string): Promise<any> {
    let response = await this.axios.delete(`/uploads/${uploadId}`);
    return response.data;
  }

  // ─── Environments ─────────────────────────────────────────────────

  async listEnvironments(): Promise<any[]> {
    let response = await this.axios.get('/environments');
    return response.data;
  }

  async getEnvironment(environmentId: string): Promise<any> {
    let response = await this.axios.get(`/environments/${environmentId}`);
    return response.data;
  }

  async forkEnvironment(sourceId: string, newId: string): Promise<any> {
    let response = await this.axios.post(
      `/environments/${sourceId}/fork`,
      { id: newId },
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async promoteEnvironment(environmentId: string): Promise<any> {
    let response = await this.axios.put(
      `/environments/${environmentId}/promote`,
      {},
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async deleteEnvironment(environmentId: string): Promise<any> {
    let response = await this.axios.delete(`/environments/${environmentId}`);
    return response.data;
  }

  // ─── Build Triggers ───────────────────────────────────────────────

  async listBuildTriggers(): Promise<any[]> {
    let response = await this.axios.get('/build-triggers');
    return response.data;
  }

  async getBuildTrigger(triggerId: string): Promise<any> {
    let response = await this.axios.get(`/build-triggers/${triggerId}`);
    return response.data;
  }

  async createBuildTrigger(attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/build-triggers', attributes, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async updateBuildTrigger(triggerId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/build-triggers/${triggerId}`, attributes, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async triggerBuild(triggerId: string): Promise<any> {
    let response = await this.axios.post(
      `/build-triggers/${triggerId}/trigger`,
      {},
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async deleteBuildTrigger(triggerId: string): Promise<any> {
    let response = await this.axios.delete(`/build-triggers/${triggerId}`);
    return response.data;
  }

  // ─── Webhooks ─────────────────────────────────────────────────────

  async listWebhooks(): Promise<any[]> {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(attributes: {
    name: string;
    url: string;
    headers: Record<string, string>;
    events: Array<{ entity_type: string; event_types: string[] }>;
    enabled?: boolean;
    payload_api_version?: string;
    nested_items_in_payload?: boolean;
    auto_retry?: boolean;
    http_basic_user?: string;
    http_basic_password?: string;
    custom_payload?: string;
  }): Promise<any> {
    let response = await this.axios.post('/webhooks', attributes, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async updateWebhook(webhookId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/webhooks/${webhookId}`, attributes, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  // ─── Roles ────────────────────────────────────────────────────────

  async listRoles(): Promise<any[]> {
    let response = await this.axios.get('/roles');
    return response.data;
  }

  // ─── Search ───────────────────────────────────────────────────────

  async searchSite(
    query: string,
    params: {
      buildTriggerId?: string;
      locale?: string;
      pageOffset?: number;
      pageLimit?: number;
      fuzzy?: boolean;
    } = {}
  ): Promise<{ data: any[]; totalCount: number }> {
    let queryParams: Record<string, string> = {
      q: query
    };
    if (params.buildTriggerId) queryParams.build_trigger_id = params.buildTriggerId;
    if (params.locale) queryParams.locale = params.locale;
    if (params.pageOffset !== undefined)
      queryParams['page[offset]'] = String(params.pageOffset);
    if (params.pageLimit !== undefined) queryParams['page[limit]'] = String(params.pageLimit);
    if (params.fuzzy !== undefined) queryParams.fuzzy = String(params.fuzzy);

    let response = await this.axios.get('/search-results', { params: queryParams });
    return {
      data: response.data,
      totalCount: response.headers?.['x-api-total-count']
        ? Number.parseInt(response.headers['x-api-total-count'], 10)
        : Array.isArray(response.data)
          ? response.data.length
          : 0
    };
  }
}
