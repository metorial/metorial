import { createAxios } from 'slates';

export class Client {
  private projectId: string;
  private token: string;
  private axios;

  constructor(config: { projectId: string; token: string }) {
    this.projectId = config.projectId;
    this.token = config.token;
    this.axios = createAxios({
      baseURL: `https://api.keen.io/3.0/projects/${config.projectId}`,
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
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
    let response = await this.axios.post('/queries/multi_analysis', params);
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

  async listDatasets(): Promise<Record<string, any>> {
    let response = await this.axios.get('/datasets');
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

  async listAccessKeys(): Promise<Record<string, any>[]> {
    let response = await this.axios.get('/keys');
    return response.data;
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
    await this.axios.delete(`/keys/${encodeURIComponent(keyId)}`);
  }

  async unrevokeAccessKey(keyId: string): Promise<Record<string, any>> {
    let response = await this.axios.put(`/keys/${encodeURIComponent(keyId)}/unrevoke`);
    return response.data;
  }

  // ── Deletion ──

  async deleteEvents(
    collectionName: string,
    params?: Record<string, any>
  ): Promise<Record<string, any>> {
    let response = await this.axios.delete(`/events/${encodeURIComponent(collectionName)}`, {
      data: params
    });
    return response.data;
  }

  // ── Project Info ──

  async getProjectInfo(): Promise<Record<string, any>> {
    let response = await this.axios.get('');
    return response.data;
  }
}
