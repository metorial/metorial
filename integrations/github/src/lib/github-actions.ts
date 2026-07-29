import { createApiServiceError } from 'slates';
import { GitHubClient, type GitHubClientConfig } from './client';

export type GitHubWorkflowResponse = {
  id: number;
  name?: string;
  path?: string;
  state?: string;
  html_url?: string;
  badge_url?: string;
  created_at?: string;
  updated_at?: string;
};

export type GitHubWorkflowRunResponse = {
  id: number;
  name?: string | null;
  status?: string | null;
  conclusion?: string | null;
  head_branch?: string | null;
  head_sha?: string;
  event?: string;
  html_url?: string;
  created_at?: string;
  updated_at?: string;
};

export type GitHubWorkflowJobResponse = {
  id: number;
  run_id?: number;
  name?: string;
  status?: string;
  conclusion?: string | null;
  html_url?: string;
  started_at?: string | null;
  completed_at?: string | null;
  runner_name?: string | null;
};

export type GitHubWorkflowArtifactResponse = {
  id: number;
  name?: string;
  size_in_bytes?: number;
  expired?: boolean;
  created_at?: string;
  expires_at?: string;
  archive_download_url?: string;
  workflow_run?: {
    id?: number;
  };
};

export type GitHubWorkflowRunUsageResponse = {
  run_duration_ms?: number;
  billable?: Record<
    string,
    {
      total_ms?: number;
      jobs?: number;
      job_runs?: Array<{
        job_id?: number;
        duration_ms?: number;
      }>;
    }
  >;
};

type Pagination = {
  page?: number;
  perPage?: number;
};

type WorkflowRunFilters = Pagination & {
  actor?: string;
  branch?: string;
  event?: string;
  status?: string;
};

type WorkflowJobFilters = Pagination & {
  filter?: 'latest' | 'all';
};

const encode = (value: string | number) => encodeURIComponent(String(value));

const repositoryPath = (owner: string, repo: string) =>
  `/repos/${encode(owner)}/${encode(repo)}`;

const positiveInteger = (value: number, field: string) => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw createApiServiceError(`${field} must be a positive integer.`, {
      reason: `github_actions_${field}_invalid`
    });
  }
  return value;
};

const paginationQuery = ({ page, perPage }: Pagination) => ({
  ...(page !== undefined ? { page } : {}),
  ...(perPage !== undefined ? { per_page: perPage } : {})
});

const contentType = (value: string | undefined, fallback: string) =>
  value?.split(';', 1)[0]?.trim() || fallback;

const sanitizeFileName = (value: string) => {
  const sanitized = value
    .replaceAll('\\', '-')
    .replaceAll('/', '-')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'download';
};

const contentDispositionFileName = (value: string | undefined) => {
  if (!value) return undefined;

  const encodedMatch = value.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].trim());
    } catch {
      return encodedMatch[1].trim();
    }
  }

  const match = value.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  return (match?.[1] ?? match?.[2])?.trim();
};

export const parsePositiveResourceId = (value: string, method: string) => {
  if (!/^[1-9]\d*$/.test(value)) {
    throw createApiServiceError(`resource_id must be a positive integer for ${method}.`, {
      reason: 'github_actions_resource_id_invalid'
    });
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw createApiServiceError(`resource_id must be a safe positive integer for ${method}.`, {
      reason: 'github_actions_resource_id_invalid'
    });
  }
  return parsed;
};

export const resolveDownloadFileName = (disposition: string | undefined, fallback: string) =>
  sanitizeFileName(contentDispositionFileName(disposition) ?? fallback);

export const normalizeDownloadMimeType = (value: string | undefined, fallback: string) =>
  contentType(value, fallback);

export const tailWorkflowLog = (content: string, requestedLines: number | undefined) => {
  const tailLines =
    requestedLines !== undefined && Number.isSafeInteger(requestedLines) && requestedLines > 0
      ? requestedLines
      : 500;
  const normalized = content.replace(/\r\n?/g, '\n');
  const hadTrailingNewline = normalized.endsWith('\n');
  const lines = normalized.split('\n');
  if (hadTrailingNewline) lines.pop();

  const selected = lines.slice(-tailLines);
  const text = `${selected.join('\n')}${hadTrailingNewline && selected.length > 0 ? '\n' : ''}`;
  return {
    text,
    totalLines: lines.length,
    returnedLines: selected.length,
    truncated: lines.length > selected.length,
    tailLines
  };
};

export class GitHubActionsClient {
  private client: GitHubClient;

