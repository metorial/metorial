import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export type AlgoliaRegion = 'us' | 'de';

export interface AlgoliaClientConfig {
  applicationId: string;
  token: string;
  analyticsRegion?: AlgoliaRegion;
}

export class AlgoliaClient {
  private searchClient: ReturnType<typeof createAuthenticatedAxios>;
  private analyticsClient: ReturnType<typeof createAuthenticatedAxios>;
  private insightsClient: ReturnType<typeof createAuthenticatedAxios>;
  private monitoringClient: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: AlgoliaClientConfig) {
    let region = config.analyticsRegion || 'us';

    let headers = {
      'x-algolia-application-id': config.applicationId,
      'x-algolia-api-key': config.token,
      'Content-Type': 'application/json'
    };

    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'Algolia',
        reason: 'algolia_api_error',
        extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
        detailKeys: ['message', 'reason', 'error', 'detail']
      });
    let clientOptions = { headers, timeout: 30_000, errorAdapter };

    this.searchClient = createAuthenticatedAxios({
      baseURL: `https://${config.applicationId}.algolia.net`,
      ...clientOptions
    });

    this.analyticsClient = createAuthenticatedAxios({
      baseURL: `https://analytics.${region}.algolia.com`,
      ...clientOptions
    });

    this.insightsClient = createAuthenticatedAxios({
      baseURL: `https://insights.${region}.algolia.io`,
      ...clientOptions
    });

    this.monitoringClient = createAuthenticatedAxios({
      baseURL: `https://status.algolia.com`,
      ...clientOptions
    });
  }

  // ============ Search ============

  async search(indexName: string, params: Record<string, any>): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/query`,
      params
    );
    return res.data;
  }

  async searchMultiIndex(
    requests: Array<{ indexName: string; params?: Record<string, any> }>
  ): Promise<any> {
    let res = await this.searchClient.post('/1/indexes/*/queries', { requests });
    return res.data;
  }

  async searchForFacetValues(
    indexName: string,
    facetName: string,
    params: Record<string, any>
  ): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/facets/${encodeURIComponent(facetName)}/query`,
      params
    );
    return res.data;
  }

  async browse(indexName: string, params: Record<string, any>): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/browse`,
      params
    );
    return res.data;
  }

  // ============ Records (Objects) ============

  async getRecord(
    indexName: string,
    objectId: string,
    attributesToRetrieve?: string[]
  ): Promise<any> {
    let params: Record<string, string> = {};
    if (attributesToRetrieve && attributesToRetrieve.length > 0) {
      params.attributesToRetrieve = attributesToRetrieve.join(',');
    }
    let res = await this.searchClient.get(
      `/1/indexes/${encodeURIComponent(indexName)}/${encodeURIComponent(objectId)}`,
      { params }
    );
    return res.data;
  }

  async getRecords(
    requests: Array<{ indexName: string; objectID: string; attributesToRetrieve?: string[] }>
  ): Promise<any> {
    let res = await this.searchClient.post('/1/indexes/*/objects', { requests });
    return res.data;
  }

  async addRecord(indexName: string, body: Record<string, any>): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}`,
      body
    );
    return res.data;
  }

  async updateRecord(
    indexName: string,
    objectId: string,
    body: Record<string, any>
  ): Promise<any> {
    let res = await this.searchClient.put(
      `/1/indexes/${encodeURIComponent(indexName)}/${encodeURIComponent(objectId)}`,
      body
    );
    return res.data;
  }

  async partialUpdateRecord(
    indexName: string,
    objectId: string,
    body: Record<string, any>,
    createIfNotExists: boolean = true
  ): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/${encodeURIComponent(objectId)}/partial`,
      body,
      { params: { createIfNotExists } }
    );
    return res.data;
  }

  async deleteRecord(indexName: string, objectId: string): Promise<any> {
    let res = await this.searchClient.delete(
      `/1/indexes/${encodeURIComponent(indexName)}/${encodeURIComponent(objectId)}`
    );
    return res.data;
  }

  async batch(
    indexName: string,
    requests: Array<{ action: string; body: Record<string, any> }>
  ): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/batch`,
      { requests }
    );
    return res.data;
  }

  async multipleBatch(
    requests: Array<{ action: string; indexName: string; body: Record<string, any> }>
  ): Promise<any> {
    let res = await this.searchClient.post('/1/indexes/*/batch', { requests });
    return res.data;
  }

  async deleteBy(indexName: string, params: Record<string, any>): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/deleteByQuery`,
      params
    );
    return res.data;
  }

  async clearRecords(indexName: string): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/clear`
    );
    return res.data;
  }

  // ============ Indices ============

  async listIndices(page?: number, hitsPerPage?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (hitsPerPage !== undefined) params.hitsPerPage = hitsPerPage;
    let res = await this.searchClient.get('/1/indexes', { params });
    return res.data;
  }

  async deleteIndex(indexName: string): Promise<any> {
    let res = await this.searchClient.delete(`/1/indexes/${encodeURIComponent(indexName)}`);
    return res.data;
  }

  async copyIndex(
    srcIndexName: string,
    destIndexName: string,
    scope?: string[]
  ): Promise<any> {
    let body: Record<string, any> = { operation: 'copy', destination: destIndexName };
    if (scope) body.scope = scope;
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(srcIndexName)}/operation`,
      body
    );
    return res.data;
  }

  async moveIndex(srcIndexName: string, destIndexName: string): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(srcIndexName)}/operation`,
      {
        operation: 'move',
        destination: destIndexName
      }
    );
    return res.data;
  }

  // ============ Settings ============

  async getSettings(indexName: string): Promise<any> {
    let res = await this.searchClient.get(
      `/1/indexes/${encodeURIComponent(indexName)}/settings`
    );
    return res.data;
  }

  async setSettings(
    indexName: string,
    settings: Record<string, any>,
    forwardToReplicas?: boolean
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (forwardToReplicas !== undefined) params.forwardToReplicas = forwardToReplicas;
    let res = await this.searchClient.put(
      `/1/indexes/${encodeURIComponent(indexName)}/settings`,
      settings,
      { params }
    );
    return res.data;
  }

  // ============ Synonyms ============

  async getSynonym(indexName: string, objectId: string): Promise<any> {
    let res = await this.searchClient.get(
      `/1/indexes/${encodeURIComponent(indexName)}/synonyms/${encodeURIComponent(objectId)}`
    );
    return res.data;
  }

  async searchSynonyms(indexName: string, params: Record<string, any>): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/synonyms/search`,
      params
    );
    return res.data;
  }

  async saveSynonym(
    indexName: string,
    objectId: string,
    synonym: Record<string, any>,
    forwardToReplicas?: boolean
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (forwardToReplicas !== undefined) params.forwardToReplicas = forwardToReplicas;
    let res = await this.searchClient.put(
      `/1/indexes/${encodeURIComponent(indexName)}/synonyms/${encodeURIComponent(objectId)}`,
      { ...synonym, objectID: objectId },
      { params }
    );
    return res.data;
  }

  async saveSynonyms(
    indexName: string,
    synonyms: Record<string, any>[],
    forwardToReplicas?: boolean,
    replaceExistingSynonyms?: boolean
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (forwardToReplicas !== undefined) params.forwardToReplicas = forwardToReplicas;
    if (replaceExistingSynonyms !== undefined)
      params.replaceExistingSynonyms = replaceExistingSynonyms;
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/synonyms/batch`,
      synonyms,
      { params }
    );
    return res.data;
  }

  async deleteSynonym(
    indexName: string,
    objectId: string,
    forwardToReplicas?: boolean
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (forwardToReplicas !== undefined) params.forwardToReplicas = forwardToReplicas;
    let res = await this.searchClient.delete(
      `/1/indexes/${encodeURIComponent(indexName)}/synonyms/${encodeURIComponent(objectId)}`,
      { params }
    );
    return res.data;
  }

  async clearSynonyms(indexName: string, forwardToReplicas?: boolean): Promise<any> {
    let params: Record<string, any> = {};
    if (forwardToReplicas !== undefined) params.forwardToReplicas = forwardToReplicas;
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/synonyms/clear`,
      {},
      { params }
    );
    return res.data;
  }

  // ============ Rules ============

  async getRule(indexName: string, objectId: string): Promise<any> {
    let res = await this.searchClient.get(
      `/1/indexes/${encodeURIComponent(indexName)}/rules/${encodeURIComponent(objectId)}`
    );
    return res.data;
  }

  async searchRules(indexName: string, params: Record<string, any>): Promise<any> {
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/rules/search`,
      params
    );
    return res.data;
  }

  async saveRule(
    indexName: string,
    objectId: string,
    rule: Record<string, any>,
    forwardToReplicas?: boolean
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (forwardToReplicas !== undefined) params.forwardToReplicas = forwardToReplicas;
    let res = await this.searchClient.put(
      `/1/indexes/${encodeURIComponent(indexName)}/rules/${encodeURIComponent(objectId)}`,
      { ...rule, objectID: objectId },
      { params }
    );
    return res.data;
  }

  async saveRules(
    indexName: string,
    rules: Record<string, any>[],
    forwardToReplicas?: boolean,
    clearExistingRules?: boolean
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (forwardToReplicas !== undefined) params.forwardToReplicas = forwardToReplicas;
    if (clearExistingRules !== undefined) params.clearExistingRules = clearExistingRules;
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/rules/batch`,
      rules,
      { params }
    );
    return res.data;
  }

  async deleteRule(
    indexName: string,
    objectId: string,
    forwardToReplicas?: boolean
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (forwardToReplicas !== undefined) params.forwardToReplicas = forwardToReplicas;
    let res = await this.searchClient.delete(
      `/1/indexes/${encodeURIComponent(indexName)}/rules/${encodeURIComponent(objectId)}`,
      { params }
    );
    return res.data;
  }

  async clearRules(indexName: string, forwardToReplicas?: boolean): Promise<any> {
    let params: Record<string, any> = {};
    if (forwardToReplicas !== undefined) params.forwardToReplicas = forwardToReplicas;
    let res = await this.searchClient.post(
      `/1/indexes/${encodeURIComponent(indexName)}/rules/clear`,
      {},
      { params }
    );
    return res.data;
  }

  // ============ API Keys ============

  async listApiKeys(): Promise<any> {
    let res = await this.searchClient.get('/1/keys');
    return res.data;
  }

  async getApiKey(keyValue: string): Promise<any> {
    let res = await this.searchClient.get(`/1/keys/${encodeURIComponent(keyValue)}`);
    return res.data;
  }

  async createApiKey(params: Record<string, any>): Promise<any> {
    let res = await this.searchClient.post('/1/keys', params);
    return res.data;
  }

  async updateApiKey(keyValue: string, params: Record<string, any>): Promise<any> {
    let res = await this.searchClient.put(`/1/keys/${encodeURIComponent(keyValue)}`, params);
    return res.data;
  }

  async deleteApiKey(keyValue: string): Promise<any> {
    let res = await this.searchClient.delete(`/1/keys/${encodeURIComponent(keyValue)}`);
    return res.data;
  }

  async restoreApiKey(keyValue: string): Promise<any> {
    let res = await this.searchClient.post(`/1/keys/${encodeURIComponent(keyValue)}/restore`);
    return res.data;
  }

  // ============ Analytics ============

  async getTopSearches(indexName: string, params?: Record<string, any>): Promise<any> {
    let queryParams: Record<string, any> = { index: indexName, ...params };
    let res = await this.analyticsClient.get('/2/searches', { params: queryParams });
    return res.data;
  }

  async getSearchesCount(indexName: string, params?: Record<string, any>): Promise<any> {
    let queryParams: Record<string, any> = { index: indexName, ...params };
    let res = await this.analyticsClient.get('/2/searches/count', { params: queryParams });
    return res.data;
  }

  async getTopHits(indexName: string, params?: Record<string, any>): Promise<any> {
    let queryParams: Record<string, any> = { index: indexName, ...params };
    let res = await this.analyticsClient.get('/2/hits', { params: queryParams });
    return res.data;
  }

  async getNoResultsSearches(indexName: string, params?: Record<string, any>): Promise<any> {
    let queryParams: Record<string, any> = { index: indexName, ...params };
    let res = await this.analyticsClient.get('/2/searches/noResults', { params: queryParams });
    return res.data;
  }

  async getUsersCount(indexName: string, params?: Record<string, any>): Promise<any> {
    let queryParams: Record<string, any> = { index: indexName, ...params };
    let res = await this.analyticsClient.get('/2/users/count', { params: queryParams });
    return res.data;
  }

  async getClickRate(indexName: string, params?: Record<string, any>): Promise<any> {
    let queryParams: Record<string, any> = { index: indexName, ...params };
    let res = await this.analyticsClient.get('/2/clicks/clickRate', { params: queryParams });
    return res.data;
  }

  async getConversionRate(indexName: string, params?: Record<string, any>): Promise<any> {
    let queryParams: Record<string, any> = { index: indexName, ...params };
    let res = await this.analyticsClient.get('/2/conversions/conversionRate', {
      params: queryParams
    });
    return res.data;
  }

  // ============ Insights (Events) ============

  async sendEvents(events: Record<string, any>[]): Promise<any> {
    let res = await this.insightsClient.post('/1/events', { events });
    return res.data;
  }

  // ============ A/B Testing ============

  async listAbTests(params?: Record<string, any>): Promise<any> {
    let res = await this.analyticsClient.get('/2/abtests', { params });
    return res.data;
  }

  async getAbTest(abTestId: number): Promise<any> {
    let res = await this.analyticsClient.get(`/2/abtests/${abTestId}`);
    return res.data;
  }

  async createAbTest(params: Record<string, any>): Promise<any> {
    let res = await this.analyticsClient.post('/2/abtests', params);
    return res.data;
  }

  async stopAbTest(abTestId: number): Promise<any> {
    let res = await this.analyticsClient.post(`/2/abtests/${abTestId}/stop`);
    return res.data;
  }

  async deleteAbTest(abTestId: number): Promise<any> {
    let res = await this.analyticsClient.delete(`/2/abtests/${abTestId}`);
    return res.data;
  }

  // ============ Recommend ============

  async getRecommendations(requests: Record<string, any>[]): Promise<any> {
    let res = await this.searchClient.post('/1/indexes/*/recommendations', { requests });
    return res.data;
  }

  // ============ Monitoring ============

  async getMonitoringStatus(): Promise<any> {
    let res = await this.monitoringClient.get('/1/status');
    return res.data;
  }

  async getMonitoringIncidents(): Promise<any> {
    let res = await this.monitoringClient.get('/1/incidents');
    return res.data;
  }

  async getServers(): Promise<any> {
    let res = await this.monitoringClient.get('/1/inventory/servers');
    return res.data;
  }

  private async resolveClusters(clusters?: string[]): Promise<string> {
    if (clusters?.length) return clusters.join(',');
    let result = await this.getServers();
    let names = Array.from(
      new Set<string>(
        (result.inventory ?? [])
          .map((server: { cluster?: string }) => server.cluster)
          .filter(
            (cluster: unknown): cluster is string =>
              typeof cluster === 'string' && cluster.length > 0
          )
      )
    );
    if (!names.length) {
      throw createApiServiceError(
        'No clusters were found for this application. Provide clusters from monitoring with metric "status".',
        { reason: 'algolia_clusters_not_found' }
      );
    }
    return names.join(',');
  }

  async getLatency(clusters?: string[]): Promise<any> {
    let selected = await this.resolveClusters(clusters);
    let res = await this.monitoringClient.get(`/1/latency/${encodeURIComponent(selected)}`);
    return res.data;
  }

  async getIndexingTime(clusters?: string[]): Promise<any> {
    let selected = await this.resolveClusters(clusters);
    let res = await this.monitoringClient.get(`/1/indexing/${encodeURIComponent(selected)}`);
    return res.data;
  }

  async getReachability(clusters?: string[]): Promise<any> {
    let selected = await this.resolveClusters(clusters);
    let res = await this.monitoringClient.get(
      `/1/reachability/${encodeURIComponent(selected)}/probes`
    );
    return res.data;
  }

  async getInfrastructure(metric: string = '*', period: string = 'hour'): Promise<any> {
    let res = await this.monitoringClient.get(
      `/1/infrastructure/${encodeURIComponent(metric)}/period/${encodeURIComponent(period)}`
    );
    return res.data;
  }

  // ============ Tasks ============

  async getTask(indexName: string, taskId: number): Promise<any> {
    let res = await this.searchClient.get(
      `/1/indexes/${encodeURIComponent(indexName)}/task/${taskId}`
    );
    return res.data;
  }
}
