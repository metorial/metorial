import { randomUUID } from 'node:crypto';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface TaskDue {
  string?: string;
  date?: string;
  isRecurring?: boolean;
  datetime?: string;
  timezone?: string;
  lang?: string;
}

export interface TaskDeadline {
  date: string;
}

export interface TaskDuration {
  amount: number;
  unit: 'minute' | 'day';
}

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  projectId: string;
  sectionId: string | null;
  parentId: string | null;
  order: number;
  priority: number;
  labels: string[];
  due: TaskDue | null;
  deadline: TaskDeadline | null;
  duration: TaskDuration | null;
  creatorId: string;
  createdAt: string;
  assigneeId: string | null;
  assignerId: string | null;
  commentCount: number;
  isCompleted: boolean;
  url: string;
}

export interface TodoistProject {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  order: number;
  commentCount: number;
  isShared: boolean;
  isFavorite: boolean;
  isInboxProject: boolean;
  isTeamInbox: boolean;
  viewStyle: string;
  url: string;
}

export interface TodoistSection {
  id: string;
  projectId: string;
  order: number;
  name: string;
}

export interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  isFavorite: boolean;
}

export interface TodoistComment {
  commentId: string;
  content: string;
  postedAt: string;
  projectId: string | null;
  taskId: string | null;
  attachment: {
    fileName: string;
    fileType: string;
    fileUrl: string;
    resourceType: string;
  } | null;
}

export interface TodoistFilter {
  filterId: string;
  name: string;
  query: string;
  color: string;
  order: number;
  isFavorite: boolean;
}

export interface Collaborator {
  collaboratorId: string;
  name: string;
  email: string;
}

let mapTask = (raw: any): TodoistTask => ({
  id: raw.id,
  content: raw.content,
  description: raw.description || '',
  projectId: raw.project_id,
  sectionId: raw.section_id || null,
  parentId: raw.parent_id || null,
  order: raw.child_order ?? raw.order,
  priority: raw.priority,
  labels: raw.labels || [],
  due: raw.due
    ? {
        string: raw.due.string ?? undefined,
        date: raw.due.date ?? undefined,
        isRecurring: raw.due.is_recurring,
        datetime: raw.due.datetime ?? undefined,
        timezone: raw.due.timezone ?? undefined,
        lang: raw.due.lang ?? undefined
      }
    : null,
  deadline: raw.deadline ? { date: raw.deadline.date } : null,
  duration: raw.duration ? { amount: raw.duration.amount, unit: raw.duration.unit } : null,
  creatorId: raw.added_by_uid ?? raw.creator_id ?? '',
  createdAt: raw.added_at ?? raw.created_at ?? '',
  assigneeId: raw.responsible_uid ?? raw.assignee_id ?? null,
  assignerId: raw.assigned_by_uid ?? raw.assigner_id ?? null,
  commentCount: raw.comment_count ?? raw.note_count ?? 0,
  isCompleted: raw.checked ?? raw.is_completed ?? false,
  url: raw.url ?? `https://app.todoist.com/app/task/${encodeURIComponent(raw.id)}`
});

let mapProject = (raw: any): TodoistProject => ({
  id: raw.id,
  name: raw.name,
  color: raw.color,
  parentId: raw.parent_id || null,
  order: raw.child_order ?? raw.order,
  commentCount: raw.comment_count ?? raw.note_count ?? 0,
  isShared: raw.is_shared || false,
  isFavorite: raw.is_favorite || false,
  isInboxProject: raw.inbox_project ?? raw.is_inbox_project ?? false,
  isTeamInbox: raw.is_team_inbox || false,
  viewStyle: raw.view_style || 'list',
  url: raw.url ?? `todoist://project?id=${encodeURIComponent(raw.id)}`
});

let mapSection = (raw: any): TodoistSection => ({
  id: raw.id,
  projectId: raw.project_id,
  order: raw.section_order ?? raw.order,
  name: raw.name
});

let mapLabel = (raw: any): TodoistLabel => ({
  id: raw.id,
  name: raw.name,
  color: raw.color,
  order: raw.order ?? 0,
  isFavorite: raw.is_favorite || false
});

