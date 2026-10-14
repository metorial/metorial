import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

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
  timeLogs?: { id?: number; user: string; date: string; time: number }[];
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
  timeLogs?: { id?: number; user: string; date: string; time: number }[];
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
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a Webvizio personal access token.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: `${BASE_URL}${VERSION_PATH}`,
      timeout: 30000,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Webvizio',
          reason: 'webvizio_api_error'
        })
    });
  }

  // --- Projects ---

  async createProject(input: ProjectCreateInput): Promise<ProjectResponse> {
    if (!input.url.trim()) {
      throw createApiServiceError('Provide the website URL for the project.');
    }
    let response = await this.axios.post(
      '/webhook/create-project',
      pickDefined({
        url: input.url,
        name: input.name,
        screenshot: input.screenshot,
        externalId: input.externalId
      })
    );
    return response.data;
  }

  async findProject(input: ProjectFindInput): Promise<ProjectResponse> {
    this.validateLocator(input, ['projectId', 'externalId', 'uuid', 'name']);
    let body = pickDefined({
      id: input.projectId,
      externalId: input.externalId,
      uuid: input.uuid,
      name: input.name
    });

    let response = await this.axios.post('/webhook/find-project', body);
    return response.data;
  }

  async updateProject(input: ProjectUpdateInput): Promise<ProjectResponse> {
    this.validateLocator(input, ['projectId', 'externalId', 'uuid']);
    let body = pickDefined({
      id: input.projectId,
      externalId: input.externalId,
      uuid: input.uuid,
      name: input.name,
      screenshot: input.screenshot
    });

    let response = await this.axios.post('/webhook/update-project', body);
    return response.data;
  }

  async deleteProject(input: ProjectDeleteInput): Promise<void> {
    this.validateLocator(input, ['projectId', 'externalId', 'uuid']);
    let params = pickDefined({
      id: input.projectId,
      externalId: input.externalId,
      uuid: input.uuid
    });

    await this.axios.delete('/webhook/delete-project', { data: params });
  }

  // --- Tasks ---

  async createTask(input: TaskCreateInput): Promise<TaskResponse> {
    this.validateLocator(input, ['projectId', 'projectUuid', 'projectExternalId']);
    if (!input.name.trim()) {
      throw createApiServiceError('Provide a name for the task.');
    }
    this.validateTimeLogs(input.timeLogs);
    let body = pickDefined(input);

    let response = await this.axios.post('/webhook/create-task', body);
    return response.data;
  }

  async findTask(input: TaskFindInput): Promise<TaskResponse> {
    this.validateLocator(input, ['taskId', 'externalId']);
    let body = pickDefined({ id: input.taskId, externalId: input.externalId });

    let response = await this.axios.post('/webhook/find-task', body);
    return response.data;
  }

  async updateTask(input: TaskUpdateInput): Promise<TaskResponse> {
    this.validateLocator(input, ['taskId', 'externalId']);
    this.validateTimeLogs(input.timeLogs);
    let { taskId, ...fields } = input;
    let body = pickDefined({ id: taskId, ...fields });

    let response = await this.axios.post('/webhook/update-task', body);
    return response.data;
  }

  async deleteTask(input: TaskDeleteInput): Promise<void> {
    this.validateLocator(input, ['taskId', 'externalId']);
    let params = pickDefined({ id: input.taskId, externalId: input.externalId });

    await this.axios.delete('/webhook/delete-task', { data: params });
  }

  // --- Comments ---

  async createComment(input: CommentCreateInput): Promise<CommentResponse> {
    this.validateLocator(input, ['taskId', 'taskExternalId']);
    let body = pickDefined(input);

    let response = await this.axios.post('/webhook/create-comment', body);
    return response.data;
  }

  async findComment(input: CommentFindInput): Promise<CommentResponse> {
    this.validateLocator(input, ['commentId', 'externalId']);
    let body = pickDefined({ id: input.commentId, externalId: input.externalId });

    let response = await this.axios.post('/webhook/find-comment', body);
    return response.data;
  }

  async deleteComment(input: CommentDeleteInput): Promise<void> {
    this.validateLocator(input, ['commentId', 'externalId']);
    let params = pickDefined({ id: input.commentId, externalId: input.externalId });

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

  private validateLocator<T extends object>(input: T, fields: (keyof T)[]): void {
    if (!fields.some(field => input[field] !== undefined)) {
      throw createApiServiceError(`Provide at least one of: ${fields.join(', ')}.`);
    }
    for (let field of fields) {
      let value = input[field];
      if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) {
        throw createApiServiceError(`${String(field)} must be a positive whole-number ID.`);
      }
      if (typeof value === 'string' && !value.trim()) {
        throw createApiServiceError(`${String(field)} must not be empty.`);
      }
    }
  }

  private validateTimeLogs(timeLogs: TaskCreateInput['timeLogs']): void {
    for (let entry of timeLogs ?? []) {
      if (entry.id !== undefined && (!Number.isSafeInteger(entry.id) || entry.id <= 0)) {
        throw createApiServiceError('Each time log id must be a positive whole-number ID.');
      }
      if (!Number.isSafeInteger(entry.time) || entry.time < 0) {
        throw createApiServiceError(
          'Each time log time must be a nonnegative whole number of minutes.'
        );
      }
    }
  }
}
