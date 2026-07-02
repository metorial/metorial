import { createAxios } from 'slates';

export interface GitHubClientConfig {
  token: string;
  instanceUrl?: string;
}

export class GitHubClient {
  private http: ReturnType<typeof createAxios>;
  private instanceUrl: string;
  private apiBaseUrl: string;

  constructor(config: GitHubClientConfig) {
    this.instanceUrl = config.instanceUrl?.replace(/\/+$/, '') || 'https://github.com';
    this.apiBaseUrl =
      this.instanceUrl === 'https://github.com'
        ? 'https://api.github.com'
        : `${this.instanceUrl}/api/v3`;

    this.http = createAxios({
      baseURL: this.apiBaseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  }

  private encodePath(path: string) {
    return path
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
  }

  getRepositoryHtmlUrl(owner: string, repo: string) {
    return `${this.instanceUrl}/${owner}/${repo}`;
  }

  // ─── Repositories ──────────────────────────────────────────────

  async listRepositories(
    params: {
      type?: string;
      sort?: string;
      direction?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get('/user/repos', {
      params: {
        type: params.type,
        sort: params.sort,
        direction: params.direction,
        per_page: params.perPage,
        page: params.page
      }
    });
    return response.data;
  }

  async getRepository(owner: string, repo: string) {
    let response = await this.http.get(`/repos/${owner}/${repo}`);
    return response.data;
  }

  async createRepository(data: {
    name: string;
    description?: string;
    private?: boolean;
    autoInit?: boolean;
    gitignoreTemplate?: string;
    licenseTemplate?: string;
    org?: string;
  }) {
    let { org, autoInit, gitignoreTemplate, licenseTemplate, ...rest } = data;
    let body = {
      ...rest,
      auto_init: autoInit,
      gitignore_template: gitignoreTemplate,
      license_template: licenseTemplate
    };

    let url = org ? `/orgs/${org}/repos` : '/user/repos';
    let response = await this.http.post(url, body);
    return response.data;
  }

  async updateRepository(
    owner: string,
    repo: string,
    data: {
      name?: string;
      description?: string;
      homepage?: string;
      private?: boolean;
      hasIssues?: boolean;
      hasProjects?: boolean;
      hasWiki?: boolean;
      defaultBranch?: string;
      archived?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.homepage !== undefined) body.homepage = data.homepage;
    if (data.private !== undefined) body.private = data.private;
    if (data.hasIssues !== undefined) body.has_issues = data.hasIssues;
    if (data.hasProjects !== undefined) body.has_projects = data.hasProjects;
    if (data.hasWiki !== undefined) body.has_wiki = data.hasWiki;
    if (data.defaultBranch !== undefined) body.default_branch = data.defaultBranch;
    if (data.archived !== undefined) body.archived = data.archived;

    let response = await this.http.patch(`/repos/${owner}/${repo}`, body);
    return response.data;
  }

  async deleteRepository(owner: string, repo: string) {
    await this.http.delete(`/repos/${owner}/${repo}`);
  }

  // ─── Issues ────────────────────────────────────────────────────

  async listIssues(
    owner: string,
    repo: string,
    params: {
      state?: string;
      labels?: string;
      sort?: string;
      direction?: string;
      since?: string;
      perPage?: number;
      page?: number;
      assignee?: string;
      milestone?: string;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/issues`, {
      params: {
        ...params,
        per_page: params.perPage
      }
    });
    return response.data;
  }

  async getIssue(owner: string, repo: string, issueNumber: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/issues/${issueNumber}`);
    return response.data;
  }

  async createIssue(
    owner: string,
    repo: string,
    data: {
      title: string;
      body?: string;
      assignees?: string[];
      labels?: string[];
      milestone?: number;
    }
  ) {
    let response = await this.http.post(`/repos/${owner}/${repo}/issues`, data);
    return response.data;
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    data: {
      title?: string;
      body?: string;
      state?: string;
      stateReason?: string;
      assignees?: string[];
      labels?: string[];
      milestone?: number | null;
    }
  ) {
    let body: Record<string, any> = { ...data };
    if (data.stateReason !== undefined) {
      body.state_reason = data.stateReason;
      body.stateReason = undefined;
    }
    let response = await this.http.patch(
      `/repos/${owner}/${repo}/issues/${issueNumber}`,
      body
    );
    return response.data;
  }

  async createIssueComment(owner: string, repo: string, issueNumber: number, body: string) {
    let response = await this.http.post(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      { body }
    );
    return response.data;
  }

  async listIssueComments(
    owner: string,
    repo: string,
    issueNumber: number,
    params: {
      perPage?: number;
      page?: number;
      since?: string;
    } = {}
  ) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        params: { per_page: params.perPage, page: params.page, since: params.since }
      }
    );
    return response.data;
  }

