import { createAxios } from '@slates/provider';
import { jiraApiError } from './errors';

export interface JiraClientConfig {
  token: string;
  cloudId: string;
  refreshToken?: string;
}

export class JiraClient {
  private api: ReturnType<typeof createAxios>;
  private agileApi: ReturnType<typeof createAxios>;

  constructor(config: JiraClientConfig) {
    let baseURL = `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3`;
    let agileBaseURL = `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/agile/1.0`;

    // Determine auth type based on whether refreshToken exists (OAuth) or not (Basic/API token)
    let authHeader = config.refreshToken ? `Bearer ${config.token}` : `Basic ${config.token}`;

    this.api = createAxios({
      baseURL,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });

    this.agileApi = createAxios({
      baseURL: agileBaseURL,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });

    let rejectWithJiraError = (error: unknown) => Promise.reject(jiraApiError(error));
    this.api.interceptors.response.use(response => response, rejectWithJiraError);
    this.agileApi.interceptors.response.use(response => response, rejectWithJiraError);
  }

  // ---- Issues ----

  async createIssue(fields: Record<string, any>): Promise<any> {
    let response = await this.api.post('/issue', { fields });
    return response.data;
  }

  async getIssue(
    issueIdOrKey: string,
    params?: { fields?: string[]; expand?: string[] }
  ): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.fields) queryParams.fields = params.fields.join(',');
    if (params?.expand) queryParams.expand = params.expand.join(',');

    let response = await this.api.get(`/issue/${issueIdOrKey}`, { params: queryParams });
    return response.data;
  }

  async updateIssue(
    issueIdOrKey: string,
    fields: Record<string, any>,
    update?: Record<string, any>
  ): Promise<void> {
    let body: Record<string, any> = {};
    if (fields && Object.keys(fields).length > 0) body.fields = fields;
    if (update && Object.keys(update).length > 0) body.update = update;
    await this.api.put(`/issue/${issueIdOrKey}`, body);
  }

  async deleteIssue(issueIdOrKey: string, deleteSubtasks?: boolean): Promise<void> {
    await this.api.delete(`/issue/${issueIdOrKey}`, {
      params: deleteSubtasks ? { deleteSubtasks: 'true' } : undefined
    });
  }

  async transitionIssue(
    issueIdOrKey: string,
    transitionId: string,
    fields?: Record<string, any>
  ): Promise<void> {
    let body: Record<string, any> = {
      transition: { id: transitionId }
    };
    if (fields) body.fields = fields;
    await this.api.post(`/issue/${issueIdOrKey}/transitions`, body);
  }

  async getTransitions(issueIdOrKey: string): Promise<any[]> {
    let response = await this.api.get(`/issue/${issueIdOrKey}/transitions`);
    return response.data.transitions;
  }

  async assignIssue(issueIdOrKey: string, accountId: string | null): Promise<void> {
    await this.api.put(`/issue/${issueIdOrKey}/assignee`, {
      accountId
    });
  }

  // ---- Search ----

  async searchIssues(
    jql: string,
    params?: {
      nextPageToken?: string;
      maxResults?: number;
      fields?: string[];
    }
  ): Promise<any> {
    let body: Record<string, unknown> = {
      jql,
      maxResults: params?.maxResults ?? 50
    };
    if (params?.nextPageToken) body.nextPageToken = params.nextPageToken;
    if (params?.fields?.length) body.fields = params.fields;

    let response = await this.api.post('/search/jql', body);
    return response.data;
  }

  // ---- Projects ----

  async getProjects(params?: {
    startAt?: number;
    maxResults?: number;
    expand?: string[];
  }): Promise<any> {
    let response = await this.api.get('/project/search', {
      params: {
        startAt: params?.startAt ?? 0,
        maxResults: params?.maxResults ?? 50,
        expand: params?.expand?.join(',')
      }
    });
    return response.data;
  }

  async getProject(projectIdOrKey: string, expand?: string[]): Promise<any> {
    let response = await this.api.get(`/project/${projectIdOrKey}`, {
      params: expand ? { expand: expand.join(',') } : undefined
    });
    return response.data;
  }

  async createProject(project: Record<string, any>): Promise<any> {
    let response = await this.api.post('/project', project);
    return response.data;
  }

  // ---- Comments ----

  async getComments(
    issueIdOrKey: string,
    params?: { startAt?: number; maxResults?: number }
  ): Promise<any> {
    let response = await this.api.get(`/issue/${issueIdOrKey}/comment`, {
      params: {
        startAt: params?.startAt ?? 0,
        maxResults: params?.maxResults ?? 50
      }
    });
    return response.data;
  }

  async addComment(issueIdOrKey: string, body: any): Promise<any> {
    let response = await this.api.post(`/issue/${issueIdOrKey}/comment`, { body });
    return response.data;
  }

  async updateComment(issueIdOrKey: string, commentId: string, body: any): Promise<any> {
    let response = await this.api.put(`/issue/${issueIdOrKey}/comment/${commentId}`, { body });
    return response.data;
  }

  async deleteComment(issueIdOrKey: string, commentId: string): Promise<void> {
    await this.api.delete(`/issue/${issueIdOrKey}/comment/${commentId}`);
  }

  // ---- Worklogs ----

  async addWorklog(
    issueIdOrKey: string,
    worklog: {
      timeSpentSeconds?: number;
      timeSpent?: string;
      started?: string;
      comment?: any;
    }
  ): Promise<any> {
    let response = await this.api.post(`/issue/${issueIdOrKey}/worklog`, worklog);
    return response.data;
  }

  async getWorklogs(
    issueIdOrKey: string,
    params?: { startAt?: number; maxResults?: number }
  ): Promise<any> {
    let response = await this.api.get(`/issue/${issueIdOrKey}/worklog`, {
      params: {
        startAt: params?.startAt ?? 0,
        maxResults: params?.maxResults ?? 50
      }
    });
    return response.data;
  }

  async updateWorklog(
    issueIdOrKey: string,
    worklogId: string,
    worklog: {
      timeSpentSeconds?: number;
      timeSpent?: string;
      started?: string;
      comment?: any;
    }
  ): Promise<any> {
    let response = await this.api.put(`/issue/${issueIdOrKey}/worklog/${worklogId}`, worklog);
    return response.data;
  }

  async deleteWorklog(issueIdOrKey: string, worklogId: string): Promise<void> {
    await this.api.delete(`/issue/${issueIdOrKey}/worklog/${worklogId}`);
  }

  // ---- Users ----

  async searchUsers(
    query: string,
    params?: { startAt?: number; maxResults?: number }
  ): Promise<any[]> {
    let response = await this.api.get('/user/search', {
      params: {
        query,
        startAt: params?.startAt ?? 0,
        maxResults: params?.maxResults ?? 50
      }
    });
    return response.data;
  }

  async getUser(accountId: string): Promise<any> {
    let response = await this.api.get('/user', {
      params: { accountId }
    });
    return response.data;
  }

  async getMyself(): Promise<any> {
    let response = await this.api.get('/myself');
    return response.data;
  }

  // ---- Boards (Agile) ----

  async getBoards(params?: {
    startAt?: number;
    maxResults?: number;
    type?: string;
    projectKeyOrId?: string;
  }): Promise<any> {
    let response = await this.agileApi.get('/board', {
      params: {
        startAt: params?.startAt ?? 0,
        maxResults: params?.maxResults ?? 50,
        type: params?.type,
        projectKeyOrId: params?.projectKeyOrId
      }
    });
    return response.data;
  }

  async getBoard(boardId: number): Promise<any> {
    let response = await this.agileApi.get(`/board/${boardId}`);
    return response.data;
  }

  // ---- Sprints (Agile) ----

  async getSprints(
    boardId: number,
    params?: { startAt?: number; maxResults?: number; state?: string }
  ): Promise<any> {
    let response = await this.agileApi.get(`/board/${boardId}/sprint`, {
      params: {
        startAt: params?.startAt ?? 0,
        maxResults: params?.maxResults ?? 50,
        state: params?.state
      }
    });
    return response.data;
  }

  async getSprint(sprintId: number): Promise<any> {
    let response = await this.agileApi.get(`/sprint/${sprintId}`);
    return response.data;
  }

  async createSprint(sprint: {
    name: string;
    originBoardId: number;
    startDate?: string;
    endDate?: string;
    goal?: string;
  }): Promise<any> {
    let response = await this.agileApi.post('/sprint', sprint);
    return response.data;
  }

  async updateSprint(sprintId: number, fields: Record<string, any>): Promise<any> {
    let response = await this.agileApi.post(`/sprint/${sprintId}`, fields);
    return response.data;
  }

  async moveIssuesToSprint(sprintId: number, issueKeys: string[]): Promise<void> {
    await this.agileApi.post(`/sprint/${sprintId}/issue`, {
      issues: issueKeys
    });
  }

  async getSprintIssues(
    sprintId: number,
    params?: { startAt?: number; maxResults?: number; fields?: string[] }
  ): Promise<any> {
    let response = await this.agileApi.get(`/sprint/${sprintId}/issue`, {
      params: {
        startAt: params?.startAt ?? 0,
        maxResults: params?.maxResults ?? 50,
        fields: params?.fields?.join(',')
      }
    });
    return response.data;
  }

  // ---- Epics (Agile) ----

  async getEpic(epicIdOrKey: string): Promise<any> {
    let response = await this.agileApi.get(`/epic/${epicIdOrKey}`);
    return response.data;
  }

  async moveIssuesToEpic(epicIdOrKey: string, issueKeys: string[]): Promise<void> {
    await this.agileApi.post(`/epic/${epicIdOrKey}/issue`, {
      issues: issueKeys
    });
  }

  // ---- Versions / Releases ----

  async getProjectVersions(
    projectIdOrKey: string,
    params?: { startAt?: number; maxResults?: number }
  ): Promise<any> {
    let response = await this.api.get(`/project/${projectIdOrKey}/version`, {
      params: {
        startAt: params?.startAt ?? 0,
        maxResults: params?.maxResults ?? 50
      }
    });
    return response.data;
  }

  async createVersion(version: Record<string, any>): Promise<any> {
    let response = await this.api.post('/version', version);
    return response.data;
  }

  async updateVersion(versionId: string, fields: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/version/${versionId}`, fields);
    return response.data;
  }

  async deleteVersion(
    versionId: string,
    params?: { moveFixIssuesTo?: string; moveAffectedIssuesTo?: string }
  ): Promise<void> {
    await this.api.delete(`/version/${versionId}`, {
      params: {
        moveFixIssuesTo: params?.moveFixIssuesTo,
        moveAffectedIssuesTo: params?.moveAffectedIssuesTo
      }
    });
  }

  // ---- Issue Links ----

  async createIssueLink(link: {
    type: { name: string };
    inwardIssue: { key: string };
    outwardIssue: { key: string };
    comment?: any;
  }): Promise<void> {
    await this.api.post('/issueLink', link);
  }

  async deleteIssueLink(linkId: string): Promise<void> {
    await this.api.delete(`/issueLink/${linkId}`);
  }

  async getIssueLinkTypes(): Promise<any[]> {
    let response = await this.api.get('/issueLinkType');
    return response.data.issueLinkTypes;
  }

  // ---- Filters ----

  async getFilter(filterId: string): Promise<any> {
    let response = await this.api.get(`/filter/${filterId}`);
    return response.data;
  }

  async createFilter(filter: {
    name: string;
    jql: string;
    description?: string;
    favourite?: boolean;
  }): Promise<any> {
    let response = await this.api.post('/filter', filter);
    return response.data;
  }

  async updateFilter(filterId: string, fields: Record<string, any>): Promise<any> {
    let response = await this.api.put(`/filter/${filterId}`, fields);
    return response.data;
  }

  async deleteFilter(filterId: string): Promise<void> {
    await this.api.delete(`/filter/${filterId}`);
  }

  async getFavouriteFilters(): Promise<any[]> {
    let response = await this.api.get('/filter/favourite');
    return response.data;
  }

  // ---- Issue Types ----

  async getIssueTypes(): Promise<any[]> {
    let response = await this.api.get('/issuetype');
    return response.data;
  }

  // ---- Priorities ----

  async getPriorities(): Promise<any[]> {
    let response = await this.api.get('/priority');
    return response.data;
  }

  // ---- Statuses ----

  async getStatuses(): Promise<any[]> {
    let response = await this.api.get('/status');
    return response.data;
  }

  // ---- Fields ----

  async getFields(): Promise<any[]> {
    let response = await this.api.get('/field');
    return response.data;
  }

  // ---- Webhooks ----

  async registerWebhook(url: string, events: string[], jqlFilter?: string): Promise<any> {
    let response = await this.api.post('/webhook', {
      url,
      webhooks: [
        {
          events,
          jqlFilter: jqlFilter ?? ''
        }
      ]
    });
    return response.data;
  }

  async deleteWebhook(webhookIds: number[]): Promise<void> {
    await this.api.delete('/webhook', {
      data: { webhookIds }
    });
  }

  async getWebhookFailedEvents(): Promise<any> {
    let response = await this.api.get('/webhook/failed');
    return response.data;
  }

  // ---- Bulk Operations ----

  async bulkCreateIssues(issues: Array<{ fields: Record<string, any> }>): Promise<any> {
    let response = await this.api.post('/issue/bulk', {
      issueUpdates: issues.map(i => ({ fields: i.fields }))
    });
    return response.data;
  }

  // ---- Attachments ----

  async getAttachment(attachmentId: string): Promise<any> {
    let response = await this.api.get(`/attachment/${attachmentId}`);
    return response.data;
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.api.delete(`/attachment/${attachmentId}`);
  }

  // ---- Components ----

  async getProjectComponents(projectIdOrKey: string): Promise<any[]> {
    let response = await this.api.get(`/project/${projectIdOrKey}/components`);
    return response.data;
  }

  async createComponent(component: Record<string, any>): Promise<any> {
    let response = await this.api.post('/component', component);
    return response.data;
  }

  // ---- Labels ----

  async getLabels(params?: { startAt?: number; maxResults?: number }): Promise<any> {
    let response = await this.api.get('/label', {
      params: {
        startAt: params?.startAt ?? 0,
        maxResults: params?.maxResults ?? 1000
      }
    });
    return response.data;
  }

  // ---- Backlog (Agile) ----

  async moveIssuesToBacklog(issueKeys: string[]): Promise<void> {
    await this.agileApi.post('/backlog/issue', {
      issues: issueKeys
    });
  }

  // ---- Board Configuration ----

  async getBoardConfiguration(boardId: number): Promise<any> {
    let response = await this.agileApi.get(`/board/${boardId}/configuration`);
    return response.data;
  }
}