let mapComment = (
  raw: any,
  target: { taskId?: string; projectId?: string } = {}
): TodoistComment => {
  let attachment = raw.file_attachment ?? raw.attachment;
  return {
    commentId: raw.id,
    content: raw.content ?? '',
    postedAt: raw.posted_at ?? '',
    projectId: raw.project_id ?? target.projectId ?? null,
    taskId: raw.task_id ?? raw.item_id ?? target.taskId ?? null,
    attachment: attachment
      ? {
          fileName: attachment.file_name ?? '',
          fileType: attachment.file_type ?? '',
          fileUrl: attachment.file_url ?? '',
          resourceType: attachment.resource_type ?? ''
        }
      : null
  };
};

let mapFilter = (raw: any): TodoistFilter => ({
  filterId: raw.id,
  name: raw.name,
  query: raw.query,
  color: raw.color,
  order: raw.item_order ?? raw.order,
  isFavorite: raw.is_favorite || false
});

export interface TodoistUser {
  id: string;
  email: string;
  name: string;
  imageUrl?: string;
  inboxProjectId: string | null;
  timezone?: string;
  isPremium: boolean;
}

export class Client {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.todoist.com/api/v1',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Todoist',
          reason: 'todoist_api_error'
        })
    });
  }

  private async getAll(path: string, params: Record<string, unknown> = {}): Promise<any[]> {
    let items: any[] = [];
    let cursor: string | undefined;
    let seen = new Set<string>();
    do {
      let response = await this.api.get(path, { params: { ...params, limit: 200, cursor } });
      if (!Array.isArray(response.data?.results)) {
        throw createApiServiceError('Todoist returned an invalid list response.');
      }
      items.push(...response.data.results);
      cursor = response.data.next_cursor ?? undefined;
      if (cursor) {
        if (seen.has(cursor)) {
          throw createApiServiceError(
            'Todoist repeated a pagination cursor. Retry the request.'
          );
        }
        seen.add(cursor);
      }
    } while (cursor);
    return items;
  }

  private validateTaskDates(data: {
    dueString?: string;
    dueDate?: string;
    dueDatetime?: string;
    duration?: number;
    durationUnit?: string;
  }) {
    if (
      [data.dueString, data.dueDate, data.dueDatetime].filter(value => value !== undefined)
        .length > 1
    ) {
      throw createApiServiceError('Provide only one of dueString, dueDate, or dueDatetime.');
    }
    if ((data.duration !== undefined) !== (data.durationUnit !== undefined)) {
      throw createApiServiceError('Provide duration and durationUnit together.');
    }
    if (
      data.duration !== undefined &&
      (!Number.isInteger(data.duration) || data.duration <= 0)
    ) {
      throw createApiServiceError('Duration must be a positive whole number.');
    }
  }

  private assigneeId(value: string): number {
    let id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
      throw createApiServiceError('Provide a numeric collaborator ID from get_collaborators.');
    }
    return id;
  }

  // ---- Tasks ----

  async getTasks(params?: {
    projectId?: string;
    sectionId?: string;
    label?: string;
    filter?: string;
    ids?: string[];
  }): Promise<TodoistTask[]> {
    if (params?.ids?.length === 0) return [];
    let query: Record<string, string> = {};
    if (params?.projectId) query.project_id = params.projectId;
    if (params?.sectionId) query.section_id = params.sectionId;
    if (params?.label) query.label = params.label;
    if (params?.ids) query.ids = params.ids.join(',');

    let tasks = (
      await this.getAll(
        params?.filter ? '/tasks/filter' : '/tasks',
        params?.filter ? { query: params.filter } : query
      )
    ).map(mapTask);
    if (params?.filter) {
      tasks = tasks.filter(
        task =>
          (!params.projectId || task.projectId === params.projectId) &&
          (!params.sectionId || task.sectionId === params.sectionId) &&
          (!params.label || task.labels.includes(params.label)) &&
          (!params.ids || params.ids.includes(task.id))
      );
    }
    return tasks;
  }

  async getTask(taskId: string): Promise<TodoistTask> {
    let response = await this.api.get(`/tasks/${encodeURIComponent(taskId)}`);
    return mapTask(response.data);
  }

  async createTask(data: {
    content: string;
    description?: string;
    projectId?: string;
    sectionId?: string;
    parentId?: string;
    order?: number;
    labels?: string[];
    priority?: number;
    dueString?: string;
    dueDate?: string;
    dueDatetime?: string;
    dueLang?: string;
    assigneeId?: string;
    duration?: number;
    durationUnit?: 'minute' | 'day';
    deadlineDate?: string;
  }): Promise<TodoistTask> {
    this.validateTaskDates(data);
    let body: Record<string, any> = { content: data.content };
    if (data.description !== undefined) body.description = data.description;
    if (data.projectId) body.project_id = data.projectId;
    if (data.sectionId) body.section_id = data.sectionId;
    if (data.parentId) body.parent_id = data.parentId;
    if (data.order !== undefined) body.order = data.order;
    if (data.labels) body.labels = data.labels;
    if (data.priority !== undefined) body.priority = data.priority;
    if (data.dueString) body.due_string = data.dueString;
    if (data.dueDate) body.due_date = data.dueDate;
    if (data.dueDatetime) body.due_datetime = data.dueDatetime;
    if (data.dueLang) body.due_lang = data.dueLang;
    if (data.assigneeId) body.assignee_id = this.assigneeId(data.assigneeId);
    if (data.duration !== undefined) body.duration = data.duration;
    if (data.durationUnit) body.duration_unit = data.durationUnit;
    if (data.deadlineDate) body.deadline_date = data.deadlineDate;

    let response = await this.api.post('/tasks', body);
    return mapTask(response.data);
  }

  async updateTask(
    taskId: string,
    data: {
      content?: string;
      description?: string;
      labels?: string[];
      priority?: number;
      dueString?: string;
      dueDate?: string;
      dueDatetime?: string;
      dueLang?: string;
      assigneeId?: string;
      duration?: number;
      durationUnit?: 'minute' | 'day';
      deadlineDate?: string;
    }
  ): Promise<TodoistTask> {
    this.validateTaskDates(data);
    let body: Record<string, any> = {};
    if (data.content !== undefined) body.content = data.content;
    if (data.description !== undefined) body.description = data.description;
    if (data.labels !== undefined) body.labels = data.labels;
    if (data.priority !== undefined) body.priority = data.priority;
    if (data.dueString !== undefined) body.due_string = data.dueString;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.dueDatetime !== undefined) body.due_datetime = data.dueDatetime;
    if (data.dueLang !== undefined) body.due_lang = data.dueLang;
    if (data.assigneeId !== undefined) body.assignee_id = this.assigneeId(data.assigneeId);
    if (data.duration !== undefined) body.duration = data.duration;
    if (data.durationUnit !== undefined) body.duration_unit = data.durationUnit;
    if (data.deadlineDate !== undefined) body.deadline_date = data.deadlineDate;

    let response = await this.api.post(`/tasks/${encodeURIComponent(taskId)}`, body);
    return mapTask(response.data);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.api.delete(`/tasks/${encodeURIComponent(taskId)}`);
  }

  async closeTask(taskId: string): Promise<void> {
    await this.api.post(`/tasks/${encodeURIComponent(taskId)}/close`);
  }

  async reopenTask(taskId: string): Promise<void> {
    await this.api.post(`/tasks/${encodeURIComponent(taskId)}/reopen`);
  }

  async moveTask(
    taskId: string,
    destination: {
      projectId?: string;
      sectionId?: string;
      parentId?: string;
    }
  ): Promise<void> {
    if (
      [destination.projectId, destination.sectionId, destination.parentId].filter(Boolean)
        .length !== 1
    ) {
      throw createApiServiceError(
        'Provide exactly one destination: projectId, sectionId, or parentId.'
      );
    }
    let body: Record<string, any> = {};
    if (destination.projectId) body.project_id = destination.projectId;
    if (destination.sectionId) body.section_id = destination.sectionId;
    if (destination.parentId) body.parent_id = destination.parentId;

    await this.api.post(`/tasks/${encodeURIComponent(taskId)}/move`, body);
  }

  async quickAddTask(text: string): Promise<TodoistTask> {
    let response = await this.api.post('/tasks/quick', { text });
    return mapTask(response.data.item ?? response.data);
  }

  async getCompletedTasks(params: {
    projectId?: string;
    since: string;
    until: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    tasks: Array<TodoistTask & { completedAt: string | null }>;
    nextCursor?: string;
  }> {
    let since = Date.parse(params.since);
    let until = Date.parse(params.until);
    let maximumUntil = new Date(since);
    let startDay = maximumUntil.getUTCDate();
    maximumUntil.setUTCDate(1);
    maximumUntil.setUTCMonth(maximumUntil.getUTCMonth() + 3);
    let lastDay = new Date(
      Date.UTC(maximumUntil.getUTCFullYear(), maximumUntil.getUTCMonth() + 1, 0)
    ).getUTCDate();
    maximumUntil.setUTCDate(Math.min(startDay, lastDay));
    if (
      !Number.isFinite(since) ||
      !Number.isFinite(until) ||
      until <= since ||
      until > maximumUntil.getTime()
    ) {
      throw createApiServiceError(
        'Provide an increasing completion date range of at most three months.'
      );
    }
    let response = await this.api.get('/tasks/completed/by_completion_date', {
      params: pickDefined({
        project_id: params.projectId,
        since: params.since,
        until: params.until,
        limit: params.limit,
        cursor: params.cursor
      })
    });
    if (!Array.isArray(response.data?.items)) {
      throw createApiServiceError('Todoist returned an invalid completed-task response.');
    }
    return {
      tasks: response.data.items.map((raw: any) => ({
        ...mapTask(raw),
        completedAt: raw.completed_at ?? null
      })),
      nextCursor: response.data.next_cursor ?? undefined
    };
  }

  // ---- Projects ----

  async getProjects(): Promise<TodoistProject[]> {
    return (await this.getAll('/projects')).map(mapProject);
  }

  async getProject(projectId: string): Promise<TodoistProject> {
    let response = await this.api.get(`/projects/${encodeURIComponent(projectId)}`);
    return mapProject(response.data);
  }

  async createProject(data: {
    name: string;
    parentId?: string;
    color?: string;
    isFavorite?: boolean;
    viewStyle?: string;
  }): Promise<TodoistProject> {
    let body: Record<string, any> = { name: data.name };
    if (data.parentId) body.parent_id = data.parentId;
    if (data.color) body.color = data.color;
    if (data.isFavorite !== undefined) body.is_favorite = data.isFavorite;
    if (data.viewStyle) body.view_style = data.viewStyle;

    let response = await this.api.post('/projects', body);
    return mapProject(response.data);
  }

  async updateProject(
    projectId: string,
    data: {
      name?: string;
      color?: string;
      isFavorite?: boolean;
      viewStyle?: string;
    }
  ): Promise<TodoistProject> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.color !== undefined) body.color = data.color;
    if (data.isFavorite !== undefined) body.is_favorite = data.isFavorite;
    if (data.viewStyle !== undefined) body.view_style = data.viewStyle;

    let response = await this.api.post(`/projects/${encodeURIComponent(projectId)}`, body);
    return mapProject(response.data);
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.api.delete(`/projects/${encodeURIComponent(projectId)}`);
  }

  async archiveProject(projectId: string): Promise<void> {
    await this.api.post(`/projects/${encodeURIComponent(projectId)}/archive`);
  }

  async unarchiveProject(projectId: string): Promise<void> {
    await this.api.post(`/projects/${encodeURIComponent(projectId)}/unarchive`);
  }

  async getCollaborators(projectId: string): Promise<Collaborator[]> {
    return (await this.getAll(`/projects/${encodeURIComponent(projectId)}/collaborators`)).map(
      (raw: any) => ({
        collaboratorId: raw.id,
        name: raw.name,
        email: raw.email
      })
    );
  }

  // ---- Sections ----

  async getSections(projectId?: string): Promise<TodoistSection[]> {
    let params: Record<string, string> = {};
    if (projectId) params.project_id = projectId;

    return (await this.getAll('/sections', params)).map(mapSection);
  }

  async getSection(sectionId: string): Promise<TodoistSection> {
    let response = await this.api.get(`/sections/${encodeURIComponent(sectionId)}`);
    return mapSection(response.data);
  }

  async createSection(data: {
    name: string;
    projectId: string;
    order?: number;
  }): Promise<TodoistSection> {
    let body: Record<string, any> = {
      name: data.name,
      project_id: data.projectId
    };
    if (data.order !== undefined) body.order = data.order;

    let response = await this.api.post('/sections', body);
    return mapSection(response.data);
  }

  async updateSection(
    sectionId: string,
    data: {
      name: string;
    }
  ): Promise<TodoistSection> {
    let response = await this.api.post(`/sections/${encodeURIComponent(sectionId)}`, {
      name: data.name
    });
    return mapSection(response.data);
  }

  async deleteSection(sectionId: string): Promise<void> {
    await this.api.delete(`/sections/${encodeURIComponent(sectionId)}`);
  }

  // ---- Labels ----

  async getLabels(): Promise<TodoistLabel[]> {
    return (await this.getAll('/labels')).map(mapLabel);
  }

  async createLabel(data: {
    name: string;
    color?: string;
    order?: number;
    isFavorite?: boolean;
  }): Promise<TodoistLabel> {
    let body: Record<string, any> = { name: data.name };
    if (data.color) body.color = data.color;
    if (data.order !== undefined) body.order = data.order;
    if (data.isFavorite !== undefined) body.is_favorite = data.isFavorite;

    let response = await this.api.post('/labels', body);
    return mapLabel(response.data);
  }

  async updateLabel(
    labelId: string,
    data: {
      name?: string;
      color?: string;
      order?: number;
      isFavorite?: boolean;
    }
  ): Promise<TodoistLabel> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.color !== undefined) body.color = data.color;
    if (data.order !== undefined) body.order = data.order;
    if (data.isFavorite !== undefined) body.is_favorite = data.isFavorite;

    let response = await this.api.post(`/labels/${encodeURIComponent(labelId)}`, body);
    return mapLabel(response.data);
  }

  async deleteLabel(labelId: string): Promise<void> {
    await this.api.delete(`/labels/${encodeURIComponent(labelId)}`);
  }

  // ---- Comments ----

  async getComments(params: {
    taskId?: string;
    projectId?: string;
  }): Promise<TodoistComment[]> {
    this.validateCommentTarget(params);
    let query = pickDefined({ task_id: params.taskId, project_id: params.projectId });
    return (await this.getAll('/comments', query)).map(raw => mapComment(raw, params));
  }

  private validateCommentTarget(params: { taskId?: string; projectId?: string }) {
    if ([params.taskId, params.projectId].filter(Boolean).length !== 1) {
      throw createApiServiceError(
        'Provide exactly one of taskId or projectId for the comment.'
      );
    }
  }

  async getComment(commentId: string): Promise<TodoistComment> {
    let response = await this.api.get(`/comments/${encodeURIComponent(commentId)}`);
    return mapComment(response.data);
  }

  async createComment(data: {
    content: string;
    taskId?: string;
    projectId?: string;
  }): Promise<TodoistComment> {
    this.validateCommentTarget(data);
    let body: Record<string, any> = { content: data.content };
    if (data.taskId) body.task_id = data.taskId;
    if (data.projectId) body.project_id = data.projectId;

    let response = await this.api.post('/comments', body);
    return mapComment(response.data, data);
  }

  async updateComment(
    commentId: string,
    data: {
      content: string;
    }
  ): Promise<TodoistComment> {
    let response = await this.api.post(`/comments/${encodeURIComponent(commentId)}`, {
      content: data.content
    });
    return response.data ? mapComment(response.data) : this.getComment(commentId);
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.api.delete(`/comments/${encodeURIComponent(commentId)}`);
  }

  // ---- Filters ----

  private async syncFilters(
    commands?: Record<string, unknown>[],
    syncToken = '*'
  ): Promise<any> {
    let body = new URLSearchParams({
      sync_token: syncToken,
      resource_types: JSON.stringify(['filters'])
    });
    if (commands) body.set('commands', JSON.stringify(commands));
    let response = await this.api.post('/sync', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    if (!Array.isArray(response.data?.filters)) {
      throw createApiServiceError('Todoist returned an invalid filter response.');
    }
    return response.data;
  }

  private async getSyncedFilters(response: any): Promise<TodoistFilter[]> {
    let filters = new Map<string, any>(
      response.filters.map((filter: any) => [filter.id, filter])
    );
    if (response.sync_token) {
      let latest = await this.syncFilters(undefined, response.sync_token);
      for (let filter of latest.filters) filters.set(filter.id, filter);
    }
    return [...filters.values()].filter(filter => !filter.is_deleted).map(mapFilter);
  }

  async getFilters(): Promise<TodoistFilter[]> {
    return this.getSyncedFilters(await this.syncFilters());
  }

  private async filterCommand(
    type: string,
    args: Record<string, unknown>,
    tempId?: string
  ): Promise<any> {
    let uuid = randomUUID();
    let response = await this.syncFilters([
      pickDefined({ type, uuid, temp_id: tempId, args })
    ]);
    let status = response.sync_status?.[uuid];
    if (status !== 'ok') {
      throw createApiServiceError(
        typeof status?.error === 'string'
          ? `Todoist filter operation failed: ${status.error}`
          : 'Todoist did not confirm the filter operation.',
        {
          upstreamStatus: status?.http_code,
          upstreamCode: status?.error_tag ?? String(status?.error_code ?? '')
        }
      );
    }
    return response;
  }

  async createFilter(data: {
    name: string;
    query: string;
    color?: string;
    order?: number;
    isFavorite?: boolean;
  }): Promise<TodoistFilter> {
    let tempId = randomUUID();
    let response = await this.filterCommand(
      'filter_add',
      pickDefined({
        name: data.name,
        query: data.query,
        color: data.color,
        item_order: data.order,
        is_favorite: data.isFavorite
      }),
      tempId
    );
    let id = response.temp_id_mapping?.[tempId];
    let filter = (await this.getSyncedFilters(response)).find(
      filter => filter.filterId === id
    );
    if (!id || !filter)
      throw createApiServiceError(
        'Todoist created the filter but did not return its details. Call get_filters before retrying creation.'
      );
    return filter;
  }

  async updateFilter(
    filterId: string,
    data: {
      name?: string;
      query?: string;
      color?: string;
      order?: number;
      isFavorite?: boolean;
    }
  ): Promise<TodoistFilter> {
    let response = await this.filterCommand(
      'filter_update',
      pickDefined({
        id: filterId,
        name: data.name,
        query: data.query,
        color: data.color,
        item_order: data.order,
        is_favorite: data.isFavorite
      })
    );
    let filter = (await this.getSyncedFilters(response)).find(
      filter => filter.filterId === filterId
    );
    if (!filter)
      throw createApiServiceError(
        'Todoist updated the filter but did not return its details. Call get_filters to inspect the result.'
      );
    return filter;
  }

  async deleteFilter(filterId: string): Promise<void> {
    await this.filterCommand('filter_delete', { id: filterId });
  }

  // ---- User ----

  async getUser(): Promise<TodoistUser> {
    let response = await this.api.get('/user');
    let user = response.data;
    return {
      id: user.id,
      email: user.email,
      name: user.full_name ?? user.name,
      imageUrl: user.avatar_big ?? user.avatar_medium ?? undefined,
      inboxProjectId: user.inbox_project_id ?? null,
      timezone: user.tz_info?.timezone,
      isPremium: user.is_premium
    };
  }

  async getProductivityStats(): Promise<any> {
    let response = await this.api.get('/tasks/completed/stats');
    return response.data;
  }
}
