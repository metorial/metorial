import { createAxios } from 'slates';

export class GitHubActionsClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  }

  // ─── Workflows ───────────────────────────────────────────────────────

  async listWorkflows(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/workflows`, {
      params: {
        per_page: params.perPage ?? 30,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getWorkflow(owner: string, repo: string, workflowId: number | string) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}`
    );
    return response.data;
  }

  async enableWorkflow(owner: string, repo: string, workflowId: number | string) {
    await this.http.put(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/enable`);
  }

  async disableWorkflow(owner: string, repo: string, workflowId: number | string) {
    await this.http.put(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/disable`);
  }

  async getWorkflowUsage(owner: string, repo: string, workflowId: number | string) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/timing`
    );
    return response.data;
  }

  async triggerWorkflowDispatch(
    owner: string,
    repo: string,
    workflowId: number | string,
    ref: string,
    inputs?: Record<string, string>
  ) {
    await this.http.post(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        ref,
        inputs: inputs ?? {}
      }
    );
  }

  // ─── Workflow Runs ───────────────────────────────────────────────────

  async listWorkflowRuns(
    owner: string,
    repo: string,
    params: {
      workflowId?: number | string;
      actor?: string;
      branch?: string;
      event?: string;
      status?: string;
      perPage?: number;
      page?: number;
      created?: string;
      excludePullRequests?: boolean;
    } = {}
  ) {
    let path = params.workflowId
      ? `/repos/${owner}/${repo}/actions/workflows/${params.workflowId}/runs`
      : `/repos/${owner}/${repo}/actions/runs`;

    let response = await this.http.get(path, {
      params: {
        actor: params.actor,
        branch: params.branch,
        event: params.event,
        status: params.status,
        per_page: params.perPage ?? 30,
        page: params.page ?? 1,
        created: params.created,
        exclude_pull_requests: params.excludePullRequests
      }
    });
    return response.data;
  }

  async getWorkflowRun(owner: string, repo: string, runId: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/runs/${runId}`);
    return response.data;
  }

  async cancelWorkflowRun(owner: string, repo: string, runId: number) {
    await this.http.post(`/repos/${owner}/${repo}/actions/runs/${runId}/cancel`);
  }

  async rerunWorkflowRun(owner: string, repo: string, runId: number) {
    await this.http.post(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun`);
  }

  async rerunFailedJobs(owner: string, repo: string, runId: number) {
    await this.http.post(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun-failed-jobs`);
  }

  async rerunWorkflowJob(owner: string, repo: string, jobId: number) {
    await this.http.post(`/repos/${owner}/${repo}/actions/jobs/${jobId}/rerun`);
  }

  async deleteWorkflowRun(owner: string, repo: string, runId: number) {
    await this.http.delete(`/repos/${owner}/${repo}/actions/runs/${runId}`);
  }

  async getWorkflowRunUsage(owner: string, repo: string, runId: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/runs/${runId}/timing`);
    return response.data;
  }

  async downloadWorkflowRunLogs(owner: string, repo: string, runId: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/runs/${runId}/logs`, {
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400
    });
    return response.headers?.location ?? response.data;
  }

  async deleteWorkflowRunLogs(owner: string, repo: string, runId: number) {
    await this.http.delete(`/repos/${owner}/${repo}/actions/runs/${runId}/logs`);
  }

  async approvePendingRun(owner: string, repo: string, runId: number) {
    await this.http.post(`/repos/${owner}/${repo}/actions/runs/${runId}/approve`);
  }

  async getPendingDeployments(owner: string, repo: string, runId: number) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/actions/runs/${runId}/pending_deployments`
    );
    return response.data;
  }

  async reviewPendingDeployments(
    owner: string,
    repo: string,
    runId: number,
    environmentIds: number[],
    state: 'approved' | 'rejected',
    comment: string
  ) {
    let response = await this.http.post(
      `/repos/${owner}/${repo}/actions/runs/${runId}/pending_deployments`,
      {
        environment_ids: environmentIds,
        state,
        comment
      }
    );
    return response.data;
  }

  // ─── Workflow Jobs ───────────────────────────────────────────────────

  async listJobsForRun(
    owner: string,
    repo: string,
    runId: number,
    params: {
      filter?: 'latest' | 'all';
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {
      params: {
        filter: params.filter ?? 'latest',
        per_page: params.perPage ?? 30,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getJob(owner: string, repo: string, jobId: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/jobs/${jobId}`);
    return response.data;
  }

  async downloadJobLogs(owner: string, repo: string, jobId: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`, {
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400
    });
    return response.headers?.location ?? response.data;
  }

  // ─── Artifacts ───────────────────────────────────────────────────────

  async listArtifactsForRepo(
    owner: string,
    repo: string,
    params: {
      perPage?: number;
      page?: number;
      name?: string;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/artifacts`, {
      params: {
        per_page: params.perPage ?? 30,
        page: params.page ?? 1,
        name: params.name
      }
    });
    return response.data;
  }

  async listArtifactsForRun(
    owner: string,
    repo: string,
    runId: number,
    params: {
      perPage?: number;
      page?: number;
      name?: string;
    } = {}
  ) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1,
          name: params.name
        }
      }
    );
    return response.data;
  }

  async getArtifact(owner: string, repo: string, artifactId: number) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/actions/artifacts/${artifactId}`
    );
    return response.data;
  }

  async downloadArtifact(owner: string, repo: string, artifactId: number) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`,
      {
        maxRedirects: 0,
        validateStatus: (status: number) => status >= 200 && status < 400
      }
    );
    return response.headers?.location ?? response.data;
  }

  async deleteArtifact(owner: string, repo: string, artifactId: number) {
    await this.http.delete(`/repos/${owner}/${repo}/actions/artifacts/${artifactId}`);
  }

  // ─── Secrets (Repository) ───────────────────────────────────────────

  async listRepoSecrets(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/secrets`, {
      params: {
        per_page: params.perPage ?? 30,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getRepoSecret(owner: string, repo: string, secretName: string) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/actions/secrets/${secretName}`
    );
    return response.data;
  }

  async getRepoPublicKey(owner: string, repo: string) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/secrets/public-key`);
    return response.data;
  }

  async createOrUpdateRepoSecret(
    owner: string,
    repo: string,
    secretName: string,
    encryptedValue: string,
    keyId: string
  ) {
    await this.http.put(`/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
      encrypted_value: encryptedValue,
      key_id: keyId
    });
  }

  async deleteRepoSecret(owner: string, repo: string, secretName: string) {
    await this.http.delete(`/repos/${owner}/${repo}/actions/secrets/${secretName}`);
  }

  // ─── Secrets (Organization) ─────────────────────────────────────────

  async listOrgSecrets(org: string, params: { perPage?: number; page?: number } = {}) {
    let response = await this.http.get(`/orgs/${org}/actions/secrets`, {
      params: {
        per_page: params.perPage ?? 30,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getOrgSecret(org: string, secretName: string) {
    let response = await this.http.get(`/orgs/${org}/actions/secrets/${secretName}`);
    return response.data;
  }

  async getOrgPublicKey(org: string) {
    let response = await this.http.get(`/orgs/${org}/actions/secrets/public-key`);
    return response.data;
  }

  async createOrUpdateOrgSecret(
    org: string,
    secretName: string,
    data: {
      encryptedValue: string;
      keyId: string;
      visibility: 'all' | 'private' | 'selected';
      selectedRepositoryIds?: number[];
    }
  ) {
    await this.http.put(`/orgs/${org}/actions/secrets/${secretName}`, {
      encrypted_value: data.encryptedValue,
      key_id: data.keyId,
      visibility: data.visibility,
      selected_repository_ids: data.selectedRepositoryIds
    });
  }

  async deleteOrgSecret(org: string, secretName: string) {
    await this.http.delete(`/orgs/${org}/actions/secrets/${secretName}`);
  }

  // ─── Secrets (Environment) ──────────────────────────────────────────

  async listEnvironmentSecrets(
    owner: string,
    repo: string,
    environmentName: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/environments/${environmentName}/secrets`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1
        }
      }
    );
    return response.data;
  }

  async getEnvironmentPublicKey(owner: string, repo: string, environmentName: string) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/environments/${environmentName}/secrets/public-key`
    );
    return response.data;
  }

  async createOrUpdateEnvironmentSecret(
    owner: string,
    repo: string,
    environmentName: string,
    secretName: string,
    encryptedValue: string,
    keyId: string
  ) {
    await this.http.put(
      `/repos/${owner}/${repo}/environments/${environmentName}/secrets/${secretName}`,
      {
        encrypted_value: encryptedValue,
        key_id: keyId
      }
    );
  }

  async deleteEnvironmentSecret(
    owner: string,
    repo: string,
    environmentName: string,
    secretName: string
  ) {
    await this.http.delete(
      `/repos/${owner}/${repo}/environments/${environmentName}/secrets/${secretName}`
    );
  }

  // ─── Variables (Repository) ─────────────────────────────────────────

  async listRepoVariables(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/variables`, {
      params: {
        per_page: params.perPage ?? 30,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getRepoVariable(owner: string, repo: string, variableName: string) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/actions/variables/${variableName}`
    );
    return response.data;
  }

  async createRepoVariable(owner: string, repo: string, name: string, value: string) {
    let response = await this.http.post(`/repos/${owner}/${repo}/actions/variables`, {
      name,
      value
    });
    return response.data;
  }

  async updateRepoVariable(
    owner: string,
    repo: string,
    variableName: string,
    data: { name?: string; value?: string }
  ) {
    await this.http.patch(`/repos/${owner}/${repo}/actions/variables/${variableName}`, data);
  }

  async deleteRepoVariable(owner: string, repo: string, variableName: string) {
    await this.http.delete(`/repos/${owner}/${repo}/actions/variables/${variableName}`);
  }

  // ─── Variables (Organization) ───────────────────────────────────────

  async listOrgVariables(org: string, params: { perPage?: number; page?: number } = {}) {
    let response = await this.http.get(`/orgs/${org}/actions/variables`, {
      params: {
        per_page: params.perPage ?? 30,
        page: params.page ?? 1
      }
    });
    return response.data;
  }

  async getOrgVariable(org: string, variableName: string) {
    let response = await this.http.get(`/orgs/${org}/actions/variables/${variableName}`);
    return response.data;
  }

  async createOrgVariable(
    org: string,
    name: string,
    value: string,
    visibility: 'all' | 'private' | 'selected',
    selectedRepositoryIds?: number[]
  ) {
    let response = await this.http.post(`/orgs/${org}/actions/variables`, {
      name,
      value,
      visibility,
      selected_repository_ids: selectedRepositoryIds
    });
    return response.data;
  }

  async updateOrgVariable(
    org: string,
    variableName: string,
    data: {
      name?: string;
      value?: string;
      visibility?: string;
      selectedRepositoryIds?: number[];
    }
  ) {
    await this.http.patch(`/orgs/${org}/actions/variables/${variableName}`, {
      name: data.name,
      value: data.value,
      visibility: data.visibility,
      selected_repository_ids: data.selectedRepositoryIds
    });
  }

  async deleteOrgVariable(org: string, variableName: string) {
    await this.http.delete(`/orgs/${org}/actions/variables/${variableName}`);
  }

  // ─── Variables (Environment) ────────────────────────────────────────

  async listEnvironmentVariables(
    owner: string,
    repo: string,
    environmentName: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/environments/${environmentName}/variables`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1
        }
      }
    );
    return response.data;
  }

  async createEnvironmentVariable(
    owner: string,
    repo: string,
    environmentName: string,
    name: string,
    value: string
  ) {
    let response = await this.http.post(
      `/repos/${owner}/${repo}/environments/${environmentName}/variables`,
      {
        name,
        value
      }
    );
    return response.data;
  }

  async updateEnvironmentVariable(
    owner: string,
    repo: string,
    environmentName: string,
    variableName: string,
    data: { name?: string; value?: string }
  ) {
    await this.http.patch(
      `/repos/${owner}/${repo}/environments/${environmentName}/variables/${variableName}`,
      data
    );
  }

  async deleteEnvironmentVariable(
    owner: string,
    repo: string,
    environmentName: string,
    variableName: string
  ) {
    await this.http.delete(
      `/repos/${owner}/${repo}/environments/${environmentName}/variables/${variableName}`
    );
  }

  // ─── Caches ──────────────────────────────────────────────────────────

  async listCaches(
    owner: string,
    repo: string,
    params: {
      perPage?: number;
      page?: number;
      ref?: string;
      key?: string;
      sort?: 'created_at' | 'last_accessed_at' | 'size_in_bytes';
      direction?: 'asc' | 'desc';
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/caches`, {
      params: {
        per_page: params.perPage ?? 30,
        page: params.page ?? 1,
        ref: params.ref,
        key: params.key,
        sort: params.sort,
        direction: params.direction
      }
    });
    return response.data;
  }

  async deleteCacheByKey(owner: string, repo: string, key: string, ref?: string) {
    await this.http.delete(`/repos/${owner}/${repo}/actions/caches`, {
      params: { key, ref }
    });
  }

  async deleteCacheById(owner: string, repo: string, cacheId: number) {
    await this.http.delete(`/repos/${owner}/${repo}/actions/caches/${cacheId}`);
  }

  // ─── Self-Hosted Runners (Repository) ───────────────────────────────

  async listRepoRunners(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number; name?: string } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/runners`, {
      params: {
        per_page: params.perPage ?? 30,
        page: params.page ?? 1,
        name: params.name
      }
    });
    return response.data;
  }

  async getRepoRunner(owner: string, repo: string, runnerId: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/runners/${runnerId}`);
    return response.data;
  }

  async removeRepoRunner(owner: string, repo: string, runnerId: number) {
    await this.http.delete(`/repos/${owner}/${repo}/actions/runners/${runnerId}`);
  }

  async createRepoRunnerRegistrationToken(owner: string, repo: string) {
    let response = await this.http.post(
      `/repos/${owner}/${repo}/actions/runners/registration-token`
    );
    return response.data;
  }

  async createRepoRunnerRemovalToken(owner: string, repo: string) {
    let response = await this.http.post(
      `/repos/${owner}/${repo}/actions/runners/remove-token`
    );
    return response.data;
  }

  async listRunnerLabels(owner: string, repo: string, runnerId: number) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/actions/runners/${runnerId}/labels`
    );
    return response.data;
  }

  async addRunnerLabels(owner: string, repo: string, runnerId: number, labels: string[]) {
    let response = await this.http.post(
      `/repos/${owner}/${repo}/actions/runners/${runnerId}/labels`,
      { labels }
    );
    return response.data;
  }

  async removeRunnerLabel(owner: string, repo: string, runnerId: number, labelName: string) {
    let response = await this.http.delete(
      `/repos/${owner}/${repo}/actions/runners/${runnerId}/labels/${labelName}`
    );
    return response.data;
  }

  async setRunnerLabels(owner: string, repo: string, runnerId: number, labels: string[]) {
    let response = await this.http.put(
      `/repos/${owner}/${repo}/actions/runners/${runnerId}/labels`,
      { labels }
    );
    return response.data;
  }

  // ─── Self-Hosted Runners (Organization) ─────────────────────────────

  async listOrgRunners(
    org: string,
    params: { perPage?: number; page?: number; name?: string } = {}
  ) {
    let response = await this.http.get(`/orgs/${org}/actions/runners`, {
      params: {
        per_page: params.perPage ?? 30,
        page: params.page ?? 1,
        name: params.name
      }
    });
    return response.data;
  }

  async getOrgRunner(org: string, runnerId: number) {
    let response = await this.http.get(`/orgs/${org}/actions/runners/${runnerId}`);
    return response.data;
  }

  async removeOrgRunner(org: string, runnerId: number) {
    await this.http.delete(`/orgs/${org}/actions/runners/${runnerId}`);
  }

  async createOrgRunnerRegistrationToken(org: string) {
    let response = await this.http.post(`/orgs/${org}/actions/runners/registration-token`);
    return response.data;
  }

  async createOrgRunnerRemovalToken(org: string) {
    let response = await this.http.post(`/orgs/${org}/actions/runners/remove-token`);
    return response.data;
  }

  // ─── Permissions ─────────────────────────────────────────────────────

  async getRepoPermissions(owner: string, repo: string) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/permissions`);
    return response.data;
  }

  async setRepoPermissions(
    owner: string,
    repo: string,
    data: { enabled: boolean; allowedActions?: string }
  ) {
    await this.http.put(`/repos/${owner}/${repo}/actions/permissions`, {
      enabled: data.enabled,
      allowed_actions: data.allowedActions
    });
  }

  async getRepoDefaultWorkflowPermissions(owner: string, repo: string) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/permissions/workflow`);
    return response.data;
  }

  async setRepoDefaultWorkflowPermissions(
    owner: string,
    repo: string,
    data: {
      defaultWorkflowPermissions?: 'read' | 'write';
      canApprovePullRequestReviews?: boolean;
    }
  ) {
    await this.http.put(`/repos/${owner}/${repo}/actions/permissions/workflow`, {
      default_workflow_permissions: data.defaultWorkflowPermissions,
      can_approve_pull_request_reviews: data.canApprovePullRequestReviews
    });
  }

  // ─── Webhooks ────────────────────────────────────────────────────────

  async createRepoWebhook(
    owner: string,
    repo: string,
    webhookUrl: string,
    events: string[],
    secret?: string
  ) {
    let response = await this.http.post(`/repos/${owner}/${repo}/hooks`, {
      name: 'web',
      active: true,
      events,
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret
      }
    });
    return response.data;
  }

  async deleteRepoWebhook(owner: string, repo: string, hookId: number) {
    await this.http.delete(`/repos/${owner}/${repo}/hooks/${hookId}`);
  }
}
