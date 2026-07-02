import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.todoist.com/api/v1'
});

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
  order: raw.order,
  priority: raw.priority,
  labels: raw.labels || [],
  due: raw.due
    ? {
        string: raw.due.string,
        date: raw.due.date,
        isRecurring: raw.due.is_recurring,
        datetime: raw.due.datetime,
        timezone: raw.due.timezone,
        lang: raw.due.lang
      }
    : null,
  deadline: raw.deadline ? { date: raw.deadline.date } : null,
  duration: raw.duration ? { amount: raw.duration.amount, unit: raw.duration.unit } : null,
  creatorId: raw.creator_id,
  createdAt: raw.created_at,
  assigneeId: raw.assignee_id || null,
  assignerId: raw.assigner_id || null,
  commentCount: raw.comment_count || 0,
  isCompleted: raw.is_completed || false,
  url: raw.url
});

let mapProject = (raw: any): TodoistProject => ({
  id: raw.id,
  name: raw.name,
  color: raw.color,
  parentId: raw.parent_id || null,
  order: raw.order,
  commentCount: raw.comment_count || 0,
  isShared: raw.is_shared || false,
  isFavorite: raw.is_favorite || false,
  isInboxProject: raw.is_inbox_project || false,
  isTeamInbox: raw.is_team_inbox || false,
  viewStyle: raw.view_style || 'list',
  url: raw.url
});

let mapSection = (raw: any): TodoistSection => ({
  id: raw.id,
  projectId: raw.project_id,
  order: raw.order,
  name: raw.name
});

let mapLabel = (raw: any): TodoistLabel => ({
  id: raw.id,
  name: raw.name,
  color: raw.color,
  order: raw.order,
  isFavorite: raw.is_favorite || false
});

let mapComment = (raw: any): TodoistComment => ({
  commentId: raw.id,
  content: raw.content,
  postedAt: raw.posted_at,
  projectId: raw.project_id || null,
  taskId: raw.task_id || null,
  attachment: raw.attachment
    ? {
        fileName: raw.attachment.file_name,
        fileType: raw.attachment.file_type,
        fileUrl: raw.attachment.file_url,
        resourceType: raw.attachment.resource_type
      }
    : null
});

