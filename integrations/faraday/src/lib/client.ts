import { createAxios } from 'slates';

export class FaradayClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.faraday.ai/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
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
    let response = await this.axios.get(`/datasets/${datasetId}`);
    return response.data;
  }

  async createDataset(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/datasets', data);
    return response.data;
  }

  async updateDataset(datasetId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/datasets/${datasetId}`, data);
    return response.data;
  }

  async deleteDataset(datasetId: string): Promise<void> {
    await this.axios.delete(`/datasets/${datasetId}`);
  }

  // ─── Streams ───────────────────────────────────────────────────────

  async listStreams(): Promise<any[]> {
    let response = await this.axios.get('/streams');
    return response.data;
  }

  async getStream(streamIdOrName: string): Promise<any> {
    let response = await this.axios.get(`/streams/${streamIdOrName}`);
    return response.data;
  }

  // ─── Connections ───────────────────────────────────────────────────

  async listConnections(): Promise<any[]> {
    let response = await this.axios.get('/connections');
    return response.data;
  }

  async getConnection(connectionId: string): Promise<any> {
    let response = await this.axios.get(`/connections/${connectionId}`);
    return response.data;
  }

  async createConnection(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/connections', data);
    return response.data;
  }

  async updateConnection(connectionId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/connections/${connectionId}`, data);
    return response.data;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.axios.delete(`/connections/${connectionId}`);
  }

  // ─── Cohorts ───────────────────────────────────────────────────────

  async listCohorts(): Promise<any[]> {
    let response = await this.axios.get('/cohorts');
    return response.data;
  }

  async getCohort(cohortId: string): Promise<any> {
    let response = await this.axios.get(`/cohorts/${cohortId}`);
    return response.data;
  }

  async createCohort(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/cohorts', data);
    return response.data;
  }

  async updateCohort(cohortId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/cohorts/${cohortId}`, data);
    return response.data;
  }

  async deleteCohort(cohortId: string): Promise<void> {
    await this.axios.delete(`/cohorts/${cohortId}`);
  }

  // ─── Outcomes ──────────────────────────────────────────────────────

  async listOutcomes(): Promise<any[]> {
    let response = await this.axios.get('/outcomes');
    return response.data;
  }

  async getOutcome(outcomeId: string): Promise<any> {
    let response = await this.axios.get(`/outcomes/${outcomeId}`);
    return response.data;
  }

  async createOutcome(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/outcomes', data);
    return response.data;
  }

  async updateOutcome(outcomeId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/outcomes/${outcomeId}`, data);
    return response.data;
  }

  async deleteOutcome(outcomeId: string): Promise<void> {
    await this.axios.delete(`/outcomes/${outcomeId}`);
  }

  // ─── Persona Sets ─────────────────────────────────────────────────

  async listPersonaSets(): Promise<any[]> {
    let response = await this.axios.get('/persona_sets');
    return response.data;
  }

  async getPersonaSet(personaSetId: string): Promise<any> {
    let response = await this.axios.get(`/persona_sets/${personaSetId}`);
    return response.data;
  }

  async createPersonaSet(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/persona_sets', data);
    return response.data;
  }

  async updatePersonaSet(personaSetId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/persona_sets/${personaSetId}`, data);
    return response.data;
  }

  // ─── Recommenders ──────────────────────────────────────────────────

  async listRecommenders(): Promise<any[]> {
    let response = await this.axios.get('/recommenders');
    return response.data;
  }

  async getRecommender(recommenderId: string): Promise<any> {
    let response = await this.axios.get(`/recommenders/${recommenderId}`);
    return response.data;
  }

  async createRecommender(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/recommenders', data);
    return response.data;
  }

  async updateRecommender(recommenderId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/recommenders/${recommenderId}`, data);
    return response.data;
  }

  // ─── Scopes ────────────────────────────────────────────────────────

  async listScopes(): Promise<any[]> {
    let response = await this.axios.get('/scopes');
    return response.data;
  }

  async getScope(scopeId: string): Promise<any> {
    let response = await this.axios.get(`/scopes/${scopeId}`);
    return response.data;
  }

  async createScope(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/scopes', data);
    return response.data;
  }

  async updateScope(scopeId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/scopes/${scopeId}`, data);
    return response.data;
  }

  // ─── Targets ───────────────────────────────────────────────────────

  async listTargets(): Promise<any[]> {
    let response = await this.axios.get('/targets');
    return response.data;
  }

  async getTarget(targetId: string): Promise<any> {
    let response = await this.axios.get(`/targets/${targetId}`);
    return response.data;
  }

  async createTarget(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/targets', data);
    return response.data;
  }

  async updateTarget(targetId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/targets/${targetId}`, data);
    return response.data;
  }

  async lookupTarget(targetId: string, identity: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/targets/${targetId}/lookup`, identity);
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
    await this.axios.delete(`/webhook_endpoints/${webhookEndpointId}`);
  }

  // ─── Graph ─────────────────────────────────────────────────────────

  async getGraph(): Promise<any[]> {
    let response = await this.axios.get('/graph');
    return response.data;
  }
}
