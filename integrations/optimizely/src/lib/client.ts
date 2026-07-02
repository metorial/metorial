import { createAxios } from 'slates';

export class ExperimentationClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.optimizely.com/v2',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
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
    let response = await this.axios.get('/pages', {
      params: { project_id: projectId, ...params }
    });
    return response.data;
  }

  async getEvent(eventId: number) {
    let response = await this.axios.get(`/pages/${eventId}`);
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
      baseURL: 'https://api.optimizely.com/flags/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async listFlags(projectId: number) {
    let response = await this.axios.get(`/projects/${projectId}/flags`);
    return response.data;
  }

  async getFlag(projectId: number, flagKey: string) {
    let response = await this.axios.get(`/projects/${projectId}/flags/${flagKey}`);
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
    let response = await this.axios.patch(`/projects/${projectId}/flags/${flagKey}`, data);
    return response.data;
  }

  async deleteFlag(projectId: number, flagKey: string) {
    let response = await this.axios.delete(`/projects/${projectId}/flags/${flagKey}`);
    return response.data;
  }

  async listRulesets(projectId: number, flagKey: string, environmentKey: string) {
    let response = await this.axios.get(
      `/projects/${projectId}/flags/${flagKey}/environments/${environmentKey}/ruleset`
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
      `/projects/${projectId}/flags/${flagKey}/environments/${environmentKey}/ruleset`,
      data
    );
    return response.data;
  }

  async enableFlag(projectId: number, flagKey: string, environmentKey: string) {
    let response = await this.axios.patch(
      `/projects/${projectId}/flags/${flagKey}/environments/${environmentKey}/ruleset`,
      {
        enabled: true
      }
    );
    return response.data;
  }

  async disableFlag(projectId: number, flagKey: string, environmentKey: string) {
    let response = await this.axios.patch(
      `/projects/${projectId}/flags/${flagKey}/environments/${environmentKey}/ruleset`,
      {
        enabled: false
      }
    );
    return response.data;
  }
}
