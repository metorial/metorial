import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class FaradayClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Faraday API key is required. Reconnect with a valid API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.faraday.ai/v1',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Faraday',
          reason: 'faraday_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['note', 'message', 'suggestion', 'error'],
          nestedKeys: ['validationErrors', 'errors'],
          extractUpstreamCode: (_error, response) => {
            let body = response?.data;
            return typeof body === 'object' &&
              body !== null &&
              'error' in body &&
              typeof body.error === 'string'
              ? body.error
              : undefined;
          }
        })
    });
  }

  // ─── Account ───────────────────────────────────────────────────────

  async getCurrentAccount(): Promise<any> {
    let response = await this.axios.get('/accounts/current');
    return response.data;
  }

  async listAccounts(): Promise<any[]> {
    let response = await this.axios.get('/accounts');
    return response.data;
  }

  // ─── Datasets ──────────────────────────────────────────────────────

  async listDatasets(): Promise<any[]> {
    let response = await this.axios.get('/datasets');
    return response.data;
  }

  async getDataset(datasetId: string): Promise<any> {
    let response = await this.axios.get(`/datasets/${encodeURIComponent(datasetId)}`);
    return response.data;
  }

  async createDataset(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/datasets', data);
    return response.data;
  }

  async updateDataset(datasetId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/datasets/${encodeURIComponent(datasetId)}`, data, {
      headers: { 'Content-Type': 'application/merge-patch+json' }
    });
    return response.data;
  }

  async deleteDataset(datasetId: string): Promise<void> {
    await this.axios.delete(`/datasets/${encodeURIComponent(datasetId)}`);
  }

  // ─── Streams ───────────────────────────────────────────────────────

  async listStreams(): Promise<any[]> {
    let response = await this.axios.get('/streams');
    return response.data;
  }

  async getStream(streamIdOrName: string): Promise<any> {
    let response = await this.axios.get(`/streams/${encodeURIComponent(streamIdOrName)}`);
    return response.data;
  }

  // ─── Connections ───────────────────────────────────────────────────

  async listConnections(): Promise<any[]> {
    let response = await this.axios.get('/connections');
    return response.data;
  }

  async getConnection(connectionId: string): Promise<any> {
    let response = await this.axios.get(`/connections/${encodeURIComponent(connectionId)}`);
    return response.data;
  }

  async createConnection(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/connections', data);
    return response.data;
  }

  async updateConnection(connectionId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(
      `/connections/${encodeURIComponent(connectionId)}`,
      data,
      { headers: { 'Content-Type': 'application/merge-patch+json' } }
    );
    return response.data;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.axios.delete(`/connections/${encodeURIComponent(connectionId)}`);
  }

  // ─── Cohorts ───────────────────────────────────────────────────────

  async listCohorts(): Promise<any[]> {
    let response = await this.axios.get('/cohorts');
    return response.data;
  }

  async getCohort(cohortId: string): Promise<any> {
    let response = await this.axios.get(`/cohorts/${encodeURIComponent(cohortId)}`);
    return response.data;
  }

  async createCohort(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/cohorts', data);
    return response.data;
  }

  async updateCohort(cohortId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/cohorts/${encodeURIComponent(cohortId)}`, data, {
      headers: { 'Content-Type': 'application/merge-patch+json' }
    });
    return response.data;
  }

  async deleteCohort(cohortId: string): Promise<void> {
    await this.axios.delete(`/cohorts/${encodeURIComponent(cohortId)}`);
  }

  // ─── Outcomes ──────────────────────────────────────────────────────

  async listOutcomes(): Promise<any[]> {
    let response = await this.axios.get('/outcomes');
    return response.data;
  }

  async getOutcome(outcomeId: string): Promise<any> {
    let response = await this.axios.get(`/outcomes/${encodeURIComponent(outcomeId)}`);
    return response.data;
  }

  async createOutcome(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/outcomes', data);
    return response.data;
  }

  async updateOutcome(outcomeId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/outcomes/${encodeURIComponent(outcomeId)}`, data, {
      headers: { 'Content-Type': 'application/merge-patch+json' }
    });
    return response.data;
  }

  async deleteOutcome(outcomeId: string): Promise<void> {
    await this.axios.delete(`/outcomes/${encodeURIComponent(outcomeId)}`);
  }

  // ─── Persona Sets ─────────────────────────────────────────────────

  async listPersonaSets(): Promise<any[]> {
    let response = await this.axios.get('/persona_sets');
    return response.data;
  }

  async getPersonaSet(personaSetId: string): Promise<any> {
    let response = await this.axios.get(`/persona_sets/${encodeURIComponent(personaSetId)}`);
    return response.data;
  }

  async createPersonaSet(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/persona_sets', data);
    return response.data;
  }

  async updatePersonaSet(personaSetId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(
      `/persona_sets/${encodeURIComponent(personaSetId)}`,
      data,
      { headers: { 'Content-Type': 'application/merge-patch+json' } }
    );
    return response.data;
  }

  // ─── Recommenders ──────────────────────────────────────────────────

  async listRecommenders(): Promise<any[]> {
    let response = await this.axios.get('/recommenders');
    return response.data;
  }

  async getRecommender(recommenderId: string): Promise<any> {
    let response = await this.axios.get(`/recommenders/${encodeURIComponent(recommenderId)}`);
    return response.data;
  }

  async createRecommender(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/recommenders', data);
    return response.data;
  }

  async updateRecommender(recommenderId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(
      `/recommenders/${encodeURIComponent(recommenderId)}`,
      data,
      { headers: { 'Content-Type': 'application/merge-patch+json' } }
    );
    return response.data;
  }

  // ─── Scopes ────────────────────────────────────────────────────────

  async listScopes(): Promise<any[]> {
    let response = await this.axios.get('/scopes');
    return response.data;
  }

  async getScope(scopeId: string): Promise<any> {
    let response = await this.axios.get(`/scopes/${encodeURIComponent(scopeId)}`);
    return response.data;
  }

  async createScope(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/scopes', data);
    return response.data;
  }

  async updateScope(scopeId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/scopes/${encodeURIComponent(scopeId)}`, data, {
      headers: { 'Content-Type': 'application/merge-patch+json' }
    });
    return response.data;
  }

  // ─── Targets ───────────────────────────────────────────────────────

  async listTargets(): Promise<any[]> {
    let response = await this.axios.get('/targets');
    return response.data;
  }

  async getTarget(targetId: string): Promise<any> {
    let response = await this.axios.get(`/targets/${encodeURIComponent(targetId)}`);
    return response.data;
  }

  async createTarget(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/targets', data);
    return response.data;
  }

  async updateTarget(targetId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/targets/${encodeURIComponent(targetId)}`, data, {
      headers: { 'Content-Type': 'application/merge-patch+json' }
    });
    return response.data;
  }

  async lookupTarget(targetId: string, identity: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/targets/${encodeURIComponent(targetId)}/lookup`,
      identity
    );
    return response.data;
  }

  // ─── Traits ────────────────────────────────────────────────────────

  async listTraits(): Promise<any[]> {
    let response = await this.axios.get('/traits');
    return response.data;
  }

  async createTrait(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/traits', data);
    return response.data;
  }

  // ─── Webhooks ──────────────────────────────────────────────────────

  async listWebhookEndpoints(): Promise<any[]> {
    let response = await this.axios.get('/webhook_endpoints');
    return response.data;
  }

  async createWebhookEndpoint(data: { url: string; enabled_events: string[] }): Promise<any> {
    let response = await this.axios.post('/webhook_endpoints', data);
    return response.data;
  }

  async deleteWebhookEndpoint(webhookEndpointId: string): Promise<void> {
    await this.axios.delete(`/webhook_endpoints/${encodeURIComponent(webhookEndpointId)}`);
  }

  // ─── Graph ─────────────────────────────────────────────────────────

  async getGraph(): Promise<any[]> {
    let response = await this.axios.get('/graph');
    return response.data;
  }
  async deletePersonaSet(personaSetId: string): Promise<void> {
    await this.axios.delete(`/persona_sets/${encodeURIComponent(personaSetId)}`);
  }

  async deleteScope(scopeId: string): Promise<void> {
    await this.axios.delete(`/scopes/${encodeURIComponent(scopeId)}`);
  }

  async deleteTarget(targetId: string): Promise<void> {
    await this.axios.delete(`/targets/${encodeURIComponent(targetId)}`);
  }

  async previewTarget(targetId: string): Promise<{ target_id: string; message: string }> {
    let response = await this.axios.post(`/targets/${encodeURIComponent(targetId)}/preview`);
    return response.data;
  }

  async getOutcomeAnalysis(outcomeId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/outcomes/${encodeURIComponent(outcomeId)}/analysis`);
    return response.data;
  }
}
