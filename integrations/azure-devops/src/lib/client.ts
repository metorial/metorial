import { createAxios } from 'slates';

export class AzureDevOpsClient {
  private axios: ReturnType<typeof createAxios>;
  private organization: string;

  constructor(config: { token: string; organization: string }) {
    this.organization = config.organization;

    let authHeader = config.token.startsWith('Basic ')
      ? config.token
      : `Bearer ${config.token}`;

    this.axios = createAxios({
      baseURL: `https://dev.azure.com/${config.organization}`,
      headers: {
        Authorization: authHeader
      }
    });
  }

  // ─── Projects ──────────────────────────────────────────────

  async listProjects(params?: {
    top?: number;
    skip?: number;
    stateFilter?: string;
  }): Promise<any> {
    let query: Record<string, string> = { 'api-version': '7.1' };
    if (params?.top) query.$top = String(params.top);
    if (params?.skip) query.$skip = String(params.skip);
    if (params?.stateFilter) query.stateFilter = params.stateFilter;

    let response = await this.axios.get('/_apis/projects', { params: query });
    return response.data;
  }

  async getProject(projectId: string): Promise<any> {
    let response = await this.axios.get(`/_apis/projects/${encodeURIComponent(projectId)}`, {
      params: { 'api-version': '7.1', includeCapabilities: 'true' }
    });
    return response.data;
  }

  // ─── Work Items ────────────────────────────────────────────

