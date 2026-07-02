import { createAxios } from 'slates';
import { toAzureDevOpsAuthHeader } from './auth';
import type {
  AzureBranchStats,
  AzureCommentThread,
  AzureCommit,
  AzureItem,
  AzureListResponse,
  AzurePullRequest,
  AzurePush,
  AzureRef,
  AzureRefUpdateResult,
  AzureRepository,
  AzureReviewer,
  AzureServiceHookSubscription
} from './types';

export interface ClientConfig {
  token: string;
  organization: string;
  project: string;
}

export class Client {
  private http: ReturnType<typeof createAxios>;
  private organization: string;
  private project: string;

  constructor(config: ClientConfig) {
    this.organization = config.organization;
    this.project = config.project;

    this.http = createAxios({
      baseURL: `https://dev.azure.com/${config.organization}`,
      headers: {
        Authorization: toAzureDevOpsAuthHeader(config.token),
        'Content-Type': 'application/json'
      }
    });
  }

  private async getProjectDetails(): Promise<{ id?: string; name?: string }> {
    let response = await this.http.get(
      `/_apis/projects/${encodeURIComponent(this.project)}?api-version=7.1`
    );
    return response.data as { id?: string; name?: string };
  }

  // --- Repositories ---

  async listRepositories(): Promise<AzureRepository[]> {
    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories?api-version=7.1`
    );
    return (response.data as AzureListResponse<AzureRepository>).value;
  }

  async getRepository(repositoryId: string): Promise<AzureRepository> {
    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories/${repositoryId}?api-version=7.1`
    );
    return response.data as AzureRepository;
  }

  async createRepository(
    name: string,
    options?: {
      parentRepositoryId?: string;
      parentProjectId?: string;
      sourceRef?: string;
    }
  ): Promise<AzureRepository> {
    let project = await this.getProjectDetails();
    let body: Record<string, any> = {
      name,
      project: {
        id: project.id,
        name: project.name ?? this.project
      }
    };

    if (options?.parentRepositoryId) {
      body.parentRepository = { id: options.parentRepositoryId };
      if (options.parentProjectId) {
        body.parentRepository.project = { id: options.parentProjectId };
      }
    }

    let url = `/${this.project}/_apis/git/repositories?api-version=7.1`;
    if (options?.sourceRef) {
      url += `&sourceRef=${encodeURIComponent(options.sourceRef)}`;
    }

    let response = await this.http.post(url, body);
    return response.data as AzureRepository;
  }

  async updateRepository(
    repositoryId: string,
    updates: {
      name?: string;
      defaultBranch?: string;
      isDisabled?: boolean;
    }
  ): Promise<AzureRepository> {
    let response = await this.http.patch(
      `/${this.project}/_apis/git/repositories/${repositoryId}?api-version=7.1`,
      updates
    );
    return response.data as AzureRepository;
  }

  async deleteRepository(repositoryId: string): Promise<void> {
    await this.http.delete(
      `/${this.project}/_apis/git/repositories/${repositoryId}?api-version=7.1`
    );
  }

  // --- Branches (Refs) ---

  async listRefs(repositoryId: string, filter?: string): Promise<AzureRef[]> {
    let url = `/${this.project}/_apis/git/repositories/${repositoryId}/refs?api-version=7.1`;
    if (filter) {
      url += `&filter=${encodeURIComponent(filter)}`;
    }
    let response = await this.http.get(url);
    return (response.data as AzureListResponse<AzureRef>).value;
  }

  async updateRefs(
    repositoryId: string,
    refUpdates: Array<{
      name: string;
      oldObjectId: string;
      newObjectId: string;
    }>
  ): Promise<AzureRefUpdateResult[]> {
    let response = await this.http.post(
      `/${this.project}/_apis/git/repositories/${repositoryId}/refs?api-version=7.1`,
      refUpdates
    );
    return (response.data as AzureListResponse<AzureRefUpdateResult>).value;
  }

  async getBranchStats(
    repositoryId: string,
    branchName?: string,
    baseVersion?: string
  ): Promise<AzureBranchStats[]> {
    let url = `/${this.project}/_apis/git/repositories/${repositoryId}/stats/branches?api-version=7.1`;
    if (branchName) {
      url += `&name=${encodeURIComponent(branchName)}`;
    }
    if (baseVersion) {
      url += `&baseVersionDescriptor.version=${encodeURIComponent(baseVersion)}`;
    }
    let response = await this.http.get(url);
    return (response.data as AzureListResponse<AzureBranchStats>).value;
  }

  // --- Pull Requests ---

  async listPullRequests(
    repositoryId: string,
    options?: {
      status?: string;
      creatorId?: string;
      reviewerId?: string;
      sourceRefName?: string;
      targetRefName?: string;
      top?: number;
      skip?: number;
    }
  ): Promise<AzurePullRequest[]> {
    let params = new URLSearchParams({ 'api-version': '7.1' });
    if (options?.status) params.set('searchCriteria.status', options.status);
    if (options?.creatorId) params.set('searchCriteria.creatorId', options.creatorId);
    if (options?.reviewerId) params.set('searchCriteria.reviewerId', options.reviewerId);
    if (options?.sourceRefName)
      params.set('searchCriteria.sourceRefName', options.sourceRefName);
    if (options?.targetRefName)
      params.set('searchCriteria.targetRefName', options.targetRefName);
    if (options?.top) params.set('$top', options.top.toString());
    if (options?.skip) params.set('$skip', options.skip.toString());

    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests?${params.toString()}`
    );
    return (response.data as AzureListResponse<AzurePullRequest>).value;
  }

  async getPullRequest(
    repositoryId: string,
    pullRequestId: number
  ): Promise<AzurePullRequest> {
    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}?api-version=7.1`
    );
    return response.data as AzurePullRequest;
  }

  async createPullRequest(
    repositoryId: string,
    params: {
      title: string;
      description?: string;
      sourceRefName: string;
      targetRefName: string;
      isDraft?: boolean;
      reviewers?: Array<{ id: string }>;
      autoCompleteSetBy?: { id: string };
      completionOptions?: {
        mergeStrategy?: string;
        deleteSourceBranch?: boolean;
        squashMerge?: boolean;
        mergeCommitMessage?: string;
      };
    }
  ): Promise<AzurePullRequest> {
    let response = await this.http.post(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests?api-version=7.1`,
      params
    );
    return response.data as AzurePullRequest;
  }

  async updatePullRequest(
    repositoryId: string,
    pullRequestId: number,
    updates: {
      title?: string;
      description?: string;
      status?: string;
      targetRefName?: string;
      isDraft?: boolean;
      autoCompleteSetBy?: { id: string } | null;
      completionOptions?: {
        mergeStrategy?: string;
        deleteSourceBranch?: boolean;
        squashMerge?: boolean;
        mergeCommitMessage?: string;
      };
    }
  ): Promise<AzurePullRequest> {
    let response = await this.http.patch(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}?api-version=7.1`,
      updates
    );
    return response.data as AzurePullRequest;
  }

  // --- PR Reviewers ---

  async listPullRequestReviewers(
    repositoryId: string,
    pullRequestId: number
  ): Promise<AzureReviewer[]> {
    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/reviewers?api-version=7.1`
    );
    return (response.data as AzureListResponse<AzureReviewer>).value;
  }

  async addPullRequestReviewer(
    repositoryId: string,
    pullRequestId: number,
    reviewerId: string,
    options?: {
      vote?: number;
      isRequired?: boolean;
    }
  ): Promise<AzureReviewer> {
    let response = await this.http.put(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/reviewers/${reviewerId}?api-version=7.1`,
      { id: reviewerId, vote: options?.vote ?? 0, isRequired: options?.isRequired }
    );
    return response.data as AzureReviewer;
  }

  async removePullRequestReviewer(
    repositoryId: string,
    pullRequestId: number,
    reviewerId: string
  ): Promise<void> {
    await this.http.delete(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/reviewers/${reviewerId}?api-version=7.1`
    );
  }

  // --- PR Comment Threads ---

  async listCommentThreads(
    repositoryId: string,
    pullRequestId: number
  ): Promise<AzureCommentThread[]> {
    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/threads?api-version=7.1`
    );
    return (response.data as AzureListResponse<AzureCommentThread>).value;
  }

  async createCommentThread(
    repositoryId: string,
    pullRequestId: number,
    params: {
      comments: Array<{ content: string; parentCommentId?: number; commentType?: string }>;
      status?: string;
      threadContext?: {
        filePath: string;
        rightFileStart?: { line: number; offset: number };
        rightFileEnd?: { line: number; offset: number };
      };
    }
  ): Promise<AzureCommentThread> {
    let response = await this.http.post(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/threads?api-version=7.1`,
      params
    );
    return response.data as AzureCommentThread;
  }

  async updateCommentThread(
    repositoryId: string,
    pullRequestId: number,
    threadId: number,
    updates: {
      status?: string;
    }
  ): Promise<AzureCommentThread> {
    let response = await this.http.patch(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/threads/${threadId}?api-version=7.1`,
      updates
    );
    return response.data as AzureCommentThread;
  }

  async createComment(
    repositoryId: string,
    pullRequestId: number,
    threadId: number,
    content: string,
    parentCommentId?: number
  ): Promise<AzureCommentThread> {
    let response = await this.http.post(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}/threads/${threadId}/comments?api-version=7.1`,
      { content, parentCommentId }
    );
    return response.data as AzureCommentThread;
  }

  // --- Commits ---

  async listCommits(
    repositoryId: string,
    options?: {
      branch?: string;
      author?: string;
      fromDate?: string;
      toDate?: string;
      itemPath?: string;
      top?: number;
      skip?: number;
    }
  ): Promise<AzureCommit[]> {
    let params = new URLSearchParams({ 'api-version': '7.1' });
    if (options?.branch) params.set('searchCriteria.itemVersion.version', options.branch);
    if (options?.author) params.set('searchCriteria.author', options.author);
    if (options?.fromDate) params.set('searchCriteria.fromDate', options.fromDate);
    if (options?.toDate) params.set('searchCriteria.toDate', options.toDate);
    if (options?.itemPath) params.set('searchCriteria.itemPath', options.itemPath);
    if (options?.top) params.set('searchCriteria.$top', options.top.toString());
    if (options?.skip) params.set('searchCriteria.$skip', options.skip.toString());

    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories/${repositoryId}/commits?${params.toString()}`
    );
    return (response.data as AzureListResponse<AzureCommit>).value;
  }

  async getCommit(repositoryId: string, commitId: string): Promise<AzureCommit> {
    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories/${repositoryId}/commits/${commitId}?api-version=7.1`
    );
    return response.data as AzureCommit;
  }

  // --- Pushes ---

  async listPushes(
    repositoryId: string,
    options?: {
      top?: number;
      skip?: number;
      refName?: string;
      pusherId?: string;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<AzurePush[]> {
    let params = new URLSearchParams({ 'api-version': '7.1' });
    if (options?.top) params.set('$top', options.top.toString());
    if (options?.skip) params.set('$skip', options.skip.toString());
    if (options?.refName) params.set('searchCriteria.refName', options.refName);
    if (options?.pusherId) params.set('searchCriteria.pusherId', options.pusherId);
    if (options?.fromDate) params.set('searchCriteria.fromDate', options.fromDate);
    if (options?.toDate) params.set('searchCriteria.toDate', options.toDate);

    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories/${repositoryId}/pushes?${params.toString()}`
    );
    return (response.data as AzureListResponse<AzurePush>).value;
  }

  // --- Items (Files/Folders) ---

  async getItem(
    repositoryId: string,
    path: string,
    options?: {
      version?: string;
      versionType?: string;
      includeContent?: boolean;
      format?: string;
    }
  ): Promise<AzureItem> {
    let params = new URLSearchParams({
      'api-version': '7.1',
      path
    });
    if (options?.version) params.set('versionDescriptor.version', options.version);
    if (options?.versionType) params.set('versionDescriptor.versionType', options.versionType);
    if (options?.includeContent) params.set('includeContent', 'true');
    if (options?.format) params.set('$format', options.format);

    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories/${repositoryId}/items?${params.toString()}`
    );
    return response.data as AzureItem;
  }

  async getItems(
    repositoryId: string,
    scopePath?: string,
    options?: {
      version?: string;
      versionType?: string;
      recursionLevel?: string;
    }
  ): Promise<AzureItem[]> {
    let params = new URLSearchParams({ 'api-version': '7.1' });
    if (scopePath) params.set('scopePath', scopePath);
    if (options?.version) params.set('versionDescriptor.version', options.version);
    if (options?.versionType) params.set('versionDescriptor.versionType', options.versionType);
    if (options?.recursionLevel) params.set('recursionLevel', options.recursionLevel);

    let response = await this.http.get(
      `/${this.project}/_apis/git/repositories/${repositoryId}/items?${params.toString()}`
    );
    return (response.data as AzureListResponse<AzureItem>).value;
  }

  // --- Code Search ---

  async searchCode(
    searchText: string,
    options?: {
      repositoryName?: string;
      branch?: string;
      path?: string;
      fileExtension?: string;
      top?: number;
      skip?: number;
    }
  ): Promise<{
    count: number;
    results: Array<{
      fileName: string;
      path: string;
      repository: { name: string; id: string };
      project: { name: string; id: string };
      versions: Array<{ branchName: string }>;
      matches: Record<string, Array<{ charOffset: number; length: number }>>;
    }>;
  }> {
    let searchHttp = createAxios({
      baseURL: `https://almsearch.dev.azure.com/${this.organization}`,
      headers: this.http.defaults.headers as Record<string, string>
    });

    let filters: Record<string, string[]> = {
      Project: [this.project]
    };
    if (options?.repositoryName) filters.Repository = [options.repositoryName];
    if (options?.branch) filters.Branch = [options.branch];
    if (options?.path) filters.Path = [options.path];
    if (options?.fileExtension) filters.CodeElement = [options.fileExtension];

    let response = await searchHttp.post(
      `/${this.project}/_apis/search/codesearchresults?api-version=7.1`,
      {
        searchText,
        $skip: options?.skip ?? 0,
        $top: options?.top ?? 25,
        filters
      }
    );

    let data = response.data as {
      count: number;
      results: Array<{
        fileName: string;
        path: string;
        repository: { name: string; id: string };
        project: { name: string; id: string };
        versions: Array<{ branchName: string }>;
        matches: Record<string, Array<{ charOffset: number; length: number }>>;
      }>;
    };

    return data;
  }

  // --- Service Hooks ---

  async createServiceHookSubscription(
    subscription: AzureServiceHookSubscription
  ): Promise<AzureServiceHookSubscription> {
    let hooksHttp = createAxios({
      baseURL: `https://dev.azure.com/${this.organization}`,
      headers: this.http.defaults.headers as Record<string, string>
    });

    let response = await hooksHttp.post(
      '/_apis/hooks/subscriptions?api-version=7.1',
      subscription
    );
    return response.data as AzureServiceHookSubscription;
  }

  async deleteServiceHookSubscription(subscriptionId: string): Promise<void> {
    let hooksHttp = createAxios({
      baseURL: `https://dev.azure.com/${this.organization}`,
      headers: this.http.defaults.headers as Record<string, string>
    });

    await hooksHttp.delete(`/_apis/hooks/subscriptions/${subscriptionId}?api-version=7.1`);
  }
}
