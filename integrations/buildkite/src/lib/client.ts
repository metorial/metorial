import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined,
  requestAxios
} from 'slates';

export interface Pipeline {
  id: string;
  slug: string;
  name: string;
  repository: string;
  web_url: string;
  builds_url: string;
  created_at: string;
  default_branch: string;
  description?: string | null;
  branch_configuration?: string | null;
  configuration?: string | null;
  running_builds_count: number;
  scheduled_builds_count: number;
  tags?: string[] | null;
  archived_at?: string | null;
  visibility?: string;
  cluster_id?: string | null;
}
export interface Job {
  id: string;
  type: string;
  state: string;
  name?: string | null;
  label?: string | null;
  exit_status?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  agent?: { name: string } | null;
  retried?: boolean;
  retried_in_job_id?: string | null;
  unblockable?: boolean;
  step_key?: string | null;
}
export interface Build {
  id: string;
  number: number;
  state: string;
  branch: string;
  commit: string;
  web_url: string;
  created_at: string;
  message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  creator?: { name: string } | null;
  env?: Record<string, string>;
  meta_data?: Record<string, unknown>;
  jobs?: Job[];
  pipeline?: { slug: string };
  blocked?: boolean;
}
export interface Agent {
  id: string;
  name: string;
  hostname: string;
  version: string;
  user_agent: string;
  connection_state: string;
  created_at: string;
  ip_address?: string | null;
  meta_data?: string[];
  job?: { id: string } | null;
  queue?: string;
}
export interface Artifact {
  id: string;
  job_id: string;
  filename: string;
  path: string;
  mime_type: string;
  file_size: number;
  sha1sum: string;
  download_url: string;
  state?: string;
}
export interface Annotation {
  id: string;
  context: string;
  style?: string | null;
  created_at: string;
  updated_at?: string;
  body_html?: string;
  priority?: number;
}
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at?: string;
}
export interface Organization {
  id: string;
  slug: string;
  name: string;
  web_url?: string;
}
export interface Cluster {
  id: string;
  name: string;
  description?: string | null;
}
export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}
export interface Pagination {
  page?: number;
  perPage?: number;
}
export interface PipelineInput {
  name?: string;
  repository?: string;
  configuration?: string;
  description?: string;
  defaultBranch?: string;
  branchConfiguration?: string;
  skipQueuedBranchBuilds?: boolean;
  cancelRunningBranchBuilds?: boolean;
  teamUuids?: string[];
  clusterUuid?: string;
  teams?: Record<string, string>;
  tags?: string[];
  visibility?: string;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private org?: string;
  pagination: { nextPage: number | null } = { nextPage: null };

