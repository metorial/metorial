import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export let teamcampApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Teamcamp',
    reason: 'teamcamp_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
  });

export class Client {
  private axios;
  private backend;

  constructor(config: { token: string }) {
    if (typeof config.token !== 'string' || !config.token.trim())
      throw createApiServiceError('Enter your Teamcamp API key.', {
        reason: 'teamcamp_missing_auth'
      });
    let options = {
      authHeader: { name: 'apiKey', value: config.token },
      errorAdapter: teamcampApiError,
      headers: { Accept: 'application/json' },
      maxRedirects: 0
    };
    this.axios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://api.teamcamp.app/v1.0'
    });
    this.backend = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://back.teamcamp.app/api/v1'
    });
  }

  // ── Company / Workspace ──────────────────────────────────────

  async verify(): Promise<unknown> {
    let response = await this.axios.get('/verify');
    return response.data;
  }

  async getUsers(): Promise<unknown> {
    let response = await this.axios.get('/company/users');
    return response.data;
  }

  async getCustomers(): Promise<unknown> {
    let response = await this.axios.get('/company/customers');
    return response.data;
  }

  // ── Projects ─────────────────────────────────────────────────

  async listProjects(): Promise<unknown> {
    let response = await this.axios.get('/project');
    return response.data;
  }

  async getProject(projectId: string): Promise<unknown> {
    let response = await this.axios.get(`/project/${encodeURIComponent(projectId)}`);
    return response.data;
  }

  async createProject(data: {
    projectName: string;
    customerId?: string;
    startDate?: string;
    dueDate?: string;
    templateId?: string;
  }): Promise<unknown> {
    let response = await this.axios.post('/project', pickDefined(data));
    return response.data;
  }

  async updateProject(
    projectId: string,
    data: {
      projectName?: string;
      customerId?: string;
      startDate?: string;
      dueDate?: string;
      description?: string;
      priority?: boolean;
      defaultPriority?: string;
      estimate?: boolean;
      milestone?: boolean;
    }
  ): Promise<unknown> {
    let response = await this.axios.put(
      `/project/${encodeURIComponent(projectId)}`,
      pickDefined(data)
    );
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/project/${encodeURIComponent(projectId)}`);
  }

  async getProjectGroups(projectId: string): Promise<unknown> {
    let response = await this.axios.get(`/project/${encodeURIComponent(projectId)}/group`);
    return response.data;
  }

  // ── Tasks ────────────────────────────────────────────────────

  async listTasks(projectId: string, complete?: boolean): Promise<unknown> {
    let params: { projectId: string; complete?: boolean } = { projectId };
    if (complete !== undefined) {
      params.complete = complete;
    }
    let response = await this.axios.get('/task', { params });
    return response.data;
  }

  async getTask(taskId: string): Promise<unknown> {
    let response = await this.axios.get(`/task/${encodeURIComponent(taskId)}`);
    return response.data;
  }

  async createTask(data: {
    projectId: string;
    name?: string;
    description?: string;
    priority?: number;
    dueDate?: string;
    groupId?: string;
    taskUsers?: string[];
    files?: Array<{
      fileType: string;
      href: string;
      name: string;
      size: number;
    }>;
    estimateTime?: number;
    milestoneId?: number;
    statusId?: string;
  }): Promise<unknown> {
    let response = await this.axios.post('/task', this.taskBody(data));
    return response.data;
  }

  async updateTask(
    taskId: string,
    data: {
      projectId: string;
      name?: string;
      description?: string;
      priority?: number;
      dueDate?: string;
      groupId?: string;
      taskUsers?: string[];
      files?: Array<{
        fileType: string;
        href: string;
        name: string;
        size: number;
      }>;
      estimateTime?: number;
      milestoneId?: number;
      statusId?: string;
    }
  ): Promise<unknown> {
    let response = await this.backend.put(
      `/task/updateTask/${encodeURIComponent(taskId)}`,
      this.taskBody(data)
    );
    return response.data;
  }

  async getProjectDetails(projectId: string): Promise<unknown> {
    let response = await this.backend.get(
      `/project/${encodeURIComponent(projectId)}/getCurrentProjectDetails`
    );
    return response.data;
  }

  private taskBody<T extends { files?: Array<{ size: number }> }>(data: T) {
    return pickDefined({
      ...data,
      files: data.files?.map(file => ({ ...file, size: String(file.size) }))
    });
  }

  // ── Comments ─────────────────────────────────────────────────

  async postComment(taskId: string, content: string): Promise<unknown> {
    let response = await this.axios.post(`/task/${encodeURIComponent(taskId)}/comments`, {
      content
    });
    return response.data;
  }
}
