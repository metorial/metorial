import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue
} from 'slates';
import { z } from 'zod';
import type {
  Artifact,
  Cache,
  Job,
  PendingDeployment,
  PublicKey,
  Runner,
  RunnerLabel,
  RunnerToken,
  Secret,
  SelectedActions,
  User,
  Variable,
  Workflow,
  WorkflowRun
} from './types';
import { encodePathSegment } from './validation';

const timestamp = z.string();
const numberId = z.number().int().positive();
const recordSchema = z.record(z.string(), z.unknown());
const workflowSchema = z
  .object({
    id: numberId,
    name: z.string(),
    path: z.string(),
    state: z.string(),
    created_at: timestamp,
    updated_at: timestamp,
    html_url: z.string(),
    badge_url: z.string()
  })
  .passthrough();
const runSchema = z
  .object({
    id: numberId,
    name: z.string().nullish(),
    display_title: z.string(),
    workflow_id: numberId,
    head_branch: z.string().nullable(),
    head_sha: z.string(),
    event: z.string(),
    status: z.string().nullable(),
    conclusion: z.string().nullable(),
    run_number: z.number(),
    run_attempt: z.number().optional(),
    html_url: z.string(),
    created_at: timestamp,
    updated_at: timestamp,
    run_started_at: timestamp.nullish(),
    actor: z.object({ login: z.string() }).nullish(),
    triggering_actor: z.object({ login: z.string() }).nullish()
  })
  .passthrough();
const stepSchema = z
  .object({
    name: z.string(),
    status: z.string(),
    conclusion: z.string().nullable(),
    number: z.number(),
    started_at: timestamp.nullish(),
    completed_at: timestamp.nullish()
  })
  .passthrough();
const jobSchema = z
  .object({
    id: numberId,
    run_id: numberId,
    name: z.string(),
    status: z.string(),
    conclusion: z.string().nullable(),
    started_at: timestamp.nullable(),
    completed_at: timestamp.nullable(),
    runner_name: z.string().nullable(),
    steps: z.array(stepSchema).optional()
  })
  .passthrough();
const artifactSchema = z
  .object({
    id: numberId,
    name: z.string(),
    size_in_bytes: z.number().nonnegative(),
    expired: z.boolean(),
    created_at: timestamp.nullable(),
    updated_at: timestamp.nullable(),
    expires_at: timestamp.nullable(),
    workflow_run: z.object({ id: numberId.optional() }).nullish()
  })
  .passthrough();
const secretSchema = z
  .object({
    name: z.string(),
    created_at: timestamp,
    updated_at: timestamp,
    visibility: z.string().optional()
  })
  .passthrough();
const variableSchema = secretSchema.extend({ value: z.string() });
const labelSchema = z
  .object({ id: numberId.optional(), name: z.string(), type: z.string().optional() })
  .passthrough();
const runnerSchema = z
  .object({
    id: numberId,
    name: z.string(),
    os: z.string(),
    status: z.string(),
    busy: z.boolean(),
    labels: z.array(labelSchema)
  })
  .passthrough();
const cacheSchema = z
  .object({
    id: numberId,
    key: z.string(),
    ref: z.string().optional(),
    version: z.string().optional(),
    created_at: timestamp.optional(),
    last_accessed_at: timestamp.optional(),
    size_in_bytes: z.number().optional()
  })
  .passthrough();