  constructor(config: GitHubClientConfig) {
    this.client = new GitHubClient(config);
  }

  private actionsPath(owner: string, repo: string) {
    return `${repositoryPath(owner, repo)}/actions`;
  }

  private repositoryApiUrl(owner: string, repo: string) {
    const repositoryUrl = new URL(this.client.getRepositoryHtmlUrl(owner, repo));
    const apiBase =
      repositoryUrl.origin === 'https://github.com'
        ? 'https://api.github.com'
        : `${repositoryUrl.origin}/api/v3`;
    return `${apiBase}${repositoryPath(owner, repo)}`;
  }

  async listWorkflows(owner: string, repo: string, pagination: Pagination) {
    return await this.client.requestRest<{
      total_count?: number;
      workflows?: GitHubWorkflowResponse[];
    }>({
      method: 'GET',
      path: `${this.actionsPath(owner, repo)}/workflows`,
      operation: 'list GitHub Actions workflows',
      reason: 'github_actions_list_workflows_failed',
      query: paginationQuery(pagination)
    });
  }

  async listWorkflowRuns(
    owner: string,
    repo: string,
    resourceId: string | undefined,
    filters: WorkflowRunFilters
  ) {
    const workflowPath = resourceId === undefined ? '' : `/workflows/${encode(resourceId)}`;
    return await this.client.requestRest<{
      total_count?: number;
      workflow_runs?: GitHubWorkflowRunResponse[];
    }>({
      method: 'GET',
      path: `${this.actionsPath(owner, repo)}${workflowPath}/runs`,
      operation: 'list GitHub Actions workflow runs',
      reason: 'github_actions_list_workflow_runs_failed',
      query: {
        ...paginationQuery(filters),
        ...(filters.actor !== undefined ? { actor: filters.actor } : {}),
        ...(filters.branch !== undefined ? { branch: filters.branch } : {}),
        ...(filters.event !== undefined ? { event: filters.event } : {}),
        ...(filters.status !== undefined ? { status: filters.status } : {})
      }
    });
  }

  async listWorkflowJobs(
    owner: string,
    repo: string,
    runId: number,
    filters: WorkflowJobFilters
  ) {
    positiveInteger(runId, 'run_id');
    return await this.client.requestRest<{
      total_count?: number;
      jobs?: GitHubWorkflowJobResponse[];
    }>({
      method: 'GET',
      path: `${this.actionsPath(owner, repo)}/runs/${runId}/jobs`,
      operation: 'list GitHub Actions workflow jobs',
      reason: 'github_actions_list_workflow_jobs_failed',
      query: {
        ...paginationQuery(filters),
        ...(filters.filter !== undefined ? { filter: filters.filter } : {})
      }
    });
  }

  async listAllLatestWorkflowJobs(owner: string, repo: string, runId: number) {
    const jobs: GitHubWorkflowJobResponse[] = [];
    let page = 1;

    while (true) {
      const response = await this.listWorkflowJobs(owner, repo, runId, {
        filter: 'latest',
        page,
        perPage: 100
      });
      const pageJobs = response.jobs ?? [];
      jobs.push(...pageJobs);
      if (pageJobs.length < 100) return jobs;
      page += 1;
    }
  }

  async listWorkflowRunArtifacts(
    owner: string,
    repo: string,
    runId: number,
    pagination: Pagination
  ) {
    positiveInteger(runId, 'run_id');
    return await this.client.requestRest<{
      total_count?: number;
      artifacts?: GitHubWorkflowArtifactResponse[];
    }>({
      method: 'GET',
      path: `${this.actionsPath(owner, repo)}/runs/${runId}/artifacts`,
      operation: 'list GitHub Actions workflow run artifacts',
      reason: 'github_actions_list_workflow_run_artifacts_failed',
      query: paginationQuery(pagination)
    });
  }

  async getWorkflow(owner: string, repo: string, workflowId: string) {
    return await this.client.requestRest<GitHubWorkflowResponse>({
      method: 'GET',
      path: `${this.actionsPath(owner, repo)}/workflows/${encode(workflowId)}`,
      operation: 'get a GitHub Actions workflow',
      reason: 'github_actions_get_workflow_failed'
    });
  }

  async getWorkflowRun(owner: string, repo: string, runId: number) {
    positiveInteger(runId, 'run_id');
    return await this.client.requestRest<GitHubWorkflowRunResponse>({
      method: 'GET',
      path: `${this.actionsPath(owner, repo)}/runs/${runId}`,
      operation: 'get a GitHub Actions workflow run',
      reason: 'github_actions_get_workflow_run_failed'
    });
  }

