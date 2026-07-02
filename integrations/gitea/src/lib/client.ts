import { createAxios } from 'slates';
import type {
  GiteaBranch,
  GiteaComment,
  GiteaCommit,
  GiteaFileContent,
  GiteaFileResponse,
  GiteaIssue,
  GiteaLabel,
  GiteaMilestone,
  GiteaOrganization,
  GiteaPullRequest,
  GiteaRelease,
  GiteaRepository,
  GiteaTag,
  GiteaTeam,
  GiteaUser,
  GiteaWebhook,
  GiteaWikiPage
} from './types';

export class GiteaClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(opts: { token: string; baseUrl: string }) {
    let baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL: `${baseUrl}/api/v1`,
      headers: {
        Authorization: `token ${opts.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── User ──────────────────────────────────────────────────────────

  async getAuthenticatedUser(): Promise<GiteaUser> {
    let response = await this.axios.get('/user');
    return response.data as GiteaUser;
  }

  async getUserByUsername(username: string): Promise<GiteaUser> {
    let response = await this.axios.get(`/users/${encodeURIComponent(username)}`);
    return response.data as GiteaUser;
  }

  // ─── Repository ────────────────────────────────────────────────────

  async listMyRepos(params?: {
    page?: number;
    limit?: number;
    sort?: string;
    order?: string;
  }): Promise<GiteaRepository[]> {
    let response = await this.axios.get('/user/repos', { params });
    return response.data as GiteaRepository[];
  }

  async searchRepos(params: {
    q?: string;
    topic?: boolean;
    page?: number;
    limit?: number;
    sort?: string;
    order?: string;
  }): Promise<GiteaRepository[]> {
    let response = await this.axios.get('/repos/search', { params });
    let data = response.data as { ok: boolean; data: GiteaRepository[] };
    return data.data || (response.data as GiteaRepository[]);
  }

  async getRepo(owner: string, repo: string): Promise<GiteaRepository> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    );
    return response.data as GiteaRepository;
  }

  async createRepo(opts: {
    name: string;
    description?: string;
    private?: boolean;
    autoInit?: boolean;
    defaultBranch?: string;
    gitignores?: string;
    license?: string;
    readme?: string;
  }): Promise<GiteaRepository> {
    let response = await this.axios.post('/user/repos', {
      name: opts.name,
      description: opts.description,
      private: opts.private,
      auto_init: opts.autoInit,
      default_branch: opts.defaultBranch,
      gitignores: opts.gitignores,
      license: opts.license,
      readme: opts.readme
    });
    return response.data as GiteaRepository;
  }

  async createOrgRepo(
    org: string,
    opts: {
      name: string;
      description?: string;
      private?: boolean;
      autoInit?: boolean;
      defaultBranch?: string;
    }
  ): Promise<GiteaRepository> {
    let response = await this.axios.post(`/orgs/${encodeURIComponent(org)}/repos`, {
      name: opts.name,
      description: opts.description,
      private: opts.private,
      auto_init: opts.autoInit,
      default_branch: opts.defaultBranch
    });
    return response.data as GiteaRepository;
  }

  async updateRepo(
    owner: string,
    repo: string,
    opts: {
      name?: string;
      description?: string;
      private?: boolean;
      archived?: boolean;
      defaultBranch?: string;
      hasIssues?: boolean;
      hasWiki?: boolean;
      hasPullRequests?: boolean;
      hasProjects?: boolean;
    }
  ): Promise<GiteaRepository> {
    let response = await this.axios.patch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      {
        name: opts.name,
        description: opts.description,
        private: opts.private,
        archived: opts.archived,
        default_branch: opts.defaultBranch,
        has_issues: opts.hasIssues,
        has_wiki: opts.hasWiki,
        has_pull_requests: opts.hasPullRequests,
        has_projects: opts.hasProjects
      }
    );
    return response.data as GiteaRepository;
  }

  async deleteRepo(owner: string, repo: string): Promise<void> {
    await this.axios.delete(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  }

  async forkRepo(
    owner: string,
    repo: string,
    opts?: { organization?: string; name?: string }
  ): Promise<GiteaRepository> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/forks`,
      {
        organization: opts?.organization,
        name: opts?.name
      }
    );
    return response.data as GiteaRepository;
  }

  async transferRepo(
    owner: string,
    repo: string,
    newOwner: string,
    teamIds?: number[]
  ): Promise<GiteaRepository> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/transfer`,
      {
        new_owner: newOwner,
        team_ids: teamIds
      }
    );
    return response.data as GiteaRepository;
  }

  // ─── Branch ────────────────────────────────────────────────────────

  async listBranches(
    owner: string,
    repo: string,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaBranch[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`,
      { params }
    );
    return response.data as GiteaBranch[];
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<GiteaBranch> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`
    );
    return response.data as GiteaBranch;
  }

  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    oldBranchName?: string
  ): Promise<GiteaBranch> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`,
      {
        new_branch_name: branchName,
        old_branch_name: oldBranchName
      }
    );
    return response.data as GiteaBranch;
  }

  async deleteBranch(owner: string, repo: string, branch: string): Promise<void> {
    await this.axios.delete(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`
    );
  }

  // ─── Tag ───────────────────────────────────────────────────────────

  async listTags(
    owner: string,
    repo: string,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaTag[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tags`,
      { params }
    );
    return response.data as GiteaTag[];
  }

  async createTag(
    owner: string,
    repo: string,
    tagName: string,
    target: string,
    message?: string
  ): Promise<GiteaTag> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tags`,
      {
        tag_name: tagName,
        target,
        message
      }
    );
    return response.data as GiteaTag;
  }

  async deleteTag(owner: string, repo: string, tagName: string): Promise<void> {
    await this.axios.delete(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tags/${encodeURIComponent(tagName)}`
    );
  }

  // ─── Commit ────────────────────────────────────────────────────────

  async listCommits(
    owner: string,
    repo: string,
    params?: { sha?: string; page?: number; limit?: number; path?: string }
  ): Promise<GiteaCommit[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
      { params }
    );
    return response.data as GiteaCommit[];
  }

  async getCommit(owner: string, repo: string, sha: string): Promise<GiteaCommit> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(sha)}`
    );
    return response.data as GiteaCommit;
  }

  // ─── File Content ──────────────────────────────────────────────────

  async getFileContent(
    owner: string,
    repo: string,
    filepath: string,
    ref?: string
  ): Promise<GiteaFileContent> {
    let params: Record<string, string> = {};
    if (ref) params.ref = ref;
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filepath}`,
      { params }
    );
    return response.data as GiteaFileContent;
  }

  async createFile(
    owner: string,
    repo: string,
    filepath: string,
    opts: {
      content: string;
      message: string;
      branch?: string;
      author?: { name: string; email: string };
    }
  ): Promise<GiteaFileResponse> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filepath}`,
      {
        content: opts.content,
        message: opts.message,
        branch: opts.branch,
        author: opts.author
      }
    );
    return response.data as GiteaFileResponse;
  }

  async updateFile(
    owner: string,
    repo: string,
    filepath: string,
    opts: {
      content: string;
      message: string;
      sha: string;
      branch?: string;
      author?: { name: string; email: string };
    }
  ): Promise<GiteaFileResponse> {
    let response = await this.axios.put(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filepath}`,
      {
        content: opts.content,
        message: opts.message,
        sha: opts.sha,
        branch: opts.branch,
        author: opts.author
      }
    );
    return response.data as GiteaFileResponse;
  }

  async deleteFile(
    owner: string,
    repo: string,
    filepath: string,
    opts: {
      message: string;
      sha: string;
      branch?: string;
    }
  ): Promise<void> {
    await this.axios.delete(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filepath}`,
      {
        data: {
          message: opts.message,
          sha: opts.sha,
          branch: opts.branch
        }
      }
    );
  }

  // ─── Issue ─────────────────────────────────────────────────────────

  async listRepoIssues(
    owner: string,
    repo: string,
    params?: {
      state?: string;
      type?: string;
      labels?: string;
      milestones?: string;
      page?: number;
      limit?: number;
      sort?: string;
      assignedBy?: string;
    }
  ): Promise<GiteaIssue[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      { params }
    );
    return response.data as GiteaIssue[];
  }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GiteaIssue> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`
    );
    return response.data as GiteaIssue;
  }

  async createIssue(
    owner: string,
    repo: string,
    opts: {
      title: string;
      body?: string;
      assignees?: string[];
      labels?: number[];
      milestone?: number;
      dueDate?: string;
    }
  ): Promise<GiteaIssue> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      {
        title: opts.title,
        body: opts.body,
        assignees: opts.assignees,
        labels: opts.labels,
        milestone: opts.milestone,
        due_date: opts.dueDate
      }
    );
    return response.data as GiteaIssue;
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    opts: {
      title?: string;
      body?: string;
      state?: string;
      assignees?: string[];
      dueDate?: string | null;
      milestone?: number | null;
    }
  ): Promise<GiteaIssue> {
    let payload: Record<string, unknown> = {};
    if (opts.title !== undefined) payload.title = opts.title;
    if (opts.body !== undefined) payload.body = opts.body;
    if (opts.state !== undefined) payload.state = opts.state;
    if (opts.assignees !== undefined) payload.assignees = opts.assignees;
    if (opts.dueDate !== undefined) payload.due_date = opts.dueDate;
    if (opts.milestone !== undefined) payload.milestone = opts.milestone;

    let response = await this.axios.patch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
      payload
    );
    return response.data as GiteaIssue;
  }

  async addIssueLabels(
    owner: string,
    repo: string,
    issueNumber: number,
    labelIds: number[]
  ): Promise<GiteaLabel[]> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/labels`,
      {
        labels: labelIds
      }
    );
    return response.data as GiteaLabel[];
  }

  async removeIssueLabel(
    owner: string,
    repo: string,
    issueNumber: number,
    labelId: number
  ): Promise<void> {
    await this.axios.delete(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/labels/${labelId}`
    );
  }

  async listIssueComments(
    owner: string,
    repo: string,
    issueNumber: number,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaComment[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
      { params }
    );
    return response.data as GiteaComment[];
  }

  async createIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<GiteaComment> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`,
      { body }
    );
    return response.data as GiteaComment;
  }

  async updateIssueComment(
    owner: string,
    repo: string,
    commentId: number,
    body: string
  ): Promise<GiteaComment> {
    let response = await this.axios.patch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/comments/${commentId}`,
      { body }
    );
    return response.data as GiteaComment;
  }

  async deleteIssueComment(owner: string, repo: string, commentId: number): Promise<void> {
    await this.axios.delete(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/comments/${commentId}`
    );
  }

  // ─── Labels ────────────────────────────────────────────────────────

  async listRepoLabels(
    owner: string,
    repo: string,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaLabel[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/labels`,
      { params }
    );
    return response.data as GiteaLabel[];
  }

  async createLabel(
    owner: string,
    repo: string,
    opts: { name: string; color: string; description?: string }
  ): Promise<GiteaLabel> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/labels`,
      opts
    );
    return response.data as GiteaLabel;
  }

  // ─── Milestones ────────────────────────────────────────────────────

  async listMilestones(
    owner: string,
    repo: string,
    params?: { state?: string; page?: number; limit?: number }
  ): Promise<GiteaMilestone[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/milestones`,
      { params }
    );
    return response.data as GiteaMilestone[];
  }

  async createMilestone(
    owner: string,
    repo: string,
    opts: { title: string; description?: string; dueOn?: string; state?: string }
  ): Promise<GiteaMilestone> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/milestones`,
      {
        title: opts.title,
        description: opts.description,
        due_on: opts.dueOn,
        state: opts.state
      }
    );
    return response.data as GiteaMilestone;
  }

  // ─── Pull Request ──────────────────────────────────────────────────

  async listPullRequests(
    owner: string,
    repo: string,
    params?: {
      state?: string;
      sort?: string;
      milestone?: number;
      labels?: number[];
      page?: number;
      limit?: number;
    }
  ): Promise<GiteaPullRequest[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
      { params }
    );
    return response.data as GiteaPullRequest[];
  }

  async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GiteaPullRequest> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`
    );
    return response.data as GiteaPullRequest;
  }

  async createPullRequest(
    owner: string,
    repo: string,
    opts: {
      title: string;
      body?: string;
      head: string;
      base: string;
      assignees?: string[];
      labels?: number[];
      milestone?: number;
    }
  ): Promise<GiteaPullRequest> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
      {
        title: opts.title,
        body: opts.body,
        head: opts.head,
        base: opts.base,
        assignees: opts.assignees,
        labels: opts.labels,
        milestone: opts.milestone
      }
    );
    return response.data as GiteaPullRequest;
  }

  async updatePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    opts: {
      title?: string;
      body?: string;
      state?: string;
      assignees?: string[];
      labels?: number[];
      milestone?: number | null;
      base?: string;
    }
  ): Promise<GiteaPullRequest> {
    let payload: Record<string, unknown> = {};
    if (opts.title !== undefined) payload.title = opts.title;
    if (opts.body !== undefined) payload.body = opts.body;
    if (opts.state !== undefined) payload.state = opts.state;
    if (opts.assignees !== undefined) payload.assignees = opts.assignees;
    if (opts.labels !== undefined) payload.labels = opts.labels;
    if (opts.milestone !== undefined) payload.milestone = opts.milestone;
    if (opts.base !== undefined) payload.base = opts.base;

    let response = await this.axios.patch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`,
      payload
    );
    return response.data as GiteaPullRequest;
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    opts?: {
      mergeMethod?: string;
      mergeCommitMessage?: string;
      mergeMessageField?: string;
      deleteBranchAfterMerge?: boolean;
    }
  ): Promise<void> {
    await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/merge`,
      {
        Do: opts?.mergeMethod || 'merge',
        merge_message_field: opts?.mergeMessageField,
        merge_commit_message: opts?.mergeCommitMessage,
        delete_branch_after_merge: opts?.deleteBranchAfterMerge
      }
    );
  }

  async listPullRequestReviews(
    owner: string,
    repo: string,
    prNumber: number,
    params?: { page?: number; limit?: number }
  ): Promise<
    Array<{
      id: number;
      body: string;
      state: string;
      user: GiteaUser;
      html_url: string;
      submitted_at: string;
      commit_id: string;
    }>
  > {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/reviews`,
      { params }
    );
    return response.data as Array<{
      id: number;
      body: string;
      state: string;
      user: GiteaUser;
      html_url: string;
      submitted_at: string;
      commit_id: string;
    }>;
  }

  async createPullRequestReview(
    owner: string,
    repo: string,
    prNumber: number,
    opts: {
      body?: string;
      event: string;
      comments?: Array<{
        path: string;
        body: string;
        new_position?: number;
        old_position?: number;
      }>;
    }
  ): Promise<{
    id: number;
    body: string;
    state: string;
    user: GiteaUser;
    html_url: string;
    submitted_at: string;
    commit_id: string;
  }> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/reviews`,
      {
        body: opts.body,
        event: opts.event,
        comments: opts.comments
      }
    );
    return response.data as {
      id: number;
      body: string;
      state: string;
      user: GiteaUser;
      html_url: string;
      submitted_at: string;
      commit_id: string;
    };
  }

  // ─── Release ───────────────────────────────────────────────────────

  async listReleases(
    owner: string,
    repo: string,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaRelease[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`,
      { params }
    );
    return response.data as GiteaRelease[];
  }

  async getRelease(owner: string, repo: string, releaseId: number): Promise<GiteaRelease> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/${releaseId}`
    );
    return response.data as GiteaRelease;
  }

  async createRelease(
    owner: string,
    repo: string,
    opts: {
      tagName: string;
      targetCommitish?: string;
      name?: string;
      body?: string;
      draft?: boolean;
      prerelease?: boolean;
    }
  ): Promise<GiteaRelease> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`,
      {
        tag_name: opts.tagName,
        target_commitish: opts.targetCommitish,
        name: opts.name,
        body: opts.body,
        draft: opts.draft,
        prerelease: opts.prerelease
      }
    );
    return response.data as GiteaRelease;
  }

  async updateRelease(
    owner: string,
    repo: string,
    releaseId: number,
    opts: {
      tagName?: string;
      name?: string;
      body?: string;
      draft?: boolean;
      prerelease?: boolean;
    }
  ): Promise<GiteaRelease> {
    let response = await this.axios.patch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/${releaseId}`,
      {
        tag_name: opts.tagName,
        name: opts.name,
        body: opts.body,
        draft: opts.draft,
        prerelease: opts.prerelease
      }
    );
    return response.data as GiteaRelease;
  }

  async deleteRelease(owner: string, repo: string, releaseId: number): Promise<void> {
    await this.axios.delete(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/${releaseId}`
    );
  }

  // ─── Organization ──────────────────────────────────────────────────

  async listMyOrgs(params?: { page?: number; limit?: number }): Promise<GiteaOrganization[]> {
    let response = await this.axios.get('/user/orgs', { params });
    return response.data as GiteaOrganization[];
  }

  async getOrg(orgName: string): Promise<GiteaOrganization> {
    let response = await this.axios.get(`/orgs/${encodeURIComponent(orgName)}`);
    return response.data as GiteaOrganization;
  }

  async createOrg(opts: {
    username: string;
    fullName?: string;
    description?: string;
    website?: string;
    location?: string;
    visibility?: string;
  }): Promise<GiteaOrganization> {
    let response = await this.axios.post('/orgs', {
      username: opts.username,
      full_name: opts.fullName,
      description: opts.description,
      website: opts.website,
      location: opts.location,
      visibility: opts.visibility
    });
    return response.data as GiteaOrganization;
  }

  async updateOrg(
    orgName: string,
    opts: {
      fullName?: string;
      description?: string;
      website?: string;
      location?: string;
      visibility?: string;
    }
  ): Promise<GiteaOrganization> {
    let response = await this.axios.patch(`/orgs/${encodeURIComponent(orgName)}`, {
      full_name: opts.fullName,
      description: opts.description,
      website: opts.website,
      location: opts.location,
      visibility: opts.visibility
    });
    return response.data as GiteaOrganization;
  }

  async deleteOrg(orgName: string): Promise<void> {
    await this.axios.delete(`/orgs/${encodeURIComponent(orgName)}`);
  }

  async listOrgRepos(
    orgName: string,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaRepository[]> {
    let response = await this.axios.get(`/orgs/${encodeURIComponent(orgName)}/repos`, {
      params
    });
    return response.data as GiteaRepository[];
  }

  // ─── Teams ─────────────────────────────────────────────────────────

  async listOrgTeams(
    orgName: string,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaTeam[]> {
    let response = await this.axios.get(`/orgs/${encodeURIComponent(orgName)}/teams`, {
      params
    });
    return response.data as GiteaTeam[];
  }

  async getTeam(teamId: number): Promise<GiteaTeam> {
    let response = await this.axios.get(`/teams/${teamId}`);
    return response.data as GiteaTeam;
  }

  async createTeam(
    orgName: string,
    opts: {
      name: string;
      description?: string;
      permission?: string;
      units?: string[];
      includesAllRepositories?: boolean;
    }
  ): Promise<GiteaTeam> {
    let response = await this.axios.post(`/orgs/${encodeURIComponent(orgName)}/teams`, {
      name: opts.name,
      description: opts.description,
      permission: opts.permission,
      units: opts.units,
      includes_all_repositories: opts.includesAllRepositories
    });
    return response.data as GiteaTeam;
  }

  async addTeamMember(teamId: number, username: string): Promise<void> {
    await this.axios.put(`/teams/${teamId}/members/${encodeURIComponent(username)}`);
  }

  async removeTeamMember(teamId: number, username: string): Promise<void> {
    await this.axios.delete(`/teams/${teamId}/members/${encodeURIComponent(username)}`);
  }

  async listTeamMembers(
    teamId: number,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaUser[]> {
    let response = await this.axios.get(`/teams/${teamId}/members`, { params });
    return response.data as GiteaUser[];
  }

  // ─── Collaborators ─────────────────────────────────────────────────

  async listCollaborators(
    owner: string,
    repo: string,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaUser[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators`,
      { params }
    );
    return response.data as GiteaUser[];
  }

  async addCollaborator(
    owner: string,
    repo: string,
    username: string,
    permission?: string
  ): Promise<void> {
    await this.axios.put(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators/${encodeURIComponent(username)}`,
      {
        permission
      }
    );
  }

  async removeCollaborator(owner: string, repo: string, username: string): Promise<void> {
    await this.axios.delete(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators/${encodeURIComponent(username)}`
    );
  }

  // ─── Wiki ──────────────────────────────────────────────────────────

  async listWikiPages(
    owner: string,
    repo: string,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaWikiPage[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/wiki/pages`,
      { params }
    );
    return response.data as GiteaWikiPage[];
  }

  async getWikiPage(owner: string, repo: string, pageName: string): Promise<GiteaWikiPage> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/wiki/page/${encodeURIComponent(pageName)}`
    );
    return response.data as GiteaWikiPage;
  }

  async createWikiPage(
    owner: string,
    repo: string,
    opts: { title: string; contentBase64: string; message?: string }
  ): Promise<GiteaWikiPage> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/wiki/new`,
      {
        title: opts.title,
        content_base64: opts.contentBase64,
        message: opts.message
      }
    );
    return response.data as GiteaWikiPage;
  }

  async updateWikiPage(
    owner: string,
    repo: string,
    pageName: string,
    opts: { title?: string; contentBase64?: string; message?: string }
  ): Promise<GiteaWikiPage> {
    let response = await this.axios.patch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/wiki/page/${encodeURIComponent(pageName)}`,
      {
        title: opts.title,
        content_base64: opts.contentBase64,
        message: opts.message
      }
    );
    return response.data as GiteaWikiPage;
  }

  async deleteWikiPage(owner: string, repo: string, pageName: string): Promise<void> {
    await this.axios.delete(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/wiki/page/${encodeURIComponent(pageName)}`
    );
  }

  // ─── Webhook ───────────────────────────────────────────────────────

  async listRepoWebhooks(
    owner: string,
    repo: string,
    params?: { page?: number; limit?: number }
  ): Promise<GiteaWebhook[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`,
      { params }
    );
    return response.data as GiteaWebhook[];
  }

  async createRepoWebhook(
    owner: string,
    repo: string,
    opts: {
      url: string;
      contentType?: string;
      secret?: string;
      events: string[];
      active?: boolean;
    }
  ): Promise<GiteaWebhook> {
    let response = await this.axios.post(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`,
      {
        type: 'gitea',
        config: {
          url: opts.url,
          content_type: opts.contentType || 'json',
          secret: opts.secret || ''
        },
        events: opts.events,
        active: opts.active !== false
      }
    );
    return response.data as GiteaWebhook;
  }

  async deleteRepoWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    await this.axios.delete(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks/${hookId}`
    );
  }

  async createOrgWebhook(
    orgName: string,
    opts: {
      url: string;
      contentType?: string;
      secret?: string;
      events: string[];
      active?: boolean;
    }
  ): Promise<GiteaWebhook> {
    let response = await this.axios.post(`/orgs/${encodeURIComponent(orgName)}/hooks`, {
      type: 'gitea',
      config: {
        url: opts.url,
        content_type: opts.contentType || 'json',
        secret: opts.secret || ''
      },
      events: opts.events,
      active: opts.active !== false
    });
    return response.data as GiteaWebhook;
  }

  async deleteOrgWebhook(orgName: string, hookId: number): Promise<void> {
    await this.axios.delete(`/orgs/${encodeURIComponent(orgName)}/hooks/${hookId}`);
  }

  // ─── Topics ────────────────────────────────────────────────────────

  async listRepoTopics(owner: string, repo: string): Promise<string[]> {
    let response = await this.axios.get(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/topics`
    );
    let data = response.data as { topics: string[] };
    return data.topics || [];
  }

  async updateRepoTopics(owner: string, repo: string, topics: string[]): Promise<void> {
    await this.axios.put(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/topics`,
      { topics }
    );
  }
}
