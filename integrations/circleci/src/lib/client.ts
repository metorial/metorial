import { createAxios } from 'slates';
import { circleCiApiError } from './errors';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://circleci.com/api/v2',
      headers: {
        Accept: 'application/json',
        'Circle-Token': config.token,
        'Content-Type': 'application/json'
      }
    });
    this.http.interceptors.response.use(
      response => response,
      error => Promise.reject(circleCiApiError(error))
    );
  }

  // ---- User ----

  async getCurrentUser() {
    let response = await this.http.get('/me');
    return response.data;
  }

  async getUserCollaborations() {
    let response = await this.http.get('/me/collaborations');
    return response.data;
  }

  async getUserById(userId: string) {
    let response = await this.http.get(`/user/${encodeURIComponent(userId)}`);
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
    let response = await this.http.post(`/project/${projectSlug}/pipeline`, params);
    return response.data;
  }

  async triggerPipelineRun(
    project: { provider: string; organization: string; name: string },
    params: {
      definitionId?: string;
      branch?: string;
      tag?: string;
      parameters?: Record<string, any>;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.definitionId) body.definition_id = params.definitionId;
    if (params.branch || params.tag) {
      let revision = params.branch ? { branch: params.branch } : { tag: params.tag };
      body.config = revision;
      body.checkout = revision;
    }
    if (params.parameters) body.parameters = params.parameters;

    let response = await this.http.post(
      `/project/${encodeURIComponent(project.provider)}/${encodeURIComponent(project.organization)}/${encodeURIComponent(project.name)}/pipeline/run`,
      body
    );
    return response.data;
  }

  async getPipeline(pipelineId: string) {
    let response = await this.http.get(`/pipeline/${encodeURIComponent(pipelineId)}`);
    return response.data;
  }

  async getPipelineConfig(pipelineId: string) {
    let response = await this.http.get(`/pipeline/${encodeURIComponent(pipelineId)}/config`);
    return response.data;
  }

  async getPipelineWorkflows(pipelineId: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await this.http.get(
      `/pipeline/${encodeURIComponent(pipelineId)}/workflow`,
      {
        params
      }
    );
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
    let response = await this.http.get(`/project/${projectSlug}/pipeline`, { params });
    return response.data;
  }

  async continuePipeline(body: {
    configuration: string;
    continuationKey: string;
    parameters?: Record<string, any>;
  }) {
    let response = await this.http.post('/pipeline/continue', {
      configuration: body.configuration,
      'continuation-key': body.continuationKey,
      parameters: body.parameters
    });
    return response.data;
  }

  // ---- Workflows ----

  async getWorkflow(workflowId: string) {
    let response = await this.http.get(`/workflow/${encodeURIComponent(workflowId)}`);
    return response.data;
  }

  async getWorkflowJobs(workflowId: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await this.http.get(`/workflow/${encodeURIComponent(workflowId)}/job`, {
      params
    });
    return response.data;
  }

  async cancelWorkflow(workflowId: string) {
    let response = await this.http.post(
      `/workflow/${encodeURIComponent(workflowId)}/cancel`,
      {}
    );
    return response.data;
  }

  async rerunWorkflow(
    workflowId: string,
    opts?: {
      fromFailed?: boolean;
      jobs?: string[];
      sparseTree?: boolean;
      enableSsh?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (opts?.fromFailed !== undefined) body.from_failed = opts.fromFailed;
    if (opts?.jobs) body.jobs = opts.jobs;
    if (opts?.sparseTree !== undefined) body.sparse_tree = opts.sparseTree;
    if (opts?.enableSsh !== undefined) body.enable_ssh = opts.enableSsh;
    let response = await this.http.post(
      `/workflow/${encodeURIComponent(workflowId)}/rerun`,
      body
    );
    return response.data;
  }

  async approveWorkflowJob(workflowId: string, approvalRequestId: string) {
    let response = await this.http.post(
      `/workflow/${encodeURIComponent(workflowId)}/approve/${encodeURIComponent(approvalRequestId)}`,
      {}
    );
    return response.data;
  }

  // ---- Jobs ----

  async getJobDetails(projectSlug: string, jobNumber: number) {
    let response = await this.http.get(`/project/${projectSlug}/job/${jobNumber}`);
    return response.data;
  }

  async cancelJob(projectSlug: string, jobNumber: number) {
    let response = await this.http.post(`/project/${projectSlug}/job/${jobNumber}/cancel`, {});
    return response.data;
  }

  async getJobArtifacts(projectSlug: string, jobNumber: number, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await this.http.get(`/project/${projectSlug}/${jobNumber}/artifacts`, {
      params
    });
    return response.data;
  }

  async getJobTestMetadata(projectSlug: string, jobNumber: number, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await this.http.get(`/project/${projectSlug}/${jobNumber}/tests`, {
      params
    });
    return response.data;
  }

  // ---- Projects ----

  async getProject(projectSlug: string) {
    let response = await this.http.get(`/project/${projectSlug}`);
    return response.data;
  }

  async getProjectSettings(projectSlug: string) {
    let response = await this.http.get(`/project/${projectSlug}/settings`);
    return response.data;
  }

  async updateProjectSettings(projectSlug: string, settings: Record<string, any>) {
    let response = await this.http.patch(`/project/${projectSlug}/settings`, settings);
    return response.data;
  }

  // ---- Project Environment Variables ----

  async listProjectEnvVars(projectSlug: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await this.http.get(`/project/${projectSlug}/envvar`, { params });
    return response.data;
  }

  async createProjectEnvVar(projectSlug: string, name: string, value: string) {
    let response = await this.http.post(`/project/${projectSlug}/envvar`, { name, value });
    return response.data;
  }

  async deleteProjectEnvVar(projectSlug: string, name: string) {
    let response = await this.http.delete(
      `/project/${projectSlug}/envvar/${encodeURIComponent(name)}`
    );
    return response.data;
  }

  async getProjectEnvVar(projectSlug: string, name: string) {
    let response = await this.http.get(
      `/project/${projectSlug}/envvar/${encodeURIComponent(name)}`
    );
    return response.data;
  }

  // ---- Checkout Keys ----

  async listCheckoutKeys(projectSlug: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await this.http.get(`/project/${projectSlug}/checkout-key`, { params });
    return response.data;
  }

  async createCheckoutKey(projectSlug: string, type: 'deploy-key' | 'user-key') {
    let response = await this.http.post(`/project/${projectSlug}/checkout-key`, { type });
    return response.data;
  }

  async deleteCheckoutKey(projectSlug: string, fingerprint: string) {
    let response = await this.http.delete(
      `/project/${projectSlug}/checkout-key/${encodeURIComponent(fingerprint)}`
    );
    return response.data;
  }

  // ---- Contexts ----

  async listContexts(opts: {
    ownerId?: string;
    ownerSlug?: string;
    ownerType?: 'account' | 'organization';
    pageToken?: string;
  }) {
    let params: Record<string, string> = {};
    if (opts.ownerId) params['owner-id'] = opts.ownerId;
    if (opts.ownerSlug) params['owner-slug'] = opts.ownerSlug;
    if (opts.ownerType) params['owner-type'] = opts.ownerType;
    if (opts.pageToken) params['page-token'] = opts.pageToken;
    let response = await this.http.get('/context', { params });
    return response.data;
  }

  async createContext(
    name: string,
    owner:
      | { id: string; type?: 'account' | 'organization' }
      | { slug: string; type?: 'organization' }
  ) {
    let response = await this.http.post('/context', { name, owner });
    return response.data;
  }

  async getContext(contextId: string) {
    let response = await this.http.get(`/context/${encodeURIComponent(contextId)}`);
    return response.data;
  }

  async deleteContext(contextId: string) {
    let response = await this.http.delete(`/context/${encodeURIComponent(contextId)}`);
    return response.data;
  }

  async listContextEnvVars(contextId: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await this.http.get(
      `/context/${encodeURIComponent(contextId)}/environment-variable`,
      { params }
    );
    return response.data;
  }

  async setContextEnvVar(contextId: string, name: string, value: string) {
    let response = await this.http.put(
      `/context/${encodeURIComponent(contextId)}/environment-variable/${encodeURIComponent(name)}`,
      { value }
    );
    return response.data;
  }

  async deleteContextEnvVar(contextId: string, name: string) {
    let response = await this.http.delete(
      `/context/${encodeURIComponent(contextId)}/environment-variable/${encodeURIComponent(name)}`
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
    let response = await this.http.get(`/insights/${projectSlug}/workflows`, { params });
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
    let response = await this.http.get(
      `/insights/${projectSlug}/workflows/${encodeURIComponent(workflowName)}`,
      { params }
    );
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
    let response = await this.http.get(
      `/insights/${projectSlug}/workflows/${encodeURIComponent(workflowName)}/summary`,
      { params }
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
    let response = await this.http.get(
      `/insights/${projectSlug}/workflows/${encodeURIComponent(workflowName)}/jobs`,
      { params }
    );
    return response.data;
  }

  async getFlakyTests(projectSlug: string) {
    let response = await this.http.get(`/insights/${projectSlug}/flaky-tests`);
    return response.data;
  }

  async getProjectBranches(projectSlug: string) {
    let response = await this.http.get(`/insights/${projectSlug}/branches`);
    return response.data;
  }

  // ---- Schedules ----

  async listSchedules(projectSlug: string, pageToken?: string) {
    let params: Record<string, string> = {};
    if (pageToken) params['page-token'] = pageToken;
    let response = await this.http.get(`/project/${projectSlug}/schedule`, { params });
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
    let response = await this.http.post(`/project/${projectSlug}/schedule`, {
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
    });
    return response.data;
  }

  async getSchedule(scheduleId: string) {
    let response = await this.http.get(`/schedule/${encodeURIComponent(scheduleId)}`);
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
    let response = await this.http.patch(`/schedule/${encodeURIComponent(scheduleId)}`, body);
    return response.data;
  }

  async deleteSchedule(scheduleId: string) {
    let response = await this.http.delete(`/schedule/${encodeURIComponent(scheduleId)}`);
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(scopeId: string, scopeType: string = 'project', pageToken?: string) {
    let params: Record<string, string> = {
      'scope-id': scopeId,
      'scope-type': scopeType
    };
    if (pageToken) params['page-token'] = pageToken;
    let response = await this.http.get('/webhook', { params });
    return response.data;
  }

  async createWebhook(webhook: {
    name: string;
    url: string;
    events: string[];
    signingSecret: string;
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
    body['signing-secret'] = webhook.signingSecret;
    let response = await this.http.post('/webhook', body);
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.http.get(`/webhook/${encodeURIComponent(webhookId)}`);
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
    let response = await this.http.put(`/webhook/${encodeURIComponent(webhookId)}`, body);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.http.delete(`/webhook/${encodeURIComponent(webhookId)}`);
    return response.data;
  }
}