  async getWorkflowJob(owner: string, repo: string, jobId: number) {
    positiveInteger(jobId, 'job_id');
    return await this.client.requestRest<GitHubWorkflowJobResponse>({
      method: 'GET',
      path: `${this.actionsPath(owner, repo)}/jobs/${jobId}`,
      operation: 'get a GitHub Actions workflow job',
      reason: 'github_actions_get_workflow_job_failed'
    });
  }

  async getWorkflowRunUsage(owner: string, repo: string, runId: number) {
    positiveInteger(runId, 'run_id');
    return await this.client.requestRest<GitHubWorkflowRunUsageResponse>({
      method: 'GET',
      path: `${this.actionsPath(owner, repo)}/runs/${runId}/timing`,
      operation: 'get GitHub Actions workflow run usage',
      reason: 'github_actions_get_workflow_run_usage_failed'
    });
  }

  workflowRunLogsUrl(owner: string, repo: string, runId: number) {
    positiveInteger(runId, 'run_id');
    return `${this.repositoryApiUrl(owner, repo)}/actions/runs/${runId}/logs`;
  }

  workflowJobLogsUrl(owner: string, repo: string, jobId: number) {
    positiveInteger(jobId, 'job_id');
    return `${this.repositoryApiUrl(owner, repo)}/actions/jobs/${jobId}/logs`;
  }

  async downloadWorkflowArtifact(owner: string, repo: string, artifactId: number) {
    positiveInteger(artifactId, 'artifact_id');
    return await this.client.downloadContent({
      path: `${this.actionsPath(owner, repo)}/artifacts/${artifactId}/zip`,
      operation: 'download a GitHub Actions workflow artifact',
      reason: 'github_actions_download_artifact_failed',
      mode: 'binary'
    });
  }

  async downloadWorkflowJobLogs(owner: string, repo: string, jobId: number) {
    positiveInteger(jobId, 'job_id');
    return await this.client.downloadContent({
      path: `${this.actionsPath(owner, repo)}/jobs/${jobId}/logs`,
      operation: 'download GitHub Actions workflow job logs',
      reason: 'github_actions_download_job_logs_failed',
      mode: 'text'
    });
  }

  async runWorkflow(
    owner: string,
    repo: string,
    workflowId: string,
    ref: string,
    inputs: Record<string, string | number | boolean> | undefined
  ) {
    await this.client.requestRest<unknown, Record<string, unknown>>({
      method: 'POST',
      path: `${this.actionsPath(owner, repo)}/workflows/${encode(workflowId)}/dispatches`,
      operation: 'dispatch a GitHub Actions workflow',
      reason: 'github_actions_run_workflow_failed',
      body: {
        ref,
        ...(inputs !== undefined ? { inputs } : {})
      }
    });
  }

  async rerunWorkflowRun(owner: string, repo: string, runId: number) {
    positiveInteger(runId, 'run_id');
    await this.client.requestRest<unknown>({
      method: 'POST',
      path: `${this.actionsPath(owner, repo)}/runs/${runId}/rerun`,
      operation: 'rerun a GitHub Actions workflow run',
      reason: 'github_actions_rerun_workflow_run_failed'
    });
  }

  async rerunFailedJobs(owner: string, repo: string, runId: number) {
    positiveInteger(runId, 'run_id');
    await this.client.requestRest<unknown>({
      method: 'POST',
      path: `${this.actionsPath(owner, repo)}/runs/${runId}/rerun-failed-jobs`,
      operation: 'rerun failed GitHub Actions workflow jobs',
      reason: 'github_actions_rerun_failed_jobs_failed'
    });
  }

  async cancelWorkflowRun(owner: string, repo: string, runId: number) {
    positiveInteger(runId, 'run_id');
    await this.client.requestRest<unknown>({
      method: 'POST',
      path: `${this.actionsPath(owner, repo)}/runs/${runId}/cancel`,
      operation: 'cancel a GitHub Actions workflow run',
      reason: 'github_actions_cancel_workflow_run_failed'
    });
  }

  async deleteWorkflowRunLogs(owner: string, repo: string, runId: number) {
    positiveInteger(runId, 'run_id');
    await this.client.requestRest<unknown>({
      method: 'DELETE',
      path: `${this.actionsPath(owner, repo)}/runs/${runId}/logs`,
      operation: 'delete GitHub Actions workflow run logs',
      reason: 'github_actions_delete_workflow_run_logs_failed'
    });
  }
}
