import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ListParams {
  [key: string]: string | number | boolean | undefined | null;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token.trim().replace(/^apikey\s+/i, '');
    if (!token) throw createApiServiceError('A Nozbe API token is required.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api4.nozbe.com/v1/api',
      timeout: 30_000,
      authHeader: { value: `apikey ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Nozbe',
          reason: 'nozbe_api_request_failed'
        })
    });
  }

  // ── Projects ──

  async listProjects(params?: ListParams) {
    let response = await this.http.get('/projects', {
      params
    });
    return response.data;
  }

  async getProject(projectId: string, fields?: string) {
    let response = await this.http.get(`/projects/${encodeURIComponent(projectId)}`, {
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  async createProject(data: Record<string, unknown>) {
    let response = await this.http.post('/projects', data);
    return response.data;
  }

  async updateProject(projectId: string, data: Record<string, unknown>) {
    let response = await this.http.put(`/projects/${encodeURIComponent(projectId)}`, data);
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await this.http.delete(`/projects/${encodeURIComponent(projectId)}`);
    return response.data;
  }

  // ── Tasks ──

  async listTasks(params?: ListParams) {
    let response = await this.http.get('/tasks', {
      params
    });
    return response.data;
  }

  async getTask(taskId: string, fields?: string) {
    let response = await this.http.get(`/tasks/${encodeURIComponent(taskId)}`, {
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  async createTask(data: Record<string, unknown>) {
    let response = await this.http.post('/tasks', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, unknown>) {
    let response = await this.http.put(`/tasks/${encodeURIComponent(taskId)}`, data);
    return response.data;
  }

  async deleteTask(taskId: string) {
    let response = await this.http.delete(`/tasks/${encodeURIComponent(taskId)}`);
    return response.data;
  }

  // ── Polling ──

  async pollNewTasks(params?: ListParams) {
    let response = await this.http.get('/poll/tasks/new', {
      params
    });
    return response.data;
  }

  async pollUpdatedTasks(params?: ListParams) {
    let response = await this.http.get('/poll/tasks/updated', {
      params
    });
    return response.data;
  }

  // ── Comments ──

  async listComments(params?: ListParams) {
    let response = await this.http.get('/comments', {
      params
    });
    return response.data;
  }

  async getComment(commentId: string, fields?: string) {
    let response = await this.http.get(`/comments/${encodeURIComponent(commentId)}`, {
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  async createComment(data: Record<string, unknown>) {
    let response = await this.http.post('/comments', data);
    return response.data;
  }

  async updateComment(commentId: string, data: Record<string, unknown>) {
    let response = await this.http.put(`/comments/${encodeURIComponent(commentId)}`, data);
    return response.data;
  }

  async deleteComment(commentId: string) {
    let response = await this.http.delete(`/comments/${encodeURIComponent(commentId)}`);
    return response.data;
  }

  // ── Tags ──

  async listTags(params?: ListParams) {
    let response = await this.http.get('/tags', {
      params
    });
    return response.data;
  }

  async getTag(tagId: string, fields?: string) {
    let response = await this.http.get(`/tags/${encodeURIComponent(tagId)}`, {
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  async createTag(data: Record<string, unknown>) {
    let response = await this.http.post('/tags', data);
    return response.data;
  }

  async updateTag(tagId: string, data: Record<string, unknown>) {
    let response = await this.http.put(`/tags/${encodeURIComponent(tagId)}`, data);
    return response.data;
  }

  // ── Tag Assignments ──

  async listTagAssignments(params?: ListParams) {
    let response = await this.http.get('/tag_assignments', {
      params
    });
    return response.data;
  }

  async createTagAssignment(data: { tag_id: string; task_id: string }) {
    let response = await this.http.post('/tag_assignments', data);
    return response.data;
  }

  async deleteTagAssignment(assignmentId: string) {
    let response = await this.http.delete(
      `/tag_assignments/${encodeURIComponent(assignmentId)}`
    );
    return response.data;
  }

  // ── Teams ──

  async listTeams(params?: ListParams) {
    let response = await this.http.get('/teams', {
      params
    });
    return response.data;
  }

  async getTeam(teamId: string, fields?: string) {
    let response = await this.http.get(`/teams/${encodeURIComponent(teamId)}`, {
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  // ── Team Members ──

  async listTeamMembers(params?: ListParams) {
    let response = await this.http.get('/team_members', {
      params
    });
    return response.data;
  }

  async getTeamMember(memberId: string, fields?: string) {
    let response = await this.http.get(`/team_members/${encodeURIComponent(memberId)}`, {
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  // ── Users ──

  async listUsers(params?: ListParams) {
    let response = await this.http.get('/users', {
      params
    });
    return response.data;
  }

  async getUser(userId: string, fields?: string) {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}`, {
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  // ── Project Sections ──

  async listProjectSections(params?: ListParams) {
    let response = await this.http.get('/project_sections', {
      params
    });
    return response.data;
  }

  async getProjectSection(sectionId: string, fields?: string) {
    let response = await this.http.get(`/project_sections/${encodeURIComponent(sectionId)}`, {
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  async createProjectSection(data: Record<string, unknown>) {
    let response = await this.http.post('/project_sections', data);
    return response.data;
  }

  async updateProjectSection(sectionId: string, data: Record<string, unknown>) {
    let response = await this.http.put(
      `/project_sections/${encodeURIComponent(sectionId)}`,
      data
    );
    return response.data;
  }

  async deleteProjectSection(sectionId: string) {
    let response = await this.http.delete(
      `/project_sections/${encodeURIComponent(sectionId)}`
    );
    return response.data;
  }

  // ── Reminders ──

  async listReminders(params?: ListParams) {
    let response = await this.http.get('/reminders', {
      params
    });
    return response.data;
  }

  async createReminder(data: Record<string, unknown>) {
    let response = await this.http.post('/reminders', data);
    return response.data;
  }

  async deleteReminder(reminderId: string) {
    let response = await this.http.delete(`/reminders/${encodeURIComponent(reminderId)}`);
    return response.data;
  }

  // ── Project Accesses ──

  async listProjectAccesses(params?: ListParams) {
    let response = await this.http.get('/project_accesses', {
      params
    });
    return response.data;
  }

  async createProjectAccess(data: Record<string, unknown>) {
    let response = await this.http.post('/project_accesses', data);
    return response.data;
  }

  async deleteProjectAccess(accessId: string) {
    let response = await this.http.delete(`/project_accesses/${encodeURIComponent(accessId)}`);
    return response.data;
  }
}
