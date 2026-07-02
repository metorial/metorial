import { createAxios } from 'slates';

export type SentryRegion = 'us' | 'de';

let getBaseUrl = (region: SentryRegion) => {
  return region === 'de' ? 'https://de.sentry.io/api/0' : 'https://us.sentry.io/api/0';
};

export class Client {
  private http;
  private orgSlug: string;

  constructor(config: { token: string; organizationSlug: string; region: SentryRegion }) {
    this.orgSlug = config.organizationSlug;
    this.http = createAxios({
      baseURL: getBaseUrl(config.region),
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private toSearchParams(params: Record<string, any>) {
    let searchParams = new URLSearchParams();

    for (let [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        for (let item of value) {
          if (item !== undefined && item !== null) {
            searchParams.append(key, String(item));
          }
        }
        continue;
      }

      searchParams.set(key, String(value));
    }

    return searchParams;
  }

  private async resolveProjectIds(
    projectSlugs?: string[],
    projectIds?: Array<string | number>
  ) {
    let resolvedIds = projectIds?.map(String) ?? [];

    if (projectSlugs?.length) {
      let projects = await Promise.all(
        projectSlugs.map(projectSlug => this.getProject(projectSlug))
      );
      resolvedIds.push(...projects.map(project => String(project.id)));
    }

    return resolvedIds.length ? resolvedIds : undefined;
  }

  private async resolveProjectFilter(params?: {
    project?: string | string[];
    projectSlug?: string;
    projectIds?: Array<string | number>;
  }) {
    let projects = params?.project
      ? Array.isArray(params.project)
        ? params.project
        : [params.project]
      : [];
    let projectSlugs = [...projects, params?.projectSlug].filter(Boolean) as string[];

    return this.resolveProjectIds(projectSlugs, params?.projectIds);
  }

  // ── Organizations ──────────────────────────────────────────

  async getOrganization() {
    let response = await this.http.get(`/organizations/${this.orgSlug}/`);
    return response.data;
  }

  async listOrganizations() {
    let response = await this.http.get('/organizations/');
    return response.data;
  }

  // ── Projects ───────────────────────────────────────────────

  async listProjects(params?: { cursor?: string }) {
    let response = await this.http.get(`/organizations/${this.orgSlug}/projects/`, { params });
    return response.data;
  }

  async getProject(projectSlug: string) {
    let response = await this.http.get(`/projects/${this.orgSlug}/${projectSlug}/`);
    return response.data;
  }

  async createProject(
    teamSlug: string,
    data: { name: string; slug?: string; platform?: string }
  ) {
    let response = await this.http.post(`/teams/${this.orgSlug}/${teamSlug}/projects/`, data);
    return response.data;
  }

  async updateProject(projectSlug: string, data: Record<string, any>) {
    let response = await this.http.put(`/projects/${this.orgSlug}/${projectSlug}/`, data);
    return response.data;
  }

  async deleteProject(projectSlug: string) {
    await this.http.delete(`/projects/${this.orgSlug}/${projectSlug}/`);
  }

  // ── Teams ──────────────────────────────────────────────────

  async listTeams(params?: { cursor?: string }) {
    let response = await this.http.get(`/organizations/${this.orgSlug}/teams/`, { params });
    return response.data;
  }

  async getTeam(teamSlug: string) {
    let response = await this.http.get(`/teams/${this.orgSlug}/${teamSlug}/`);
    return response.data;
  }

  async createTeam(data: { name: string; slug?: string }) {
    let response = await this.http.post(`/organizations/${this.orgSlug}/teams/`, data);
    return response.data;
  }

  async updateTeam(teamSlug: string, data: { name?: string; slug?: string }) {
    let response = await this.http.put(`/teams/${this.orgSlug}/${teamSlug}/`, data);
    return response.data;
  }

  async deleteTeam(teamSlug: string) {
    await this.http.delete(`/teams/${this.orgSlug}/${teamSlug}/`);
  }

  async listTeamProjects(teamSlug: string) {
    let response = await this.http.get(`/teams/${this.orgSlug}/${teamSlug}/projects/`);
    return response.data;
  }

  async addProjectToTeam(teamSlug: string, projectSlug: string) {
    let response = await this.http.post(
      `/projects/${this.orgSlug}/${projectSlug}/teams/${teamSlug}/`
    );
    return response.data;
  }

  async removeProjectFromTeam(teamSlug: string, projectSlug: string) {
    await this.http.delete(`/projects/${this.orgSlug}/${projectSlug}/teams/${teamSlug}/`);
  }

  // ── Issues ─────────────────────────────────────────────────

  async listIssues(params?: {
    query?: string;
    project?: string;
    projectSlug?: string;
    projectIds?: Array<string | number>;
    cursor?: string;
    sort?: string;
    statsPeriod?: string;
    shortIdLookup?: boolean;
  }) {
    let projectIds = await this.resolveProjectFilter(params);

    let response = await this.http.get(`/organizations/${this.orgSlug}/issues/`, {
      params: this.toSearchParams({
        query: params?.query,
        project: projectIds,
        cursor: params?.cursor,
        sort: params?.sort,
        statsPeriod: params?.statsPeriod,
        shortIdLookup: params?.shortIdLookup
      })
    });
    return response.data;
  }

  async getIssue(issueId: string) {
    let response = await this.http.get(`/organizations/${this.orgSlug}/issues/${issueId}/`);
    return response.data;
  }

  async updateIssue(
    issueId: string,
    data: {
      status?: string;
      assignedTo?: string;
      hasSeen?: boolean;
      isBookmarked?: boolean;
      isSubscribed?: boolean;
      isPublic?: boolean;
      substatus?: string;
    }
  ) {
    let response = await this.http.put(
      `/organizations/${this.orgSlug}/issues/${issueId}/`,
      data
    );
    return response.data;
  }

  async deleteIssue(issueId: string) {
    await this.http.delete(`/organizations/${this.orgSlug}/issues/${issueId}/`);
  }

  async bulkMutateIssues(data: {
    id?: string[];
    query?: string;
    project?: number[];
    status?: string;
    assignedTo?: string;
    hasSeen?: boolean;
    isBookmarked?: boolean;
    merge?: boolean;
    substatus?: string;
  }) {
    let { id, query, project, ...body } = data;
    let params: Record<string, any> = {};
    if (id) params.id = id;
    if (query) params.query = query;
    if (project) params.project = project;

    let response = await this.http.put(`/organizations/${this.orgSlug}/issues/`, body, {
      params: this.toSearchParams(params)
    });
    return response.data;
  }

  // ── Events ─────────────────────────────────────────────────

  async listIssueEvents(issueId: string, params?: { cursor?: string }) {
    let response = await this.http.get(
      `/organizations/${this.orgSlug}/issues/${issueId}/events/`,
      { params }
    );
    return response.data;
  }

  async getEvent(projectSlug: string, eventId: string) {
    let response = await this.http.get(
      `/projects/${this.orgSlug}/${projectSlug}/events/${eventId}/`
    );
    return response.data;
  }

  async getLatestEvent(issueId: string) {
    let response = await this.http.get(
      `/organizations/${this.orgSlug}/issues/${issueId}/events/latest/`
    );
    return response.data;
  }

  // ── Releases ───────────────────────────────────────────────

  async listReleases(params?: { query?: string; project?: number; cursor?: string }) {
    let response = await this.http.get(`/organizations/${this.orgSlug}/releases/`, { params });
    return response.data;
  }

  async getRelease(version: string) {
    let encodedVersion = encodeURIComponent(version);
    let response = await this.http.get(
      `/organizations/${this.orgSlug}/releases/${encodedVersion}/`
    );
    return response.data;
  }

  async createRelease(data: {
    version: string;
    ref?: string;
    url?: string;
    projects: string[];
    dateReleased?: string;
    commits?: Array<{
      id: string;
      repository?: string;
      message?: string;
      authorName?: string;
      authorEmail?: string;
      timestamp?: string;
    }>;
  }) {
    let { commits, ...release } = data;
    let response = await this.http.post(`/organizations/${this.orgSlug}/releases/`, {
      ...release,
      commits: commits?.map(commit => ({
        id: commit.id,
        repository: commit.repository,
        message: commit.message,
        author_name: commit.authorName,
        author_email: commit.authorEmail,
        timestamp: commit.timestamp
      }))
    });
    return response.data;
  }

  async updateRelease(
    version: string,
    data: {
      ref?: string;
      url?: string;
      dateReleased?: string;
      commits?: Array<{ id: string; repository?: string }>;
    }
  ) {
    let encodedVersion = encodeURIComponent(version);
    let response = await this.http.put(
      `/organizations/${this.orgSlug}/releases/${encodedVersion}/`,
      data
    );
    return response.data;
  }

  async deleteRelease(version: string) {
    let encodedVersion = encodeURIComponent(version);
    await this.http.delete(`/organizations/${this.orgSlug}/releases/${encodedVersion}/`);
  }

  async listReleaseDeploys(version: string) {
    let encodedVersion = encodeURIComponent(version);
    let response = await this.http.get(
      `/organizations/${this.orgSlug}/releases/${encodedVersion}/deploys/`
    );
    return response.data;
  }

  async createReleaseDeploy(
    version: string,
    data: {
      environment: string;
      name?: string;
      url?: string;
      dateStarted?: string;
      dateFinished?: string;
    }
  ) {
    let encodedVersion = encodeURIComponent(version);
    let response = await this.http.post(
      `/organizations/${this.orgSlug}/releases/${encodedVersion}/deploys/`,
      data
    );
    return response.data;
  }

  // ── Alert Rules ────────────────────────────────────────────

  async listIssueAlertRules(projectSlug: string) {
    let response = await this.http.get(`/projects/${this.orgSlug}/${projectSlug}/rules/`);
    return response.data;
  }

  async getIssueAlertRule(projectSlug: string, ruleId: string) {
    let response = await this.http.get(
      `/projects/${this.orgSlug}/${projectSlug}/rules/${ruleId}/`
    );
    return response.data;
  }

  async createIssueAlertRule(projectSlug: string, data: Record<string, any>) {
    let response = await this.http.post(
      `/projects/${this.orgSlug}/${projectSlug}/rules/`,
      data
    );
    return response.data;
  }

  async updateIssueAlertRule(projectSlug: string, ruleId: string, data: Record<string, any>) {
    let response = await this.http.put(
      `/projects/${this.orgSlug}/${projectSlug}/rules/${ruleId}/`,
      data
    );
    return response.data;
  }

  async deleteIssueAlertRule(projectSlug: string, ruleId: string) {
    await this.http.delete(`/projects/${this.orgSlug}/${projectSlug}/rules/${ruleId}/`);
  }

  async listMetricAlertRules() {
    let response = await this.http.get(`/organizations/${this.orgSlug}/alert-rules/`);
    return response.data;
  }

  async getMetricAlertRule(ruleId: string) {
    let response = await this.http.get(
      `/organizations/${this.orgSlug}/alert-rules/${ruleId}/`
    );
    return response.data;
  }

  async createMetricAlertRule(data: Record<string, any>) {
    let response = await this.http.post(`/organizations/${this.orgSlug}/alert-rules/`, data);
    return response.data;
  }

  async updateMetricAlertRule(ruleId: string, data: Record<string, any>) {
    let response = await this.http.put(
      `/organizations/${this.orgSlug}/alert-rules/${ruleId}/`,
      data
    );
    return response.data;
  }

  async deleteMetricAlertRule(ruleId: string) {
    await this.http.delete(`/organizations/${this.orgSlug}/alert-rules/${ruleId}/`);
  }

  // ── Cron Monitors ─────────────────────────────────────────

  async listMonitors(params?: {
    cursor?: string;
    project?: string;
    projectSlug?: string;
    projectIds?: Array<string | number>;
  }) {
    let projectIds = await this.resolveProjectFilter(params);

    let response = await this.http.get(`/organizations/${this.orgSlug}/monitors/`, {
      params: this.toSearchParams({
        cursor: params?.cursor,
        project: projectIds
      })
    });
    return response.data;
  }

  async getMonitor(monitorSlug: string) {
    let response = await this.http.get(
      `/organizations/${this.orgSlug}/monitors/${monitorSlug}/`
    );
    return response.data;
  }

  async createMonitor(data: {
    name: string;
    slug?: string;
    project: string;
    type: string;
    config: Record<string, any>;
    alertRule?: Record<string, any>;
  }) {
    let response = await this.http.post(`/organizations/${this.orgSlug}/monitors/`, data);
    return response.data;
  }

  async updateMonitor(monitorSlug: string, data: Record<string, any>) {
    let response = await this.http.put(
      `/organizations/${this.orgSlug}/monitors/${monitorSlug}/`,
      data
    );
    return response.data;
  }

  async deleteMonitor(monitorSlug: string) {
    await this.http.delete(`/organizations/${this.orgSlug}/monitors/${monitorSlug}/`);
  }

  // ── Discover (Events) ─────────────────────────────────────

  async discoverQuery(params: {
    field: string[];
    query?: string;
    sort?: string;
    project?: string[];
    projectIds?: Array<string | number>;
    statsPeriod?: string;
    start?: string;
    end?: string;
    per_page?: number;
  }) {
    let projectIds = await this.resolveProjectFilter({
      project: params.project,
      projectIds: params.projectIds
    });
    let response = await this.http.get(`/organizations/${this.orgSlug}/events/`, {
      params: this.toSearchParams({
        field: params.field,
        query: params.query,
        sort: params.sort,
        project: projectIds,
        statsPeriod: params.statsPeriod,
        start: params.start,
        end: params.end,
        per_page: params.per_page
      })
    });
    return response.data;
  }

  // ── Members ────────────────────────────────────────────────

  async listMembers(params?: { cursor?: string; query?: string }) {
    let response = await this.http.get(`/organizations/${this.orgSlug}/members/`, { params });
    return response.data;
  }

  async getMember(memberId: string) {
    let response = await this.http.get(`/organizations/${this.orgSlug}/members/${memberId}/`);
    return response.data;
  }

  // ── Tags ───────────────────────────────────────────────────

  async listIssueTags(issueId: string) {
    let response = await this.http.get(
      `/organizations/${this.orgSlug}/issues/${issueId}/tags/`
    );
    return response.data;
  }

  // ── Issue Comments (Notes) ─────────────────────────────────

  async listIssueComments(issueId: string) {
    let response = await this.http.get(
      `/organizations/${this.orgSlug}/issues/${issueId}/comments/`
    );
    return response.data;
  }

  async createIssueComment(issueId: string, data: { text: string }) {
    let response = await this.http.post(
      `/organizations/${this.orgSlug}/issues/${issueId}/comments/`,
      data
    );
    return response.data;
  }

  async updateIssueComment(issueId: string, commentId: string, data: { text: string }) {
    let response = await this.http.put(
      `/organizations/${this.orgSlug}/issues/${issueId}/comments/${commentId}/`,
      data
    );
    return response.data;
  }

  async deleteIssueComment(issueId: string, commentId: string) {
    await this.http.delete(
      `/organizations/${this.orgSlug}/issues/${issueId}/comments/${commentId}/`
    );
  }
}
