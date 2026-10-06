import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import type {
  Branch,
  Build,
  Cache,
  Cron,
  EnvVar,
  Job,
  Lint,
  Log,
  Pagination,
  Repository,
  Request,
  Setting,
  User
} from './types';

export const hostedBaseUrl = 'https://api.travis-ci.com';
export function legacyBaseUrl(config: unknown): string | undefined {
  if (
    config &&
    typeof config === 'object' &&
    'baseUrl' in config &&
    typeof config.baseUrl === 'string'
  )
    return config.baseUrl;
  return undefined;
}
export function normalizeBaseUrl(value = hostedBaseUrl): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Provide a valid Travis CI API URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw createApiServiceError(
      'Use an HTTPS Travis CI API URL without credentials, query parameters, or a fragment.'
    );
  if (url.hostname === 'travis-ci.org' || url.hostname.endsWith('.travis-ci.org'))
    throw createApiServiceError(
      'Travis CI .org was retired. Use the .com API or your Enterprise API endpoint.'
    );
  return url.toString().replace(/\/+$/, '');
}
export function requireInput(value: string | undefined, label: string): string {
  if (value === undefined || !value.trim())
    throw createApiServiceError(`${label} is required for this action.`);
  return value;
}
function numericId(value: string): string {
  if (!/^\d+$/.test(value) || Number(value) <= 0 || !Number.isSafeInteger(Number(value)))
    throw createApiServiceError('Provide a positive numeric Travis CI resource ID.');
  return value;
}
export function pagination(result: Pagination) {
  const page = result['@pagination'];
  return {
    totalCount: page?.count,
    hasMore: page?.is_last === undefined ? undefined : !page.is_last,
    nextOffset: page?.next?.offset
  };
}

