import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let resourceBody = (type: string, attributes: Record<string, any>, id?: string) => ({
  data: { type, ...(id ? { id } : {}), attributes }
});

let deserializeResource = (resource: any): any => {
  if (!resource || typeof resource !== 'object') return resource;
  let relationships = Object.fromEntries(
    Object.entries(resource.relationships ?? {}).map(([key, value]) => [
      key,
      (value as { data: unknown }).data
    ])
  );
  return { ...resource, ...resource.attributes, ...relationships };
};

let validatePagination = (offset?: number, limit?: number, maxLimit = 500) => {
  if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) {
    throw createApiServiceError('pageOffset must be a non-negative whole number.');
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > maxLimit)) {
    throw createApiServiceError(`pageLimit must be a whole number between 1 and ${maxLimit}.`);
  }
};

export class Client {
  private token: string;
  private environment?: string;

  constructor(config: { token: string; environment?: string }) {
    if (!config.token?.trim()) throw createApiServiceError('A DatoCMS API token is required.');
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
    let axios = createAuthenticatedAxios({
      baseURL: 'https://site-api.datocms.com',
      contentType: false,
      headers,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'DatoCMS',
          reason: 'datocms_api_error'
        })
    });
    axios.interceptors.response.use(response => {
      let body = response.data;
      if (body && typeof body === 'object' && 'data' in body) {
        if (typeof body.meta?.total_count === 'number') {
          response.headers['x-api-total-count'] = String(body.meta.total_count);
        }
        response.data = Array.isArray(body.data)
          ? body.data.map(deserializeResource)
          : deserializeResource(body.data);
      } else if (response.status === 204 || body === '') {
        response.data = null;
      }
      return response;
    });
    return axios;
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
    validatePagination(params.pageOffset, params.pageLimit);
    if (params.filterIds && params.filterType) {
      throw createApiServiceError('recordIds cannot be combined with modelIdOrApiKey.');
    }
    if (params.orderBy && (!params.filterType || params.filterType.includes(','))) {
      throw createApiServiceError('orderBy requires exactly one modelIdOrApiKey.');
    }
    let queryParams: Record<string, string> = {};
    if (params.filterType) queryParams['filter[type]'] = params.filterType;
    if (params.filterQuery) queryParams['filter[query]'] = params.filterQuery;
    if (params.filterIds) queryParams['filter[ids]'] = params.filterIds;
    if (params.version) queryParams.version = params.version;
    if (params.locale) queryParams['filter[locale]'] = params.locale;
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

    let response = await this.axios.get(`/items/${encodeURIComponent(recordId)}`, {
      params: queryParams
    });
    return response.data;
  }

  async createRecord(
    modelId: string,
    fields: Record<string, any>,
    meta?: { created_at?: string; first_published_at?: string | null }
  ): Promise<any> {
    let model = await this.getModel(modelId);
    let body = {
      data: {
        type: 'item',
        attributes: fields,
        relationships: { item_type: { data: { type: 'item_type', id: model.id } } },
        ...(meta ? { meta } : {})
      }
    };
    let response = await this.axios.post('/items', body, {
      headers: this.jsonApiHeaders
    });
    return response.data;
  }

  async updateRecord(recordId: string, fields: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/items/${encodeURIComponent(recordId)}`,
      resourceBody('item', fields, recordId),
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async deleteRecord(recordId: string): Promise<any> {
    let response = await this.axios.delete(`/items/${encodeURIComponent(recordId)}`);
    return response.data;
  }

  async publishRecord(recordId: string): Promise<any> {
    let response = await this.axios.put(
      `/items/${encodeURIComponent(recordId)}/publish`,
      undefined,
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async unpublishRecord(recordId: string): Promise<any> {
    let response = await this.axios.put(
      `/items/${encodeURIComponent(recordId)}/unpublish`,
      undefined,
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
    let response = await this.axios.get(`/item-types/${encodeURIComponent(modelId)}`);
    return response.data;
  }

  async createModel(attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/item-types',
      resourceBody('item_type', attributes),
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async updateModel(modelId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/item-types/${encodeURIComponent(modelId)}`,
      resourceBody('item_type', attributes, (await this.getModel(modelId)).id),
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async deleteModel(modelId: string): Promise<any> {
    let response = await this.axios.delete(`/item-types/${encodeURIComponent(modelId)}`);
    return response.data;
  }

  // ─── Fields ───────────────────────────────────────────────────────

  async listFields(modelId: string): Promise<any[]> {
    let response = await this.axios.get(`/item-types/${encodeURIComponent(modelId)}/fields`);
    return response.data;
  }

  async getField(fieldId: string): Promise<any> {
    let response = await this.axios.get(`/fields/${encodeURIComponent(fieldId)}`);
    return response.data;
  }

  async createField(modelId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/item-types/${encodeURIComponent(modelId)}/fields`,
      resourceBody('field', attributes),
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async updateField(fieldId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/fields/${encodeURIComponent(fieldId)}`,
      resourceBody('field', attributes, fieldId),
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async deleteField(fieldId: string): Promise<any> {
    let response = await this.axios.delete(`/fields/${encodeURIComponent(fieldId)}`);
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
    validatePagination(params.pageOffset, params.pageLimit);
    let queryParams: Record<string, string> = {};
    if (params.pageOffset !== undefined)
      queryParams['page[offset]'] = String(params.pageOffset);
    if (params.pageLimit !== undefined) queryParams['page[limit]'] = String(params.pageLimit);
    if (params.filterType) queryParams['filter[fields][type][eq]'] = params.filterType;
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
    let response = await this.axios.get(`/uploads/${encodeURIComponent(uploadId)}`);
    return response.data;
  }

  async updateUpload(uploadId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/uploads/${encodeURIComponent(uploadId)}`,
      resourceBody('upload', attributes, uploadId),
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async deleteUpload(uploadId: string): Promise<any> {
    let response = await this.axios.delete(`/uploads/${encodeURIComponent(uploadId)}`);
    return response.data;
  }

  // ─── Environments ─────────────────────────────────────────────────

  async listEnvironments(): Promise<any[]> {
    let response = await this.axios.get('/environments');
    return response.data;
  }

  async getEnvironment(environmentId: string): Promise<any> {
    let response = await this.axios.get(`/environments/${encodeURIComponent(environmentId)}`);
    return response.data;
  }

  async forkEnvironment(sourceId: string, newId: string): Promise<any> {
    let response = await this.axios.post(
      `/environments/${encodeURIComponent(sourceId)}/fork`,
      { data: { type: 'environment', id: newId } },
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async promoteEnvironment(environmentId: string): Promise<any> {
    let response = await this.axios.put(
      `/environments/${encodeURIComponent(environmentId)}/promote`,
      undefined,
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async deleteEnvironment(environmentId: string): Promise<any> {
    let response = await this.axios.delete(
      `/environments/${encodeURIComponent(environmentId)}`
    );
    return response.data;
  }

  // ─── Build Triggers ───────────────────────────────────────────────

  async listBuildTriggers(): Promise<any[]> {
    let response = await this.axios.get('/build-triggers');
    return response.data;
  }

  async getBuildTrigger(triggerId: string): Promise<any> {
    let response = await this.axios.get(`/build-triggers/${encodeURIComponent(triggerId)}`);
    return response.data;
  }

  async createBuildTrigger(attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      '/build-triggers',
      resourceBody('build_trigger', attributes),
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async updateBuildTrigger(triggerId: string, attributes: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/build-triggers/${encodeURIComponent(triggerId)}`,
      resourceBody('build_trigger', attributes, triggerId),
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async triggerBuild(triggerId: string): Promise<any> {
    let response = await this.axios.post(
      `/build-triggers/${encodeURIComponent(triggerId)}/trigger`,
      undefined,
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async deleteBuildTrigger(triggerId: string): Promise<any> {
    let response = await this.axios.delete(`/build-triggers/${encodeURIComponent(triggerId)}`);
    return response.data;
  }

  // ─── Webhooks ─────────────────────────────────────────────────────

  async listWebhooks(): Promise<any[]> {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.get(`/webhooks/${encodeURIComponent(webhookId)}`);
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
    let response = await this.axios.put(
      `/webhooks/${encodeURIComponent(webhookId)}`,
      attributes,
      {
        headers: this.jsonApiHeaders
      }
    );
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.delete(`/webhooks/${encodeURIComponent(webhookId)}`);
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
      searchIndexId?: string;
      locale?: string;
      pageOffset?: number;
      pageLimit?: number;
      fuzzy?: boolean;
    } = {}
  ): Promise<{ data: any[]; totalCount: number }> {
    validatePagination(params.pageOffset, params.pageLimit, 100);
    if (params.searchIndexId && params.buildTriggerId) {
      throw createApiServiceError('Use searchIndexId or buildTriggerId, not both.');
    }
    let queryParams: Record<string, string> = { 'filter[query]': query };
    if (params.searchIndexId) queryParams['filter[search_index_id]'] = params.searchIndexId;
    if (params.buildTriggerId) queryParams['filter[build_trigger_id]'] = params.buildTriggerId;
    if (params.locale) queryParams['filter[locale]'] = params.locale;
    if (params.pageOffset !== undefined)
      queryParams['page[offset]'] = String(params.pageOffset);
    if (params.pageLimit !== undefined) queryParams['page[limit]'] = String(params.pageLimit);
    if (params.fuzzy) queryParams['filter[fuzzy]'] = 'true';

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

  async listRecordVersions(
    recordId: string,
    params: { nested?: boolean; pageOffset?: number; pageLimit?: number } = {}
  ): Promise<any[]> {
    validatePagination(params.pageOffset, params.pageLimit, 50);
    let response = await this.axios.get(`/items/${encodeURIComponent(recordId)}/versions`, {
      params: {
        nested: params.nested,
        'page[offset]': params.pageOffset,
        'page[limit]': params.pageLimit
      }
    });
    return response.data;
  }

  async getJobResult(jobId: string): Promise<any> {
    let response = await this.axios.get(`/job-results/${encodeURIComponent(jobId)}`);
    return response.data;
  }
}