  // ─── Pull Requests ─────────────────────────────────────────────

  async listPullRequests(
    owner: string,
    repo: string,
    params: {
      state?: string;
      head?: string;
      base?: string;
      sort?: string;
      direction?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/pulls`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
    return response.data;
  }

  async createPullRequest(
    owner: string,
    repo: string,
    data: {
      title: string;
      head: string;
      base: string;
      body?: string;
      draft?: boolean;
      maintainerCanModify?: boolean;
    }
  ) {
    let body: Record<string, any> = {
      title: data.title,
      head: data.head,
      base: data.base,
      body: data.body,
      draft: data.draft,
      maintainer_can_modify: data.maintainerCanModify
    };
    let response = await this.http.post(`/repos/${owner}/${repo}/pulls`, body);
    return response.data;
  }

  async updatePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    data: {
      title?: string;
      body?: string;
      state?: string;
      base?: string;
      maintainerCanModify?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.body !== undefined) body.body = data.body;
    if (data.state !== undefined) body.state = data.state;
    if (data.base !== undefined) body.base = data.base;
    if (data.maintainerCanModify !== undefined)
      body.maintainer_can_modify = data.maintainerCanModify;

    let response = await this.http.patch(`/repos/${owner}/${repo}/pulls/${pullNumber}`, body);
    return response.data;
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    data: {
      commitTitle?: string;
      commitMessage?: string;
      mergeMethod?: string;
      sha?: string;
    } = {}
  ) {
    let body: Record<string, any> = {};
    if (data.commitTitle) body.commit_title = data.commitTitle;
    if (data.commitMessage) body.commit_message = data.commitMessage;
    if (data.mergeMethod) body.merge_method = data.mergeMethod;
    if (data.sha) body.sha = data.sha;

    let response = await this.http.put(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
      body
    );
    return response.data;
  }

  async listPullRequestReviews(owner: string, repo: string, pullNumber: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`);
    return response.data;
  }

  async createPullRequestReview(
    owner: string,
    repo: string,
    pullNumber: number,
    data: {
      body?: string;
      event: string;
      comments?: Array<{ path: string; position?: number; body: string }>;
    }
  ) {
    let response = await this.http.post(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
      data
    );
    return response.data;
  }

  async requestReviewers(
    owner: string,
    repo: string,
    pullNumber: number,
    data: {
      reviewers?: string[];
      teamReviewers?: string[];
    }
  ) {
    let body: Record<string, any> = {};
    if (data.reviewers) body.reviewers = data.reviewers;
    if (data.teamReviewers) body.team_reviewers = data.teamReviewers;

    let response = await this.http.post(
      `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`,
      body
    );
    return response.data;
  }

  // ─── Branches ──────────────────────────────────────────────────

  async listBranches(
    owner: string,
    repo: string,
    params: {
      perPage?: number;
      page?: number;
      protected?: boolean;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/branches`, {
      params: { per_page: params.perPage, page: params.page, protected: params.protected }
    });
    return response.data;
  }

  async getBranch(owner: string, repo: string, branch: string) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`
    );
    return response.data;
  }

  // ─── Contents ──────────────────────────────────────────────────

  async getContent(owner: string, repo: string, path: string, ref?: string) {
    let response = await this.http.get(
      `/repos/${owner}/${repo}/contents/${this.encodePath(path)}`,
      {
        params: ref ? { ref } : undefined
      }
    );
    return response.data;
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    data: {
      message: string;
      content: string;
      sha?: string;
      branch?: string;
    }
  ) {
    let response = await this.http.put(
      `/repos/${owner}/${repo}/contents/${this.encodePath(path)}`,
      data
    );
    return response.data;
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    data: {
      message: string;
      sha: string;
      branch?: string;
    }
  ) {
    let response = await this.http.delete(
      `/repos/${owner}/${repo}/contents/${this.encodePath(path)}`,
      {
        data
      }
    );
    return response.data;
  }

  // ─── Labels ────────────────────────────────────────────────────

  async listLabels(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/labels`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async createLabel(
    owner: string,
    repo: string,
    data: { name: string; color?: string; description?: string }
  ) {
    let response = await this.http.post(`/repos/${owner}/${repo}/labels`, data);
    return response.data;
  }

  // ─── Milestones ────────────────────────────────────────────────

  async listMilestones(
    owner: string,
    repo: string,
    params: {
      state?: string;
      sort?: string;
      direction?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/milestones`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  // ─── Workflows / Actions ───────────────────────────────────────

  async listWorkflows(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/workflows`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async listWorkflowRuns(
    owner: string,
    repo: string,
    params: {
      workflowId?: number | string;
      branch?: string;
      event?: string;
      status?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let url = params.workflowId
      ? `/repos/${owner}/${repo}/actions/workflows/${params.workflowId}/runs`
      : `/repos/${owner}/${repo}/actions/runs`;

    let { workflowId, ...queryParams } = params;
    let response = await this.http.get(url, {
      params: { ...queryParams, per_page: queryParams.perPage }
    });
    return response.data;
  }

  async getWorkflowRun(owner: string, repo: string, runId: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/runs/${runId}`);
    return response.data;
  }