let mapFilter = (raw: any): TodoistFilter => ({
  filterId: raw.id,
  name: raw.name,
  query: raw.query,
  color: raw.color,
  order: raw.order,
  isFavorite: raw.is_favorite || false
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ---- Tasks ----

  async getTasks(params?: {
    projectId?: string;
    sectionId?: string;
    label?: string;
    filter?: string;
    ids?: string[];
  }): Promise<TodoistTask[]> {
    let query: Record<string, string> = {};
    if (params?.projectId) query.project_id = params.projectId;
    if (params?.sectionId) query.section_id = params.sectionId;
    if (params?.label) query.label = params.label;
    if (params?.filter) query.filter = params.filter;
    if (params?.ids) query.ids = params.ids.join(',');

    let response = await api.get('/tasks', {
      headers: this.headers(),
      params: query
    });

    return (response.data || []).map(mapTask);
  }

  async getTask(taskId: string): Promise<TodoistTask> {
    let response = await api.get(`/tasks/${taskId}`, {
      headers: this.headers()
    });
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
    if (data.assigneeId) body.assignee_id = data.assigneeId;
    if (data.duration !== undefined) body.duration = data.duration;
    if (data.durationUnit) body.duration_unit = data.durationUnit;
    if (data.deadlineDate) body.deadline_date = data.deadlineDate;

    let response = await api.post('/tasks', body, {
      headers: this.headers()
    });
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
    let body: Record<string, any> = {};
    if (data.content !== undefined) body.content = data.content;
    if (data.description !== undefined) body.description = data.description;
    if (data.labels !== undefined) body.labels = data.labels;
    if (data.priority !== undefined) body.priority = data.priority;
    if (data.dueString !== undefined) body.due_string = data.dueString;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.dueDatetime !== undefined) body.due_datetime = data.dueDatetime;
    if (data.dueLang !== undefined) body.due_lang = data.dueLang;
    if (data.assigneeId !== undefined) body.assignee_id = data.assigneeId;
    if (data.duration !== undefined) body.duration = data.duration;
    if (data.durationUnit !== undefined) body.duration_unit = data.durationUnit;
    if (data.deadlineDate !== undefined) body.deadline_date = data.deadlineDate;

    let response = await api.post(`/tasks/${taskId}`, body, {
      headers: this.headers()
    });
    return mapTask(response.data);
  }

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`, {
      headers: this.headers()
    });
  }

  async closeTask(taskId: string): Promise<void> {
    await api.post(
      `/tasks/${taskId}/close`,
      {},
      {
        headers: this.headers()
      }
    );
  }

  async reopenTask(taskId: string): Promise<void> {
    await api.post(
      `/tasks/${taskId}/reopen`,
      {},
      {
        headers: this.headers()
      }
    );
  }

  async moveTask(
    taskId: string,
    destination: {
      projectId?: string;
      sectionId?: string;
      parentId?: string;
    }
  ): Promise<void> {
    let body: Record<string, any> = { id: taskId };
    if (destination.projectId) body.project_id = destination.projectId;
    if (destination.sectionId) body.section_id = destination.sectionId;
    if (destination.parentId) body.parent_id = destination.parentId;

    await api.post('/tasks/move', body, {
      headers: this.headers()
    });
  }

  async quickAddTask(text: string): Promise<TodoistTask> {
    let response = await api.post(
      '/tasks/quick',
      { text },
      {
        headers: this.headers()
      }
    );
    return mapTask(response.data);
  }

  async getCompletedTasks(params?: {
    projectId?: string;
    since?: string;
    until?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ tasks: TodoistTask[]; nextCursor?: string }> {
    let query: Record<string, string> = {};
    if (params?.projectId) query.project_id = params.projectId;
    if (params?.since) query.since = params.since;
    if (params?.until) query.until = params.until;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.cursor) query.cursor = params.cursor;

    let response = await api.get('/tasks/completed', {
      headers: this.headers(),
      params: query
    });

    let results = response.data?.results || response.data || [];
    let items = Array.isArray(results) ? results : [];

    return {
      tasks: items.map(mapTask),
      nextCursor: response.data?.next_cursor
    };
  }

  // ---- Projects ----

  async getProjects(): Promise<TodoistProject[]> {
    let response = await api.get('/projects', {
      headers: this.headers()
    });
    return (response.data || []).map(mapProject);
  }

  async getProject(projectId: string): Promise<TodoistProject> {
    let response = await api.get(`/projects/${projectId}`, {
      headers: this.headers()
    });
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

    let response = await api.post('/projects', body, {
      headers: this.headers()
    });
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

    let response = await api.post(`/projects/${projectId}`, body, {
      headers: this.headers()
    });
    return mapProject(response.data);
  }

  async deleteProject(projectId: string): Promise<void> {
    await api.delete(`/projects/${projectId}`, {
      headers: this.headers()
    });
  }

  async archiveProject(projectId: string): Promise<void> {
    await api.post(
      `/projects/${projectId}/archive`,
      {},
      {
        headers: this.headers()
      }
    );
  }

  async unarchiveProject(projectId: string): Promise<void> {
    await api.post(
      `/projects/${projectId}/unarchive`,
      {},
      {
        headers: this.headers()
      }
    );
  }

  async getCollaborators(projectId: string): Promise<Collaborator[]> {
    let response = await api.get(`/projects/${projectId}/collaborators`, {
      headers: this.headers()
    });
    return (response.data || []).map((raw: any) => ({
      collaboratorId: raw.id,
      name: raw.name,
      email: raw.email
    }));
  }

  // ---- Sections ----

  async getSections(projectId?: string): Promise<TodoistSection[]> {
    let params: Record<string, string> = {};
    if (projectId) params.project_id = projectId;

    let response = await api.get('/sections', {
      headers: this.headers(),
      params
    });
    return (response.data || []).map(mapSection);
  }

  async getSection(sectionId: string): Promise<TodoistSection> {
    let response = await api.get(`/sections/${sectionId}`, {
      headers: this.headers()
    });
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

    let response = await api.post('/sections', body, {
      headers: this.headers()
    });
    return mapSection(response.data);
  }

  async updateSection(
    sectionId: string,
    data: {
      name: string;
    }
  ): Promise<TodoistSection> {
    let response = await api.post(
      `/sections/${sectionId}`,
      { name: data.name },
      {
        headers: this.headers()
      }
    );
    return mapSection(response.data);
  }

  async deleteSection(sectionId: string): Promise<void> {
    await api.delete(`/sections/${sectionId}`, {
      headers: this.headers()
    });
  }

  // ---- Labels ----

  async getLabels(): Promise<TodoistLabel[]> {
    let response = await api.get('/labels', {
      headers: this.headers()
    });
    return (response.data || []).map(mapLabel);
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

    let response = await api.post('/labels', body, {
      headers: this.headers()
    });
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

    let response = await api.post(`/labels/${labelId}`, body, {
      headers: this.headers()
    });
    return mapLabel(response.data);
  }

  async deleteLabel(labelId: string): Promise<void> {
    await api.delete(`/labels/${labelId}`, {
      headers: this.headers()
    });
  }

  // ---- Comments ----

  async getComments(params: {
    taskId?: string;
    projectId?: string;
  }): Promise<TodoistComment[]> {
    let query: Record<string, string> = {};
    if (params.taskId) query.task_id = params.taskId;
    if (params.projectId) query.project_id = params.projectId;

    let response = await api.get('/comments', {
      headers: this.headers(),
      params: query
    });
    return (response.data || []).map(mapComment);
  }

  async getComment(commentId: string): Promise<TodoistComment> {
    let response = await api.get(`/comments/${commentId}`, {
      headers: this.headers()
    });
    return mapComment(response.data);
  }

  async createComment(data: {
    content: string;
    taskId?: string;
    projectId?: string;
  }): Promise<TodoistComment> {
    let body: Record<string, any> = { content: data.content };
    if (data.taskId) body.task_id = data.taskId;
    if (data.projectId) body.project_id = data.projectId;

    let response = await api.post('/comments', body, {
      headers: this.headers()
    });
    return mapComment(response.data);
  }

  async updateComment(
    commentId: string,
    data: {
      content: string;
    }
  ): Promise<TodoistComment> {
    let response = await api.post(
      `/comments/${commentId}`,
      { content: data.content },
      {
        headers: this.headers()
      }
    );
    return mapComment(response.data);
  }

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`, {
      headers: this.headers()
    });
  }

  // ---- Filters ----

  async getFilters(): Promise<TodoistFilter[]> {
    let response = await api.get('/filters', {
      headers: this.headers()
    });
    return (response.data || []).map(mapFilter);
  }

  async createFilter(data: {
    name: string;
    query: string;
    color?: string;
    order?: number;
    isFavorite?: boolean;
  }): Promise<TodoistFilter> {
    let body: Record<string, any> = { name: data.name, query: data.query };
    if (data.color) body.color = data.color;
    if (data.order !== undefined) body.order = data.order;
    if (data.isFavorite !== undefined) body.is_favorite = data.isFavorite;

    let response = await api.post('/filters', body, {
      headers: this.headers()
    });
    return mapFilter(response.data);
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
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.query !== undefined) body.query = data.query;
    if (data.color !== undefined) body.color = data.color;
    if (data.order !== undefined) body.order = data.order;
    if (data.isFavorite !== undefined) body.is_favorite = data.isFavorite;

    let response = await api.post(`/filters/${filterId}`, body, {
      headers: this.headers()
    });
    return mapFilter(response.data);
  }

  async deleteFilter(filterId: string): Promise<void> {
    await api.delete(`/filters/${filterId}`, {
      headers: this.headers()
    });
  }

  // ---- User ----

  async getUser(): Promise<any> {
    let response = await api.get('/user', {
      headers: this.headers()
    });
    return response.data;
  }

  async getProductivityStats(): Promise<any> {
    let response = await api.get('/user/stats', {
      headers: this.headers()
    });
    return response.data;
  }
}
