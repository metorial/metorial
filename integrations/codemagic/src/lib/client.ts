import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface StartBuildParams {
  appId: string;
  workflowId: string;
  branch?: string;
  tag?: string;
  labels?: string[];
  environment?: {
    variables?: Record<string, string>;
    groups?: string[];
    softwareVersions?: {
      xcode?: string;
      flutter?: string;
      cocoapods?: string;
      [key: string]: string | undefined;
    };
  };
  instanceType?: string;
}

export interface BuildResponse {
  _id: string;
  index?: number;
  appId: string;
  status: string;
  version?: string | null;
  branch?: string;
  tag?: string;
  startedAt?: string | null;
  startedBy?: string | null;
  createdAt?: string;
  finishedAt?: string | null;
  workflowId?: string | null;
  fileWorkflowId?: string | null;
  instanceType?: string;
  commit?: {
    authorAvatarUrl?: string;
    authorEmail?: string;
    authorName?: string;
    branch?: string;
    tag?: string;
    commitMessage?: string;
    hash?: string;
    url?: string;
  };
  config?: {
    name?: string;
    buildSettings?: Record<string, unknown>;
  };
  artefacts?: Array<{
    md5?: string;
    name?: string;
    size?: number;
    type?: string;
    url?: string;
    versionName?: string;
  }>;
  buildActions?: Array<{
    name?: string;
    status?: string;
    startedAt?: string;
    finishedAt?: string;
  }>;
  message?: string | null;
  labels?: string[];
}

export interface ApplicationResponse {
  _id: string;
  appName: string;
  workflowIds?: string[];
  workflows?: Record<string, { name: string }>;
  branches?: string[];
  repository?: {
    url?: string;
    provider?: string;
  };
  teamId?: string;
}

export interface CacheResponse {
  _id: string;
  appId: string;
  lastUsed?: string;
  size?: number;
  workflowId?: string;
}

export interface AddAppParams {
  repositoryUrl: string;
  teamId?: string;
}

export interface AddPrivateAppParams {
  repositoryUrl: string;
  sshKey: {
    data: string;
    passphrase?: string | null;
  };
  projectType?: string;
  teamId?: string;
}

export interface VariableGroupVariable {
  name: string;
  value: string;
}

export interface AddVariablesParams {
  variableGroupId: string;
  secure?: boolean;
  variables: VariableGroupVariable[];
}

export interface CacheDeletionResponse {
  caches: string[];
  message?: string;
}

export interface CurrentUserResponse {
  id: string;
  avatar_url: string | null;
  permissions: Record<string, string[]>;
}

export interface VariableGroupsResponse {
  data: Array<{ id: string; name: string }>;
  page_size: number;
  current_page: number;
  total_pages: number;
}

export let getArtifactDownloadUrl = (artifactUrl: string): URL => {
  let url: URL;
  try {
    url = new URL(artifactUrl);
  } catch {
    throw createApiServiceError('Provide the authenticated artifact URL from get_build.');
  }
  if (
    url.origin !== 'https://api.codemagic.io' ||
    !url.pathname.startsWith('/artifacts/') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/public-url') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw createApiServiceError(
      'Provide an authenticated https://api.codemagic.io/artifacts/ URL from get_build.'
    );
  }
  return url;
};

