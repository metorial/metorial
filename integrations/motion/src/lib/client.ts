import { createAxios } from 'slates';

let BASE_URL = 'https://api.usemotion.com/v1';
let BETA_BASE_URL = 'https://api.usemotion.com';

export class MotionClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get axios() {
    return createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-Key': this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  private get betaAxios() {
    return createAxios({
      baseURL: BETA_BASE_URL,
      headers: {
        'X-API-Key': this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Tasks ──────────────────────────────────────────────

  async createTask(data: {
    name: string;
    workspaceId: string;
    dueDate?: string;
    duration?: number | string;
    status?: string;
    projectId?: string;
    description?: string;
    priority?: string;
    labels?: string[];
    assigneeId?: string;
    autoScheduled?: {
      startDate?: string;
      deadlineType?: string;
      schedule?: string;
    } | null;
  }) {
    let response = await this.axios.post('/tasks', data);
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/tasks/${taskId}`);
    return response.data;
  }

  async listTasks(
    params: {
      workspaceId?: string;
      projectId?: string;
      assigneeId?: string;
      status?: string[];
      includeAllStatuses?: boolean;
      label?: string;
      name?: string;
      cursor?: string;
    } = {}
  ) {
    let response = await this.axios.get('/tasks', { params });
    return response.data;
  }

  async updateTask(
    taskId: string,
    data: {
      name?: string;
      dueDate?: string;
      duration?: number | string;
      status?: string;
      projectId?: string;
      description?: string;
      priority?: string;
      labels?: string[];
      assigneeId?: string;
      autoScheduled?: {
        startDate?: string;
        deadlineType?: string;
        schedule?: string;
      } | null;
    }
  ) {
    let response = await this.axios.patch(`/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteTask(taskId: string) {
    let response = await this.axios.delete(`/tasks/${taskId}`);
    return response.data;
  }

  async moveTask(
    taskId: string,
    data: {
      workspaceId: string;
      assigneeId?: string;
    }
  ) {
    let response = await this.axios.patch(`/tasks/${taskId}/move`, data);
    return response.data;
  }

  async unassignTask(taskId: string) {
    let response = await this.axios.delete(`/tasks/${taskId}/assignee`);
    return response.data;
  }

  // ─── Projects ───────────────────────────────────────────

  async createProject(data: {
    name: string;
    workspaceId: string;
    dueDate?: string;
    description?: string;
    labels?: string[];
    priority?: string;
  }) {
    let response = await this.axios.post('/projects', data);
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data;
  }

  async listProjects(params: { workspaceId?: string; cursor?: string } = {}) {
    let response = await this.axios.get('/projects', { params });
    return response.data;
  }

  // ─── Recurring Tasks ────────────────────────────────────

  async createRecurringTask(data: {
    name: string;
    workspaceId: string;
    assigneeId: string;
    frequency: Record<string, unknown>;
    deadlineType?: string;
    duration?: number | string;
    startingOn?: string;
    idealTime?: string;
    schedule?: string;
    description?: string;
    priority?: string;
  }) {
    let response = await this.axios.post('/recurring-tasks', data);
    return response.data;
  }

  async listRecurringTasks(params: { workspaceId: string; cursor?: string }) {
    let response = await this.axios.get('/recurring-tasks', { params });
    return response.data;
  }

  async deleteRecurringTask(recurringTaskId: string) {
    let response = await this.axios.delete(`/recurring-tasks/${recurringTaskId}`);
    return response.data;
  }

  // ─── Comments ───────────────────────────────────────────

  async createComment(data: { taskId: string; content?: string }) {
    let response = await this.axios.post('/comments', data);
    return response.data;
  }

  async listComments(params: { taskId: string; cursor?: string }) {
    let response = await this.axios.get('/comments', { params });
    return response.data;
  }

  // ─── Custom Fields ──────────────────────────────────────

  async createCustomField(
    workspaceId: string,
    data: {
      type: string;
      name: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    let response = await this.betaAxios.post(
      `/beta/workspaces/${workspaceId}/custom-fields`,
      data
    );
    return response.data;
  }

  async listCustomFields(workspaceId: string) {
    let response = await this.betaAxios.get(`/beta/workspaces/${workspaceId}/custom-fields`);
    return response.data;
  }

  async deleteCustomField(workspaceId: string, customFieldId: string) {
    let response = await this.betaAxios.delete(
      `/beta/workspaces/${workspaceId}/custom-fields/${customFieldId}`
    );
    return response.data;
  }

  async addCustomFieldToTask(
    taskId: string,
    data: {
      customFieldInstanceId: string;
      value: { type: string; value: string | number };
    }
  ) {
    let response = await this.betaAxios.post(`/beta/custom-field-values/task/${taskId}`, data);
    return response.data;
  }

  async addCustomFieldToProject(
    projectId: string,
    data: {
      customFieldInstanceId: string;
      value: { type: string; value: string | number };
    }
  ) {
    let response = await this.betaAxios.post(
      `/beta/custom-field-values/project/${projectId}`,
      data
    );
    return response.data;
  }

  async removeCustomFieldFromTask(taskId: string, valueId: string) {
    let response = await this.betaAxios.delete(
      `/beta/custom-field-values/task/${taskId}/custom-fields/${valueId}`
    );
    return response.data;
  }

  async removeCustomFieldFromProject(projectId: string, valueId: string) {
    let response = await this.betaAxios.delete(
      `/beta/custom-field-values/project/${projectId}/custom-fields/${valueId}`
    );
    return response.data;
  }

  // ─── Schedules ──────────────────────────────────────────

  async listSchedules() {
    let response = await this.axios.get('/schedules');
    return response.data;
  }

  // ─── Statuses ───────────────────────────────────────────

  async listStatuses(workspaceId: string) {
    let response = await this.axios.get('/statuses', { params: { workspaceId } });
    return response.data;
  }

  // ─── Workspaces ─────────────────────────────────────────

  async listWorkspaces(params: { cursor?: string; ids?: string[] } = {}) {
    let response = await this.axios.get('/workspaces', { params });
    return response.data;
  }

  // ─── Users ──────────────────────────────────────────────

  async listUsers(params: { workspaceId?: string; teamId?: string; cursor?: string } = {}) {
    let response = await this.axios.get('/users', { params });
    return response.data;
  }

  async getMe() {
    let response = await this.axios.get('/users/me');
    return response.data;
  }
}