const totalCount = z.number().int().nonnegative();
const responseSchemas = {
  workflows: z.object({ total_count: totalCount, workflows: z.array(workflowSchema) }),
  workflow: workflowSchema,
  runs: z.object({ total_count: totalCount, workflow_runs: z.array(runSchema) }),
  run: runSchema,
  jobs: z.object({ total_count: totalCount, jobs: z.array(jobSchema) }),
  job: jobSchema,
  artifacts: z.object({ total_count: totalCount, artifacts: z.array(artifactSchema) }),
  artifact: artifactSchema,
  secrets: z.object({ total_count: totalCount, secrets: z.array(secretSchema) }),
  secret: secretSchema,
  variables: z.object({ total_count: totalCount, variables: z.array(variableSchema) }),
  variable: variableSchema,
  publicKey: z.object({ key: z.string().min(1), key_id: z.string().min(1) }),
  caches: z.object({ total_count: totalCount, actions_caches: z.array(cacheSchema) }),
  runners: z.object({ total_count: totalCount, runners: z.array(runnerSchema) }),
  runner: runnerSchema,
  labels: z.object({ labels: z.array(labelSchema) }),
  runnerToken: z.object({ token: z.string().min(1), expires_at: timestamp }),
  permissions: z.object({ enabled: z.boolean(), allowed_actions: z.string().optional() }),
  workflowPermissions: z.object({
    default_workflow_permissions: z.string(),
    can_approve_pull_request_reviews: z.boolean()
  }),
  selectedActions: z.object({
    github_owned_allowed: z.boolean(),
    verified_allowed: z.boolean(),
    patterns_allowed: z.array(z.string())
  }),
  pendingDeployments: z.array(
    z.object({
      environment: z.object({ id: numberId, name: z.string(), html_url: z.string() }),
      wait_timer: z.number(),
      wait_timer_started_at: timestamp.nullable(),
      current_user_can_approve: z.boolean()
    })
  ),
  dispatch: z.object({ workflow_run_id: numberId, run_url: z.string(), html_url: z.string() }),
  usage: z.object({ billable: recordSchema })
};

export const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10'
};
export const githubApiError = (error: unknown) =>
  buildApiServiceError(error, {
    parent: {},
    providerLabel: 'GitHub',
    reason: 'github_api_error',
    formatMessage: ({ status }) =>
      `GitHub request failed${status ? ` (HTTP ${status})` : ''}. Check token permissions, repository access, resource availability, and rate limits.`
  });

