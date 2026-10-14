import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  pickDefined,
  requestAxiosData
} from 'slates';
import { assertLeigaResponse } from './response';

let api = createAxios({
  baseURL: 'https://app.leiga.com/openapi/api',
  timeout: 30000
});

let leigaDate = (value: string | undefined, field: string) => {
  if (value === undefined) return undefined;
  let timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw createApiServiceError(`${field} must be a valid ISO 8601 date.`, {
      reason: 'invalid_date'
    });
  }
  return timestamp;
};

let relationType = (value: string) => {
  let normalized = value.trim().toUpperCase().replace(/\s+/g, '_');
  let aliases: Record<string, string> = {
    IS_BLOCKED_BY: 'IS_BLOCKS_BY',
    IS_DUPLICATED_BY: 'IS_DUPLICATES_BY'
  };
  normalized = aliases[normalized] ?? normalized;
  if (
    ![
      'RELATES_TO',
      'PARENT',
      'CHILD',
      'BLOCKS',
      'IS_BLOCKS_BY',
      'CAUSES',
      'IS_CAUSED_BY',
      'REPEAT',
      'DUPLICATES',
      'IS_DUPLICATES_BY'
    ].includes(normalized)
  ) {
    throw createApiServiceError(
      'Use a documented issue relation type such as RELATES_TO, BLOCKS, or IS_BLOCKS_BY.',
      { reason: 'invalid_relation_type' }
    );
  }
  return normalized;
};

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      accessToken: this.token
    };
  }

  private async request<T = any>(
    method: string,
    path: string,
    options?: {
      data?: any;
      params?: Record<string, any>;
    }
  ): Promise<T> {
    let operation = `${method} ${path}`;
    let response = await requestAxiosData<T>(
      operation,
      () =>
        api.request({
          method,
          url: path,
          headers: this.headers(),
          data: options?.data,
          params: options?.params
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Leiga',
          reason: 'leiga_api_error',
          operation,
          detailKeys: ['msg', 'message', 'code']
        })
    );
    assertLeigaResponse(response as LeigaResponse<unknown>, operation);
    return response;
  }

  private async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  private async post<T = any>(
    path: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    return this.request<T>('POST', path, { data, params });
  }

  private async put<T = any>(path: string, data?: any): Promise<T> {
    return this.request<T>('PUT', path, { data });
  }

  private async patch<T = any>(path: string, data?: any): Promise<T> {
    return this.request<T>('PATCH', path, { data });
  }

  private async delete<T = any>(path: string, data?: any): Promise<T> {
    return this.request<T>('DELETE', path, { data });
  }

  // ─── Projects ───────────────────────────────────────────────

  async listProjects(): Promise<LeigaResponse<LeigaProject[]>> {
    return this.get('/project/list');
  }

  async getProject(projectId: number): Promise<LeigaResponse<LeigaProject>> {
    return this.get('/project/get', { projectId });
  }

  async getProjectByKey(projectKey: string): Promise<LeigaResponse<LeigaProject>> {
    return this.get('/project/get-by-key', { projectKey });
  }

  async createProject(data: {
    pname: string;
    pkey: string;
    templateId?: number;
    description?: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/project/add', data);
  }

  async updateProject(data: {
    id: number;
    pname?: string;
    description?: string;
  }): Promise<LeigaResponse<any>> {
    return this.put('/project/update', data);
  }

  // ─── Project Members ────────────────────────────────────────

  async listProjectMembers(projectId: number): Promise<LeigaResponse<any[]>> {
    return this.get('/user/project-user-list', { projectId });
  }

  async addProjectMember(data: {
    projectId: number;
    userId: number;
    roleId: number;
  }): Promise<LeigaResponse<any>> {
    return this.post('/project/add-member', data);
  }

  async removeProjectMember(data: {
    projectId: number;
    userId: number;
  }): Promise<LeigaResponse<any>> {
    return this.post('/project/remove-member', data);
  }

  // ─── Issues ─────────────────────────────────────────────────

  async getIssueByNumber(issueNumber: string): Promise<LeigaResponse<any>> {
    return this.get('/issue/get-by-issue-number', { issueNumber });
  }

  async getIssue(issueId: number): Promise<LeigaResponse<any>> {
    return this.get('/issue/get', { id: issueId });
  }

  async createIssue(data: {
    projectId: number;
    issueTypeId: number;
    data: Record<string, any>;
  }): Promise<LeigaResponse<any>> {
    return this.post('/issue/add', data);
  }

  async updateIssue(data: {
    issueId: number;
    data: Record<string, any>;
  }): Promise<LeigaResponse<any>> {
    return this.patch('/issue/update', { id: data.issueId, data: data.data });
  }

  async deleteIssue(issueId: number): Promise<LeigaResponse<any>> {
    return this.delete('/issue/remove', { id: issueId });
  }

  async queryIssues(data: {
    projectId: number;
    pageNumber?: number;
    pageSize?: number;
    filters?: Record<string, any>;
  }): Promise<LeigaResponse<any>> {
    return this.post('/issue/page', {
      ...data.filters,
      projectId: data.projectId,
      pageNumber: data.pageNumber,
      pageSize: data.pageSize
    });
  }

  async getIssueTypeList(projectId: number): Promise<LeigaResponse<any[]>> {
    return this.get('/issue/type-list', { projectId });
  }

  async getIssueSchema(projectId: number, issueTypeId: number): Promise<LeigaResponse<any>> {
    return this.get('/issue/issue-scheme', { projectId, issueTypeId });
  }

  async batchCreateIssues(data: {
    projectId: number;
    issues: any[];
  }): Promise<LeigaResponse<any>> {
    return this.post('/issue/batch-add', data);
  }

  async batchUpdateIssues(data: { issues: any[] }): Promise<LeigaResponse<any>> {
    return this.put('/issue/batch-update', data);
  }

  async batchDeleteIssues(issueIds: number[]): Promise<LeigaResponse<any>> {
    return this.delete('/issue/batch-delete', { issueIds });
  }

  // ─── Subtasks ───────────────────────────────────────────────

  async addSubtask(data: {
    issueId: number;
    summary: string;
    assigneeId?: number;
    dueDate?: string;
    estimatePoint?: number;
  }): Promise<LeigaResponse<any>> {
    return this.post('/issue/batch-add-subtask', {
      issueId: data.issueId,
      datas: [
        pickDefined({
          summary: data.summary,
          assignee: data.assigneeId,
          dueDate: leigaDate(data.dueDate, 'dueDate'),
          estimatePoint: data.estimatePoint
        })
      ]
    });
  }

  async updateSubtask(data: {
    subtaskId: number;
    summary?: string;
    status?: string;
    assigneeId?: number;
    dueDate?: string;
    estimatePoint?: number;
  }): Promise<LeigaResponse<any>> {
    let status = data.status === undefined ? undefined : Number(data.status);
    if (status !== undefined && (!Number.isSafeInteger(status) || status <= 0)) {
      throw createApiServiceError('status must be a numeric Leiga subtask status ID.', {
        reason: 'invalid_subtask_status'
      });
    }
    return this.patch('/issue/update-subtask', {
      id: data.subtaskId,
      data: pickDefined({
        summary: data.summary,
        status,
        assignee: data.assigneeId,
        dueDate: leigaDate(data.dueDate, 'dueDate'),
        estimatePoint: data.estimatePoint
      })
    });
  }

  async deleteSubtask(subtaskId: number, issueId?: number): Promise<LeigaResponse<any>> {
    if (issueId === undefined) {
      throw createApiServiceError(
        'Provide the parent issueId with subtaskId. Call list_subtasks for that issue to find subtask IDs.',
        { reason: 'missing_parent_issue' }
      );
    }
    return this.delete('/issue/remove-subtask', { issueId, subTaskId: subtaskId });
  }

  async listSubtasks(issueId: number): Promise<LeigaResponse<any[]>> {
    return this.post('/issue/list-subtask', { id: issueId });
  }

  // ─── Issue Relations ────────────────────────────────────────

  async addIssueRelation(data: {
    sourceIssueId: number;
    destinationIssueId: number;
    relationType: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/issue/add-relationship', {
      issueId: data.sourceIssueId,
      linkedIssueId: data.destinationIssueId,
      type: relationType(data.relationType)
    });
  }

  async removeIssueRelation(data: {
    sourceIssueId: number;
    destinationIssueId: number;
    relationType: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/issue/remove-relationship', {
      issueId: data.sourceIssueId,
      linkedIssueId: data.destinationIssueId,
      type: relationType(data.relationType)
    });
  }

  // ─── Sprints ────────────────────────────────────────────────

  async listSprints(projectId: number): Promise<LeigaResponse<any[]>> {
    return this.post('/sprint/list-with-count', { projectId });
  }

  async getSprint(sprintId: number): Promise<LeigaResponse<any>> {
    return this.get('/sprint/get', { id: sprintId });
  }

  async createSprint(data: {
    projectId: number;
    name: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
    assigneeId?: number;
  }): Promise<LeigaResponse<any>> {
    return this.post(
      '/sprint/add',
      pickDefined({
        projectId: data.projectId,
        name: data.name,
        goal: data.goal,
        assignee: data.assigneeId,
        startDate: leigaDate(data.startDate, 'startDate'),
        endDate: leigaDate(data.endDate, 'endDate')
      })
    );
  }

  async updateSprint(data: {
    sprintId: number;
    name?: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
    assigneeId?: number;
  }): Promise<LeigaResponse<any>> {
    let name = data.name ?? (await this.getSprint(data.sprintId)).data?.name;
    if (!name)
      throw createApiServiceError('Provide a sprint name; Leiga requires it for updates.', {
        reason: 'missing_sprint_name'
      });
    return this.patch(
      '/sprint/update',
      pickDefined({
        id: data.sprintId,
        name,
        goal: data.goal,
        assignee: data.assigneeId,
        startDate: leigaDate(data.startDate, 'startDate'),
        endDate: leigaDate(data.endDate, 'endDate')
      })
    );
  }

  async deleteSprint(sprintId: number): Promise<LeigaResponse<any>> {
    return this.post('/sprint/remove', { sprintId });
  }

  // ─── Epics ──────────────────────────────────────────────────

  async listEpics(
    projectId: number,
    pageNumber = 1,
    pageSize = 50
  ): Promise<LeigaResponse<LeigaPage>> {
    return this.post('/epic/page', { projectId, pageNumber, pageSize });
  }

  async getEpic(epicId: number): Promise<LeigaResponse<any>> {
    return this.get('/epic/get', { epicId });
  }

  async createEpic(data: {
    projectId: number;
    name: string;
    description?: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/epic/add', {
      projectId: data.projectId,
      data: pickDefined({ summary: data.name, description: data.description })
    });
  }

  async updateEpic(data: {
    epicId: number;
    name?: string;
    description?: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/epic/update', {
      id: data.epicId,
      data: pickDefined({ summary: data.name, description: data.description })
    });
  }

  async deleteEpic(epicId: number): Promise<LeigaResponse<any>> {
    return this.post('/epic/remove', { id: epicId });
  }

  // ─── Versions / Releases ───────────────────────────────────

  async listVersions(
    _projectId?: number,
    pageNumber = 1,
    pageSize = 50
  ): Promise<LeigaResponse<LeigaPage>> {
    return this.post('/version/all-version', { pageNumber, pageSize });
  }

  async getVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.get('/version/detail', { id: versionId });
  }

  async createVersion(data: {
    projectId?: number;
    name: string;
    ownerId?: number;
    description?: string;
    startDate?: string;
    releaseDate?: string;
  }): Promise<LeigaResponse<any>> {
    if (data.ownerId === undefined)
      throw createApiServiceError(
        'Provide ownerId for the version. Call list_org_members to discover member IDs.',
        { reason: 'missing_version_owner' }
      );
    return this.post(
      '/version/add',
      pickDefined({
        name: data.name,
        ownerId: data.ownerId,
        description: data.description,
        startDate: leigaDate(data.startDate, 'startDate'),
        planDate: leigaDate(data.releaseDate, 'releaseDate')
      })
    );
  }

  async updateVersion(data: {
    versionId: number;
    name?: string;
    ownerId?: number;
    description?: string;
    startDate?: string;
    releaseDate?: string;
  }): Promise<LeigaResponse<any>> {
    if (data.ownerId === undefined)
      throw createApiServiceError(
        'Provide ownerId for the version. Call list_versions to find its current ownerId or list_org_members to select a new owner.',
        { reason: 'missing_version_owner' }
      );
    let name = data.name ?? (await this.getVersion(data.versionId)).data?.name;
    if (!name)
      throw createApiServiceError('Provide a version name; Leiga requires it for updates.', {
        reason: 'missing_version_name'
      });
    return this.patch(
      '/version/update',
      pickDefined({
        id: data.versionId,
        name,
        ownerId: data.ownerId,
        description: data.description,
        startDate: leigaDate(data.startDate, 'startDate'),
        planDate: leigaDate(data.releaseDate, 'releaseDate')
      })
    );
  }

  async deleteVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.delete('/version/remove', { id: versionId });
  }

  async releaseVersion(
    versionId: number,
    releasedDate = new Date().toISOString()
  ): Promise<LeigaResponse<any>> {
    return this.patch('/version/release', {
      id: versionId,
      releasedDate: leigaDate(releasedDate, 'releasedDate')
    });
  }

  async cancelReleaseVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.patch('/version/unrelease', { id: versionId });
  }

  async archiveVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.patch('/version/archive', { id: versionId });
  }

  async unarchiveVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.patch('/version/unarchive', { id: versionId });
  }

  // ─── Comments ───────────────────────────────────────────────

  async listComments(
    issueId: number,
    pageNumber = 1,
    pageSize = 50
  ): Promise<LeigaResponse<LeigaPage>> {
    return this.post('/comment/page', {
      commentModule: 'issue',
      linkId: issueId,
      pageNumber,
      pageSize
    });
  }

  async addComment(data: {
    issueId: number;
    content: string;
    parentId?: number;
  }): Promise<LeigaResponse<any>> {
    return this.post(
      '/comment/add',
      pickDefined({
        commentModule: 'issue',
        linkId: data.issueId,
        content: data.content,
        commentId: data.parentId
      })
    );
  }

  async updateComment(data: {
    commentId: number;
    content: string;
  }): Promise<LeigaResponse<any>> {
    return this.patch('/comment/update', data);
  }

  async deleteComment(commentId: number): Promise<LeigaResponse<any>> {
    return this.delete('/comment/remove', { id: commentId });
  }

  async addCommentSticker(data: {
    commentId: number;
    sticker: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/comment/sticker/add', data);
  }

  async listCommentStickers(commentId: number): Promise<LeigaResponse<any[]>> {
    return this.get('/comment/sticker/list', { commentId });
  }

  // ─── Tags ───────────────────────────────────────────────────

  async listTags(projectId: number): Promise<LeigaResponse<any[]>> {
    return this.post('/tag/list', { projectId });
  }

  async createTag(data: {
    projectId: number;
    name: string;
    color?: string;
  }): Promise<LeigaResponse<any>> {
    if (data.color !== undefined)
      throw createApiServiceError(
        'Leiga tags do not support a color parameter. Omit color to create the tag.',
        { reason: 'unsupported_tag_color' }
      );
    return this.post('/tag/add', { projectId: data.projectId, tagName: data.name });
  }

  async updateTag(data: {
    tagId: number;
    name?: string;
    color?: string;
  }): Promise<LeigaResponse<any>> {
    return this.patch('/tag/update', { id: data.tagId, tagName: data.name });
  }

  async deleteTag(tagId: number): Promise<LeigaResponse<any>> {
    return this.delete('/tag/remove', { id: tagId });
  }

  // ─── Workflows ──────────────────────────────────────────────

  async getWorkflow(projectId: number): Promise<LeigaResponse<any>> {
    return this.get('/workflow/get', { projectId });
  }

  async getStatusTransitions(data: {
    projectId: number;
    issueTypeId: number;
    statusId: number;
  }): Promise<LeigaResponse<any[]>> {
    return this.get('/workflow/transitions', data);
  }

  // ─── Webhooks ───────────────────────────────────────────────

  async listWebhookEvents(projectId: number): Promise<LeigaResponse<any[]>> {
    return this.get('/webhook/list-events', { projectId });
  }

  async listWebhookTypes(): Promise<LeigaResponse<any[]>> {
    return this.get('/webhook/list-types');
  }

  async queryWebhooks(projectId: number): Promise<LeigaResponse<any[]>> {
    return this.get('/webhook/list', { projectId });
  }

  async createWebhook(data: {
    name: string;
    state: string;
    type: string;
    projectId: number;
    eventIds: number[];
    url: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/webhook/add', data);
  }

  async updateWebhook(data: {
    webhookId: number;
    name?: string;
    state?: string;
    eventIds?: number[];
    url?: string;
  }): Promise<LeigaResponse<any>> {
    return this.put('/webhook/update', data);
  }

  async deleteWebhook(webhookId: number): Promise<LeigaResponse<any>> {
    return this.delete('/webhook/delete', { webhookId });
  }

  async getWebhookDetail(webhookId: number): Promise<LeigaResponse<any>> {
    return this.get('/webhook/get', { webhookId });
  }

  // ─── Organization Members ──────────────────────────────────

  async listOrgMembers(pageNumber?: number, pageSize?: number): Promise<LeigaResponse<any>> {
    return this.get('/org/all-member-list', { pageNumber, pageSize });
  }

  // ─── Personal Messages ─────────────────────────────────────

  async listPersonalMessages(
    pageNumber?: number,
    pageSize?: number
  ): Promise<LeigaResponse<any>> {
    return this.get('/message/list', { pageNumber, pageSize });
  }
}

// ─── Types ──────────────────────────────────────────────────

export interface LeigaResponse<T> {
  code: string;
  msg?: string;
  data: T;
  success?: boolean;
}

export interface LeigaPage {
  list: any[];
  total?: number;
}

export interface LeigaProject {
  id: number;
  pname: string;
  pkey: string;
  archived: number;
  description?: string;
}
