import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://app.leiga.com/openapi/api'
});

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
    let response = await api.request({
      method,
      url: path,
      headers: this.headers(),
      data: options?.data,
      params: options?.params
    });
    return response.data;
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
    return this.get('/project/member-list', { projectId });
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
    return this.get('/issue/get', { issueId });
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
    return this.put('/issue/update', data);
  }

  async deleteIssue(issueId: number): Promise<LeigaResponse<any>> {
    return this.delete('/issue/delete', { issueId });
  }

  async queryIssues(data: {
    projectId: number;
    pageNumber?: number;
    pageSize?: number;
    filters?: Record<string, any>;
  }): Promise<LeigaResponse<any>> {
    return this.post('/issue/query', data);
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
    return this.post('/issue/subtask/add', data);
  }

  async updateSubtask(data: {
    subtaskId: number;
    summary?: string;
    status?: string;
    assigneeId?: number;
    dueDate?: string;
    estimatePoint?: number;
  }): Promise<LeigaResponse<any>> {
    return this.put('/issue/subtask/update', data);
  }

  async deleteSubtask(subtaskId: number): Promise<LeigaResponse<any>> {
    return this.delete('/issue/subtask/delete', { subtaskId });
  }

  // ─── Issue Relations ────────────────────────────────────────

  async addIssueRelation(data: {
    sourceIssueId: number;
    destinationIssueId: number;
    relationType: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/issue/relation/add', data);
  }

  async removeIssueRelation(data: {
    sourceIssueId: number;
    destinationIssueId: number;
    relationType: string;
  }): Promise<LeigaResponse<any>> {
    return this.delete('/issue/relation/delete', data);
  }

  // ─── Sprints ────────────────────────────────────────────────

  async listSprints(projectId: number): Promise<LeigaResponse<any[]>> {
    return this.get('/sprint/list', { projectId });
  }

  async getSprint(sprintId: number): Promise<LeigaResponse<any>> {
    return this.get('/sprint/get', { sprintId });
  }

  async createSprint(data: {
    projectId: number;
    name: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
    assigneeId?: number;
  }): Promise<LeigaResponse<any>> {
    return this.post('/sprint/add', data);
  }

  async updateSprint(data: {
    sprintId: number;
    name?: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
    assigneeId?: number;
  }): Promise<LeigaResponse<any>> {
    return this.put('/sprint/update', data);
  }

  async deleteSprint(sprintId: number): Promise<LeigaResponse<any>> {
    return this.delete('/sprint/delete', { sprintId });
  }

  // ─── Epics ──────────────────────────────────────────────────

  async listEpics(projectId: number): Promise<LeigaResponse<any[]>> {
    return this.get('/epic/list', { projectId });
  }

  async getEpic(epicId: number): Promise<LeigaResponse<any>> {
    return this.get('/epic/get', { epicId });
  }

  async createEpic(data: {
    projectId: number;
    name: string;
    description?: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/epic/add', data);
  }

  async updateEpic(data: {
    epicId: number;
    name?: string;
    description?: string;
  }): Promise<LeigaResponse<any>> {
    return this.put('/epic/update', data);
  }

  async deleteEpic(epicId: number): Promise<LeigaResponse<any>> {
    return this.delete('/epic/delete', { epicId });
  }

  // ─── Versions / Releases ───────────────────────────────────

  async listVersions(projectId: number): Promise<LeigaResponse<any[]>> {
    return this.get('/version/list', { projectId });
  }

  async getVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.get('/version/get', { versionId });
  }

  async createVersion(data: {
    projectId: number;
    name: string;
    description?: string;
    startDate?: string;
    releaseDate?: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/version/add', data);
  }

  async updateVersion(data: {
    versionId: number;
    name?: string;
    description?: string;
    startDate?: string;
    releaseDate?: string;
  }): Promise<LeigaResponse<any>> {
    return this.put('/version/update', data);
  }

  async deleteVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.delete('/version/delete', { versionId });
  }

  async releaseVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.patch('/version/release', { id: versionId });
  }

  async cancelReleaseVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.patch('/version/cancel-release', { id: versionId });
  }

  async archiveVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.patch('/version/archive', { id: versionId });
  }

  async unarchiveVersion(versionId: number): Promise<LeigaResponse<any>> {
    return this.patch('/version/unarchive', { id: versionId });
  }

  // ─── Comments ───────────────────────────────────────────────

  async listComments(issueId: number): Promise<LeigaResponse<any[]>> {
    return this.get('/comment/list', { issueId });
  }

  async addComment(data: {
    issueId: number;
    content: string;
    parentId?: number;
  }): Promise<LeigaResponse<any>> {
    return this.post('/comment/add', data);
  }

  async updateComment(data: {
    commentId: number;
    content: string;
  }): Promise<LeigaResponse<any>> {
    return this.put('/comment/update', data);
  }

  async deleteComment(commentId: number): Promise<LeigaResponse<any>> {
    return this.delete('/comment/delete', { commentId });
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
    return this.get('/tag/list', { projectId });
  }

  async createTag(data: {
    projectId: number;
    name: string;
    color?: string;
  }): Promise<LeigaResponse<any>> {
    return this.post('/tag/add', data);
  }

  async updateTag(data: {
    tagId: number;
    name?: string;
    color?: string;
  }): Promise<LeigaResponse<any>> {
    return this.put('/tag/update', data);
  }

  async deleteTag(tagId: number): Promise<LeigaResponse<any>> {
    return this.delete('/tag/delete', { tagId });
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

export interface LeigaProject {
  id: number;
  pname: string;
  pkey: string;
  archived: number;
  description?: string;
}
