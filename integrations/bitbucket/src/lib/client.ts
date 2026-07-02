import { createAxios } from '@slates/provider';
import { bitbucketApiError } from './errors';

export class Client {
  private api: ReturnType<typeof createAxios>;

  constructor(private params: { token: string; workspace: string }) {
    let authorization = params.token.startsWith('Basic ')
      ? params.token
      : `Bearer ${params.token}`;

    this.api = createAxios({
      baseURL: 'https://api.bitbucket.org/2.0',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json'
      }
    });
    this.api.interceptors?.response.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(bitbucketApiError(error))
    );
  }

  // ─── Repositories ───

  async listRepositories(opts?: {
    query?: string;
    page?: number;
    pageLen?: number;
    sort?: string;
  }) {
    let params: Record<string, string> = {};
    if (opts?.query) params.q = opts.query;
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);
    if (opts?.sort) params.sort = opts.sort;

    let response = await this.api.get(`/repositories/${this.params.workspace}`, { params });
    return response.data;
  }

  async getRepository(repoSlug: string) {
    let response = await this.api.get(`/repositories/${this.params.workspace}/${repoSlug}`);
    return response.data;
  }

  async createRepository(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}`,
      body
    );
    return response.data;
  }

  async updateRepository(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.put(
      `/repositories/${this.params.workspace}/${repoSlug}`,
      body
    );
    return response.data;
  }

  async deleteRepository(repoSlug: string) {
    await this.api.delete(`/repositories/${this.params.workspace}/${repoSlug}`);
  }

  async forkRepository(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/forks`,
      body
    );
    return response.data;
  }

  // ─── Pull Requests ───

  async listPullRequests(
    repoSlug: string,
    opts?: { state?: string; page?: number; pageLen?: number }
  ) {
    let params: Record<string, string> = {};
    if (opts?.state) params.state = opts.state;
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests`,
      { params }
    );
    return response.data;
  }

  async getPullRequest(repoSlug: string, prId: number) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}`
    );
    return response.data;
  }

  async createPullRequest(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests`,
      body
    );
    return response.data;
  }

  async updatePullRequest(repoSlug: string, prId: number, body: Record<string, any>) {
    let response = await this.api.put(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}`,
      body
    );
    return response.data;
  }

  async approvePullRequest(repoSlug: string, prId: number) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}/approve`
    );
    return response.data;
  }

  async unapprovePullRequest(repoSlug: string, prId: number) {
    await this.api.delete(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}/approve`
    );
  }

  async mergePullRequest(repoSlug: string, prId: number, body?: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}/merge`,
      body || {}
    );
    return response.data;
  }

  async declinePullRequest(repoSlug: string, prId: number) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}/decline`
    );
    return response.data;
  }

  async requestChanges(repoSlug: string, prId: number) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}/request-changes`
    );
    return response.data;
  }

  async removeChangeRequest(repoSlug: string, prId: number) {
    await this.api.delete(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}/request-changes`
    );
  }

  // ─── Pull Request Comments ───

  async listPullRequestComments(
    repoSlug: string,
    prId: number,
    opts?: { page?: number; pageLen?: number }
  ) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}/comments`,
      { params }
    );
    return response.data;
  }

  async createPullRequestComment(repoSlug: string, prId: number, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}/comments`,
      body
    );
    return response.data;
  }

  async getPullRequestDiff(repoSlug: string, prId: number) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/pullrequests/${prId}/diff`
    );
    return response.data;
  }

  // ─── Commits ───

  async listCommits(
    repoSlug: string,
    opts?: { branch?: string; page?: number; pageLen?: number }
  ) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let path = opts?.branch
      ? `/repositories/${this.params.workspace}/${repoSlug}/commits/${opts.branch}`
      : `/repositories/${this.params.workspace}/${repoSlug}/commits`;

    let response = await this.api.get(path, { params });
    return response.data;
  }

  async getCommit(repoSlug: string, commitHash: string) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/commit/${commitHash}`
    );
    return response.data;
  }

  async createCommitComment(repoSlug: string, commitHash: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/commit/${commitHash}/comments`,
      body
    );
    return response.data;
  }

  async listCommitStatuses(
    repoSlug: string,
    commitHash: string,
    opts?: { page?: number; pageLen?: number }
  ) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/commit/${commitHash}/statuses`,
      { params }
    );
    return response.data;
  }

  async createCommitStatus(repoSlug: string, commitHash: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/commit/${commitHash}/statuses/build`,
      body
    );
    return response.data;
  }

  // ─── Branches & Tags ───

  async listBranches(
    repoSlug: string,
    opts?: { query?: string; page?: number; pageLen?: number; sort?: string }
  ) {
    let params: Record<string, string> = {};
    if (opts?.query) params.q = opts.query;
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);
    if (opts?.sort) params.sort = opts.sort;

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/refs/branches`,
      { params }
    );
    return response.data;
  }

  async createBranch(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/refs/branches`,
      body
    );
    return response.data;
  }

  async deleteBranch(repoSlug: string, branchName: string) {
    await this.api.delete(
      `/repositories/${this.params.workspace}/${repoSlug}/refs/branches/${branchName}`
    );
  }

  async listTags(
    repoSlug: string,
    opts?: { query?: string; page?: number; pageLen?: number; sort?: string }
  ) {
    let params: Record<string, string> = {};
    if (opts?.query) params.q = opts.query;
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);
    if (opts?.sort) params.sort = opts.sort;

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/refs/tags`,
      { params }
    );
    return response.data;
  }

  async createTag(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/refs/tags`,
      body
    );
    return response.data;
  }

  async deleteTag(repoSlug: string, tagName: string) {
    await this.api.delete(
      `/repositories/${this.params.workspace}/${repoSlug}/refs/tags/${tagName}`
    );
  }

  // ─── Issues ───

  async listIssues(
    repoSlug: string,
    opts?: { query?: string; page?: number; pageLen?: number; sort?: string }
  ) {
    let params: Record<string, string> = {};
    if (opts?.query) params.q = opts.query;
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);
    if (opts?.sort) params.sort = opts.sort;

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/issues`,
      { params }
    );
    return response.data;
  }

  async getIssue(repoSlug: string, issueId: number) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/issues/${issueId}`
    );
    return response.data;
  }

  async createIssue(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/issues`,
      body
    );
    return response.data;
  }

  async updateIssue(repoSlug: string, issueId: number, body: Record<string, any>) {
    let response = await this.api.put(
      `/repositories/${this.params.workspace}/${repoSlug}/issues/${issueId}`,
      body
    );
    return response.data;
  }

  async deleteIssue(repoSlug: string, issueId: number) {
    await this.api.delete(
      `/repositories/${this.params.workspace}/${repoSlug}/issues/${issueId}`
    );
  }

  async createIssueComment(repoSlug: string, issueId: number, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/issues/${issueId}/comments`,
      body
    );
    return response.data;
  }

  async listIssueComments(
    repoSlug: string,
    issueId: number,
    opts?: { page?: number; pageLen?: number }
  ) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/issues/${issueId}/comments`,
      { params }
    );
    return response.data;
  }

  // ─── Pipelines ───

  async listPipelines(
    repoSlug: string,
    opts?: { page?: number; pageLen?: number; sort?: string }
  ) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);
    if (opts?.sort) params.sort = opts.sort;

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/pipelines`,
      { params }
    );
    return response.data;
  }

  async getPipeline(repoSlug: string, pipelineUuid: string) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/pipelines/${pipelineUuid}`
    );
    return response.data;
  }

  async triggerPipeline(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/pipelines`,
      body
    );
    return response.data;
  }

  async stopPipeline(repoSlug: string, pipelineUuid: string) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/pipelines/${pipelineUuid}/stopPipeline`
    );
    return response.data;
  }

  async listPipelineSteps(
    repoSlug: string,
    pipelineUuid: string,
    opts?: { page?: number; pageLen?: number }
  ) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/pipelines/${pipelineUuid}/steps`,
      { params }
    );
    return response.data;
  }

  async getPipelineStepLog(repoSlug: string, pipelineUuid: string, stepUuid: string) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/pipelines/${pipelineUuid}/steps/${stepUuid}/log`,
      {
        headers: { Accept: 'application/octet-stream' },
        responseType: 'text'
      }
    );
    return response.data;
  }

  // ─── Pipeline Variables ───

  async listPipelineVariables(repoSlug: string, opts?: { page?: number; pageLen?: number }) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/pipelines_config/variables`,
      { params }
    );
    return response.data;
  }

  async createPipelineVariable(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/pipelines_config/variables`,
      body
    );
    return response.data;
  }

  async updatePipelineVariable(
    repoSlug: string,
    variableUuid: string,
    body: Record<string, any>
  ) {
    let response = await this.api.put(
      `/repositories/${this.params.workspace}/${repoSlug}/pipelines_config/variables/${variableUuid}`,
      body
    );
    return response.data;
  }

  async deletePipelineVariable(repoSlug: string, variableUuid: string) {
    await this.api.delete(
      `/repositories/${this.params.workspace}/${repoSlug}/pipelines_config/variables/${variableUuid}`
    );
  }

  // ─── Deployments ───

  async listDeploymentEnvironments(
    repoSlug: string,
    opts?: { page?: number; pageLen?: number }
  ) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/environments`,
      { params }
    );
    return response.data;
  }

  async getDeploymentEnvironment(repoSlug: string, environmentUuid: string) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/environments/${environmentUuid}`
    );
    return response.data;
  }

  // ─── Source / File Browsing ───

  async getSource(repoSlug: string, opts: { revision: string; path: string }) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/src/${opts.revision}/${opts.path}`
    );
    return response.data;
  }

  async getFileContent(repoSlug: string, opts: { revision: string; path: string }) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/src/${opts.revision}/${opts.path}`,
      {
        headers: { Accept: 'application/json' }
      }
    );
    return response.data;
  }

  // ─── Diff ───

  async getDiff(repoSlug: string, diffSpec: string) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/diff/${diffSpec}`
    );
    return response.data;
  }

  // ─── Webhooks ───

  async listWebhooks(repoSlug: string, opts?: { page?: number; pageLen?: number }) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/hooks`,
      { params }
    );
    return response.data;
  }

  async createWebhook(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/hooks`,
      body
    );
    return response.data;
  }

  async getWebhook(repoSlug: string, webhookUuid: string) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/hooks/${webhookUuid}`
    );
    return response.data;
  }

  async updateWebhook(repoSlug: string, webhookUuid: string, body: Record<string, any>) {
    let response = await this.api.put(
      `/repositories/${this.params.workspace}/${repoSlug}/hooks/${webhookUuid}`,
      body
    );
    return response.data;
  }

  async deleteWebhook(repoSlug: string, webhookUuid: string) {
    await this.api.delete(
      `/repositories/${this.params.workspace}/${repoSlug}/hooks/${webhookUuid}`
    );
  }

  // ─── Workspace Webhooks ───

  async listWorkspaceWebhooks(opts?: { page?: number; pageLen?: number }) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(`/workspaces/${this.params.workspace}/hooks`, {
      params
    });
    return response.data;
  }

  async createWorkspaceWebhook(body: Record<string, any>) {
    let response = await this.api.post(`/workspaces/${this.params.workspace}/hooks`, body);
    return response.data;
  }

  async deleteWorkspaceWebhook(webhookUuid: string) {
    await this.api.delete(`/workspaces/${this.params.workspace}/hooks/${webhookUuid}`);
  }

  // ─── Workspace Members ───

  async listWorkspaceMembers(opts?: { page?: number; pageLen?: number }) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(`/workspaces/${this.params.workspace}/members`, {
      params
    });
    return response.data;
  }

  // ─── Projects ───

  async listProjects(opts?: { page?: number; pageLen?: number }) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(`/workspaces/${this.params.workspace}/projects`, {
      params
    });
    return response.data;
  }

  async getProject(projectKey: string) {
    let response = await this.api.get(
      `/workspaces/${this.params.workspace}/projects/${projectKey}`
    );
    return response.data;
  }

  async createProject(body: Record<string, any>) {
    // Trailing slash matches Bitbucket docs; some workspaces return 400 without it.
    let response = await this.api.post(`/workspaces/${this.params.workspace}/projects/`, body);
    return response.data;
  }

  async updateProject(projectKey: string, body: Record<string, any>) {
    let response = await this.api.put(
      `/workspaces/${this.params.workspace}/projects/${projectKey}`,
      body
    );
    return response.data;
  }

  async deleteProject(projectKey: string) {
    await this.api.delete(`/workspaces/${this.params.workspace}/projects/${projectKey}`);
  }

  // ─── Code Search ───

  async searchCode(searchQuery: string, opts?: { page?: number; pageLen?: number }) {
    let params: Record<string, string> = {
      search_query: searchQuery
    };
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(`/workspaces/${this.params.workspace}/search/code`, {
      params
    });
    return response.data;
  }

  // ─── User ───

  async getCurrentUser() {
    let response = await this.api.get('/user');
    return response.data;
  }

  // ─── Default Reviewers ───

  async listDefaultReviewers(repoSlug: string, opts?: { page?: number; pageLen?: number }) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/default-reviewers`,
      { params }
    );
    return response.data;
  }

  async listEffectiveDefaultReviewers(
    repoSlug: string,
    opts?: { page?: number; pageLen?: number }
  ) {
    let params: Record<string, string> = {};
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/effective-default-reviewers`,
      { params }
    );
    return response.data;
  }

  async getDefaultReviewer(repoSlug: string, userSlug: string) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/default-reviewers/${encodeURIComponent(userSlug)}`
    );
    return response.data;
  }

  async addDefaultReviewer(repoSlug: string, userSlug: string) {
    let response = await this.api.put(
      `/repositories/${this.params.workspace}/${repoSlug}/default-reviewers/${encodeURIComponent(userSlug)}`
    );
    return response.data;
  }

  async removeDefaultReviewer(repoSlug: string, userSlug: string) {
    await this.api.delete(
      `/repositories/${this.params.workspace}/${repoSlug}/default-reviewers/${encodeURIComponent(userSlug)}`
    );
  }

  // ─── Branch Restrictions ───

  async listBranchRestrictions(
    repoSlug: string,
    opts?: { kind?: string; pattern?: string; page?: number; pageLen?: number }
  ) {
    let params: Record<string, string> = {};
    if (opts?.kind) params.kind = opts.kind;
    if (opts?.pattern) params.pattern = opts.pattern;
    if (opts?.page) params.page = String(opts.page);
    if (opts?.pageLen) params.pagelen = String(opts.pageLen);

    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/branch-restrictions`,
      { params }
    );
    return response.data;
  }

  async getBranchRestriction(repoSlug: string, restrictionId: string | number) {
    let response = await this.api.get(
      `/repositories/${this.params.workspace}/${repoSlug}/branch-restrictions/${restrictionId}`
    );
    return response.data;
  }

  async createBranchRestriction(repoSlug: string, body: Record<string, any>) {
    let response = await this.api.post(
      `/repositories/${this.params.workspace}/${repoSlug}/branch-restrictions`,
      body
    );
    return response.data;
  }

  async updateBranchRestriction(
    repoSlug: string,
    restrictionId: string | number,
    body: Record<string, any>
  ) {
    let response = await this.api.put(
      `/repositories/${this.params.workspace}/${repoSlug}/branch-restrictions/${restrictionId}`,
      body
    );
    return response.data;
  }

  async deleteBranchRestriction(repoSlug: string, restrictionId: string | number) {
    await this.api.delete(
      `/repositories/${this.params.workspace}/${repoSlug}/branch-restrictions/${restrictionId}`
    );
  }
}