  async triggerWorkflowDispatch(
    owner: string,
    repo: string,
    workflowId: number | string,
    data: {
      ref: string;
      inputs?: Record<string, string>;
    }
  ) {
    await this.http.post(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      data
    );
  }

  async cancelWorkflowRun(owner: string, repo: string, runId: number) {
    await this.http.post(`/repos/${owner}/${repo}/actions/runs/${runId}/cancel`);
  }

  async rerunWorkflow(owner: string, repo: string, runId: number) {
    await this.http.post(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun`);
  }

  async listWorkflowRunJobs(
    owner: string,
    repo: string,
    runId: number,
    params: {
      filter?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  // ─── Releases ──────────────────────────────────────────────────

  async listReleases(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/releases`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async getRelease(owner: string, repo: string, releaseId: number) {
    let response = await this.http.get(`/repos/${owner}/${repo}/releases/${releaseId}`);
    return response.data;
  }

  async getLatestRelease(owner: string, repo: string) {
    let response = await this.http.get(`/repos/${owner}/${repo}/releases/latest`);
    return response.data;
  }

  async createRelease(
    owner: string,
    repo: string,
    data: {
      tagName: string;
      targetCommitish?: string;
      name?: string;
      body?: string;
      draft?: boolean;
      prerelease?: boolean;
      generateReleaseNotes?: boolean;
    }
  ) {
    let body: Record<string, any> = {
      tag_name: data.tagName,
      name: data.name,
      body: data.body,
      draft: data.draft,
      prerelease: data.prerelease,
      generate_release_notes: data.generateReleaseNotes
    };
    if (data.targetCommitish) body.target_commitish = data.targetCommitish;

    let response = await this.http.post(`/repos/${owner}/${repo}/releases`, body);
    return response.data;
  }

  // ─── Search ────────────────────────────────────────────────────

  async searchRepositories(
    query: string,
    params: {
      sort?: string;
      order?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get('/search/repositories', {
      params: { q: query, ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async searchCode(
    query: string,
    params: {
      sort?: string;
      order?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get('/search/code', {
      params: { q: query, ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async searchIssues(
    query: string,
    params: {
      sort?: string;
      order?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get('/search/issues', {
      params: { q: query, ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async searchUsers(
    query: string,
    params: {
      sort?: string;
      order?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get('/search/users', {
      params: { q: query, ...params, per_page: params.perPage }
    });
    return response.data;
  }

  // ─── Users ─────────────────────────────────────────────────────

  async getAuthenticatedUser() {
    let response = await this.http.get('/user');
    return response.data;
  }

  async getUser(username: string) {
    let response = await this.http.get(`/users/${username}`);
    return response.data;
  }

  // ─── Organizations ────────────────────────────────────────────

  async listUserOrgs(params: { perPage?: number; page?: number } = {}) {
    let response = await this.http.get('/user/orgs', {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async getOrg(org: string) {
    let response = await this.http.get(`/orgs/${org}`);
    return response.data;
  }

  async listOrgMembers(
    org: string,
    params: { role?: string; perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/orgs/${org}/members`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async listOrgRepos(
    org: string,
    params: {
      type?: string;
      sort?: string;
      direction?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/orgs/${org}/repos`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  // ─── Teams ─────────────────────────────────────────────────────

  async listOrgTeams(org: string, params: { perPage?: number; page?: number } = {}) {
    let response = await this.http.get(`/orgs/${org}/teams`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  // ─── Commits ───────────────────────────────────────────────────

  async listCommits(
    owner: string,
    repo: string,
    params: {
      sha?: string;
      path?: string;
      author?: string;
      since?: string;
      until?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/commits`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async getCommit(owner: string, repo: string, ref: string) {
    let response = await this.http.get(`/repos/${owner}/${repo}/commits/${ref}`);
    return response.data;
  }

  // ─── Collaborators ────────────────────────────────────────────

  async listCollaborators(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/collaborators`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async addCollaborator(owner: string, repo: string, username: string, permission?: string) {
    let response = await this.http.put(`/repos/${owner}/${repo}/collaborators/${username}`, {
      permission
    });
    return response.data;
  }

  async removeCollaborator(owner: string, repo: string, username: string) {
    await this.http.delete(`/repos/${owner}/${repo}/collaborators/${username}`);
  }

  // ─── Webhooks ──────────────────────────────────────────────────

  async createWebhook(
    owner: string,
    repo: string,
    data: {
      url: string;
      contentType?: string;
      secret?: string;
      events?: string[];
      active?: boolean;
    }
  ) {
    let response = await this.http.post(`/repos/${owner}/${repo}/hooks`, {
      name: 'web',
      active: data.active ?? true,
      events: data.events ?? ['push'],
      config: {
        url: data.url,
        content_type: data.contentType ?? 'json',
        secret: data.secret
      }
    });
    return response.data;
  }

  async deleteWebhook(owner: string, repo: string, hookId: number) {
    await this.http.delete(`/repos/${owner}/${repo}/hooks/${hookId}`);
  }

  async listWebhooks(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/hooks`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  // ─── Gists ─────────────────────────────────────────────────────

  async listGists(params: { since?: string; perPage?: number; page?: number } = {}) {
    let response = await this.http.get('/gists', {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async getGist(gistId: string) {
    let response = await this.http.get(`/gists/${gistId}`);
    return response.data;
  }

  async createGist(data: {
    description?: string;
    public?: boolean;
    files: Record<string, { content: string }>;
  }) {
    let response = await this.http.post('/gists', data);
    return response.data;
  }

  async updateGist(
    gistId: string,
    data: {
      description?: string;
      files?: Record<string, { content?: string; filename?: string } | null>;
    }
  ) {
    let response = await this.http.patch(`/gists/${gistId}`, data);
    return response.data;
  }

  async deleteGist(gistId: string) {
    await this.http.delete(`/gists/${gistId}`);
  }

  // ─── Check Runs / Statuses ─────────────────────────────────────

  async listCheckRunsForRef(
    owner: string,
    repo: string,
    ref: string,
    params: {
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/commits/${ref}/check-runs`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async createCommitStatus(
    owner: string,
    repo: string,
    sha: string,
    data: {
      state: string;
      targetUrl?: string;
      description?: string;
      context?: string;
    }
  ) {
    let body: Record<string, any> = {
      state: data.state,
      description: data.description,
      context: data.context
    };
    if (data.targetUrl) body.target_url = data.targetUrl;

    let response = await this.http.post(`/repos/${owner}/${repo}/statuses/${sha}`, body);
    return response.data;
  }

  async getCombinedStatus(owner: string, repo: string, ref: string) {
    let response = await this.http.get(`/repos/${owner}/${repo}/commits/${ref}/status`);
    return response.data;
  }

  // ─── Deployments ───────────────────────────────────────────────

  async listDeployments(
    owner: string,
    repo: string,
    params: {
      environment?: string;
      sha?: string;
      ref?: string;
      perPage?: number;
      page?: number;
    } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/deployments`, {
      params: { ...params, per_page: params.perPage }
    });
    return response.data;
  }

  async createDeployment(
    owner: string,
    repo: string,
    data: {
      ref: string;
      environment?: string;
      description?: string;
      autoMerge?: boolean;
      requiredContexts?: string[];
    }
  ) {
    let body: Record<string, any> = {
      ref: data.ref,
      environment: data.environment,
      description: data.description,
      auto_merge: data.autoMerge,
      required_contexts: data.requiredContexts
    };

    let response = await this.http.post(`/repos/${owner}/${repo}/deployments`, body);
    return response.data;
  }

  async createDeploymentStatus(
    owner: string,
    repo: string,
    deploymentId: number,
    data: {
      state: string;
      targetUrl?: string;
      description?: string;
      environment?: string;
      environmentUrl?: string;
    }
  ) {
    let body: Record<string, any> = {
      state: data.state,
      description: data.description,
      environment: data.environment
    };
    if (data.targetUrl) body.target_url = data.targetUrl;
    if (data.environmentUrl) body.environment_url = data.environmentUrl;

    let response = await this.http.post(
      `/repos/${owner}/${repo}/deployments/${deploymentId}/statuses`,
      body
    );
    return response.data;
  }

  // ─── Tags ──────────────────────────────────────────────────────

  async listTags(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/tags`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  // ─── Forks ─────────────────────────────────────────────────────

  async createFork(
    owner: string,
    repo: string,
    data: { organization?: string; name?: string } = {}
  ) {
    let response = await this.http.post(`/repos/${owner}/${repo}/forks`, data);
    return response.data;
  }

  // ─── Stars ─────────────────────────────────────────────────────

  async listStargazers(
    owner: string,
    repo: string,
    params: { perPage?: number; page?: number } = {}
  ) {
    let response = await this.http.get(`/repos/${owner}/${repo}/stargazers`, {
      params: { per_page: params.perPage, page: params.page }
    });
    return response.data;
  }

  async starRepository(owner: string, repo: string) {
    await this.http.put(`/user/starred/${owner}/${repo}`);
  }

  async unstarRepository(owner: string, repo: string) {
    await this.http.delete(`/user/starred/${owner}/${repo}`);
  }
}
