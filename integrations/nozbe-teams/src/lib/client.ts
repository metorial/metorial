import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api4.nozbe.com/v1/api'
});

export interface ListParams {
  [key: string]: string | number | boolean | undefined | null;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      Authorization: this.token,
      'Content-Type': 'application/json'
    };
  }

  // ── Projects ──

  async listProjects(params?: ListParams) {
    let response = await http.get('/projects', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getProject(projectId: string, fields?: string) {
    let response = await http.get(`/projects/${projectId}`, {
      headers: this.headers(),
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  async createProject(data: Record<string, unknown>) {
    let response = await http.post('/projects', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateProject(projectId: string, data: Record<string, unknown>) {
    let response = await http.put(`/projects/${projectId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await http.delete(`/projects/${projectId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Tasks ──

  async listTasks(params?: ListParams) {
    let response = await http.get('/tasks', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getTask(taskId: string, fields?: string) {
    let response = await http.get(`/tasks/${taskId}`, {
      headers: this.headers(),
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  async createTask(data: Record<string, unknown>) {
    let response = await http.post('/tasks', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, unknown>) {
    let response = await http.put(`/tasks/${taskId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteTask(taskId: string) {
    let response = await http.delete(`/tasks/${taskId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Polling ──

  async pollNewTasks(params?: ListParams) {
    let response = await http.get('/poll/tasks/new', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async pollUpdatedTasks(params?: ListParams) {
    let response = await http.get('/poll/tasks/updated', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  // ── Comments ──

  async listComments(params?: ListParams) {
    let response = await http.get('/comments', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getComment(commentId: string, fields?: string) {
    let response = await http.get(`/comments/${commentId}`, {
      headers: this.headers(),
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  async createComment(data: Record<string, unknown>) {
    let response = await http.post('/comments', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateComment(commentId: string, data: Record<string, unknown>) {
    let response = await http.put(`/comments/${commentId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteComment(commentId: string) {
    let response = await http.delete(`/comments/${commentId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Tags ──

  async listTags(params?: ListParams) {
    let response = await http.get('/tags', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getTag(tagId: string, fields?: string) {
    let response = await http.get(`/tags/${tagId}`, {
      headers: this.headers(),
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  async createTag(data: Record<string, unknown>) {
    let response = await http.post('/tags', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateTag(tagId: string, data: Record<string, unknown>) {
    let response = await http.put(`/tags/${tagId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Tag Assignments ──

  async listTagAssignments(params?: ListParams) {
    let response = await http.get('/tag_assignments', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async createTagAssignment(data: { tag_id: string; task_id: string }) {
    let response = await http.post('/tag_assignments', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteTagAssignment(assignmentId: string) {
    let response = await http.delete(`/tag_assignments/${assignmentId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Teams ──

  async listTeams(params?: ListParams) {
    let response = await http.get('/teams', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getTeam(teamId: string, fields?: string) {
    let response = await http.get(`/teams/${teamId}`, {
      headers: this.headers(),
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  // ── Team Members ──

  async listTeamMembers(params?: ListParams) {
    let response = await http.get('/team_members', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getTeamMember(memberId: string, fields?: string) {
    let response = await http.get(`/team_members/${memberId}`, {
      headers: this.headers(),
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  // ── Users ──

  async listUsers(params?: ListParams) {
    let response = await http.get('/users', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getUser(userId: string, fields?: string) {
    let response = await http.get(`/users/${userId}`, {
      headers: this.headers(),
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  // ── Project Sections ──

  async listProjectSections(params?: ListParams) {
    let response = await http.get('/project_sections', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getProjectSection(sectionId: string, fields?: string) {
    let response = await http.get(`/project_sections/${sectionId}`, {
      headers: this.headers(),
      params: fields ? { fields } : undefined
    });
    return response.data;
  }

  async createProjectSection(data: Record<string, unknown>) {
    let response = await http.post('/project_sections', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateProjectSection(sectionId: string, data: Record<string, unknown>) {
    let response = await http.put(`/project_sections/${sectionId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteProjectSection(sectionId: string) {
    let response = await http.delete(`/project_sections/${sectionId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Reminders ──

  async listReminders(params?: ListParams) {
    let response = await http.get('/reminders', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async createReminder(data: Record<string, unknown>) {
    let response = await http.post('/reminders', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteReminder(reminderId: string) {
    let response = await http.delete(`/reminders/${reminderId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Project Accesses ──

  async listProjectAccesses(params?: ListParams) {
    let response = await http.get('/project_accesses', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async createProjectAccess(data: Record<string, unknown>) {
    let response = await http.post('/project_accesses', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteProjectAccess(accessId: string) {
    let response = await http.delete(`/project_accesses/${accessId}`, {
      headers: this.headers()
    });
    return response.data;
  }
}
