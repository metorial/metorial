import { createAxios } from 'slates';

let BASE_URL = 'https://app.webvizio.com';
let VERSION_PATH = '/api/v1';

export interface ProjectCreateInput {
  url: string;
  name?: string;
  screenshot?: string;
  externalId?: string;
}

export interface ProjectUpdateInput {
  projectId?: number;
  externalId?: string;
  uuid?: string;
  name?: string;
  screenshot?: string;
}

export interface ProjectFindInput {
  projectId?: number;
  externalId?: string;
  uuid?: string;
  name?: string;
}

export interface ProjectDeleteInput {
  projectId?: number;
  externalId?: string;
  uuid?: string;
}

export interface ProjectResponse {
  id: number;
  uuid: string;
  externalId: string | null;
  name: string;
  screenshot: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCreateInput {
  projectId?: number;
  projectUuid?: string;
  projectExternalId?: string;
  name: string;
  externalId?: string;
  author?: string;
  description?: string;
  status?: string;
  priority?: string;
  executeAt?: string;
  tags?: string[];
  files?: { fileName: string; fileUrl: string }[];
  assignees?: string[];
  timeLogs?: { user: string; date: string; time: number }[];
}

export interface TaskUpdateInput {
  taskId?: number;
  externalId?: string;
  name?: string;
  author?: string;
  description?: string;
  status?: string;
  priority?: string;
  executeAt?: string;
  tags?: string[];
  files?: { fileName: string; fileUrl: string }[];
  assignees?: string[];
  timeLogs?: { user: string; date: string; time: number }[];
}

export interface TaskFindInput {
  taskId?: number;
  externalId?: string;
}

export interface TaskDeleteInput {
  taskId?: number;
  externalId?: string;
}

export interface TaskResponse {
  id: number;
  externalId: string | null;
  number: number;
  projectId: number;
  projectUuid: string;
  projectExternalId: string | null;
  author: string;
  name: string;
  description: string;
  descriptionHtml: string | null;
  screenshot: string | null;
  status: string;
  priority: string;
  deviceType: string;
  createdAt: string;
  updatedAt: string;
  os: string;
  browser: string;
  executeAt: string;
  tags: string[];
  files: { fileName: string; fileUrl: string }[];
  videos: string[];
  assignees: string[];
  timeLogs: { id: number; user: string; date: string; time: number }[];
}

export interface CommentCreateInput {
  taskId?: number;
  taskExternalId?: string;
  externalId?: string;
  author?: string;
  body?: string;
}

export interface CommentFindInput {
  commentId?: number;
  externalId?: string;
}

export interface CommentDeleteInput {
  commentId?: number;
  externalId?: string;
}

export interface CommentResponse {
  id: number;
  externalId: string | null;
  taskId: number;
  taskExternalId: string | null;
  author: string;
  body: string;
  bodyHtml: string | null;
  createdAt: string;
}

export interface WebhookSubscribeInput {
  url: string;
  event: string;
}

export interface WebhookSubscribeResponse {
  id: number;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: `${BASE_URL}${VERSION_PATH}`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Projects ---

  async createProject(input: ProjectCreateInput): Promise<ProjectResponse> {
    let response = await this.axios.post('/webhook/create-project', {
      url: input.url,
      name: input.name,
      screenshot: input.screenshot,
      externalId: input.externalId
    });
    return response.data;
  }

  async findProject(input: ProjectFindInput): Promise<ProjectResponse> {
    let body: Record<string, unknown> = {};
    if (input.projectId) body.id = input.projectId;
    if (input.externalId) body.externalId = input.externalId;
    if (input.uuid) body.uuid = input.uuid;
    if (input.name) body.name = input.name;

    let response = await this.axios.post('/webhook/find-project', body);
    return response.data;
  }

  async updateProject(input: ProjectUpdateInput): Promise<ProjectResponse> {
    let body: Record<string, unknown> = {};
    if (input.projectId) body.id = input.projectId;
    if (input.externalId) body.externalId = input.externalId;
    if (input.uuid) body.uuid = input.uuid;
    if (input.name !== undefined) body.name = input.name;
    if (input.screenshot !== undefined) body.screenshot = input.screenshot;

    let response = await this.axios.post('/webhook/update-project', body);
    return response.data;
  }