  async getWorkItem(
    project: string,
    workItemId: number,
    params?: { expand?: string; fields?: string[] }
  ): Promise<any> {
    let query: Record<string, string> = { 'api-version': '7.1' };
    if (params?.expand) query.$expand = params.expand;
    if (params?.fields) query.fields = params.fields.join(',');

    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}`,
      { params: query }
    );
    return response.data;
  }

  async getWorkItemsBatch(project: string, ids: number[], fields?: string[]): Promise<any> {
    let body: Record<string, any> = { ids };
    if (fields && fields.length > 0) body.fields = fields;

    let response = await this.axios.post(
      `/${encodeURIComponent(project)}/_apis/wit/workitemsbatch?api-version=7.1`,
      body
    );
    return response.data;
  }

  async createWorkItem(
    project: string,
    workItemType: string,
    fields: Record<string, any>
  ): Promise<any> {
    let operations = Object.entries(fields).map(([path, value]) => ({
      op: 'add',
      path: path.startsWith('/') ? path : `/fields/${path}`,
      value
    }));

    let response = await this.axios.post(
      `/${encodeURIComponent(project)}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}?api-version=7.1`,
      operations,
      { headers: { 'Content-Type': 'application/json-patch+json' } }
    );
    return response.data;
  }

  async updateWorkItem(
    project: string,
    workItemId: number,
    operations: Array<{ op: string; path: string; value?: any; from?: string }>
  ): Promise<any> {
    let response = await this.axios.patch(
      `/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}?api-version=7.1`,
      operations,
      { headers: { 'Content-Type': 'application/json-patch+json' } }
    );
    return response.data;
  }

  async deleteWorkItem(project: string, workItemId: number, destroy?: boolean): Promise<any> {
    let response = await this.axios.delete(
      `/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}`,
      { params: { 'api-version': '7.1', destroy: destroy ? 'true' : 'false' } }
    );
    return response.data;
  }

  async queryWorkItems(project: string, wiql: string, top?: number): Promise<any> {
    let query: Record<string, string> = { 'api-version': '7.1' };
    if (top) query.$top = String(top);

    let response = await this.axios.post(
      `/${encodeURIComponent(project)}/_apis/wit/wiql`,
      { query: wiql },
      { params: query }
    );
    return response.data;
  }

  // ─── Git Repositories ─────────────────────────────────────

  async listRepositories(project: string): Promise<any> {
    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/git/repositories`,
      { params: { 'api-version': '7.1' } }
    );
    return response.data;
  }

  async getRepository(project: string, repositoryId: string): Promise<any> {
    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}`,
      { params: { 'api-version': '7.1' } }
    );
    return response.data;
  }

  async createRepository(project: string, name: string): Promise<any> {
    let projectInfo = await this.getProject(project);
    let response = await this.axios.post(
      `/${encodeURIComponent(project)}/_apis/git/repositories?api-version=7.1`,
      { name, project: { id: projectInfo.id } }
    );
    return response.data;
  }

  async deleteRepository(project: string, repositoryId: string): Promise<void> {
    await this.axios.delete(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}`,
      { params: { 'api-version': '7.1' } }
    );
  }

  // ─── Branches (Refs) ──────────────────────────────────────

  async listBranches(project: string, repositoryId: string, filter?: string): Promise<any> {
    let params: Record<string, string> = { 'api-version': '7.1' };
    if (filter) params.filter = filter;

    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/refs`,
      { params }
    );
    return response.data;
  }

  // ─── Pull Requests ────────────────────────────────────────

  async listPullRequests(
    project: string,
    repositoryId: string,
    params?: {
      status?: string;
      creatorId?: string;
      reviewerId?: string;
      sourceRefName?: string;
      targetRefName?: string;
      top?: number;
      skip?: number;
    }
  ): Promise<any> {
    let query: Record<string, string> = { 'api-version': '7.1' };
    if (params?.status) query['searchCriteria.status'] = params.status;
    if (params?.creatorId) query['searchCriteria.creatorId'] = params.creatorId;
    if (params?.reviewerId) query['searchCriteria.reviewerId'] = params.reviewerId;
    if (params?.sourceRefName) query['searchCriteria.sourceRefName'] = params.sourceRefName;
    if (params?.targetRefName) query['searchCriteria.targetRefName'] = params.targetRefName;
    if (params?.top) query.$top = String(params.top);
    if (params?.skip) query.$skip = String(params.skip);

    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests`,
      { params: query }
    );
    return response.data;
  }

  async getPullRequest(
    project: string,
    repositoryId: string,
    pullRequestId: number
  ): Promise<any> {
    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}`,
      { params: { 'api-version': '7.1' } }
    );
    return response.data;
  }

  async createPullRequest(
    project: string,
    repositoryId: string,
    data: {
      sourceRefName: string;
      targetRefName: string;
      title: string;
      description?: string;
      reviewerIds?: string[];
      isDraft?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      sourceRefName: data.sourceRefName,
      targetRefName: data.targetRefName,
      title: data.title,
      description: data.description || '',
      isDraft: data.isDraft || false
    };

    if (data.reviewerIds && data.reviewerIds.length > 0) {
      body.reviewers = data.reviewerIds.map(id => ({ id }));
    }

    let response = await this.axios.post(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests?api-version=7.1`,
      body
    );
    return response.data;
  }

  async updatePullRequest(
    project: string,
    repositoryId: string,
    pullRequestId: number,
    data: {
      title?: string;
      description?: string;
      status?: string;
      targetRefName?: string;
      autoCompleteSetBy?: { id: string };
      completionOptions?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.axios.patch(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}?api-version=7.1`,
      data
    );
    return response.data;
  }

  async createPullRequestReviewer(
    project: string,
    repositoryId: string,
    pullRequestId: number,
    reviewerId: string,
    vote?: number
  ): Promise<any> {
    let response = await this.axios.put(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/reviewers/${encodeURIComponent(reviewerId)}?api-version=7.1`,
      { vote: vote ?? 0 }
    );
    return response.data;
  }

  // ─── Pull Request Threads ─────────────────────────────────

  async createPullRequestThread(
    project: string,
    repositoryId: string,
    pullRequestId: number,
    content: string,
    status?: number
  ): Promise<any> {
    let response = await this.axios.post(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/threads?api-version=7.1`,
      {
        comments: [{ parentCommentId: 0, content, commentType: 1 }],
        status: status ?? 1
      }
    );
    return response.data;
  }

  // ─── Pipelines ─────────────────────────────────────────────

  async listPipelines(
    project: string,
    params?: { top?: number; continuationToken?: string }
  ): Promise<any> {
    let query: Record<string, string> = { 'api-version': '7.1' };
    if (params?.top) query.$top = String(params.top);
    if (params?.continuationToken) query.continuationToken = params.continuationToken;

    let response = await this.axios.get(`/${encodeURIComponent(project)}/_apis/pipelines`, {
      params: query
    });
    return response.data;
  }

  async runPipeline(
    project: string,
    pipelineId: number,
    params?: {
      branch?: string;
      variables?: Record<string, { value: string; isSecret?: boolean }>;
      templateParameters?: Record<string, string>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params?.branch) {
      body.resources = {
        repositories: {
          self: {
            refName: params.branch.startsWith('refs/')
              ? params.branch
              : `refs/heads/${params.branch}`
          }
        }
      };
    }
    if (params?.variables) body.variables = params.variables;
    if (params?.templateParameters) body.templateParameters = params.templateParameters;

    let response = await this.axios.post(
      `/${encodeURIComponent(project)}/_apis/pipelines/${pipelineId}/runs?api-version=7.1`,
      body
    );
    return response.data;
  }

  async getPipelineRun(project: string, pipelineId: number, runId: number): Promise<any> {
    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/pipelines/${pipelineId}/runs/${runId}`,
      { params: { 'api-version': '7.1' } }
    );
    return response.data;
  }

  async listPipelineRuns(project: string, pipelineId: number, top?: number): Promise<any> {
    let query: Record<string, string> = { 'api-version': '7.1' };
    if (top) query.$top = String(top);

    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/pipelines/${pipelineId}/runs`,
      { params: query }
    );
    return response.data;
  }

  // ─── Builds ────────────────────────────────────────────────

  async listBuilds(
    project: string,
    params?: {
      definitions?: number[];
      statusFilter?: string;
      resultFilter?: string;
      top?: number;
      branchName?: string;
      requestedFor?: string;
      minTime?: string;
    }
  ): Promise<any> {
    let query: Record<string, string> = { 'api-version': '7.1' };
    if (params?.definitions) query.definitions = params.definitions.join(',');
    if (params?.statusFilter) query.statusFilter = params.statusFilter;
    if (params?.resultFilter) query.resultFilter = params.resultFilter;
    if (params?.top) query.$top = String(params.top);
    if (params?.branchName) query.branchName = params.branchName;
    if (params?.requestedFor) query.requestedFor = params.requestedFor;
    if (params?.minTime) query.minTime = params.minTime;

    let response = await this.axios.get(`/${encodeURIComponent(project)}/_apis/build/builds`, {
      params: query
    });
    return response.data;
  }

  async getBuild(project: string, buildId: number): Promise<any> {
    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/build/builds/${buildId}`,
      { params: { 'api-version': '7.1' } }
    );
    return response.data;
  }

  async getBuildTimeline(project: string, buildId: number): Promise<any> {
    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/build/builds/${buildId}/timeline`,
      { params: { 'api-version': '7.1' } }
    );
    return response.data;
  }

  // ─── Wiki ──────────────────────────────────────────────────

  async listWikis(project: string): Promise<any> {
    let response = await this.axios.get(`/${encodeURIComponent(project)}/_apis/wiki/wikis`, {
      params: { 'api-version': '7.1' }
    });
    return response.data;
  }

  private normalizeWikiPageResponse(
    responseData: Record<string, any>,
    eTag?: string
  ): Record<string, any> {
    if (responseData.page) {
      return {
        ...responseData,
        eTag: eTag ?? responseData.eTag
      };
    }

    let { id, path, content, gitItemPath, subPages, ...rest } = responseData;

    return {
      ...rest,
      page: {
        id,
        path,
        content,
        gitItemPath,
        subPages
      },
      eTag: eTag ?? responseData.eTag
    };
  }

  private async getCodeWikiVersion(
    project: string,
    wikiIdentifier: string
  ): Promise<string | null> {
    let wikis = await this.listWikis(project);
    let wiki = (wikis.value ?? []).find(
      (candidate: { id?: string; name?: string; type?: string }) =>
        candidate.id === wikiIdentifier || candidate.name === wikiIdentifier
    );

    if (wiki?.type !== 'codeWiki') {
      return null;
    }

    let version = (wiki.versions ?? []).find(
      (candidate: { version?: string }) => typeof candidate.version === 'string'
    );

    return typeof version?.version === 'string' && version.version.length > 0
      ? version.version
      : null;
  }

  async getWikiPage(
    project: string,
    wikiIdentifier: string,
    path: string,
    params?: { includeContent?: boolean; recursionLevel?: string }
  ): Promise<any> {
    let query: Record<string, string> = {
      'api-version': '7.1',
      path
    };
    if (params?.includeContent) query.includeContent = 'true';
    if (params?.recursionLevel) query.recursionLevel = params.recursionLevel;
    let version = await this.getCodeWikiVersion(project, wikiIdentifier);
    if (version) {
      query['versionDescriptor.version'] = version;
      query['versionDescriptor.versionType'] = 'branch';
    }

    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/wiki/wikis/${encodeURIComponent(wikiIdentifier)}/pages`,
      { params: query }
    );
    let responseData = response.data as Record<string, any>;
    let eTag =
      (response.headers?.etag as string | undefined) ??
      (response.headers?.ETag as string | undefined) ??
      responseData.eTag;
    return this.normalizeWikiPageResponse(responseData, eTag);
  }

  async createOrUpdateWikiPage(
    project: string,
    wikiIdentifier: string,
    path: string,
    content: string,
    version?: string
  ): Promise<any> {
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (version) headers['If-Match'] = version;
    let query = new URLSearchParams({
      path,
      'api-version': '7.1'
    });
    let branchVersion = await this.getCodeWikiVersion(project, wikiIdentifier);
    if (branchVersion) {
      query.set('versionDescriptor.version', branchVersion);
      query.set('versionDescriptor.versionType', 'branch');
    }

    let response = await this.axios.put(
      `/${encodeURIComponent(project)}/_apis/wiki/wikis/${encodeURIComponent(wikiIdentifier)}/pages?${query.toString()}`,
      { content },
      { headers }
    );
    let responseData = response.data as Record<string, any>;
    let eTag =
      (response.headers?.etag as string | undefined) ??
      (response.headers?.ETag as string | undefined) ??
      responseData.eTag;
    return this.normalizeWikiPageResponse(responseData, eTag);
  }

  // ─── Service Hooks ─────────────────────────────────────────

  async createServiceHookSubscription(data: {
    publisherId: string;
    eventType: string;
    consumerId: string;
    consumerActionId: string;
    publisherInputs: Record<string, string>;
    consumerInputs: Record<string, string>;
    resourceVersion?: string;
  }): Promise<any> {
    let response = await this.axios.post('/_apis/hooks/subscriptions?api-version=7.1', data);
    return response.data;
  }

  async deleteServiceHookSubscription(subscriptionId: string): Promise<void> {
    await this.axios.delete(
      `/_apis/hooks/subscriptions/${encodeURIComponent(subscriptionId)}?api-version=7.1`
    );
  }

  async listServiceHookSubscriptions(): Promise<any> {
    let response = await this.axios.get('/_apis/hooks/subscriptions', {
      params: { 'api-version': '7.1' }
    });
    return response.data;
  }

  // ─── Teams ─────────────────────────────────────────────────

  async listTeams(project: string): Promise<any> {
    let response = await this.axios.get(
      `/_apis/projects/${encodeURIComponent(project)}/teams`,
      { params: { 'api-version': '7.1' } }
    );
    return response.data;
  }

  // ─── Iterations ────────────────────────────────────────────

  async listIterations(project: string, team: string): Promise<any> {
    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/${encodeURIComponent(team)}/_apis/work/teamsettings/iterations`,
      { params: { 'api-version': '7.1' } }
    );
    return response.data;
  }

  // ─── File content (Items) ─────────────────────────────────

  async getFileContent(
    project: string,
    repositoryId: string,
    path: string,
    params?: { versionDescriptor?: string }
  ): Promise<any> {
    let query: Record<string, string> = {
      'api-version': '7.1',
      path
    };
    if (params?.versionDescriptor)
      query['versionDescriptor.version'] = params.versionDescriptor;

    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/items`,
      { params: query }
    );
    return response.data;
  }

  async getCommits(
    project: string,
    repositoryId: string,
    params?: {
      top?: number;
      skip?: number;
      branch?: string;
      fromDate?: string;
      toDate?: string;
      author?: string;
    }
  ): Promise<any> {
    let query: Record<string, string> = { 'api-version': '7.1' };
    if (params?.top) query.$top = String(params.top);
    if (params?.skip) query.$skip = String(params.skip);
    if (params?.branch) query['searchCriteria.itemVersion.version'] = params.branch;
    if (params?.fromDate) query['searchCriteria.fromDate'] = params.fromDate;
    if (params?.toDate) query['searchCriteria.toDate'] = params.toDate;
    if (params?.author) query['searchCriteria.author'] = params.author;

    let response = await this.axios.get(
      `/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/commits`,
      { params: query }
    );
    return response.data;
  }
}