export class GitHubActionsClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (!token.trim()) throw createApiServiceError('A GitHub access token is required.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.github.com',
      timeout: 30000,
      maxRedirects: 3,
      beforeRedirect: options => {
        if (
          options.protocol !== 'https:' ||
          options.hostname !== 'api.github.com' ||
          options.auth ||
          (options.port && String(options.port) !== '443')
        )
          throw createApiServiceError(
            'GitHub redirected the request outside its secure API origin.'
          );
      },
      authHeader: { value: `Bearer ${token.trim()}` },
      headers: githubHeaders,
      errorAdapter: githubApiError
    });
  }

  private validateResponse(data: unknown, schema: z.ZodType) {
    if (!schema.safeParse(data).success)
      throw createApiServiceError(
        'GitHub returned an invalid API response. Request the resource again or check its availability.'
      );
  }

  async getCurrentUser() {
    const user = (await this.http.get<User>('/user')).data;
    if (!user || !Number.isSafeInteger(user.id) || !user.login)
      throw createApiServiceError('GitHub did not return an authenticated user profile.');
    return user;
  }

  private async prepareDownload(path: string) {
    // Keep the authenticated API endpoint: each download obtains a fresh one-minute redirect.
    const response = await this.http.get<unknown>(path, {
      maxRedirects: 0,
      validateStatus: status => status === 302
    });
    const location = getResponseHeaderValue(response.headers, 'location');
    const redirect = z.url().safeParse(location);
    if (!redirect.success)
      throw createApiServiceError('GitHub did not provide a secure download redirect.');
    const target = new URL(redirect.data);
    if (target.protocol !== 'https:' || target.username || target.password)
      throw createApiServiceError('GitHub did not provide a secure download redirect.');
    return { downloadUrl: location, apiUrl: `https://api.github.com${path}` };
  }

  // ─── Workflows ───────────────────────────────────────────────────────

  async listWorkflows(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get<{ total_count: number; workflows: Workflow[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/workflows`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.workflows);
    return response.data;
  }

  async getWorkflow(owner: string, repo: string, workflowId: number | string) {
    let response = await this.http.get<Workflow>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/workflows/${encodePathSegment(workflowId)}`
    );
    this.validateResponse(response.data, responseSchemas.workflow);
    return response.data;
  }

  async enableWorkflow(owner: string, repo: string, workflowId: number | string) {
    await this.http.put(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/workflows/${encodePathSegment(workflowId)}/enable`
    );
  }

  async disableWorkflow(owner: string, repo: string, workflowId: number | string) {
    await this.http.put(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/workflows/${encodePathSegment(workflowId)}/disable`
    );
  }

  async getWorkflowUsage(owner: string, repo: string, workflowId: number | string) {
    let response = await this.http.get<{ billable: Record<string, unknown> }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/workflows/${encodePathSegment(workflowId)}/timing`
    );
    this.validateResponse(response.data, responseSchemas.usage);
    return response.data;
  }

  async triggerWorkflowDispatch(
    owner: string,
    repo: string,
    workflowId: number | string,
    ref: string,
    inputs?: Record<string, string>
  ) {
    let response = await this.http.post<{
      workflow_run_id: number;
      run_url: string;
      html_url: string;
    }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/workflows/${encodePathSegment(workflowId)}/dispatches`,
      {
        ref,
        inputs: inputs ?? {}
      }
    );
    this.validateResponse(response.data, responseSchemas.dispatch);
    return response.data;
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
      headSha?: string;
      excludePullRequests?: boolean;
    } = {}
  ) {
    let path = params.workflowId
      ? `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/workflows/${encodePathSegment(params.workflowId)}/runs`
      : `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs`;

    let response = await this.http.get<{ total_count: number; workflow_runs: WorkflowRun[] }>(
      path,
      {
        params: {
          actor: params.actor,
          branch: params.branch,
          event: params.event,
          status: params.status,
          per_page: params.perPage ?? 30,
          page: params.page ?? 1,
          created: params.created,
          head_sha: params.headSha,
          exclude_pull_requests: params.excludePullRequests
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.runs);
    return response.data;
  }

  async getWorkflowRun(owner: string, repo: string, runId: number) {
    let response = await this.http.get<WorkflowRun>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}`
    );
    this.validateResponse(response.data, responseSchemas.run);
    return response.data;
  }

  async cancelWorkflowRun(owner: string, repo: string, runId: number) {
    await this.http.post(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/cancel`
    );
  }

  async rerunWorkflowRun(owner: string, repo: string, runId: number) {
    await this.http.post(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/rerun`
    );
  }

  async rerunFailedJobs(owner: string, repo: string, runId: number) {
    await this.http.post(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/rerun-failed-jobs`
    );
  }

  async rerunWorkflowJob(owner: string, repo: string, jobId: number) {
    await this.http.post(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/jobs/${jobId}/rerun`
    );
  }

  async deleteWorkflowRun(owner: string, repo: string, runId: number) {
    await this.http.delete(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}`
    );
  }

  async getWorkflowRunUsage(owner: string, repo: string, runId: number) {
    let response = await this.http.get<{ billable: Record<string, unknown> }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/timing`
    );
    this.validateResponse(response.data, responseSchemas.usage);
    return response.data;
  }

  async downloadWorkflowRunLogs(owner: string, repo: string, runId: number) {
    return this.prepareDownload(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/logs`
    );
  }

  async deleteWorkflowRunLogs(owner: string, repo: string, runId: number) {
    await this.http.delete(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/logs`
    );
  }

  async approvePendingRun(owner: string, repo: string, runId: number) {
    await this.http.post(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/approve`
    );
  }

  async getPendingDeployments(owner: string, repo: string, runId: number) {
    let response = await this.http.get<PendingDeployment[]>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/pending_deployments`
    );
    this.validateResponse(response.data, responseSchemas.pendingDeployments);
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
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/pending_deployments`,
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
    let response = await this.http.get<{ total_count: number; jobs: Job[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/jobs`,
      {
        params: {
          filter: params.filter ?? 'latest',
          per_page: params.perPage ?? 30,
          page: params.page ?? 1
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.jobs);
    return response.data;
  }

  async getJob(owner: string, repo: string, jobId: number) {
    let response = await this.http.get<Job>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/jobs/${jobId}`
    );
    this.validateResponse(response.data, responseSchemas.job);
    return response.data;
  }

  async downloadJobLogs(owner: string, repo: string, jobId: number) {
    return this.prepareDownload(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/jobs/${jobId}/logs`
    );
  }

  async listArtifactsForRepo(
    owner: string,
    repo: string,
    params: {
      perPage?: number;
      page?: number;
      name?: string;
    } = {}
  ) {
    let response = await this.http.get<{ total_count: number; artifacts: Artifact[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/artifacts`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1,
          name: params.name
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.artifacts);
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
    let response = await this.http.get<{ total_count: number; artifacts: Artifact[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runs/${runId}/artifacts`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1,
          name: params.name
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.artifacts);
    return response.data;
  }

  async getArtifact(owner: string, repo: string, artifactId: number) {
    let response = await this.http.get<Artifact>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/artifacts/${artifactId}`
    );
    this.validateResponse(response.data, responseSchemas.artifact);
    return response.data;
  }

  async downloadArtifact(owner: string, repo: string, artifactId: number) {
    return this.prepareDownload(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/artifacts/${artifactId}/zip`
    );
  }

  async deleteArtifact(owner: string, repo: string, artifactId: number) {
    await this.http.delete(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/artifacts/${artifactId}`
    );
  }

  // ─── Secrets (Repository) ───────────────────────────────────────────

  async listRepoSecrets(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get<{ total_count: number; secrets: Secret[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/secrets`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.secrets);
    return response.data;
  }

  async getRepoSecret(owner: string, repo: string, secretName: string) {
    let response = await this.http.get<Secret>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/secrets/${encodePathSegment(secretName)}`
    );
    this.validateResponse(response.data, responseSchemas.secret);
    return response.data;
  }

  async getRepoPublicKey(owner: string, repo: string) {
    let response = await this.http.get<PublicKey>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/secrets/public-key`
    );
    this.validateResponse(response.data, responseSchemas.publicKey);
    return response.data;
  }

  async createOrUpdateRepoSecret(
    owner: string,
    repo: string,
    secretName: string,
    encryptedValue: string,
    keyId: string
  ) {
    await this.http.put(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/secrets/${encodePathSegment(secretName)}`,
      {
        encrypted_value: encryptedValue,
        key_id: keyId
      }
    );
  }

  async deleteRepoSecret(owner: string, repo: string, secretName: string) {
    await this.http.delete(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/secrets/${encodePathSegment(secretName)}`
    );
  }

  // ─── Secrets (Organization) ─────────────────────────────────────────

  async listOrgSecrets(org: string, params: { perPage?: number; page?: number } = {}) {
    let response = await this.http.get<{ total_count: number; secrets: Secret[] }>(
      `/orgs/${encodePathSegment(org)}/actions/secrets`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.secrets);
    return response.data;
  }

  async getOrgSecret(org: string, secretName: string) {
    let response = await this.http.get<Secret>(
      `/orgs/${encodePathSegment(org)}/actions/secrets/${encodePathSegment(secretName)}`
    );
    this.validateResponse(response.data, responseSchemas.secret);
    return response.data;
  }

  async getOrgPublicKey(org: string) {
    let response = await this.http.get<PublicKey>(
      `/orgs/${encodePathSegment(org)}/actions/secrets/public-key`
    );
    this.validateResponse(response.data, responseSchemas.publicKey);
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
    await this.http.put(
      `/orgs/${encodePathSegment(org)}/actions/secrets/${encodePathSegment(secretName)}`,
      {
        encrypted_value: data.encryptedValue,
        key_id: data.keyId,
        visibility: data.visibility,
        selected_repository_ids: data.selectedRepositoryIds
      }
    );
  }

  async deleteOrgSecret(org: string, secretName: string) {
    await this.http.delete(
      `/orgs/${encodePathSegment(org)}/actions/secrets/${encodePathSegment(secretName)}`
    );
  }

  // ─── Secrets (Environment) ──────────────────────────────────────────

  async listEnvironmentSecrets(
    owner: string,
    repo: string,
    environmentName: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get<{ total_count: number; secrets: Secret[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/environments/${encodePathSegment(environmentName)}/secrets`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.secrets);
    return response.data;
  }

  async getEnvironmentPublicKey(owner: string, repo: string, environmentName: string) {
    let response = await this.http.get<PublicKey>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/environments/${encodePathSegment(environmentName)}/secrets/public-key`
    );
    this.validateResponse(response.data, responseSchemas.publicKey);
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
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/environments/${encodePathSegment(environmentName)}/secrets/${encodePathSegment(secretName)}`,
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
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/environments/${encodePathSegment(environmentName)}/secrets/${encodePathSegment(secretName)}`
    );
  }

  // ─── Variables (Repository) ─────────────────────────────────────────

  async listRepoVariables(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get<{ total_count: number; variables: Variable[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/variables`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.variables);
    return response.data;
  }

  async getRepoVariable(owner: string, repo: string, variableName: string) {
    let response = await this.http.get<Variable>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/variables/${encodePathSegment(variableName)}`
    );
    this.validateResponse(response.data, responseSchemas.variable);
    return response.data;
  }

  async createRepoVariable(owner: string, repo: string, name: string, value: string) {
    let response = await this.http.post(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/variables`,
      {
        name,
        value
      }
    );
    return response.data;
  }

  async updateRepoVariable(
    owner: string,
    repo: string,
    variableName: string,
    data: { name?: string; value?: string }
  ) {
    await this.http.patch(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/variables/${encodePathSegment(variableName)}`,
      data
    );
  }

  async deleteRepoVariable(owner: string, repo: string, variableName: string) {
    await this.http.delete(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/variables/${encodePathSegment(variableName)}`
    );
  }

  // ─── Variables (Organization) ───────────────────────────────────────

  async listOrgVariables(org: string, params: { perPage?: number; page?: number } = {}) {
    let response = await this.http.get<{ total_count: number; variables: Variable[] }>(
      `/orgs/${encodePathSegment(org)}/actions/variables`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.variables);
    return response.data;
  }

  async getOrgVariable(org: string, variableName: string) {
    let response = await this.http.get<Variable>(
      `/orgs/${encodePathSegment(org)}/actions/variables/${encodePathSegment(variableName)}`
    );
    this.validateResponse(response.data, responseSchemas.variable);
    return response.data;
  }

  async createOrgVariable(
    org: string,
    name: string,
    value: string,
    visibility: 'all' | 'private' | 'selected',
    selectedRepositoryIds?: number[]
  ) {
    let response = await this.http.post(`/orgs/${encodePathSegment(org)}/actions/variables`, {
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
    await this.http.patch(
      `/orgs/${encodePathSegment(org)}/actions/variables/${encodePathSegment(variableName)}`,
      {
        name: data.name,
        value: data.value,
        visibility: data.visibility,
        selected_repository_ids: data.selectedRepositoryIds
      }
    );
  }

  async deleteOrgVariable(org: string, variableName: string) {
    await this.http.delete(
      `/orgs/${encodePathSegment(org)}/actions/variables/${encodePathSegment(variableName)}`
    );
  }

  // ─── Variables (Environment) ────────────────────────────────────────

  async listEnvironmentVariables(
    owner: string,
    repo: string,
    environmentName: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get<{ total_count: number; variables: Variable[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/environments/${encodePathSegment(environmentName)}/variables`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.variables);
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
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/environments/${encodePathSegment(environmentName)}/variables`,
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
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/environments/${encodePathSegment(environmentName)}/variables/${encodePathSegment(variableName)}`,
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
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/environments/${encodePathSegment(environmentName)}/variables/${encodePathSegment(variableName)}`
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
    let response = await this.http.get<{ total_count: number; actions_caches: Cache[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/caches`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1,
          ref: params.ref,
          key: params.key,
          sort: params.sort,
          direction: params.direction
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.caches);
    return response.data;
  }

  async deleteCacheByKey(owner: string, repo: string, key: string, ref?: string) {
    const response = await this.http.delete<{ total_count: number; actions_caches: Cache[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/caches`,
      {
        params: { key, ref }
      }
    );
    this.validateResponse(response.data, responseSchemas.caches);
    return response.data;
  }

  async deleteCacheById(owner: string, repo: string, cacheId: number) {
    await this.http.delete(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/caches/${cacheId}`
    );
  }

  // ─── Self-Hosted Runners (Repository) ───────────────────────────────

  async listRepoRunners(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number; name?: string } = {}
  ) {
    let response = await this.http.get<{ total_count: number; runners: Runner[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runners`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1,
          name: params.name
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.runners);
    return response.data;
  }

  async getRepoRunner(owner: string, repo: string, runnerId: number) {
    let response = await this.http.get<Runner>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runners/${runnerId}`
    );
    this.validateResponse(response.data, responseSchemas.runner);
    return response.data;
  }

  async removeRepoRunner(owner: string, repo: string, runnerId: number) {
    await this.http.delete(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runners/${runnerId}`
    );
  }

  async createRepoRunnerRegistrationToken(owner: string, repo: string) {
    let response = await this.http.post<RunnerToken>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runners/registration-token`
    );
    this.validateResponse(response.data, responseSchemas.runnerToken);
    return response.data;
  }

  async createRepoRunnerRemovalToken(owner: string, repo: string) {
    let response = await this.http.post<RunnerToken>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runners/remove-token`
    );
    this.validateResponse(response.data, responseSchemas.runnerToken);
    return response.data;
  }

  async listRunnerLabels(owner: string, repo: string, runnerId: number) {
    let response = await this.http.get<{ labels: RunnerLabel[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runners/${runnerId}/labels`
    );
    this.validateResponse(response.data, responseSchemas.labels);
    return response.data;
  }

  async addRunnerLabels(owner: string, repo: string, runnerId: number, labels: string[]) {
    let response = await this.http.post<{ labels: RunnerLabel[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runners/${runnerId}/labels`,
      { labels }
    );
    this.validateResponse(response.data, responseSchemas.labels);
    return response.data;
  }

  async removeRunnerLabel(owner: string, repo: string, runnerId: number, labelName: string) {
    let response = await this.http.delete<{ labels: RunnerLabel[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runners/${runnerId}/labels/${encodePathSegment(labelName)}`
    );
    this.validateResponse(response.data, responseSchemas.labels);
    return response.data;
  }

  async setRunnerLabels(owner: string, repo: string, runnerId: number, labels: string[]) {
    let response = await this.http.put<{ labels: RunnerLabel[] }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/runners/${runnerId}/labels`,
      { labels }
    );
    this.validateResponse(response.data, responseSchemas.labels);
    return response.data;
  }

  // ─── Self-Hosted Runners (Organization) ─────────────────────────────

  async listOrgRunners(
    org: string,
    params: { perPage?: number; page?: number; name?: string } = {}
  ) {
    let response = await this.http.get<{ total_count: number; runners: Runner[] }>(
      `/orgs/${encodePathSegment(org)}/actions/runners`,
      {
        params: {
          per_page: params.perPage ?? 30,
          page: params.page ?? 1,
          name: params.name
        }
      }
    );
    this.validateResponse(response.data, responseSchemas.runners);
    return response.data;
  }

  async getOrgRunner(org: string, runnerId: number) {
    let response = await this.http.get<Runner>(
      `/orgs/${encodePathSegment(org)}/actions/runners/${runnerId}`
    );
    this.validateResponse(response.data, responseSchemas.runner);
    return response.data;
  }

  async removeOrgRunner(org: string, runnerId: number) {
    await this.http.delete(`/orgs/${encodePathSegment(org)}/actions/runners/${runnerId}`);
  }

  async createOrgRunnerRegistrationToken(org: string) {
    let response = await this.http.post<RunnerToken>(
      `/orgs/${encodePathSegment(org)}/actions/runners/registration-token`
    );
    this.validateResponse(response.data, responseSchemas.runnerToken);
    return response.data;
  }

  async createOrgRunnerRemovalToken(org: string) {
    let response = await this.http.post<RunnerToken>(
      `/orgs/${encodePathSegment(org)}/actions/runners/remove-token`
    );
    this.validateResponse(response.data, responseSchemas.runnerToken);
    return response.data;
  }

  // ─── Permissions ─────────────────────────────────────────────────────

  async getRepoPermissions(owner: string, repo: string) {
    let response = await this.http.get<{ enabled: boolean; allowed_actions?: string }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/permissions`
    );
    this.validateResponse(response.data, responseSchemas.permissions);
    return response.data;
  }

  async setRepoPermissions(
    owner: string,
    repo: string,
    data: { enabled: boolean; allowedActions?: string }
  ) {
    await this.http.put(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/permissions`,
      {
        enabled: data.enabled,
        allowed_actions: data.allowedActions
      }
    );
  }

  async getRepoDefaultWorkflowPermissions(owner: string, repo: string) {
    let response = await this.http.get<{
      default_workflow_permissions: string;
      can_approve_pull_request_reviews: boolean;
    }>(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/permissions/workflow`
    );
    this.validateResponse(response.data, responseSchemas.workflowPermissions);
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
    await this.http.put(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/permissions/workflow`,
      {
        default_workflow_permissions: data.defaultWorkflowPermissions,
        can_approve_pull_request_reviews: data.canApprovePullRequestReviews
      }
    );
  }

  async getEnvironmentSecret(
    owner: string,
    repo: string,
    environmentName: string,
    secretName: string
  ) {
    const data = (
      await this.http.get<Secret>(
        `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/environments/${encodePathSegment(environmentName)}/secrets/${encodePathSegment(secretName)}`
      )
    ).data;
    this.validateResponse(data, responseSchemas.secret);
    return data;
  }
  async getEnvironmentVariable(
    owner: string,
    repo: string,
    environmentName: string,
    variableName: string
  ) {
    const data = (
      await this.http.get<Variable>(
        `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/environments/${encodePathSegment(environmentName)}/variables/${encodePathSegment(variableName)}`
      )
    ).data;
    this.validateResponse(data, responseSchemas.variable);
    return data;
  }
  async getSelectedActions(owner: string, repo: string) {
    const data = (
      await this.http.get<SelectedActions>(
        `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/permissions/selected-actions`
      )
    ).data;
    this.validateResponse(data, responseSchemas.selectedActions);
    return data;
  }
  async setSelectedActions(owner: string, repo: string, data: SelectedActions) {
    await this.http.put(
      `/repos/${encodePathSegment(owner)}/${encodePathSegment(repo)}/actions/permissions/selected-actions`,
      data
    );
  }
  async listOrgRunnerLabels(org: string, runnerId: number) {
    const data = (
      await this.http.get<{ labels: RunnerLabel[] }>(
        `/orgs/${encodePathSegment(org)}/actions/runners/${runnerId}/labels`
      )
    ).data;
    this.validateResponse(data, responseSchemas.labels);
    return data;
  }
  async addOrgRunnerLabels(org: string, runnerId: number, labels: string[]) {
    const data = (
      await this.http.post<{ labels: RunnerLabel[] }>(
        `/orgs/${encodePathSegment(org)}/actions/runners/${runnerId}/labels`,
        { labels }
      )
    ).data;
    this.validateResponse(data, responseSchemas.labels);
    return data;
  }
  async setOrgRunnerLabels(org: string, runnerId: number, labels: string[]) {
    const data = (
      await this.http.put<{ labels: RunnerLabel[] }>(
        `/orgs/${encodePathSegment(org)}/actions/runners/${runnerId}/labels`,
        { labels }
      )
    ).data;
    this.validateResponse(data, responseSchemas.labels);
    return data;
  }
  async removeOrgRunnerLabel(org: string, runnerId: number, labelName: string) {
    const data = (
      await this.http.delete<{ labels: RunnerLabel[] }>(
        `/orgs/${encodePathSegment(org)}/actions/runners/${runnerId}/labels/${encodePathSegment(labelName)}`
      )
    ).data;
    this.validateResponse(data, responseSchemas.labels);
    return data;
  }
}
