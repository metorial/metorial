import { createAxios } from 'slates';

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

export class CodemagicClient {
  private api: ReturnType<typeof createAxios>;
  private apiV3: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.codemagic.io',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': config.token
      }
    });

    this.apiV3 = createAxios({
      baseURL: 'https://codemagic.io/api/v3',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-auth-token': config.token
      }
    });
  }

  // --- Applications ---

  async listApplications(): Promise<ApplicationResponse[]> {
    let response = await this.api.get('/apps');
    return response.data.applications;
  }

  async getApplication(appId: string): Promise<ApplicationResponse> {
    let response = await this.api.get(`/apps/${appId}`);
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
    let response = await this.api.get(`/builds/${buildId}`);
    return response.data.build;
  }

  async cancelBuild(buildId: string): Promise<{ status: string }> {
    let response = await this.api.post(`/builds/${buildId}/cancel`);
    return { status: response.status === 208 ? 'already_finished' : 'cancelled' };
  }

  // --- Artifacts ---

  async getPublicArtifactUrl(
    artifactUrl: string,
    expiresAt?: number
  ): Promise<{ url: string; expiresAt: string }> {
    let securePath = artifactUrl.replace('https://api.codemagic.io/artifacts/', '');
    let body: Record<string, unknown> = {};
    if (expiresAt) body.expiresAt = expiresAt;
    let response = await this.api.post(`/artifacts/${securePath}/public-url`, body);
    return response.data;
  }

  // --- Caches ---

  async listCaches(appId: string): Promise<CacheResponse[]> {
    let response = await this.api.get(`/apps/${appId}/caches`);
    return response.data;
  }

  async deleteAllCaches(appId: string): Promise<void> {
    await this.api.delete(`/apps/${appId}/caches`);
  }

  async deleteCache(appId: string, cacheId: string): Promise<void> {
    await this.api.delete(`/apps/${appId}/caches/${cacheId}`);
  }

  // --- Environment Variables (v3 API) ---

  async addVariablesToGroup(params: AddVariablesParams): Promise<unknown> {
    let response = await this.apiV3.post(
      `/variable-groups/${params.variableGroupId}/variables`,
      {
        secure: params.secure ?? false,
        variables: params.variables
      }
    );
    return response.data;
  }
}