export class CodemagicClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;
  private apiV3: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'A Codemagic API token is required. Reconnect your account.'
      );
    }
    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'Codemagic',
        reason: 'codemagic_api_error'
      });
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.codemagic.io',
      authHeader: { name: 'x-auth-token', value: config.token },
      errorAdapter
    });

    this.apiV3 = createAuthenticatedAxios({
      baseURL: 'https://codemagic.io/api/v3',
      authHeader: { name: 'x-auth-token', value: config.token },
      headers: { Accept: 'application/json' },
      errorAdapter
    });
  }

  // --- Applications ---

  async listApplications(): Promise<ApplicationResponse[]> {
    let response = await this.api.get('/apps');
    return response.data.applications;
  }

  async getApplication(appId: string): Promise<ApplicationResponse> {
    let response = await this.api.get(`/apps/${encodeURIComponent(appId)}`);
    return response.data.application;
  }

  async addApplication(params: AddAppParams): Promise<ApplicationResponse> {
    let response = await this.api.post('/apps', {
      repositoryUrl: params.repositoryUrl,
      ...(params.teamId ? { teamId: params.teamId } : {})
    });
    return response.data;
  }

  async addPrivateApplication(params: AddPrivateAppParams): Promise<ApplicationResponse> {
    let response = await this.api.post('/apps/new', {
      repositoryUrl: params.repositoryUrl,
      sshKey: params.sshKey,
      ...(params.projectType ? { projectType: params.projectType } : {}),
      ...(params.teamId ? { teamId: params.teamId } : {})
    });
    return response.data.application;
  }

  // --- Builds ---

  async startBuild(params: StartBuildParams): Promise<{ buildId: string }> {
    if (
      (params.branch !== undefined && !params.branch.trim()) ||
      (params.tag !== undefined && !params.tag.trim()) ||
      (params.branch !== undefined) === (params.tag !== undefined)
    ) {
      throw createApiServiceError(
        'Provide exactly one non-empty branch or tag to start a build.'
      );
    }
    let body: Record<string, unknown> = {
      appId: params.appId,
      workflowId: params.workflowId
    };

    if (params.branch) body.branch = params.branch;
    if (params.tag) body.tag = params.tag;
    if (params.labels && params.labels.length > 0) body.labels = params.labels;
    if (params.instanceType) body.instanceType = params.instanceType;

    if (params.environment) {
      let env: Record<string, unknown> = {};
      if (params.environment.variables) env.variables = params.environment.variables;
      if (params.environment.groups) env.groups = params.environment.groups;
      if (params.environment.softwareVersions)
        env.softwareVersions = params.environment.softwareVersions;
      body.environment = env;
    }

    let response = await this.api.post('/builds', body);
    return response.data;
  }

  async listBuilds(appId?: string): Promise<BuildResponse[]> {
    let url = '/builds';
    if (appId) {
      url += `?appId=${encodeURIComponent(appId)}`;
    }
    let response = await this.api.get(url);
    return response.data.builds;
  }

  async getBuild(buildId: string): Promise<BuildResponse> {
    let response = await this.api.get(`/builds/${encodeURIComponent(buildId)}`);
    return response.data.build;
  }

  async cancelBuild(buildId: string): Promise<{ status: string }> {
    let response = await this.api.post(`/builds/${encodeURIComponent(buildId)}/cancel`);
    return { status: response.status === 208 ? 'already_finished' : 'cancelled' };
  }

  // --- Artifacts ---

  async getPublicArtifactUrl(
    artifactUrl: string,
    expiresAt?: number
  ): Promise<{ url: string; expiresAt: string }> {
    let url = getArtifactDownloadUrl(artifactUrl);
    if (
      expiresAt !== undefined &&
      (!Number.isInteger(expiresAt) || expiresAt <= Date.now() / 1000)
    ) {
      throw createApiServiceError('expiresAt must be a future UNIX timestamp in seconds.');
    }
    let body: Record<string, unknown> = {};
    if (expiresAt !== undefined) body.expiresAt = expiresAt;
    let response = await this.api.post(`${url.pathname}/public-url`, body);
    return response.data;
  }

  // --- Caches ---

  async listCaches(appId: string): Promise<CacheResponse[]> {
    let response = await this.api.get<{ caches: CacheResponse[] }>(
      `/apps/${encodeURIComponent(appId)}/caches`
    );
    return response.data.caches;
  }

  async deleteAllCaches(appId: string): Promise<CacheDeletionResponse> {
    let response = await this.api.delete<CacheDeletionResponse>(
      `/apps/${encodeURIComponent(appId)}/caches`
    );
    return response.data;
  }

  async deleteCache(appId: string, cacheId: string): Promise<CacheDeletionResponse> {
    let response = await this.api.delete<CacheDeletionResponse>(
      `/apps/${encodeURIComponent(appId)}/caches/${encodeURIComponent(cacheId)}`
    );
    return response.data;
  }

  // --- Environment Variables (v3 API) ---

  async addVariablesToGroup(params: AddVariablesParams): Promise<unknown> {
    let response = await this.apiV3.post(
      `/variable-groups/${encodeURIComponent(params.variableGroupId)}/variables`,
      {
        secure: params.secure ?? false,
        variables: params.variables
      }
    );
    return response.data;
  }

  async getCurrentUser(): Promise<CurrentUserResponse> {
    let response = await this.apiV3.get<{ data: CurrentUserResponse }>('/user');
    return response.data.data;
  }

  async listVariableGroups(
    appId: string,
    page?: number,
    pageSize?: number
  ): Promise<VariableGroupsResponse> {
    let response = await this.apiV3.get<VariableGroupsResponse>(
      `/apps/${encodeURIComponent(appId)}/variable-groups`,
      { params: { page, page_size: pageSize } }
    );
    return response.data;
  }
}
