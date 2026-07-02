import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.teamcamp.app/v1.0',
      headers: {
        apiKey: config.token
      }
    });
  }

  // ── Company / Workspace ──────────────────────────────────────

  async verify(): Promise<any> {
    let response = await this.axios.get('/verify');
    return response.data;
  }

  async getUsers(): Promise<any[]> {
    let response = await this.axios.get('/company/users');
    return response.data;
  }

  async getCustomers(): Promise<any[]> {
    let response = await this.axios.get('/company/customers');
    return response.data;
  }

  // ── Projects ─────────────────────────────────────────────────

  async listProjects(): Promise<any[]> {
    let response = await this.axios.get('/project');
    return response.data;
  }

  async getProject(projectId: string): Promise<any> {
    let response = await this.axios.get(`/project/${projectId}`);
    return response.data;
  }

  async createProject(data: {
    projectName: string;
    customerId?: string;
    startDate?: string;
    dueDate?: string;
    templateId?: string;
  }): Promise<any> {
    let response = await this.axios.post('/project', data);
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
  ): Promise<any> {
    let response = await this.axios.put(`/project/${projectId}`, data);
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/project/${projectId}`);
  }

  async getProjectGroups(projectId: string): Promise<any[]> {
    let response = await this.axios.get(`/project/${projectId}/group`);
    return response.data;
  }

  // ── Tasks ────────────────────────────────────────────────────

  async listTasks(projectId: string, complete?: boolean): Promise<any[]> {
    let params: Record<string, any> = { projectId };
    if (complete !== undefined) {
      params.complete = complete;
    }
    let response = await this.axios.get('/task', { params });
    return response.data;
  }

  async getTask(taskId: string): Promise<any> {
    let response = await this.axios.get(`/task/${taskId}`);
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
  }): Promise<any> {
    let response = await this.axios.post('/task', data);
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
  ): Promise<any> {
    let response = await this.axios.put(`/task/updateTask/${taskId}`, data);
    return response.data;
  }

  // ── Comments ─────────────────────────────────────────────────

  async postComment(taskId: string, content: string): Promise<any> {
    let response = await this.axios.post(`/task/${taskId}/comments`, { content });
    return response.data;
  }
}
