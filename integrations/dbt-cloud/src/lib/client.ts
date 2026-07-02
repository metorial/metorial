import { createAxios } from 'slates';
import { dbtCloudApiError, dbtCloudServiceError } from './errors';

export interface ClientConfig {
  token: string;
  accountId?: string;
  baseUrl: string;
}

export let normalizeWebhookJobIds = (jobIds: unknown): number[] | undefined => {
  if (!Array.isArray(jobIds)) return undefined;

  return jobIds
    .map(jobId => (typeof jobId === 'number' ? jobId : Number(jobId)))
    .filter(jobId => Number.isFinite(jobId));
};

export class Client {
  private axios;
  private accountId?: string;
  private resolvedAccountId?: string;
  readonly baseUrl: string;

  constructor(config: ClientConfig) {
    this.accountId = config.accountId?.trim() || undefined;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
    this.axios.interceptors.response.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(dbtCloudApiError(error))
    );
  }

  private async getAccountId(): Promise<string> {
    if (this.accountId) return this.accountId;
    if (this.resolvedAccountId) return this.resolvedAccountId;

    let accounts = await this.listAccounts({ limit: 2 });
    if (accounts.length === 1) {
      let accountId = accounts[0]?.id;
      if (accountId !== undefined && accountId !== null) {
        this.resolvedAccountId = String(accountId);
        return this.resolvedAccountId;
      }
    }

    if (accounts.length === 0) {
      throw dbtCloudServiceError(
        `No dbt Cloud accounts were found for ${this.baseUrl}. Verify the baseUrl and token permissions.`
      );
    }

    let accountSummary = accounts
      .map(account => {
        let id = account?.id ?? 'unknown';
        let name = typeof account?.name === 'string' ? ` (${account.name})` : '';
        return `${id}${name}`;
      })
      .join(', ');

    throw dbtCloudServiceError(
      `This dbt Cloud token can access multiple accounts on ${this.baseUrl}. Call List Accounts and pass the selected accountId to the tool. Found: ${accountSummary}.`
    );
  }

  // ─── Accounts ──────────────────────────────────────────────

  async listAccounts(params?: { limit?: number; offset?: number }): Promise<any[]> {
    let response = await this.axios.get('/api/v3/accounts/', { params });
    return Array.isArray(response.data.data) ? response.data.data : [];
  }

  async getAccount(): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(`/api/v2/accounts/${accountId}/`);
    return response.data.data;
  }

  // ─── Projects ──────────────────────────────────────────────

  async listProjects(params?: {
    limit?: number;
    offset?: number;
    order_by?: string;
    name__icontains?: string;
    state?: string;
    include_related?: string;
  }): Promise<any[]> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(`/api/v3/accounts/${accountId}/projects/`, {
      params
    });
    return response.data.data;
  }

  async getProject(projectId: string): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(
      `/api/v3/accounts/${accountId}/projects/${projectId}/`
    );
    return response.data.data;
  }

  // ─── Environments ──────────────────────────────────────────

  async listEnvironments(
    projectId: string,
    params?: {
      limit?: number;
      offset?: number;
      order_by?: string;
      name?: string;
      name__icontains?: string;
      state?: string;
      type?: string;
      deployment_type?: string;
      dbt_version?: string;
      dbt_version__in?: string[];
      include_related?: string;
    }
  ): Promise<any[]> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(
      `/api/v3/accounts/${accountId}/projects/${projectId}/environments/`,
      { params }
    );
    return response.data.data;
  }

  async getEnvironment(projectId: string, environmentId: string): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(
      `/api/v3/accounts/${accountId}/projects/${projectId}/environments/${environmentId}/`
    );
    return response.data.data;
  }

  // ─── Jobs ──────────────────────────────────────────────────

  async listJobs(params?: {
    project_id?: string;
    environment_id?: string;
    limit?: number;
    offset?: number;
    order_by?: string;
    include_related?: string;
    name__icontains?: string;
    state?: string;
    dbt_version__in?: string[];
    is_fusion_ready?: boolean;
    is_system?: boolean;
    triggers_schedule?: boolean;
  }): Promise<any[]> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(`/api/v2/accounts/${accountId}/jobs/`, {
      params
    });
    return response.data.data;
  }

  async getJob(jobId: string): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(`/api/v2/accounts/${accountId}/jobs/${jobId}/`);
    return response.data.data;
  }

  async createJob(jobData: Record<string, any>): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.post(`/api/v2/accounts/${accountId}/jobs/`, jobData);
    return response.data.data;
  }

  async updateJob(jobId: string, jobData: Record<string, any>): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.post(
      `/api/v2/accounts/${accountId}/jobs/${jobId}/`,
      jobData
    );
    return response.data.data;
  }

  async deleteJob(jobId: string): Promise<void> {
    let accountId = await this.getAccountId();
    await this.axios.delete(`/api/v2/accounts/${accountId}/jobs/${jobId}/`);
  }

  async triggerJobRun(
    jobId: string,
    options?: {
      cause?: string;
      gitSha?: string;
      gitBranch?: string;
      azurePullRequestId?: number;
      githubPullRequestId?: number;
      gitlabMergeRequestId?: number;
      nonNativePullRequestId?: number;
      schemaOverride?: string;
      dbtVersionOverride?: string;
      threadsOverride?: number;
      targetNameOverride?: string;
      generateDocsOverride?: boolean;
      timeoutSecondsOverride?: number;
      stepsOverride?: string[];
    }
  ): Promise<any> {
    let accountId = await this.getAccountId();
    let body: Record<string, any> = {};
    if (options?.cause) body.cause = options.cause;
    if (options?.gitSha) body.git_sha = options.gitSha;
    if (options?.gitBranch) body.git_branch = options.gitBranch;
    if (options?.azurePullRequestId !== undefined)
      body.azure_pull_request_id = options.azurePullRequestId;
    if (options?.githubPullRequestId !== undefined)
      body.github_pull_request_id = options.githubPullRequestId;
    if (options?.gitlabMergeRequestId !== undefined)
      body.gitlab_merge_request_id = options.gitlabMergeRequestId;
    if (options?.nonNativePullRequestId !== undefined)
      body.non_native_pull_request_id = options.nonNativePullRequestId;
    if (options?.schemaOverride) body.schema_override = options.schemaOverride;
    if (options?.dbtVersionOverride) body.dbt_version_override = options.dbtVersionOverride;
    if (options?.threadsOverride !== undefined)
      body.threads_override = options.threadsOverride;
    if (options?.targetNameOverride) body.target_name_override = options.targetNameOverride;
    if (options?.generateDocsOverride !== undefined)
      body.generate_docs_override = options.generateDocsOverride;
    if (options?.timeoutSecondsOverride !== undefined)
      body.timeout_seconds_override = options.timeoutSecondsOverride;
    if (options?.stepsOverride) body.steps_override = options.stepsOverride;

    let response = await this.axios.post(
      `/api/v2/accounts/${accountId}/jobs/${jobId}/run/`,
      body
    );
    return response.data.data;
  }

  // ─── Runs ──────────────────────────────────────────────────

  async listRuns(params?: {
    job_definition_id?: string;
    project_id?: string;
    environment_id?: string;
    status?: number;
    status__in?: number[];
    order_by?: string;
    limit?: number;
    offset?: number;
    include_related?: string;
    state?: string;
    dbt_version?: string;
    dbt_version__in?: string[];
    has_docs_generated?: boolean;
    has_sources_generated?: boolean;
  }): Promise<any[]> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(`/api/v2/accounts/${accountId}/runs/`, {
      params
    });
    return response.data.data;
  }

  async getRun(runId: string, params?: { include_related?: string[] }): Promise<any> {
    let accountId = await this.getAccountId();
    let queryParams: Record<string, any> = {};
    if (params?.include_related) {
      queryParams.include_related = params.include_related.join(',');
    }
    let response = await this.axios.get(`/api/v2/accounts/${accountId}/runs/${runId}/`, {
      params: queryParams
    });
    return response.data.data;
  }

  async cancelRun(runId: string): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.post(
      `/api/v2/accounts/${accountId}/runs/${runId}/cancel/`
    );
    return response.data.data;
  }

  async getRunFailureDetails(runId: string): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(`/api/v2/accounts/${accountId}/runs/${runId}/retry/`);
    return response.data.data;
  }

  async retryRun(runId: string): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.post(`/api/v2/accounts/${accountId}/runs/${runId}/retry/`);
    return response.data.data;
  }

  async retryFailedJob(jobId: string): Promise<any> {
    let [latestRun] = await this.listRuns({
      job_definition_id: jobId,
      order_by: '-created_at',
      limit: 1
    });

    if (latestRun?.status === 20) {
      let accountId = await this.getAccountId();
      let response = await this.axios.post(
        `/api/v2/accounts/${accountId}/jobs/${jobId}/rerun/`
      );
      return response.data.data;
    }

    return this.triggerJobRun(jobId, {
      cause: 'Triggered by Slates retry_failed_job because no latest failed run was available'
    });
  }

  // ─── Artifacts ─────────────────────────────────────────────

  async getRunArtifact(
    runId: string,
    path: string,
    step?: number
  ): Promise<{
    content: string;
    contentType: string;
    sizeBytes: number;
  }> {
    let accountId = await this.getAccountId();
    let params: Record<string, any> = {};
    if (step !== undefined) params.step = step;
    let response = await this.axios.get(
      `/api/v2/accounts/${accountId}/runs/${runId}/artifacts/${path}`,
      {
        params,
        responseType: 'text',
        transformResponse: [(data: unknown) => data]
      }
    );
    let content =
      typeof response.data === 'string'
        ? response.data
        : (JSON.stringify(response.data, null, 2) ?? String(response.data ?? ''));
    let contentType =
      typeof response.headers?.['content-type'] === 'string'
        ? (response.headers['content-type'].split(';')[0] ?? 'application/json')
        : 'application/json';

    return {
      content,
      contentType,
      sizeBytes: Buffer.byteLength(content, 'utf8')
    };
  }

  async listRunArtifacts(runId: string, step?: number): Promise<string[]> {
    let accountId = await this.getAccountId();
    let params: Record<string, any> = {};
    if (step !== undefined) params.step = step;
    let response = await this.axios.get(
      `/api/v2/accounts/${accountId}/runs/${runId}/artifacts/`,
      { params }
    );
    return response.data.data;
  }

  // ─── Users ─────────────────────────────────────────────────

  async listUsers(params?: { limit?: number; offset?: number }): Promise<any[]> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(`/api/v2/accounts/${accountId}/users/`, {
      params
    });
    return response.data.data;
  }

  // ─── Webhooks ──────────────────────────────────────────────

  async listWebhooks(params?: { limit?: number; offset?: number }): Promise<any[]> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(
      `/api/v3/accounts/${accountId}/webhooks/subscriptions`,
      { params }
    );
    return response.data.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(
      `/api/v3/accounts/${accountId}/webhooks/subscription/${webhookId}`
    );
    return response.data.data;
  }

  async createWebhook(data: {
    name: string;
    clientUrl: string;
    eventTypes: string[];
    description?: string;
    active?: boolean;
    jobIds?: number[];
  }): Promise<any> {
    let accountId = await this.getAccountId();
    let body: Record<string, any> = {
      name: data.name,
      client_url: data.clientUrl,
      event_types: data.eventTypes
    };
    if (data.description) body.description = data.description;
    if (data.active !== undefined) body.active = data.active;
    if (data.jobIds !== undefined) body.job_ids = data.jobIds;

    let response = await this.axios.post(
      `/api/v3/accounts/${accountId}/webhooks/subscriptions`,
      body
    );
    return response.data.data;
  }

  async updateWebhook(
    webhookId: string,
    data: {
      name?: string;
      clientUrl?: string;
      eventTypes?: string[];
      description?: string;
      active?: boolean;
      jobIds?: number[];
    }
  ): Promise<any> {
    let accountId = await this.getAccountId();
    let current = await this.getWebhook(webhookId);
    let body: Record<string, any> = {
      name: data.name ?? current.name,
      client_url: data.clientUrl ?? current.client_url,
      event_types: data.eventTypes ?? current.event_types,
      active: data.active ?? current.active
    };

    let description = data.description ?? current.description;
    if (description !== undefined) body.description = description;

    let jobIds =
      data.jobIds !== undefined ? data.jobIds : normalizeWebhookJobIds(current.job_ids);
    if (jobIds !== undefined) body.job_ids = jobIds;

    let response = await this.axios.put(
      `/api/v3/accounts/${accountId}/webhooks/subscription/${webhookId}`,
      body
    );
    return response.data.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    let accountId = await this.getAccountId();
    await this.axios.delete(
      `/api/v3/accounts/${accountId}/webhooks/subscription/${webhookId}`
    );
  }

  async testWebhook(webhookId: string): Promise<any> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(
      `/api/v3/accounts/${accountId}/webhooks/subscription/${webhookId}/test`
    );
    return response.data.data;
  }

  async listWebhookEvents(webhookId: string): Promise<any[]> {
    let accountId = await this.getAccountId();
    let response = await this.axios.get(
      `/api/v3/accounts/${accountId}/webhooks/subscription/${webhookId}/events`
    );
    return response.data.data;
  }
}
