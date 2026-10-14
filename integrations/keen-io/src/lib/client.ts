import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export class Client {
  readonly projectId: string;
  private axios;

  constructor(config: { projectId?: string; token: string }) {
    if (!config.projectId) {
      throw createApiServiceError(
        'Reconnect with the Project ID paired with your Keen.io API key.'
      );
    }
    if (!config.token) {
      throw createApiServiceError('Reconnect with a Keen.io API key.');
    }
    this.projectId = config.projectId;
    this.axios = createAuthenticatedAxios({
      baseURL: `https://api.keen.io/3.0/projects/${encodeURIComponent(config.projectId)}`,
      authHeader: { value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Keen.io',
          reason: 'keenio_api_error',
          detailKeys: ['message', 'description', 'error_code', 'name', 'code'],
          nestedKeys: ['error', 'errors'],
          extractResponse: (input, helpers) => {
            let response = helpers.getResponse(input);
            if (!isApiErrorRecord(input) || !isApiErrorRecord(input.data)) return response;
            let baggage = input.data.baggage;
            return isApiErrorRecord(baggage)
              ? { ...response, data: baggage.response }
              : response;
          },
          extractUpstreamCode: (_input, response) => {
            let data = response?.data;
            return isApiErrorRecord(data) && typeof data.error_code === 'string'
              ? data.error_code
              : undefined;
          }
        })
    });
  }

  // ── Event Streaming ──

  async recordEvent(
    collectionName: string,
    eventData: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(
      `/events/${encodeURIComponent(collectionName)}`,
      eventData
    );
    return response.data;
  }

  async recordMultipleEvents(
    events: Record<string, Record<string, any>[]>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post('/events', events);
    return response.data;
  }

  // ── Queries ──

  async runQuery(
    analysisType: string,
    params: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(`/queries/${analysisType}`, params);
    return response.data;
  }

  async runMultiAnalysis(params: Record<string, any>): Promise<Record<string, any>> {
    let { include_metadata, ...body } = params;
    let response = await this.axios.post('/queries/multi_analysis', body, {
      params: { include_metadata }
    });
    return response.data;
  }

  async runFunnelAnalysis(params: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/queries/funnel', params);
    return response.data;
  }

  // ── Extractions ──

  async extractEvents(
    collectionName: string,
    params: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post('/queries/extraction', {
      event_collection: collectionName,
      ...params
    });
    return response.data;
  }

  // ── Saved Queries ──

  async listSavedQueries(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/queries/saved');
    return response.data;
  }

  async getSavedQuery(queryName: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/queries/saved/${encodeURIComponent(queryName)}`);
    return response.data;
  }

  async createSavedQuery(
    queryName: string,
    queryDefinition: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(
      `/queries/saved/${encodeURIComponent(queryName)}`,
      queryDefinition
    );
    return response.data;
  }

  async updateSavedQuery(
    queryName: string,
    queryDefinition: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(
      `/queries/saved/${encodeURIComponent(queryName)}`,
      queryDefinition
    );
    return response.data;
  }

  async deleteSavedQuery(queryName: string): Promise<void> {
    await this.axios.delete(`/queries/saved/${encodeURIComponent(queryName)}`);
  }

  async runSavedQuery(queryName: string): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `/queries/saved/${encodeURIComponent(queryName)}/result`
    );
    return response.data;
  }

  // ── Cached Queries ──

  async listCachedQueries(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/queries/cached');
    return response.data;
  }

  async getCachedQuery(queryName: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/queries/cached/${encodeURIComponent(queryName)}`);
    return response.data;
  }

  async createCachedQuery(
    queryName: string,
    queryDefinition: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(
      `/queries/cached/${encodeURIComponent(queryName)}`,
      queryDefinition
    );
    return response.data;
  }

  async deleteCachedQuery(queryName: string): Promise<void> {
    await this.axios.delete(`/queries/cached/${encodeURIComponent(queryName)}`);
  }

  async getCachedQueryResult(queryName: string): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `/queries/cached/${encodeURIComponent(queryName)}/result`
    );
    return response.data;
  }

  // ── Cached Datasets ──

  async listDatasets(params?: {
    limit?: number;
    after_name?: string;
  }): Promise<Record<string, any>> {
    let response = await this.axios.get('/datasets', { params });
    return response.data;
  }

  async getDataset(datasetName: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/datasets/${encodeURIComponent(datasetName)}`);
    return response.data;
  }

  async createDataset(
    datasetName: string,
    definition: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.put(
      `/datasets/${encodeURIComponent(datasetName)}`,
      definition
    );
    return response.data;
  }

  async deleteDataset(datasetName: string): Promise<void> {
    await this.axios.delete(`/datasets/${encodeURIComponent(datasetName)}`);
  }

  async getDatasetResults(
    datasetName: string,
    indexBy: string,
    timeframe: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.get(
      `/datasets/${encodeURIComponent(datasetName)}/results`,
      {
        params: {
          index_by: indexBy,
          timeframe: JSON.stringify(timeframe)
        }
      }
    );
    return response.data;
  }

  // ── Schema ──

  async listEventCollections(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/events');
    return response.data;
  }

  async getEventCollectionSchema(collectionName: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/events/${encodeURIComponent(collectionName)}`);
    return response.data;
  }

  // ── Access Keys ──

  async listAccessKeys(params?: {
    page?: number;
    per_page?: number;
    name?: string;
  }): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/keys', { params });
    let keys = Array.isArray(response.data) ? response.data : response.data.keys;
    if (!Array.isArray(keys)) {
      throw createApiServiceError('Keen.io returned an access-key list without a keys array.');
    }
    return keys;
  }

  async getAccessKey(keyId: string): Promise<Record<string, any>> {
    let response = await this.axios.get(`/keys/${encodeURIComponent(keyId)}`);
    return response.data;
  }

  async createAccessKey(keyDefinition: Record<string, any>): Promise<Record<string, any>> {
    let response = await this.axios.post('/keys', keyDefinition);
    return response.data;
  }

  async updateAccessKey(
    keyId: string,
    keyDefinition: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.post(`/keys/${encodeURIComponent(keyId)}`, keyDefinition);
    return response.data;
  }

  async revokeAccessKey(keyId: string): Promise<void> {
    await this.axios.post(`/keys/${encodeURIComponent(keyId)}/revoke`);
  }

  async unrevokeAccessKey(keyId: string): Promise<Record<string, any>> {
    await this.axios.post(`/keys/${encodeURIComponent(keyId)}/unrevoke`);
    return this.getAccessKey(keyId);
  }

  // ── Deletion ──

  async deleteEvents(
    collectionName: string,
    params?: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.delete(`/events/${encodeURIComponent(collectionName)}`, {
      params:
        params &&
        Object.fromEntries(
          Object.entries(params).map(([key, value]) => [
            key,
            typeof value === 'object' ? JSON.stringify(value) : value
          ])
        )
    });
    return response.data;
  }

  // ── Project Info ──

  async getProjectInfo(): Promise<Record<string, any>> {
    let response = await this.axios.get('');
    return response.data;
  }
}

export let createClient = (ctx: {
  auth: { token: string; projectId?: string };
  config: unknown;
}) => {
  let legacyProjectId =
    isApiErrorRecord(ctx.config) && typeof ctx.config.projectId === 'string'
      ? ctx.config.projectId
      : undefined;
  return new Client({
    projectId: ctx.auth.projectId ?? legacyProjectId,
    token: ctx.auth.token
  });
};