  constructor(config: { token: string; organizationSlug?: string }) {
    this.org = config.organizationSlug;
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.buildkite.com/v2',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30_000
    });
  }

  private orgPath() {
    if (!this.org?.trim())
      throw createApiServiceError(
        'Choose an organizationSlug from list_organizations, or set a default organization.'
      );
    return `/organizations/${encodeURIComponent(this.org)}`;
  }
  private pipelinePath(slug: string) {
    if (!slug.trim())
      throw createApiServiceError('Choose a pipelineSlug from list_pipelines.');
    return `${this.orgPath()}/pipelines/${encodeURIComponent(slug)}`;
  }
  buildPath(slug: string, number: number) {
    if (!Number.isSafeInteger(number) || number < 1)
      throw createApiServiceError(
        'buildNumber must be a positive integer from list_builds. Use the build number, not its UUID.'
      );
    return `${this.pipelinePath(slug)}/builds/${number}`;
  }
  jobPath(slug: string, number: number, id: string) {
    if (!id.trim()) throw createApiServiceError('Choose a jobId from get_build.');
    return `${this.buildPath(slug, number)}/jobs/${encodeURIComponent(id)}`;
  }
  artifactPath(slug: string, number: number, jobId: string, artifactId: string) {
    if (!artifactId.trim())
      throw createApiServiceError('Choose an artifactId from list_artifacts.');
    return `${this.jobPath(slug, number, jobId)}/artifacts/${encodeURIComponent(artifactId)}`;
  }
  downloadUrl(path: string) {
    return `https://api.buildkite.com/v2${path}`;
  }

  private async request<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    body?: unknown,
    params?: Record<string, unknown>
  ) {
    const response = await requestAxios<T>(
      `${method.toUpperCase()} ${path}`,
      () => this.http.request<T>({ method, url: path, data: body, params }),
      (error, operation) =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Buildkite',
          reason: 'buildkite_api_error',
          operation
        })
    );
    const link = getResponseHeaderValue(response.headers, 'link');
    const next =
      typeof link === 'string' ? /<([^>]+)>;\s*rel="next"/.exec(link)?.[1] : undefined;
    let page = Number.NaN;
    if (next) {
      try {
        page = Number(new URL(next).searchParams.get('page'));
      } catch {
        throw createApiServiceError('Buildkite returned an invalid pagination link.');
      }
    }
    this.pagination = { nextPage: Number.isSafeInteger(page) && page > 0 ? page : null };
    return response.data;
  }
  private pageParams(params?: Pagination) {
    if (params?.page !== undefined && (!Number.isSafeInteger(params.page) || params.page < 1))
      throw createApiServiceError('page must be a positive integer.');
    if (
      params?.perPage !== undefined &&
      (!Number.isSafeInteger(params.perPage) || params.perPage < 1 || params.perPage > 100)
    )
      throw createApiServiceError('perPage must be an integer between 1 and 100.');
    return pickDefined({ page: params?.page, per_page: params?.perPage });
  }
  private async list<T>(path: string, params: Record<string, unknown>) {
    const data = await this.request<T[]>('get', path, undefined, params);
    if (!Array.isArray(data))
      throw createApiServiceError('Buildkite returned an invalid list response.');
    return data;
  }
  getCurrentUser() {
    return this.request<User>('get', '/user');
  }
  listOrganizations(params?: Pagination) {
    return this.list<Organization>('/organizations', this.pageParams(params));
  }
  getOrganization() {
    return this.request<Organization>('get', this.orgPath());
  }
  listPipelines(params?: Pagination) {
    return this.list<Pipeline>(`${this.orgPath()}/pipelines`, this.pageParams(params));
  }
  getPipeline(slug: string) {
    return this.request<Pipeline>('get', this.pipelinePath(slug));
  }
  private pipelineBody(data: PipelineInput) {
    if (data.teams !== undefined && data.teamUuids !== undefined)
      throw createApiServiceError('Supply teams or legacy teamUuids, not both.');
    return pickDefined({
      name: data.name,
      repository: data.repository,
      configuration: data.configuration,
      description: data.description,
      default_branch: data.defaultBranch,
      branch_configuration: data.branchConfiguration,
      skip_queued_branch_builds: data.skipQueuedBranchBuilds,
      cancel_running_branch_builds: data.cancelRunningBranchBuilds,
      team_uuids: data.teamUuids,
      teams: data.teams,
      cluster_id: data.clusterUuid,
      tags: data.tags,
      visibility: data.visibility
    });
  }
  createPipeline(data: PipelineInput & { name: string; repository: string }) {
    if (!data.configuration?.trim() || !data.clusterUuid?.trim())
      throw createApiServiceError(
        'Creating a YAML pipeline requires nonempty configuration and clusterUuid. Call list_clusters to choose a cluster.'
      );
    return this.request<Pipeline>(
      'post',
      `${this.orgPath()}/pipelines`,
      this.pipelineBody(data)
    );
  }
  updatePipeline(slug: string, data: PipelineInput) {
    const body = this.pipelineBody(data);
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one pipeline setting to update.');
    return this.request<Pipeline>('patch', this.pipelinePath(slug), body);
  }
  deletePipeline(slug: string) {
    return this.request<void>('delete', this.pipelinePath(slug));
  }
  archivePipeline(slug: string) {
    return this.request<Pipeline>('post', `${this.pipelinePath(slug)}/archive`);
  }
  unarchivePipeline(slug: string) {
    return this.request<Pipeline>('post', `${this.pipelinePath(slug)}/unarchive`);
  }
  listBuilds(
    params?: Pagination & {
      pipelineSlug?: string;
      state?: string;
      branch?: string;
      commit?: string;
      creator?: string;
      createdFrom?: string;
      createdTo?: string;
      finishedFrom?: string;
    }
  ) {
    const path = params?.pipelineSlug
      ? `${this.pipelinePath(params.pipelineSlug)}/builds`
      : `${this.orgPath()}/builds`;
    return this.list<Build>(
      path,
      pickDefined({
        ...this.pageParams(params),
        state: params?.state,
        branch: params?.branch,
        commit: params?.commit,
        creator: params?.creator,
        created_from: params?.createdFrom,
        created_to: params?.createdTo,
        finished_from: params?.finishedFrom,
        exclude_jobs: true
      })
    );
  }
  getBuild(slug: string, number: number) {
    return this.request<Build>('get', this.buildPath(slug, number));
  }
  createBuild(
    slug: string,
    data: {
      commit: string;
      branch: string;
      message?: string;
      env?: Record<string, string>;
      metaData?: Record<string, string>;
      ignorePipelineBranchFilters?: boolean;
      cleanCheckout?: boolean;
    }
  ) {
    return this.request<Build>(
      'post',
      `${this.pipelinePath(slug)}/builds`,
      pickDefined({
        commit: data.commit,
        branch: data.branch,
        message: data.message,
        env: data.env,
        meta_data: data.metaData,
        ignore_pipeline_branch_filters: data.ignorePipelineBranchFilters,
        clean_checkout: data.cleanCheckout
      })
    );
  }
  cancelBuild(slug: string, number: number) {
    return this.request<Build>('put', `${this.buildPath(slug, number)}/cancel`);
  }
  rebuildBuild(slug: string, number: number) {
    return this.request<Build>('put', `${this.buildPath(slug, number)}/rebuild`);
  }
  async getJob(slug: string, number: number, id: string) {
    return (await this.getBuild(slug, number)).jobs?.find(job => job.id === id) ?? null;
  }
  retryJob(slug: string, number: number, id: string) {
    return this.request<Job>('put', `${this.jobPath(slug, number, id)}/retry`);
  }
  unblockJob(
    slug: string,
    number: number,
    id: string,
    fields?: Record<string, string>,
    unblocker?: string
  ) {
    return this.request<Job>(
      'put',
      `${this.jobPath(slug, number, id)}/unblock`,
      pickDefined({ fields, unblocker })
    );
  }
  getJobLog(slug: string, number: number, id: string) {
    return this.request<{ content?: string; size?: number; header_times?: number[] }>(
      'get',
      `${this.jobPath(slug, number, id)}/log`
    );
  }
  async getJobLogSize(slug: string, number: number, id: string) {
    const path = `${this.jobPath(slug, number, id)}/log`;
    const response = await requestAxios<void>(
      `HEAD ${path}`,
      () => this.http.head(path),
      (error, operation) =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Buildkite',
          reason: 'buildkite_api_error',
          operation
        })
    );
    const length = getResponseHeaderValue(response.headers, 'content-length');
    const size = Number(length);
    if (length === undefined || length === '' || !Number.isSafeInteger(size) || size < 0)
      throw createApiServiceError('Buildkite returned an invalid job log size.');
    return size;
  }
  getJobEnvironment(slug: string, number: number, id: string) {
    return this.request<{ env?: Record<string, string> }>(
      'get',
      `${this.jobPath(slug, number, id)}/env`
    );
  }
  listAgents(params?: Pagination & { name?: string }) {
    return this.list<Agent>(
      `${this.orgPath()}/agents`,
      pickDefined({ ...this.pageParams(params), name: params?.name })
    );
  }
  getAgent(id: string) {
    return this.request<Agent>('get', `${this.orgPath()}/agents/${encodeURIComponent(id)}`);
  }
  stopAgent(id: string, force?: boolean) {
    return this.request<void>(
      'put',
      `${this.orgPath()}/agents/${encodeURIComponent(id)}/stop`,
      { force: force ?? false }
    );
  }
  listArtifacts(
    slug: string,
    number: number,
    params?: Pagination & { state?: string; path?: string }
  ) {
    return this.list<Artifact>(
      `${this.buildPath(slug, number)}/artifacts`,
      pickDefined({ ...this.pageParams(params), state: params?.state, path: params?.path })
    );
  }
  getArtifact(slug: string, number: number, jobId: string, id: string) {
    return this.request<Artifact>('get', this.artifactPath(slug, number, jobId, id));
  }
  listAnnotations(slug: string, number: number, params?: Pagination) {
    return this.list<Annotation>(
      `${this.buildPath(slug, number)}/annotations`,
      this.pageParams(params)
    );
  }
  createAnnotation(
    slug: string,
    number: number,
    data: { body: string; context?: string; style?: string; append?: boolean }
  ) {
    return this.request<Annotation>(
      'post',
      `${this.buildPath(slug, number)}/annotations`,
      pickDefined(data)
    );
  }
  deleteAnnotation(slug: string, number: number, id: string) {
    return this.request<void>(
      'delete',
      `${this.buildPath(slug, number)}/annotations/${encodeURIComponent(id)}`
    );
  }
  listTeams(params?: Pagination) {
    return this.list<Team>(`${this.orgPath()}/teams`, this.pageParams(params));
  }
  listClusters(params?: Pagination) {
    return this.list<Cluster>(`${this.orgPath()}/clusters`, this.pageParams(params));
  }
}

export const createClient = (ctx: {
  auth: { token: string };
  config: { organizationSlug?: string };
  input: { organizationSlug?: string };
}) =>
  new Client({
    token: ctx.auth.token,
    organizationSlug: ctx.input.organizationSlug ?? ctx.config.organizationSlug
  });
