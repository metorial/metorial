import { createAxios } from 'slates';

export class TravisCIClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: params.baseUrl,
      headers: {
        Authorization: `token ${params.token}`,
        'Travis-API-Version': '3',
        'Content-Type': 'application/json'
      }
    });
  }

  private encodeSlug(slug: string): string {
    return encodeURIComponent(slug);
  }

  private repoPath(repoSlugOrId: string): string {
    if (/^\d+$/.test(repoSlugOrId)) {
      return `/repo/${repoSlugOrId}`;
    }
    return `/repo/${this.encodeSlug(repoSlugOrId)}`;
  }

  // ---- Repositories ----

  async getRepository(repoSlugOrId: string): Promise<any> {
    let response = await this.axios.get(this.repoPath(repoSlugOrId));
    return response.data;
  }

  async listRepositories(params?: {
    ownerLogin?: string;
    active?: boolean;
    starred?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: string;
  }): Promise<any> {
    let url = params?.ownerLogin ? `/owner/${params.ownerLogin}/repos` : '/repos';
    let query: Record<string, any> = {};
    if (params?.active !== undefined) query.active = params.active;
    if (params?.starred !== undefined) query.starred = params.starred;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    if (params?.sortBy) query.sort_by = params.sortBy;
    let response = await this.axios.get(url, { params: query });
    return response.data;
  }

  async activateRepository(repoSlugOrId: string): Promise<any> {
    let response = await this.axios.post(`${this.repoPath(repoSlugOrId)}/activate`);
    return response.data;
  }

  async deactivateRepository(repoSlugOrId: string): Promise<any> {
    let response = await this.axios.post(`${this.repoPath(repoSlugOrId)}/deactivate`);
    return response.data;
  }

  async starRepository(repoSlugOrId: string): Promise<any> {
    let response = await this.axios.post(`${this.repoPath(repoSlugOrId)}/star`);
    return response.data;
  }

  async unstarRepository(repoSlugOrId: string): Promise<any> {
    let response = await this.axios.post(`${this.repoPath(repoSlugOrId)}/unstar`);
    return response.data;
  }

  // ---- Builds ----

  async getBuild(buildId: string): Promise<any> {
    let response = await this.axios.get(`/build/${buildId}`);
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
  }): Promise<any> {
    let url = params?.repoSlugOrId
      ? `${this.repoPath(params.repoSlugOrId)}/builds`
      : '/builds';
    let query: Record<string, any> = {};
    if (params?.branchName) query['branch.name'] = params.branchName;
    if (params?.state) query['build.state'] = params.state;
    if (params?.eventType) query['build.event_type'] = params.eventType;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    if (params?.sortBy) query.sort_by = params.sortBy;
    let response = await this.axios.get(url, { params: query });
    return response.data;
  }

  async cancelBuild(buildId: string): Promise<any> {
    let response = await this.axios.post(`/build/${buildId}/cancel`);
    return response.data;
  }

  async restartBuild(buildId: string): Promise<any> {
    let response = await this.axios.post(`/build/${buildId}/restart`);
    return response.data;
  }

  // ---- Trigger Build (Requests) ----

  async triggerBuild(
    repoSlugOrId: string,
    params: {
      message?: string;
      branch?: string;
      config?: Record<string, any>;
    }
  ): Promise<any> {
    let body: Record<string, any> = { request: {} };
    if (params.message) body.request.message = params.message;
    if (params.branch) body.request.branch = params.branch;
    if (params.config) body.request.config = params.config;
    let response = await this.axios.post(`${this.repoPath(repoSlugOrId)}/requests`, body);
    return response.data;
  }

  // ---- Build Requests ----

  async listRequests(
    repoSlugOrId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    let response = await this.axios.get(`${this.repoPath(repoSlugOrId)}/requests`, {
      params: query
    });
    return response.data;
  }

  // ---- Jobs ----

  async getJob(jobId: string): Promise<any> {
    let response = await this.axios.get(`/job/${jobId}`);
    return response.data;
  }

  async cancelJob(jobId: string): Promise<any> {
    let response = await this.axios.post(`/job/${jobId}/cancel`);
    return response.data;
  }

  async restartJob(jobId: string): Promise<any> {
    let response = await this.axios.post(`/job/${jobId}/restart`);
    return response.data;
  }

  async debugJob(jobId: string): Promise<any> {
    let response = await this.axios.post(`/job/${jobId}/debug`);
    return response.data;
  }

  // ---- Logs ----

  async getJobLog(jobId: string): Promise<any> {
    let response = await this.axios.get(`/job/${jobId}/log`);
    return response.data;
  }

  async getJobLogText(jobId: string): Promise<string> {
    let response = await this.axios.get(`/job/${jobId}/log.txt`, {
      headers: { Accept: 'text/plain' }
    });
    return response.data;
  }

  async deleteJobLog(jobId: string): Promise<void> {
    await this.axios.delete(`/job/${jobId}/log`);
  }

  // ---- Environment Variables ----

  async listEnvVars(repoSlugOrId: string): Promise<any> {
    let response = await this.axios.get(`${this.repoPath(repoSlugOrId)}/env_vars`);
    return response.data;
  }

  async getEnvVar(repoSlugOrId: string, envVarId: string): Promise<any> {
    let response = await this.axios.get(`${this.repoPath(repoSlugOrId)}/env_var/${envVarId}`);
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
  ): Promise<any> {
    let body: Record<string, any> = {
      'env_var.name': params.name,
      'env_var.value': params.value,
      'env_var.public': params.isPublic ?? false
    };
    if (params.branch) body['env_var.branch'] = params.branch;
    let response = await this.axios.post(`${this.repoPath(repoSlugOrId)}/env_vars`, body);
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
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body['env_var.name'] = params.name;
    if (params.value !== undefined) body['env_var.value'] = params.value;
    if (params.isPublic !== undefined) body['env_var.public'] = params.isPublic;
    if (params.branch !== undefined) body['env_var.branch'] = params.branch;
    let response = await this.axios.patch(
      `${this.repoPath(repoSlugOrId)}/env_var/${envVarId}`,
      body
    );
    return response.data;
  }

  async deleteEnvVar(repoSlugOrId: string, envVarId: string): Promise<void> {
    await this.axios.delete(`${this.repoPath(repoSlugOrId)}/env_var/${envVarId}`);
  }

  // ---- Cron Jobs ----

  async listCrons(
    repoSlugOrId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    let response = await this.axios.get(`${this.repoPath(repoSlugOrId)}/crons`, {
      params: query
    });
    return response.data;
  }

  async getCron(cronId: string): Promise<any> {
    let response = await this.axios.get(`/cron/${cronId}`);
    return response.data;
  }

  async createCron(
    repoSlugOrId: string,
    branchName: string,
    params: {
      interval: 'daily' | 'weekly' | 'monthly';
      dontRunIfRecentBuildExists?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      'cron.interval': params.interval
    };
    if (params.dontRunIfRecentBuildExists !== undefined) {
      body['cron.dont_run_if_recent_build_exists'] = params.dontRunIfRecentBuildExists;
    }
    let response = await this.axios.post(
      `${this.repoPath(repoSlugOrId)}/branch/${encodeURIComponent(branchName)}/cron`,
      body
    );
    return response.data;
  }

  async deleteCron(cronId: string): Promise<void> {
    await this.axios.delete(`/cron/${cronId}`);
  }

  // ---- Caches ----

  async listCaches(
    repoSlugOrId: string,
    params?: {
      branch?: string;
      match?: string;
    }
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.branch) query.branch = params.branch;
    if (params?.match) query.match = params.match;
    let response = await this.axios.get(`${this.repoPath(repoSlugOrId)}/caches`, {
      params: query
    });
    return response.data;
  }

  async deleteCaches(
    repoSlugOrId: string,
    params?: {
      branch?: string;
      match?: string;
    }
  ): Promise<void> {
    let query: Record<string, any> = {};
    if (params?.branch) query.branch = params.branch;
    if (params?.match) query.match = params.match;
    await this.axios.delete(`${this.repoPath(repoSlugOrId)}/caches`, { params: query });
  }

  // ---- Branches ----

  async getBranch(repoSlugOrId: string, branchName: string): Promise<any> {
    let response = await this.axios.get(
      `${this.repoPath(repoSlugOrId)}/branch/${encodeURIComponent(branchName)}`
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
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.existsOnGithub !== undefined) query.exists_on_github = params.existsOnGithub;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.offset !== undefined) query.offset = params.offset;
    if (params?.sortBy) query.sort_by = params.sortBy;
    let response = await this.axios.get(`${this.repoPath(repoSlugOrId)}/branches`, {
      params: query
    });
    return response.data;
  }

  // ---- User ----

  async getCurrentUser(): Promise<any> {
    let response = await this.axios.get('/user');
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.axios.get(`/user/${userId}`);
    return response.data;
  }

  async syncUser(userId: string): Promise<any> {
    let response = await this.axios.post(`/user/${userId}/sync`);
    return response.data;
  }

  // ---- Lint ----

  async lintTravisYml(content: string): Promise<any> {
    let response = await this.axios.post('/lint', content, {
      headers: { 'Content-Type': 'text/yaml' }
    });
    return response.data;
  }
}
