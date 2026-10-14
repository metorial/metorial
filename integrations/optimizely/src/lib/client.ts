import { createAxios } from 'slates';
import { optimizelyErrorMapping } from './api-errors';

export class ExperimentationClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      errorMapping: optimizelyErrorMapping,
      timeout: 30000,
      baseURL: 'https://api.optimizely.com/v2',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getCurrentUser() {
    let response = await this.axios.get('/me');
    return response.data;
  }

  // Projects
  async listProjects(params?: { page?: number; per_page?: number }) {
    let response = await this.axios.get('/projects', { params });
    return response.data;
  }

  async getProject(projectId: number) {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data;
  }

  async createProject(data: {
    name: string;
    description?: string;
    platform?: string;
    sdks?: string[];
  }) {
    let response = await this.axios.post('/projects', data);
    return response.data;
  }

  async updateProject(
    projectId: number,
    data: { name?: string; description?: string; is_classic?: boolean }
  ) {
    let response = await this.axios.patch(`/projects/${projectId}`, data);
    return response.data;
  }

  // Experiments
  async listExperiments(
    projectId: number,
    params?: { page?: number; per_page?: number; status?: string }
  ) {
    let response = await this.axios.get('/experiments', {
      params: { project_id: projectId, ...params }
    });
    return response.data;
  }

  async getExperiment(experimentId: number) {
    let response = await this.axios.get(`/experiments/${experimentId}`);
    return response.data;
  }

  async createExperiment(data: {
    project_id: number;
    name: string;
    description?: string;
    type?: string;
    holdback?: number;
    variations?: Array<{ name: string; weight?: number; actions?: any }>;
    metrics?: Array<{ aggregator?: string; event_id?: number; scope?: string }>;
    audience_conditions?: string;
    page_ids?: number[];
    url_targeting?: Record<string, unknown>;
  }) {
    let response = await this.axios.post('/experiments', data);
    return response.data;
  }

  async updateExperiment(experimentId: number, data: Record<string, any>) {
    let response = await this.axios.patch(`/experiments/${experimentId}`, data);
    return response.data;
  }

  async deleteExperiment(experimentId: number) {
    let response = await this.axios.delete(`/experiments/${experimentId}`);
    return response.data;
  }

  async getExperimentResults(
    experimentId: number,
    params?: { start_time?: string; end_time?: string }
  ) {
    let response = await this.axios.get(`/experiments/${experimentId}/results`, { params });
    return response.data;
  }

  // Audiences
  async listAudiences(projectId: number, params?: { page?: number; per_page?: number }) {
    let response = await this.axios.get('/audiences', {
      params: { project_id: projectId, ...params }
    });
    return response.data;
  }

  async getAudience(audienceId: number) {
    let response = await this.axios.get(`/audiences/${audienceId}`);
    return response.data;
  }

  async createAudience(data: {
    project_id: number;
    name: string;
    description?: string;
    conditions?: string;
  }) {
    let response = await this.axios.post('/audiences', data);
    return response.data;
  }

  async updateAudience(
    audienceId: number,
    data: { name?: string; description?: string; conditions?: string }
  ) {
    let response = await this.axios.patch(`/audiences/${audienceId}`, data);
    return response.data;
  }

  // Events (custom)
  async listEvents(projectId: number, params?: { page?: number; per_page?: number }) {
    let response = await this.axios.get('/events', {
      params: { project_id: projectId, ...params }
    });
    return response.data;
  }

  async getEvent(eventId: number) {
    let response = await this.axios.get(`/events/${eventId}`);
    return response.data;
  }

  // Campaigns (Feature Experimentation)
  async listCampaigns(projectId: number) {
    let response = await this.axios.get('/campaigns', { params: { project_id: projectId } });
    return response.data;
  }

  async getCampaign(campaignId: number) {
    let response = await this.axios.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  // Environments
  async listEnvironments(projectId: number) {
    let response = await this.axios.get(`/projects/${projectId}/environments`);
    return response.data;
  }

  // Change History
  async listChangeHistory(
    projectId: number,
    params?: { page?: number; per_page?: number; start_date?: string; end_date?: string }
  ) {
    let response = await this.axios.get('/changes', {
      params: { project_id: projectId, ...params }
    });
    return response.data;
  }
}

export class FlagsClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      errorMapping: optimizelyErrorMapping,
      timeout: 30000,
      baseURL: 'https://api.optimizely.com/flags/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async listEnvironments(
    projectId: number,
    params?: { per_page?: number; page_token?: string; archived?: boolean }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/environments`, { params });
    return response.data;
  }

  async listFlags(
    projectId: number,
    params?: { per_page?: number; page_token?: string; page_number?: number }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/flags`, { params });
    return response.data;
  }

  async getFlag(projectId: number, flagKey: string) {
    let response = await this.axios.get(
      `/projects/${projectId}/flags/${encodeURIComponent(flagKey)}`
    );
    return response.data;
  }

  async createFlag(
    projectId: number,
    data: { key: string; name: string; description?: string }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/flags`, data);
    return response.data;
  }

  async updateFlag(
    projectId: number,
    flagKey: string,
    data: { name?: string; description?: string; archived?: boolean }
  ) {
    let operations = Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({
        op: 'replace',
        path: `/${flagKey.replace(/~/g, '~0').replace(/\//g, '~1')}/${key}`,
        value
      }));
    if (operations.length > 0) {
      await this.axios.patch(`/projects/${projectId}/flags`, operations, {
        headers: { 'Content-Type': 'application/json-patch+json' }
      });
    }
    return this.getFlag(projectId, flagKey);
  }

  async deleteFlag(projectId: number, flagKey: string) {
    let response = await this.axios.delete(
      `/projects/${projectId}/flags/${encodeURIComponent(flagKey)}`
    );
    return response.data;
  }

  async listRulesets(projectId: number, flagKey: string, environmentKey: string) {
    let response = await this.axios.get(
      `/projects/${projectId}/flags/${encodeURIComponent(flagKey)}/environments/${encodeURIComponent(environmentKey)}/ruleset`
    );
    return response.data;
  }

  async updateRuleset(
    projectId: number,
    flagKey: string,
    environmentKey: string,
    data: Record<string, any>
  ) {
    let response = await this.axios.patch(
      `/projects/${projectId}/flags/${encodeURIComponent(flagKey)}/environments/${encodeURIComponent(environmentKey)}/ruleset`,
      Object.entries(data).map(([key, value]) => ({
        op: 'replace',
        path: `/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`,
        value
      })),
      { headers: { 'Content-Type': 'application/json-patch+json' } }
    );
    return response.data;
  }

  async enableFlag(projectId: number, flagKey: string, environmentKey: string) {
    let response = await this.axios.post(
      `/projects/${projectId}/flags/${encodeURIComponent(flagKey)}/environments/${encodeURIComponent(environmentKey)}/ruleset/enabled`
    );
    return response.data;
  }

  async disableFlag(projectId: number, flagKey: string, environmentKey: string) {
    let response = await this.axios.post(
      `/projects/${projectId}/flags/${encodeURIComponent(flagKey)}/environments/${encodeURIComponent(environmentKey)}/ruleset/disabled`
    );
    return response.data;
  }
}
