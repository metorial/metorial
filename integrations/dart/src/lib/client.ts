import { buildApiServiceError, createAuthenticatedAxios, pickDefined } from 'slates';
import type {
  Comment,
  ConciseDoc,
  ConciseTask,
  CurrentUser,
  Doc,
  Task,
  WorkspaceConfig
} from './types';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ListTasksParams {
  assignee?: string;
  dartboard?: string;
  status?: string;
  priority?: string;
  tag?: string;
  isCompleted?: boolean;
  dueDateBefore?: string;
  dueDateAfter?: string;
  createdAtAfter?: string;
  createdAtBefore?: string;
  updatedAtAfter?: string;
  updatedAtBefore?: string;
  parentId?: string;
  title?: string;
  inTrash?: boolean;
  ordering?: string[];
  limit?: number;
  offset?: number;
  noDefaults?: boolean;
}

export interface CreateTaskParams {
  title: string;
  dartboard?: string;
  description?: string;
  status?: string;
  type?: string;
  assignee?: string;
  assignees?: string[];
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  tags?: string[];
  startAt?: string;
  dueAt?: string;
  size?: string | number;
  parentId?: string;
  customProperties?: Record<string, any>;
}

export interface UpdateTaskParams {
  title?: string;
  dartboard?: string;
  description?: string;
  status?: string;
  type?: string;
  assignee?: string | null;
  assignees?: string[] | null;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low' | null;
  tags?: string[];
  startAt?: string | null;
  dueAt?: string | null;
  size?: string | number | null;
  parentId?: string | null;
  customProperties?: Record<string, any>;
  taskRelationships?: {
    subtaskIds?: string[];
    blockerIds?: string[];
    blockingIds?: string[];
    duplicateIds?: string[];
    relatedIds?: string[];
  };
}

export interface ListCommentsParams {
  taskId: string;
  limit?: number;
  offset?: number;
  ordering?: string[];
}

export interface CreateCommentParams {
  taskId: string;
  text: string;
  parentId?: string;
}

export interface ListDocsParams {
  folder?: string;
  title?: string;
  search?: string;
  inTrash?: boolean;
  limit?: number;
  offset?: number;
  ordering?: string[];
  noDefaults?: boolean;
}

export interface CreateDocParams {
  title: string;
  folder?: string;
  text?: string;
}

export interface UpdateDocParams {
  title?: string;
  folder?: string;
  text?: string;
}

let mapTask = (raw: any): Task => ({
  taskId: raw.id,
  htmlUrl: raw.htmlUrl ?? '',
  title: raw.title ?? '',
  parentId: raw.parentId ?? null,
  dartboard: raw.dartboard ?? '',
  type: raw.type ?? '',
  status: raw.status ?? '',
  description: raw.description ?? '',
  assignee: raw.assignee ?? null,
  assignees: raw.assignees ?? null,
  tags: raw.tags ?? [],
  priority: raw.priority ?? null,
  startAt: raw.startAt ?? null,
  dueAt: raw.dueAt ?? null,
  size: raw.size ?? null,
  timeTracking: raw.timeTracking,
  attachments: raw.attachments,
  customProperties: raw.customProperties ?? null,
  taskRelationships: raw.taskRelationships ?? null,
  createdBy: raw.createdBy ?? null,
  createdAt: raw.createdAt,
  updatedBy: raw.updatedBy ?? null,
  updatedAt: raw.updatedAt
});

let mapConciseTask = (raw: any): ConciseTask => ({
  taskId: raw.id,
  htmlUrl: raw.htmlUrl ?? '',
  title: raw.title ?? '',
  parentId: raw.parentId,
  dartboard: raw.dartboard ?? '',
  type: raw.type,
  status: raw.status ?? '',
  assignee: raw.assignee,
  assignees: raw.assignees,
  tags: raw.tags,
  priority: raw.priority,
  startAt: raw.startAt,
  dueAt: raw.dueAt,
  size: raw.size,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt
});

let mapComment = (raw: any): Comment => ({
  commentId: raw.id,
  parentId: raw.parentId ?? null,
  htmlUrl: raw.htmlUrl,
  author: raw.author ?? '',
  taskId: raw.taskId ?? '',
  text: raw.text ?? ''
});

let mapDoc = (raw: any): Doc => ({
  docId: raw.id,
  htmlUrl: raw.htmlUrl ?? '',
  title: raw.title ?? '',
  folder: raw.folder ?? '',
  text: raw.text
});

let mapConciseDoc = (raw: any): ConciseDoc => ({
  docId: raw.id,
  htmlUrl: raw.htmlUrl ?? '',
  title: raw.title ?? '',
  folder: raw.folder ?? ''
});

export class Client {
  private api;