export class TravisCIClient {
  private token: string;
  private baseUrl: string;
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { token: string; baseUrl?: string }) {
    this.token = params.token.trim();
    this.baseUrl = normalizeBaseUrl(params.baseUrl);
    if (!params.token.trim())
      throw createApiServiceError('A Travis CI API token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: { value: `token ${this.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Travis CI',
          reason: 'travis_ci_api_error',
          extractMessage: () =>
            'The request was rejected. Check the API endpoint, account permissions, resource IDs, and build credits.'
        }),
      headers: {
        'Travis-API-Version': '3',
        'Content-Type': 'application/json'
      }
    });
  }

  private validatePagination(params?: { limit?: number; offset?: number }) {
    if (params?.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1))
      throw createApiServiceError('limit must be a positive integer.');
    if (
      params?.offset !== undefined &&
      (!Number.isInteger(params.offset) || params.offset < 0)
    )
      throw createApiServiceError('offset must be a non-negative integer.');
  }

  private encodeSlug(slug: string): string {
    return encodeURIComponent(slug);
  }

  private repoPath(repoSlugOrId: string): string {
    if (/^\d+$/.test(repoSlugOrId)) {
      return `/repo/${numericId(repoSlugOrId)}`;
    }
    requireInput(repoSlugOrId, 'repoSlugOrId');
    return `/repo/${this.encodeSlug(repoSlugOrId)}`;
  }

  // ---- Repositories ----

  async getRepository(repoSlugOrId: string): Promise<Repository> {
    let response = await this.axios.get<Repository>(this.repoPath(repoSlugOrId), {
      params: { include: 'repository.default_branch,repository.owner' }
    });
    return response.data;
  }

  async listRepositories(params?: {
    ownerLogin?: string;
    active?: boolean;
    starred?: boolean;
    isPrivate?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: string;
  }): Promise<Pagination & { repositories?: Repository[] }> {
    this.validatePagination(params);
    let url = params?.ownerLogin
      ? `/owner/${encodeURIComponent(params.ownerLogin)}/repos`
      : '/repos';
    let query: Record<string, unknown> = {
      include: 'repository.description,repository.starred,repository.default_branch'
    };
    if (params?.active !== undefined) query.active = params.active;
    if (params?.starred !== undefined) query['repository.starred'] = params.starred;
    if (params?.isPrivate !== undefined) query.private = params.isPrivate;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    if (params?.sortBy) query.sort_by = params.sortBy;
    let response = await this.axios.get<Pagination & { repositories?: Repository[] }>(url, {
      params: query
    });
    return response.data;
  }

  async activateRepository(repoSlugOrId: string): Promise<Repository> {
    await this.axios.post(`${this.repoPath(repoSlugOrId)}/activate`);
    return this.getRepository(repoSlugOrId);
  }

  async deactivateRepository(repoSlugOrId: string): Promise<Repository> {
    await this.axios.post(`${this.repoPath(repoSlugOrId)}/deactivate`);
    return this.getRepository(repoSlugOrId);
  }

  async starRepository(repoSlugOrId: string): Promise<Repository> {
    await this.axios.post(`${this.repoPath(repoSlugOrId)}/star`);
    return this.getRepository(repoSlugOrId);
  }

  async unstarRepository(repoSlugOrId: string): Promise<Repository> {
    await this.axios.post(`${this.repoPath(repoSlugOrId)}/unstar`);
    return this.getRepository(repoSlugOrId);
  }

  // ---- Builds ----

  async getBuild(buildId: string): Promise<Build> {
    let response = await this.axios.get<Build>(`/build/${numericId(buildId)}`, {
      params: { include: 'build.commit,build.branch,build.repository,build.jobs' }
    });
    return response.data;
  }

  async listBuilds(params?: {
    repoSlugOrId?: string;
    branchName?: string;
    state?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
  }): Promise<Pagination & { builds?: Build[] }> {
    this.validatePagination(params);
    let url = params?.repoSlugOrId
      ? `${this.repoPath(params.repoSlugOrId)}/builds`
      : '/builds';
    let query: Record<string, unknown> = {
      include: 'build.commit,build.branch,build.repository'
    };
    if (params?.branchName) query['branch.name'] = params.branchName;
    if (params?.state) query['build.state'] = params.state;
    if (params?.eventType) query['build.event_type'] = params.eventType;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    if (params?.sortBy) query.sort_by = params.sortBy;
    let response = await this.axios.get<Pagination & { builds?: Build[] }>(url, {
      params: query
    });
    return response.data;
  }

  async cancelBuild(buildId: string): Promise<Build> {
    await this.axios.post(`/build/${numericId(buildId)}/cancel`);
    return this.getBuild(buildId);
  }

  async restartBuild(buildId: string): Promise<Build> {
    await this.axios.post(`/build/${numericId(buildId)}/restart`);
    return this.getBuild(buildId);
  }

  // ---- Trigger Build (Requests) ----

  async triggerBuild(
    repoSlugOrId: string,
    params: {
      message?: string;
      branch?: string;
      config?: Record<string, unknown>;
      mergeMode?: string;
      sha?: string;
    }
  ): Promise<
    {
      request?: Request;
      remaining_requests?: number;
      repository?: { slug?: string };
    } & Partial<Request>
  > {
    let body = {
      request: {
        message: params.message,
        branch: params.branch,
        config: params.config,
        merge_mode: params.mergeMode,
        sha: params.sha
      }
    };
    let response = await this.axios.post<
      {
        request?: Request;
        remaining_requests?: number;
        repository?: { slug?: string };
      } & Partial<Request>
    >(`${this.repoPath(repoSlugOrId)}/requests`, body);
    return response.data;
  }

  // ---- Build Requests ----

  async listRequests(
    repoSlugOrId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Pagination & { requests?: Request[] }> {
    this.validatePagination(params);
    let query: Record<string, unknown> = {
      include: 'request.builds,request.branch_name,request.event_type,request.created_at'
    };
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    let response = await this.axios.get<Pagination & { requests?: Request[] }>(
      `${this.repoPath(repoSlugOrId)}/requests`,
      {
        params: query
      }
    );
    return response.data;
  }

  // ---- Jobs ----

  async getJob(jobId: string): Promise<Job> {
    let response = await this.axios.get<Job>(`/job/${numericId(jobId)}`, {
      params: { include: 'job.build,job.repository' }
    });
    return response.data;
  }

  async cancelJob(jobId: string): Promise<Job> {
    await this.axios.post(`/job/${numericId(jobId)}/cancel`);
    return this.getJob(jobId);
  }

  async restartJob(jobId: string): Promise<Job> {
    await this.axios.post(`/job/${numericId(jobId)}/restart`);
    return this.getJob(jobId);
  }

  async debugJob(jobId: string): Promise<Job> {
    await this.axios.post(`/job/${numericId(jobId)}/debug`);
    return this.getJob(jobId);
  }

  // ---- Logs ----

  async getJobLog(jobId: string): Promise<Log> {
    let response = await this.axios.get<Log>(`/job/${numericId(jobId)}/log`);
    return response.data;
  }

  async getJobLogText(jobId: string): Promise<string> {
    let response = await this.axios.get<string>(`/job/${numericId(jobId)}/log`, {
      responseType: 'text',
      headers: { Accept: 'text/plain' }
    });
    return response.data;
  }

  jobLogDownload(jobId: string, format: 'text' | 'json') {
    const base = this.baseUrl;
    const token = `token ${this.token}`;
    return {
      url: `${base}/job/${numericId(jobId)}/log`,
      headers: {
        Authorization: token,
        'Travis-API-Version': '3',
        Accept: format === 'text' ? 'text/plain' : 'application/json'
      }
    };
  }

  async deleteJobLog(jobId: string): Promise<void> {
    await this.axios.delete(`/job/${numericId(jobId)}/log`);
  }

  // ---- Environment Variables ----

  async listEnvVars(repoSlugOrId: string): Promise<{ env_vars?: EnvVar[] }> {
    let response = await this.axios.get<{ env_vars?: EnvVar[] }>(
      `${this.repoPath(repoSlugOrId)}/env_vars`
    );
    return response.data;
  }

  async getEnvVar(repoSlugOrId: string, envVarId: string): Promise<EnvVar> {
    let response = await this.axios.get<EnvVar>(
      `${this.repoPath(repoSlugOrId)}/env_var/${encodeURIComponent(requireInput(envVarId, 'envVarId'))}`
    );
    return response.data;
  }

  async createEnvVar(
    repoSlugOrId: string,
    params: {
      name: string;
      value: string;
      isPublic?: boolean;
      branch?: string;
    }
  ): Promise<EnvVar> {
    let body: Record<string, unknown> = {
      'env_var.name': params.name,
      'env_var.value': params.value,
      'env_var.public': params.isPublic ?? false
    };
    if (params.branch) body['env_var.branch'] = params.branch;
    let response = await this.axios.post<EnvVar>(
      `${this.repoPath(repoSlugOrId)}/env_vars`,
      body
    );
    return response.data;
  }

  async updateEnvVar(
    repoSlugOrId: string,
    envVarId: string,
    params: {
      name?: string;
      value?: string;
      isPublic?: boolean;
      branch?: string;
    }
  ): Promise<EnvVar> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body['env_var.name'] = params.name;
    if (params.value !== undefined) body['env_var.value'] = params.value;
    if (params.isPublic !== undefined) body['env_var.public'] = params.isPublic;
    if (params.branch !== undefined) body['env_var.branch'] = params.branch;
    let response = await this.axios.patch<EnvVar>(
      `${this.repoPath(repoSlugOrId)}/env_var/${encodeURIComponent(requireInput(envVarId, 'envVarId'))}`,
      body
    );
    return response.data;
  }

  async deleteEnvVar(repoSlugOrId: string, envVarId: string): Promise<void> {
    await this.axios.delete(
      `${this.repoPath(repoSlugOrId)}/env_var/${encodeURIComponent(requireInput(envVarId, 'envVarId'))}`
    );
  }

  // ---- Cron Jobs ----

  async listCrons(
    repoSlugOrId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Pagination & { crons?: Cron[] }> {
    this.validatePagination(params);
    let query: Record<string, unknown> = { include: 'cron.branch' };
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    let response = await this.axios.get<Pagination & { crons?: Cron[] }>(
      `${this.repoPath(repoSlugOrId)}/crons`,
      {
        params: query
      }
    );
    return response.data;
  }

  async getCron(cronId: string): Promise<Cron> {
    let response = await this.axios.get<Cron>(`/cron/${numericId(cronId)}`, {
      params: { include: 'cron.branch' }
    });
    return response.data;
  }

  async createCron(
    repoSlugOrId: string,
    branchName: string,
    params: {
      interval: 'daily' | 'weekly' | 'monthly';
      dontRunIfRecentBuildExists?: boolean;
    }
  ): Promise<Cron> {
    let body: Record<string, unknown> = {
      'cron.interval': params.interval
    };
    if (params.dontRunIfRecentBuildExists !== undefined) {
      body['cron.dont_run_if_recent_build_exists'] = params.dontRunIfRecentBuildExists;
    }
    let response = await this.axios.post<Cron>(
      `${this.repoPath(repoSlugOrId)}/branch/${encodeURIComponent(branchName)}/cron`,
      body
    );
    return response.data;
  }

  async deleteCron(cronId: string): Promise<void> {
    await this.axios.delete(`/cron/${numericId(cronId)}`);
  }

  // ---- Caches ----

  async listCaches(
    repoSlugOrId: string,
    params?: {
      branch?: string;
      match?: string;
    }
  ): Promise<{ caches?: Cache[] }> {
    let query: Record<string, unknown> = {};
    if (params?.branch) query.branch = params.branch;
    if (params?.match) query.match = params.match;
    let response = await this.axios.get<{ caches?: Cache[] }>(
      `${this.repoPath(repoSlugOrId)}/caches`,
      {
        params: query
      }
    );
    return response.data;
  }

  async deleteCaches(
    repoSlugOrId: string,
    params?: {
      branch?: string;
      match?: string;
    }
  ): Promise<void> {
    let query: Record<string, unknown> = {};
    if (params?.branch) query.branch = params.branch;
    if (params?.match) query.match = params.match;
    await this.axios.delete(`${this.repoPath(repoSlugOrId)}/caches`, { params: query });
  }

  // ---- Branches ----

  async getBranch(repoSlugOrId: string, branchName: string): Promise<Branch> {
    let response = await this.axios.get<Branch>(
      `${this.repoPath(repoSlugOrId)}/branch/${encodeURIComponent(branchName)}`,
      { params: { include: 'branch.last_build' } }
    );
    return response.data;
  }

  async listBranches(
    repoSlugOrId: string,
    params?: {
      existsOnGithub?: boolean;
      limit?: number;
      offset?: number;
      sortBy?: string;
    }
  ): Promise<Pagination & { branches?: Branch[] }> {
    this.validatePagination(params);
    let query: Record<string, unknown> = { include: 'branch.last_build' };
    if (params?.existsOnGithub !== undefined) query.exists_on_github = params.existsOnGithub;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    if (params?.sortBy) query.sort_by = params.sortBy;
    let response = await this.axios.get<Pagination & { branches?: Branch[] }>(
      `${this.repoPath(repoSlugOrId)}/branches`,
      {
        params: query
      }
    );
    return response.data;
  }

  // ---- User ----

  async getCurrentUser(): Promise<User> {
    let response = await this.axios.get<User>('/user');
    return response.data;
  }

  async getUser(userId: string): Promise<User> {
    let response = await this.axios.get<User>(`/user/${numericId(userId)}`);
    return response.data;
  }

  async syncUser(userId: string): Promise<User> {
    await this.axios.post(`/user/${numericId(userId)}/sync`);
    return this.getUser(userId);
  }

  async getRequest(repoSlugOrId: string, requestId: string): Promise<Request> {
    return (
      await this.axios.get<Request>(
        `${this.repoPath(repoSlugOrId)}/request/${numericId(requestId)}`,
        { params: { include: 'request.builds' } }
      )
    ).data;
  }
  async listSettings(repoSlugOrId: string): Promise<{ settings: Setting[] }> {
    return (
      await this.axios.get<{ settings: Setting[] }>(`${this.repoPath(repoSlugOrId)}/settings`)
    ).data;
  }
  async getSetting(repoSlugOrId: string, name: string): Promise<Setting> {
    return (
      await this.axios.get<Setting>(
        `${this.repoPath(repoSlugOrId)}/setting/${encodeURIComponent(name)}`
      )
    ).data;
  }
  async updateSetting(
    repoSlugOrId: string,
    name: string,
    value: boolean | number
  ): Promise<Setting> {
    await this.axios.patch(
      `${this.repoPath(repoSlugOrId)}/setting/${encodeURIComponent(name)}`,
      { 'setting.value': value }
    );
    return this.getSetting(repoSlugOrId, name);
  }

  // ---- Lint ----

  async lintTravisYml(content: string): Promise<Lint> {
    let response = await this.axios.post<Lint>('/lint', content, {
      headers: { 'Content-Type': 'text/yaml' }
    });
    return response.data;
  }
}
