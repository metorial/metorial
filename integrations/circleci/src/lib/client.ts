import { createAxios } from 'slates';

let httpClient = createAxios({
  baseURL: 'https://circleci.com/api/v2'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      'Circle-Token': config.token,
      'Content-Type': 'application/json'
    };
  }

  // ---- User ----

  async getCurrentUser() {
    let response = await httpClient.get('/me', { headers: this.headers });
    return response.data;
  }

  async getUserCollaborations() {
    let response = await httpClient.get('/me/collaborations', { headers: this.headers });
    return response.data;
  }

  async getUserById(userId: string) {
    let response = await httpClient.get(`/user/${userId}`, { headers: this.headers });
    return response.data;
  }

  // ---- Pipelines ----

  async triggerPipeline(
    projectSlug: string,
    params: {
      branch?: string;
      tag?: string;
      parameters?: Record<string, any>;
    }
  ) {
    let response = await httpClient.post(`/project/${projectSlug}/pipeline`, params, {
      headers: this.headers
    });
    return response.data;
  }

  async getPipeline(pipelineId: string) {
    let response = await httpClient.get(`/pipeline/${pipelineId}`, { headers: this.headers });
    return response.data;
  }

  async getPipelineConfig(pipelineId: string) {
    let response = await httpClient.get(`/pipeline/${pipelineId}/config`, {
      headers: this.headers
    });
    return response.data;
  }

  async getPipelineWorkflows(pipelineId: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await httpClient.get(`/pipeline/${pipelineId}/workflow`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getProjectPipelines(
    projectSlug: string,
    opts?: {
      branch?: string;
      pageToken?: string;
    }
  ) {
    let params: Record<string, string> = {};
    if (opts?.branch) params.branch = opts.branch;
    if (opts?.pageToken) params['page-token'] = opts.pageToken;
    let response = await httpClient.get(`/project/${projectSlug}/pipeline`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async continuePipeline(
    pipelineId: string,
    body: {
      configuration: string;
      continuationKey: string;
      parameters?: Record<string, any>;
    }
  ) {
    let response = await httpClient.post(
      `/pipeline/${pipelineId}/continue`,
      {
        configuration: body.configuration,
        'continuation-key': body.continuationKey,
        parameters: body.parameters
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // ---- Workflows ----

  async getWorkflow(workflowId: string) {
    let response = await httpClient.get(`/workflow/${workflowId}`, { headers: this.headers });
    return response.data;
  }

  async getWorkflowJobs(workflowId: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await httpClient.get(`/workflow/${workflowId}/job`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async cancelWorkflow(workflowId: string) {
    let response = await httpClient.post(
      `/workflow/${workflowId}/cancel`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async rerunWorkflow(
    workflowId: string,
    opts?: {
      fromFailed?: boolean;
      jobs?: string[];
      sparseTree?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (opts?.fromFailed !== undefined) body.from_failed = opts.fromFailed;
    if (opts?.jobs) body.jobs = opts.jobs;
    if (opts?.sparseTree !== undefined) body.sparse_tree = opts.sparseTree;
    let response = await httpClient.post(`/workflow/${workflowId}/rerun`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async approveWorkflowJob(workflowId: string, approvalRequestId: string) {
    let response = await httpClient.post(
      `/workflow/${workflowId}/approve/${approvalRequestId}`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  // ---- Jobs ----

  async getJobDetails(projectSlug: string, jobNumber: number) {
    let response = await httpClient.get(`/project/${projectSlug}/job/${jobNumber}`, {
      headers: this.headers
    });
    return response.data;
  }

  async cancelJob(projectSlug: string, jobNumber: number) {
    let response = await httpClient.post(
      `/project/${projectSlug}/job/${jobNumber}/cancel`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async getJobArtifacts(projectSlug: string, jobNumber: number, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await httpClient.get(`/project/${projectSlug}/job/${jobNumber}/artifacts`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getJobTestMetadata(projectSlug: string, jobNumber: number, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await httpClient.get(`/project/${projectSlug}/job/${jobNumber}/tests`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ---- Projects ----

  async getProject(projectSlug: string) {
    let response = await httpClient.get(`/project/${projectSlug}`, { headers: this.headers });
    return response.data;
  }

  async getProjectSettings(projectSlug: string) {
    let response = await httpClient.get(`/project/${projectSlug}/settings`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateProjectSettings(projectSlug: string, settings: Record<string, any>) {
    let response = await httpClient.patch(`/project/${projectSlug}/settings`, settings, {
      headers: this.headers
    });
    return response.data;
  }

  // ---- Project Environment Variables ----

  async listProjectEnvVars(projectSlug: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await httpClient.get(`/project/${projectSlug}/envvar`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createProjectEnvVar(projectSlug: string, name: string, value: string) {
    let response = await httpClient.post(
      `/project/${projectSlug}/envvar`,
      { name, value },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteProjectEnvVar(projectSlug: string, name: string) {
    let response = await httpClient.delete(`/project/${projectSlug}/envvar/${name}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getProjectEnvVar(projectSlug: string, name: string) {
    let response = await httpClient.get(`/project/${projectSlug}/envvar/${name}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ---- Checkout Keys ----

  async listCheckoutKeys(projectSlug: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await httpClient.get(`/project/${projectSlug}/checkout-key`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createCheckoutKey(projectSlug: string, type: 'deploy-key' | 'user-key') {
    let response = await httpClient.post(
      `/project/${projectSlug}/checkout-key`,
      { type },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteCheckoutKey(projectSlug: string, fingerprint: string) {
    let response = await httpClient.delete(
      `/project/${projectSlug}/checkout-key/${fingerprint}`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ---- Contexts ----

  async listContexts(
    ownerId: string,
    ownerType: 'account' | 'organization',
    pageToken?: string
  ) {
    let params: Record<string, string> = {
      'owner-id': ownerId,
      'owner-type': ownerType
    };
    if (pageToken) params['page-token'] = pageToken;
    let response = await httpClient.get('/context', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createContext(name: string, owner: { id: string; type: 'account' | 'organization' }) {
    let response = await httpClient.post(
      '/context',
      { name, owner },
      { headers: this.headers }
    );
    return response.data;
  }

  async getContext(contextId: string) {
    let response = await httpClient.get(`/context/${contextId}`, { headers: this.headers });
    return response.data;
  }

  async deleteContext(contextId: string) {
    let response = await httpClient.delete(`/context/${contextId}`, { headers: this.headers });
    return response.data;
  }

  async listContextEnvVars(contextId: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await httpClient.get(`/context/${contextId}/environment-variable`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async setContextEnvVar(contextId: string, name: string, value: string) {
    let response = await httpClient.put(
      `/context/${contextId}/environment-variable/${name}`,
      { value },
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteContextEnvVar(contextId: string, name: string) {
    let response = await httpClient.delete(
      `/context/${contextId}/environment-variable/${name}`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ---- Insights ----

  async getProjectWorkflowMetrics(
    projectSlug: string,
    opts?: {
      branch?: string;
      pageToken?: string;
      reportingWindow?: string;
    }
  ) {
    let params: Record<string, string> = {};
    if (opts?.branch) params.branch = opts.branch;
    if (opts?.pageToken) params['page-token'] = opts.pageToken;
    if (opts?.reportingWindow) params['reporting-window'] = opts.reportingWindow;
    let response = await httpClient.get(`/insights/${projectSlug}/workflows`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getWorkflowRuns(
    projectSlug: string,
    workflowName: string,
    opts?: {
      branch?: string;
      pageToken?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    let params: Record<string, string> = {};
    if (opts?.branch) params.branch = opts.branch;
    if (opts?.pageToken) params['page-token'] = opts.pageToken;
    if (opts?.startDate) params['start-date'] = opts.startDate;
    if (opts?.endDate) params['end-date'] = opts.endDate;
    let response = await httpClient.get(`/insights/${projectSlug}/workflows/${workflowName}`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getWorkflowSummary(
    projectSlug: string,
    workflowName: string,
    opts?: {
      branch?: string;
    }
  ) {
    let params: Record<string, string> = {};
    if (opts?.branch) params.branch = opts.branch;
    let response = await httpClient.get(
      `/insights/${projectSlug}/workflows/${workflowName}/summary`,
      { headers: this.headers, params }
    );
    return response.data;
  }

  async getWorkflowJobMetrics(
    projectSlug: string,
    workflowName: string,
    opts?: {
      branch?: string;
      pageToken?: string;
      reportingWindow?: string;
    }
  ) {
    let params: Record<string, string> = {};
    if (opts?.branch) params.branch = opts.branch;
    if (opts?.pageToken) params['page-token'] = opts.pageToken;
    if (opts?.reportingWindow) params['reporting-window'] = opts.reportingWindow;
    let response = await httpClient.get(
      `/insights/${projectSlug}/workflows/${workflowName}/jobs`,
      { headers: this.headers, params }
    );
    return response.data;
  }

  async getFlakyTests(projectSlug: string) {
    let response = await httpClient.get(`/insights/${projectSlug}/flaky-tests`, {
      headers: this.headers
    });
    return response.data;
  }

  async getProjectBranches(projectSlug: string) {
    let response = await httpClient.get(`/insights/${projectSlug}/branches`, {
      headers: this.headers
    });
    return response.data;
  }

  // ---- Schedules ----

  async listSchedules(projectSlug: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await httpClient.get(`/project/${projectSlug}/schedule`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createSchedule(
    projectSlug: string,
    schedule: {
      name: string;
      description?: string;
      attributionActor: 'current' | 'system';
      parameters: Record<string, any>;
      timetable: {
        perHour: number;
        hoursOfDay: number[];
        daysOfWeek?: string[];
        daysOfMonth?: number[];
        months?: string[];
      };
    }
  ) {
    let response = await httpClient.post(
      `/project/${projectSlug}/schedule`,
      {
        name: schedule.name,
        description: schedule.description,
        'attribution-actor': schedule.attributionActor,
        parameters: schedule.parameters,
        timetable: {
          'per-hour': schedule.timetable.perHour,
          'hours-of-day': schedule.timetable.hoursOfDay,
          'days-of-week': schedule.timetable.daysOfWeek,
          'days-of-month': schedule.timetable.daysOfMonth,
          months: schedule.timetable.months
        }
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getSchedule(scheduleId: string) {
    let response = await httpClient.get(`/schedule/${scheduleId}`, { headers: this.headers });
    return response.data;
  }

  async updateSchedule(
    scheduleId: string,
    updates: {
      name?: string;
      description?: string;
      attributionActor?: 'current' | 'system';
      parameters?: Record<string, any>;
      timetable?: {
        perHour: number;
        hoursOfDay: number[];
        daysOfWeek?: string[];
        daysOfMonth?: number[];
        months?: string[];
      };
    }
  ) {
    let body: Record<string, any> = {};
    if (updates.name) body.name = updates.name;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.attributionActor) body['attribution-actor'] = updates.attributionActor;
    if (updates.parameters) body.parameters = updates.parameters;
    if (updates.timetable) {
      body.timetable = {
        'per-hour': updates.timetable.perHour,
        'hours-of-day': updates.timetable.hoursOfDay,
        'days-of-week': updates.timetable.daysOfWeek,
        'days-of-month': updates.timetable.daysOfMonth,
        months: updates.timetable.months
      };
    }
    let response = await httpClient.patch(`/schedule/${scheduleId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteSchedule(scheduleId: string) {
    let response = await httpClient.delete(`/schedule/${scheduleId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(scopeId: string, scopeType: string = 'project', pageToken?: string) {
    let params: Record<string, string> = {
      'scope-id': scopeId,
      'scope-type': scopeType
    };
    if (pageToken) params['page-token'] = pageToken;
    let response = await httpClient.get('/webhook', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createWebhook(webhook: {
    name: string;
    url: string;
    events: string[];
    signingSecret?: string;
    verifyTls?: boolean;
    scope: { id: string; type: string };
  }) {
    let body: Record<string, any> = {
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      'verify-tls': webhook.verifyTls ?? true,
      scope: webhook.scope
    };
    if (webhook.signingSecret) body['signing-secret'] = webhook.signingSecret;
    let response = await httpClient.post('/webhook', body, { headers: this.headers });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await httpClient.get(`/webhook/${webhookId}`, { headers: this.headers });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    updates: {
      name?: string;
      url?: string;
      events?: string[];
      signingSecret?: string;
      verifyTls?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.url !== undefined) body.url = updates.url;
    if (updates.events !== undefined) body.events = updates.events;
    if (updates.signingSecret !== undefined) body['signing-secret'] = updates.signingSecret;
    if (updates.verifyTls !== undefined) body['verify-tls'] = updates.verifyTls;
    let response = await httpClient.put(`/webhook/${webhookId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await httpClient.delete(`/webhook/${webhookId}`, { headers: this.headers });
    return response.data;
  }
}