  constructor(config: { token: string }) {
    this.api = createAuthenticatedAxios({
      baseURL: 'https://app.dartai.com/api/v0/public',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Dart',
          reason: 'dart_api_error'
        })
    });
  }

  // --- Tasks ---

  async createTask(params: CreateTaskParams): Promise<Task> {
    let response = await this.api.post('/tasks', { item: pickDefined(params) });
    return mapTask(response.data.item);
  }

  async getTask(taskId: string): Promise<Task> {
    let response = await this.api.get(`/tasks/${encodeURIComponent(taskId)}`);
    return mapTask(response.data.item);
  }

  async updateTask(taskId: string, params: UpdateTaskParams): Promise<Task> {
    let item = pickDefined({ id: taskId, ...params });
    let response = await this.api.put(`/tasks/${encodeURIComponent(taskId)}`, { item });
    return mapTask(response.data.item);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.api.delete(`/tasks/${encodeURIComponent(taskId)}`);
  }

  async listTasks(params: ListTasksParams = {}): Promise<PaginatedResponse<ConciseTask>> {
    let query: Record<string, any> = {};
    if (params.assignee !== undefined) query.assignee = params.assignee;
    if (params.dartboard !== undefined) query.dartboard = params.dartboard;
    if (params.status !== undefined) query.status = params.status;
    if (params.priority !== undefined) query.priority = params.priority;
    if (params.tag !== undefined) query.tag = params.tag;
    if (params.isCompleted !== undefined) query.is_completed = params.isCompleted;
    if (params.dueDateBefore !== undefined) query.due_at_before = params.dueDateBefore;
    if (params.dueDateAfter !== undefined) query.due_at_after = params.dueDateAfter;
    if (params.createdAtAfter !== undefined) query.created_at_after = params.createdAtAfter;
    if (params.createdAtBefore !== undefined) query.created_at_before = params.createdAtBefore;
    if (params.updatedAtAfter !== undefined) query.updated_at_after = params.updatedAtAfter;
    if (params.updatedAtBefore !== undefined) query.updated_at_before = params.updatedAtBefore;
    if (params.parentId !== undefined) query.parent_id = params.parentId;
    if (params.title !== undefined) query.title = params.title;
    if (params.inTrash !== undefined) query.in_trash = params.inTrash;
    if (params.ordering && params.ordering.length > 0) query.o = params.ordering.join(',');
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.noDefaults !== undefined) query.no_defaults = params.noDefaults;

    let response = await this.api.get('/tasks/list', { params: query });
    let data = response.data;
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: (data.results ?? []).map(mapConciseTask)
    };
  }

  async addTaskTimeTracking(
    taskId: string,
    params: {
      startedAt: string;
      finishedAt: string;
      user?: string | null;
      customPropertyName?: string | null;
    }
  ): Promise<Task> {
    let response = await this.api.post(
      `/tasks/${encodeURIComponent(taskId)}/time-tracking`,
      pickDefined(params)
    );
    return mapTask(response.data.item);
  }

  async getCurrentUser(): Promise<CurrentUser> {
    let response = await this.api.get<{
      isLoggedIn: boolean;
      user: { id: string; name: string; email: string };
    }>('/me');
    return {
      isLoggedIn: response.data.isLoggedIn,
      userId: response.data.user.id,
      name: response.data.user.name,
      email: response.data.user.email
    };
  }

  // --- Comments ---

  async createComment(params: CreateCommentParams): Promise<Comment> {
    let response = await this.api.post('/comments', {
      item: {
        taskId: params.taskId,
        text: params.text,
        parentId: params.parentId
      }
    });
    return mapComment(response.data.item);
  }

  async listComments(params: ListCommentsParams): Promise<PaginatedResponse<Comment>> {
    let query: Record<string, any> = {
      task_id: params.taskId
    };
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.ordering && params.ordering.length > 0) query.o = params.ordering.join(',');

    let response = await this.api.get('/comments/list', { params: query });
    let data = response.data;
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: (data.results ?? []).map(mapComment)
    };
  }

  // --- Documents ---

  async createDoc(params: CreateDocParams): Promise<Doc> {
    let response = await this.api.post('/docs', {
      item: {
        title: params.title,
        folder: params.folder,
        text: params.text
      }
    });
    return mapDoc(response.data.item);
  }

  async getDoc(docId: string): Promise<Doc> {
    let response = await this.api.get(`/docs/${encodeURIComponent(docId)}`);
    return mapDoc(response.data.item);
  }

  async updateDoc(docId: string, params: UpdateDocParams): Promise<Doc> {
    let item: Record<string, any> = { id: docId };
    if (params.title !== undefined) item.title = params.title;
    if (params.folder !== undefined) item.folder = params.folder;
    if (params.text !== undefined) item.text = params.text;

    let response = await this.api.put(`/docs/${encodeURIComponent(docId)}`, { item });
    return mapDoc(response.data.item);
  }

  async deleteDoc(docId: string): Promise<void> {
    await this.api.delete(`/docs/${encodeURIComponent(docId)}`);
  }

  async listDocs(params: ListDocsParams = {}): Promise<PaginatedResponse<ConciseDoc>> {
    let query: Record<string, any> = {};
    if (params.folder !== undefined) query.folder = params.folder;
    if (params.title !== undefined) query.title = params.title;
    if (params.search !== undefined) query.s = params.search;
    if (params.inTrash !== undefined) query.in_trash = params.inTrash;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.ordering && params.ordering.length > 0) query.o = params.ordering.join(',');
    if (params.noDefaults !== undefined) query.no_defaults = params.noDefaults;

    let response = await this.api.get('/docs/list', { params: query });
    let data = response.data;
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: (data.results ?? []).map(mapConciseDoc)
    };
  }

  // --- Workspace Config ---

  async getWorkspaceConfig(): Promise<WorkspaceConfig> {
    let response = await this.api.get('/config');
    let data = response.data;
    return {
      today: data.today ?? '',
      userName: data.user?.name ?? '',
      userEmail: data.user?.email ?? '',
      dartboards: data.dartboards ?? [],
      folders: data.folders ?? [],
      types: data.types ?? [],
      statuses: data.statuses ?? [],
      assignees: (data.assignees ?? []).map((a: any) => ({
        name: a.name ?? '',
        email: a.email ?? ''
      })),
      tags: data.tags ?? [],
      priorities: data.priorities ?? [],
      sizes: Array.isArray(data.sizes) ? data.sizes : [],
      customProperties: (data.customProperties ?? []).map((p: any) => ({
        name: p.name ?? '',
        type: p.type ?? '',
        options: p.options,
        format: p.format,
        isRange: p.isRange,
        isMultiple: p.isMultiple,
        statuses: p.statuses
      }))
    };
  }
}
