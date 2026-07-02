import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;
  private org: string;

  constructor(config: { token: string; organizationSlug: string }) {
    this.org = config.organizationSlug;
    this.http = createAxios({
      baseURL: 'https://api.buildkite.com/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Organizations ──

  async getOrganization() {
    let response = await this.http.get(`/organizations/${this.org}`);
    return response.data;
  }

  // ── Pipelines ──

  async listPipelines(params?: { page?: number; perPage?: number }) {
    let response = await this.http.get(`/organizations/${this.org}/pipelines`, {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getPipeline(pipelineSlug: string) {
    let response = await this.http.get(`/organizations/${this.org}/pipelines/${pipelineSlug}`);
    return response.data;
  }

  async createPipeline(data: {
    name: string;
    repository: string;
    configuration?: string;
    description?: string;
    defaultBranch?: string;
    branchConfiguration?: string;
    skipQueuedBranchBuilds?: boolean;
    cancelRunningBranchBuilds?: boolean;
    teamUuids?: string[];
    clusterUuid?: string;
    tags?: string[];
    visibility?: string;
  }) {
    let response = await this.http.post(`/organizations/${this.org}/pipelines`, {
      name: data.name,
      repository: data.repository,
      configuration: data.configuration,
      description: data.description,
      default_branch: data.defaultBranch,
      branch_configuration: data.branchConfiguration,
      skip_queued_branch_builds: data.skipQueuedBranchBuilds,
      cancel_running_branch_builds: data.cancelRunningBranchBuilds,
      team_uuids: data.teamUuids,
      cluster_id: data.clusterUuid,
      tags: data.tags,
      visibility: data.visibility
    });
    return response.data;
  }

  async updatePipeline(
    pipelineSlug: string,
    data: {
      name?: string;
      repository?: string;
      configuration?: string;
      description?: string;
      defaultBranch?: string;
      branchConfiguration?: string;
      skipQueuedBranchBuilds?: boolean;
      cancelRunningBranchBuilds?: boolean;
      tags?: string[];
      visibility?: string;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.repository !== undefined) body.repository = data.repository;
    if (data.configuration !== undefined) body.configuration = data.configuration;
    if (data.description !== undefined) body.description = data.description;
    if (data.defaultBranch !== undefined) body.default_branch = data.defaultBranch;
    if (data.branchConfiguration !== undefined)
      body.branch_configuration = data.branchConfiguration;
    if (data.skipQueuedBranchBuilds !== undefined)
      body.skip_queued_branch_builds = data.skipQueuedBranchBuilds;
    if (data.cancelRunningBranchBuilds !== undefined)
      body.cancel_running_branch_builds = data.cancelRunningBranchBuilds;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.visibility !== undefined) body.visibility = data.visibility;

    let response = await this.http.patch(
      `/organizations/${this.org}/pipelines/${pipelineSlug}`,
      body
    );
    return response.data;
  }

  async deletePipeline(pipelineSlug: string) {
    await this.http.delete(`/organizations/${this.org}/pipelines/${pipelineSlug}`);
  }

  async archivePipeline(pipelineSlug: string) {
    let response = await this.http.post(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/archive`
    );
    return response.data;
  }

  async unarchivePipeline(pipelineSlug: string) {
    let response = await this.http.post(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/unarchive`
    );
    return response.data;
  }

  // ── Builds ──

  async listBuilds(params?: {
    pipelineSlug?: string;
    state?: string;
    branch?: string;
    commit?: string;
    creator?: string;
    createdFrom?: string;
    createdTo?: string;
    finishedFrom?: string;
    page?: number;
    perPage?: number;
  }) {
    let path = params?.pipelineSlug
      ? `/organizations/${this.org}/pipelines/${params.pipelineSlug}/builds`
      : `/organizations/${this.org}/builds`;

    let response = await this.http.get(path, {
      params: {
        state: params?.state,
        branch: params?.branch,
        commit: params?.commit,
        creator: params?.creator,
        created_from: params?.createdFrom,
        created_to: params?.createdTo,
        finished_from: params?.finishedFrom,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getBuild(pipelineSlug: string, buildNumber: number) {
    let response = await this.http.get(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}`
    );
    return response.data;
  }

  async createBuild(
    pipelineSlug: string,
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
    let response = await this.http.post(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds`,
      {
        commit: data.commit,
        branch: data.branch,
        message: data.message,
        env: data.env,
        meta_data: data.metaData,
        ignore_pipeline_branch_filters: data.ignorePipelineBranchFilters,
        clean_checkout: data.cleanCheckout
      }
    );
    return response.data;
  }

  async cancelBuild(pipelineSlug: string, buildNumber: number) {
    let response = await this.http.put(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/cancel`
    );
    return response.data;
  }

  async rebuildBuild(pipelineSlug: string, buildNumber: number) {
    let response = await this.http.put(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/rebuild`
    );
    return response.data;
  }

  // ── Jobs ──

  async getJob(pipelineSlug: string, buildNumber: number, jobId: string) {
    let build = await this.getBuild(pipelineSlug, buildNumber);
    let job = build.jobs?.find((j: any) => j.id === jobId);
    return job || null;
  }

  async retryJob(pipelineSlug: string, buildNumber: number, jobId: string) {
    let response = await this.http.put(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/jobs/${jobId}/retry`
    );
    return response.data;
  }

  async unblockJob(
    pipelineSlug: string,
    buildNumber: number,
    jobId: string,
    fields?: Record<string, string>,
    unblockedBy?: string
  ) {
    let response = await this.http.put(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/jobs/${jobId}/unblock`,
      {
        fields,
        unblocker: unblockedBy
      }
    );
    return response.data;
  }

  async getJobLog(pipelineSlug: string, buildNumber: number, jobId: string) {
    let response = await this.http.get(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/jobs/${jobId}/log`
    );
    return response.data;
  }

  async getJobEnvironment(pipelineSlug: string, buildNumber: number, jobId: string) {
    let response = await this.http.get(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/jobs/${jobId}/env`
    );
    return response.data;
  }

  // ── Agents ──

  async listAgents(params?: { page?: number; perPage?: number; name?: string }) {
    let response = await this.http.get(`/organizations/${this.org}/agents`, {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        name: params?.name
      }
    });
    return response.data;
  }

  async getAgent(agentId: string) {
    let response = await this.http.get(`/organizations/${this.org}/agents/${agentId}`);
    return response.data;
  }

  async stopAgent(agentId: string, force?: boolean) {
    let response = await this.http.put(`/organizations/${this.org}/agents/${agentId}/stop`, {
      force: force ?? false
    });
    return response.data;
  }

  // ── Artifacts ──

  async listArtifacts(
    pipelineSlug: string,
    buildNumber: number,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.http.get(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/artifacts`,
      {
        params: {
          page: params?.page,
          per_page: params?.perPage
        }
      }
    );
    return response.data;
  }

  async getArtifact(pipelineSlug: string, buildNumber: number, artifactId: string) {
    let response = await this.http.get(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/artifacts/${artifactId}`
    );
    return response.data;
  }

  async downloadArtifactUrl(pipelineSlug: string, buildNumber: number, artifactId: string) {
    let response = await this.http.get(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/artifacts/${artifactId}/download`
    );
    return response.data;
  }

  // ── Annotations ──

  async listAnnotations(
    pipelineSlug: string,
    buildNumber: number,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.http.get(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/annotations`,
      {
        params: {
          page: params?.page,
          per_page: params?.perPage
        }
      }
    );
    return response.data;
  }

  async createAnnotation(
    pipelineSlug: string,
    buildNumber: number,
    data: {
      body: string;
      context?: string;
      style?: string;
      append?: boolean;
    }
  ) {
    let response = await this.http.post(
      `/organizations/${this.org}/pipelines/${pipelineSlug}/builds/${buildNumber}/annotations`,
      {
        body: data.body,
        context: data.context,
        style: data.style,
        append: data.append
      }
    );
    return response.data;
  }

  // ── Teams ──

  async listTeams(params?: { page?: number; perPage?: number }) {
    let response = await this.http.get(`/organizations/${this.org}/teams`, {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  // ── Clusters ──

  async listClusters(params?: { page?: number; perPage?: number }) {
    let response = await this.http.get(`/organizations/${this.org}/clusters`, {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getCluster(clusterId: string) {
    let response = await this.http.get(`/organizations/${this.org}/clusters/${clusterId}`);
    return response.data;
  }

  async createCluster(data: {
    name: string;
    description?: string;
    emoji?: string;
    color?: string;
  }) {
    let response = await this.http.post(`/organizations/${this.org}/clusters`, data);
    return response.data;
  }

  async updateCluster(
    clusterId: string,
    data: { name?: string; description?: string; emoji?: string; color?: string }
  ) {
    let response = await this.http.patch(
      `/organizations/${this.org}/clusters/${clusterId}`,
      data
    );
    return response.data;
  }

  async deleteCluster(clusterId: string) {
    await this.http.delete(`/organizations/${this.org}/clusters/${clusterId}`);
  }

  // ── Cluster Queues ──

  async listClusterQueues(clusterId: string, params?: { page?: number; perPage?: number }) {
    let response = await this.http.get(
      `/organizations/${this.org}/clusters/${clusterId}/queues`,
      {
        params: {
          page: params?.page,
          per_page: params?.perPage
        }
      }
    );
    return response.data;
  }

  async createClusterQueue(clusterId: string, data: { key: string; description?: string }) {
    let response = await this.http.post(
      `/organizations/${this.org}/clusters/${clusterId}/queues`,
      data
    );
    return response.data;
  }

  // ── Test Suites ──

  async listTestSuites(params?: { page?: number; perPage?: number }) {
    let response = await this.http.get(`/organizations/${this.org}/analytics/suites`, {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getTestSuite(testSuiteSlug: string) {
    let response = await this.http.get(
      `/organizations/${this.org}/analytics/suites/${testSuiteSlug}`
    );
    return response.data;
  }

  // ── Package Registries ──

  async listRegistries(params?: { page?: number; perPage?: number }) {
    let response = await this.http.get(`/organizations/${this.org}/packages/registries`, {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getRegistry(registrySlug: string) {
    let response = await this.http.get(
      `/organizations/${this.org}/packages/registries/${registrySlug}`
    );
    return response.data;
  }
}
