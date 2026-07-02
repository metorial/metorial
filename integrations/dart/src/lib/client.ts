import { createAxios } from 'slates';
import type { Comment, ConciseDoc, ConciseTask, Doc, Task, WorkspaceConfig } from './types';

let api = createAxios({
  baseURL: 'https://app.dartai.com/api/v0/public'
});

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
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // --- Tasks ---

  async createTask(params: CreateTaskParams): Promise<Task> {
    let response = await api.post(
      '/tasks',
      {
        item: {
          title: params.title,
          dartboard: params.dartboard,
          description: params.description,
          status: params.status,
          type: params.type,
          assignee: params.assignee,
          assignees: params.assignees,
          priority: params.priority,
          tags: params.tags,
          startAt: params.startAt,
          dueAt: params.dueAt,
          size: params.size,
          parentId: params.parentId,
          customProperties: params.customProperties
        }
      },
      { headers: this.headers }
    );
    return mapTask(response.data.item);
  }

  async getTask(taskId: string): Promise<Task> {
    let response = await api.get(`/tasks/${taskId}`, { headers: this.headers });
    return mapTask(response.data.item);
  }

  async updateTask(taskId: string, params: UpdateTaskParams): Promise<Task> {
    let item: Record<string, any> = {};
    if (params.title !== undefined) item.title = params.title;
    if (params.dartboard !== undefined) item.dartboard = params.dartboard;
    if (params.description !== undefined) item.description = params.description;
    if (params.status !== undefined) item.status = params.status;
    if (params.type !== undefined) item.type = params.type;
    if (params.assignee !== undefined) item.assignee = params.assignee;
    if (params.assignees !== undefined) item.assignees = params.assignees;
    if (params.priority !== undefined) item.priority = params.priority;
    if (params.tags !== undefined) item.tags = params.tags;
    if (params.startAt !== undefined) item.startAt = params.startAt;
    if (params.dueAt !== undefined) item.dueAt = params.dueAt;
    if (params.size !== undefined) item.size = params.size;
    if (params.parentId !== undefined) item.parentId = params.parentId;
    if (params.customProperties !== undefined) item.customProperties = params.customProperties;
    if (params.taskRelationships !== undefined)
      item.taskRelationships = params.taskRelationships;

    let response = await api.put(`/tasks/${taskId}`, { item }, { headers: this.headers });
    return mapTask(response.data.item);
  }

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`, { headers: this.headers });
  }

  async listTasks(params: ListTasksParams = {}): Promise<PaginatedResponse<ConciseTask>> {
    let query: Record<string, any> = {};
    if (params.assignee) query.assignee = params.assignee;
    if (params.dartboard) query.dartboard = params.dartboard;
    if (params.status) query.status = params.status;
    if (params.priority) query.priority = params.priority;
    if (params.tag) query.tag = params.tag;
    if (params.isCompleted !== undefined) query.is_completed = params.isCompleted;
    if (params.dueDateBefore) query.due_at_before = params.dueDateBefore;
    if (params.dueDateAfter) query.due_at_after = params.dueDateAfter;
    if (params.createdAtAfter) query.created_at_after = params.createdAtAfter;
    if (params.createdAtBefore) query.created_at_before = params.createdAtBefore;
    if (params.updatedAtAfter) query.updated_at_after = params.updatedAtAfter;
    if (params.updatedAtBefore) query.updated_at_before = params.updatedAtBefore;
    if (params.parentId) query.parent_id = params.parentId;
    if (params.title) query.title = params.title;
    if (params.inTrash !== undefined) query.in_trash = params.inTrash;
    if (params.ordering && params.ordering.length > 0) query.o = params.ordering;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.noDefaults !== undefined) query.no_defaults = params.noDefaults;

    let response = await api.get('/tasks/list', { headers: this.headers, params: query });
    let data = response.data;
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: (data.results ?? []).map(mapConciseTask)
    };
  }

  // --- Comments ---

  async createComment(params: CreateCommentParams): Promise<Comment> {
    let response = await api.post(
      '/comments',
      {
        item: {
          taskId: params.taskId,
          text: params.text,
          parentId: params.parentId
        }
      },
      { headers: this.headers }
    );
    return mapComment(response.data.item);
  }

  async listComments(params: ListCommentsParams): Promise<PaginatedResponse<Comment>> {
    let query: Record<string, any> = {
      task_id: params.taskId
    };
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.ordering && params.ordering.length > 0) query.o = params.ordering;

    let response = await api.get('/comments/list', { headers: this.headers, params: query });
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
    let response = await api.post(
      '/docs',
      {
        item: {
          title: params.title,
          folder: params.folder,
          text: params.text
        }
      },
      { headers: this.headers }
    );
    return mapDoc(response.data.item);
  }

  async getDoc(docId: string): Promise<Doc> {
    let response = await api.get(`/docs/${docId}`, { headers: this.headers });
    return mapDoc(response.data.item);
  }

  async updateDoc(docId: string, params: UpdateDocParams): Promise<Doc> {
    let item: Record<string, any> = { id: docId };
    if (params.title !== undefined) item.title = params.title;
    if (params.folder !== undefined) item.folder = params.folder;
    if (params.text !== undefined) item.text = params.text;

    let response = await api.put(`/docs/${docId}`, { item }, { headers: this.headers });
    return mapDoc(response.data.item);
  }

  async deleteDoc(docId: string): Promise<void> {
    await api.delete(`/docs/${docId}`, { headers: this.headers });
  }

  async listDocs(params: ListDocsParams = {}): Promise<PaginatedResponse<ConciseDoc>> {
    let query: Record<string, any> = {};
    if (params.folder) query.folder = params.folder;
    if (params.title) query.title = params.title;
    if (params.search) query.s = params.search;
    if (params.inTrash !== undefined) query.in_trash = params.inTrash;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.ordering && params.ordering.length > 0) query.o = params.ordering;
    if (params.noDefaults !== undefined) query.no_defaults = params.noDefaults;

    let response = await api.get('/docs/list', { headers: this.headers, params: query });
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
    let response = await api.get('/config', { headers: this.headers });
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
      sizes: data.sizes ?? [],
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