  async deleteProject(input: ProjectDeleteInput): Promise<void> {
    let params: Record<string, unknown> = {};
    if (input.projectId) params.id = input.projectId;
    if (input.externalId) params.externalId = input.externalId;
    if (input.uuid) params.uuid = input.uuid;

    await this.axios.delete('/webhook/delete-project', { data: params });
  }

  // --- Tasks ---

  async createTask(input: TaskCreateInput): Promise<TaskResponse> {
    let body: Record<string, unknown> = {
      name: input.name
    };
    if (input.projectId) body.projectId = input.projectId;
    if (input.projectUuid) body.projectUuid = input.projectUuid;
    if (input.projectExternalId) body.projectExternalId = input.projectExternalId;
    if (input.externalId) body.externalId = input.externalId;
    if (input.author) body.author = input.author;
    if (input.description) body.description = input.description;
    if (input.status) body.status = input.status;
    if (input.priority) body.priority = input.priority;
    if (input.executeAt) body.executeAt = input.executeAt;
    if (input.tags) body.tags = input.tags;
    if (input.files) body.files = input.files;
    if (input.assignees) body.assignees = input.assignees;
    if (input.timeLogs) body.timeLogs = input.timeLogs;

    let response = await this.axios.post('/webhook/create-task', body);
    return response.data;
  }

  async findTask(input: TaskFindInput): Promise<TaskResponse> {
    let body: Record<string, unknown> = {};
    if (input.taskId) body.id = input.taskId;
    if (input.externalId) body.externalId = input.externalId;

    let response = await this.axios.post('/webhook/find-task', body);
    return response.data;
  }

  async updateTask(input: TaskUpdateInput): Promise<TaskResponse> {
    let body: Record<string, unknown> = {};
    if (input.taskId) body.id = input.taskId;
    if (input.externalId) body.externalId = input.externalId;
    if (input.name !== undefined) body.name = input.name;
    if (input.author !== undefined) body.author = input.author;
    if (input.description !== undefined) body.description = input.description;
    if (input.status !== undefined) body.status = input.status;
    if (input.priority !== undefined) body.priority = input.priority;
    if (input.executeAt !== undefined) body.executeAt = input.executeAt;
    if (input.tags) body.tags = input.tags;
    if (input.files) body.files = input.files;
    if (input.assignees) body.assignees = input.assignees;
    if (input.timeLogs) body.timeLogs = input.timeLogs;

    let response = await this.axios.post('/webhook/update-task', body);
    return response.data;
  }

  async deleteTask(input: TaskDeleteInput): Promise<void> {
    let params: Record<string, unknown> = {};
    if (input.taskId) params.id = input.taskId;
    if (input.externalId) params.externalId = input.externalId;

    await this.axios.delete('/webhook/delete-task', { data: params });
  }

  // --- Comments ---

  async createComment(input: CommentCreateInput): Promise<CommentResponse> {
    let body: Record<string, unknown> = {};
    if (input.taskId) body.taskId = input.taskId;
    if (input.taskExternalId) body.taskExternalId = input.taskExternalId;
    if (input.externalId) body.externalId = input.externalId;
    if (input.author) body.author = input.author;
    if (input.body) body.body = input.body;

    let response = await this.axios.post('/webhook/create-comment', body);
    return response.data;
  }

  async findComment(input: CommentFindInput): Promise<CommentResponse> {
    let body: Record<string, unknown> = {};
    if (input.commentId) body.id = input.commentId;
    if (input.externalId) body.externalId = input.externalId;

    let response = await this.axios.post('/webhook/find-comment', body);
    return response.data;
  }

  async deleteComment(input: CommentDeleteInput): Promise<void> {
    let params: Record<string, unknown> = {};
    if (input.commentId) params.id = input.commentId;
    if (input.externalId) params.externalId = input.externalId;

    await this.axios.delete('/webhook/delete-comment', { data: params });
  }

  // --- REST Hooks (Webhook Subscription Management) ---

  async subscribeWebhook(input: WebhookSubscribeInput): Promise<WebhookSubscribeResponse> {
    let response = await this.axios.post('/webhook', {
      url: input.url,
      event: input.event
    });
    return response.data;
  }

  async unsubscribeWebhook(webhookId: number): Promise<void> {
    await this.axios.delete(`/webhook/${webhookId}`);
  }
}
