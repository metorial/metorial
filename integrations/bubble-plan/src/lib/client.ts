import { createAxios } from 'slates';

export class Client {
  private token: string;
  private domain: string;

  constructor(config: { token: string; domain: string }) {
    this.token = config.token;
    this.domain = config.domain;
  }

  private get axios() {
    return createAxios({
      baseURL: 'https://api.projectbubble.com/v2',
      headers: {
        key: this.token,
        domain: this.domain,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Company & Users ──────────────────────────────────────────

  async getCompany(): Promise<any> {
    let response = await this.axios.get('/company');
    return response.data;
  }

  async getUsers(params?: { userId?: string }): Promise<any> {
    let url = params?.userId ? `/users/${params.userId}` : '/users';
    let response = await this.axios.get(url);
    return response.data;
  }

  async getTeams(): Promise<any> {
    let response = await this.axios.get('/teams');
    return response.data;
  }

  // ── Projects ─────────────────────────────────────────────────

  async getProjects(params?: {
    projectId?: string;
    clientId?: string;
    dueFrom?: string;
    dueTo?: string;
    createdFrom?: string;
    createdTo?: string;
    tag?: string;
    status?: string;
    limit?: number;
    offset?: number;
    order?: string;
  }): Promise<any> {
    let url = params?.projectId ? `/projects/${params.projectId}` : '/projects';
    let queryParams: Record<string, any> = {};
    if (params?.clientId) queryParams.client_id = params.clientId;
    if (params?.dueFrom) queryParams.due_from = params.dueFrom;
    if (params?.dueTo) queryParams.due_to = params.dueTo;
    if (params?.createdFrom) queryParams.created_from = params.createdFrom;
    if (params?.createdTo) queryParams.created_to = params.createdTo;
    if (params?.tag) queryParams.tag = params.tag;
    if (params?.status) queryParams.status = params.status;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.order) queryParams.order = params.order;
    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createProject(data: {
    projectName: string;
    description?: string;
    tags?: string;
    notes?: string;
    startDate?: string;
    dueDate?: string;
    clientId?: string;
    currency?: string;
    hourlyRate?: number;
    fixedPrice?: number;
    price?: number;
    public?: boolean;
    active?: boolean;
    important?: boolean;
    notifications?: boolean;
    users?: number[];
    teams?: number[];
  }): Promise<any> {
    let body: Record<string, any> = { project_name: data.projectName };
    if (data.description !== undefined) body.description = data.description;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.startDate !== undefined) body.start_date = data.startDate;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.currency !== undefined) body.currency = data.currency;
    if (data.hourlyRate !== undefined) body.hourly_rate = data.hourlyRate;
    if (data.fixedPrice !== undefined) body.fixed_price = data.fixedPrice;
    if (data.price !== undefined) body.price = data.price;
    if (data.public !== undefined) body.public = data.public ? 1 : 0;
    if (data.active !== undefined) body.active = data.active ? 1 : 0;
    if (data.important !== undefined) body.important = data.important ? 1 : 0;
    if (data.notifications !== undefined) body.notifications = data.notifications ? 1 : 0;
    if (data.users !== undefined) body.users = data.users;
    if (data.teams !== undefined) body.teams = data.teams;
    let response = await this.axios.post('/projects', body);
    return response.data;
  }

  async updateProject(
    projectId: string,
    data: {
      projectName?: string;
      description?: string;
      tags?: string;
      notes?: string;
      startDate?: string;
      dueDate?: string;
      clientId?: string;
      currency?: string;
      hourlyRate?: number;
      fixedPrice?: number;
      price?: number;
      public?: boolean;
      active?: boolean;
      important?: boolean;
      closed?: boolean;
      archived?: boolean;
      notifications?: boolean;
      users?: number[];
      teams?: number[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.projectName !== undefined) body.project_name = data.projectName;
    if (data.description !== undefined) body.description = data.description;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.startDate !== undefined) body.start_date = data.startDate;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.currency !== undefined) body.currency = data.currency;
    if (data.hourlyRate !== undefined) body.hourly_rate = data.hourlyRate;
    if (data.fixedPrice !== undefined) body.fixed_price = data.fixedPrice;
    if (data.price !== undefined) body.price = data.price;
    if (data.public !== undefined) body.public = data.public ? 1 : 0;
    if (data.active !== undefined) body.active = data.active ? 1 : 0;
    if (data.important !== undefined) body.important = data.important ? 1 : 0;
    if (data.closed !== undefined) body.closed = data.closed ? 1 : 0;
    if (data.archived !== undefined) body.archived = data.archived ? 1 : 0;
    if (data.notifications !== undefined) body.notifications = data.notifications ? 1 : 0;
    if (data.users !== undefined) body.users = data.users;
    if (data.teams !== undefined) body.teams = data.teams;
    let response = await this.axios.put(`/projects/${projectId}`, body);
    return response.data;
  }

  async deleteProject(projectId: string): Promise<any> {
    let response = await this.axios.delete(`/projects/${projectId}`);
    return response.data;
  }

  // ── Tasks ────────────────────────────────────────────────────

  async getTasks(params?: {
    taskId?: string;
    projectId?: string;
    dueFrom?: string;
    dueTo?: string;
    createdFrom?: string;
    createdTo?: string;
    completedFrom?: string;
    completedTo?: string;
    tag?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let url = params?.taskId ? `/tasks/${params.taskId}` : '/tasks';
    let queryParams: Record<string, any> = {};
    if (params?.projectId) queryParams.project_id = params.projectId;
    if (params?.dueFrom) queryParams.due_from = params.dueFrom;
    if (params?.dueTo) queryParams.due_to = params.dueTo;
    if (params?.createdFrom) queryParams.created_from = params.createdFrom;
    if (params?.createdTo) queryParams.created_to = params.createdTo;
    if (params?.completedFrom) queryParams.completed_from = params.completedFrom;
    if (params?.completedTo) queryParams.completed_to = params.completedTo;
    if (params?.tag) queryParams.tag = params.tag;
    if (params?.status) queryParams.status = params.status;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createTask(
    projectId: string,
    data: {
      taskName: string;
      description?: string;
      tags?: string;
      notes?: string;
      startDate?: string;
      dueDate?: string;
      estimatedHours?: number;
      estimatedCost?: number;
      hourlyRate?: number;
      fixedPrice?: number;
      active?: boolean;
      important?: boolean;
      recurring?: string;
      users?: number[];
      teams?: number[];
    }
  ): Promise<any> {
    let body: Record<string, any> = { task_name: data.taskName };
    if (data.description !== undefined) body.description = data.description;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.startDate !== undefined) body.start_date = data.startDate;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.estimatedHours !== undefined) body.estimated_hours = data.estimatedHours;
    if (data.estimatedCost !== undefined) body.estimated_cost = data.estimatedCost;
    if (data.hourlyRate !== undefined) body.hourly_rate = data.hourlyRate;
    if (data.fixedPrice !== undefined) body.fixed_price = data.fixedPrice;
    if (data.active !== undefined) body.active = data.active ? 1 : 0;
    if (data.important !== undefined) body.important = data.important ? 1 : 0;
    if (data.recurring !== undefined) body.recurring = data.recurring;
    if (data.users !== undefined) body.users = data.users;
    if (data.teams !== undefined) body.teams = data.teams;
    let response = await this.axios.post(`/tasks/${projectId}`, body);
    return response.data;
  }

  async updateTask(
    taskId: string,
    data: {
      taskName?: string;
      description?: string;
      tags?: string;
      notes?: string;
      startDate?: string;
      dueDate?: string;
      progress?: number;
      estimatedHours?: number;
      estimatedCost?: number;
      hourlyRate?: number;
      fixedPrice?: number;
      active?: boolean;
      important?: boolean;
      recurring?: string;
      users?: number[];
      teams?: number[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.taskName !== undefined) body.task_name = data.taskName;
    if (data.description !== undefined) body.description = data.description;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.startDate !== undefined) body.start_date = data.startDate;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.progress !== undefined) body.progress = data.progress;
    if (data.estimatedHours !== undefined) body.estimated_hours = data.estimatedHours;
    if (data.estimatedCost !== undefined) body.estimated_cost = data.estimatedCost;
    if (data.hourlyRate !== undefined) body.hourly_rate = data.hourlyRate;
    if (data.fixedPrice !== undefined) body.fixed_price = data.fixedPrice;
    if (data.active !== undefined) body.active = data.active ? 1 : 0;
    if (data.important !== undefined) body.important = data.important ? 1 : 0;
    if (data.recurring !== undefined) body.recurring = data.recurring;
    if (data.users !== undefined) body.users = data.users;
    if (data.teams !== undefined) body.teams = data.teams;
    let response = await this.axios.put(`/tasks/${taskId}`, body);
    return response.data;
  }

  async completeTask(taskId: string): Promise<any> {
    let response = await this.axios.put(`/tasks/${taskId}`, { completed: 1 });
    return response.data;
  }

  async resumeTask(taskId: string): Promise<any> {
    let response = await this.axios.put(`/tasks/${taskId}`, { resume: 1 });
    return response.data;
  }

  async deleteTask(taskId: string): Promise<any> {
    let response = await this.axios.delete(`/tasks/${taskId}`);
    return response.data;
  }

  // ── Subtasks ─────────────────────────────────────────────────

  async getSubtasks(params?: {
    subtaskId?: string;
    taskId?: string;
    userId?: string;
    teamId?: string;
    dueFrom?: string;
    dueTo?: string;
    completedFrom?: string;
    completedTo?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let url = params?.subtaskId ? `/subtasks/${params.subtaskId}` : '/subtasks';
    let queryParams: Record<string, any> = {};
    if (params?.taskId) queryParams.task_id = params.taskId;
    if (params?.userId) queryParams.user_id = params.userId;
    if (params?.teamId) queryParams.team_id = params.teamId;
    if (params?.dueFrom) queryParams.due_from = params.dueFrom;
    if (params?.dueTo) queryParams.due_to = params.dueTo;
    if (params?.completedFrom) queryParams.completed_from = params.completedFrom;
    if (params?.completedTo) queryParams.completed_to = params.completedTo;
    if (params?.status) queryParams.status = params.status;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createSubtask(
    taskId: string,
    data: {
      subtaskName: string;
      description?: string;
      color?: string;
      notes?: string;
      startDate?: string;
      dueDate?: string;
      active?: boolean;
      important?: boolean;
      notifications?: boolean;
      recurring?: string;
      users?: number[];
      teams?: number[];
    }
  ): Promise<any> {
    let body: Record<string, any> = { subtask_name: data.subtaskName };
    if (data.description !== undefined) body.description = data.description;
    if (data.color !== undefined) body.color = data.color;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.startDate !== undefined) body.start_date = data.startDate;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.active !== undefined) body.active = data.active ? 1 : 0;
    if (data.important !== undefined) body.important = data.important ? 1 : 0;
    if (data.notifications !== undefined) body.notifications = data.notifications ? 1 : 0;
    if (data.recurring !== undefined) body.recurring = data.recurring;
    if (data.users !== undefined) body.users = data.users;
    if (data.teams !== undefined) body.teams = data.teams;
    let response = await this.axios.post(`/subtasks/${taskId}`, body);
    return response.data;
  }

  async updateSubtask(
    subtaskId: string,
    data: {
      subtaskName?: string;
      description?: string;
      color?: string;
      notes?: string;
      startDate?: string;
      dueDate?: string;
      progress?: number;
      active?: boolean;
      important?: boolean;
      notifications?: boolean;
      recurring?: string;
      users?: number[];
      teams?: number[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.subtaskName !== undefined) body.subtask_name = data.subtaskName;
    if (data.description !== undefined) body.description = data.description;
    if (data.color !== undefined) body.color = data.color;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.startDate !== undefined) body.start_date = data.startDate;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.progress !== undefined) body.progress = data.progress;
    if (data.active !== undefined) body.active = data.active ? 1 : 0;
    if (data.important !== undefined) body.important = data.important ? 1 : 0;
    if (data.notifications !== undefined) body.notifications = data.notifications ? 1 : 0;
    if (data.recurring !== undefined) body.recurring = data.recurring;
    if (data.users !== undefined) body.users = data.users;
    if (data.teams !== undefined) body.teams = data.teams;
    let response = await this.axios.put(`/subtasks/${subtaskId}`, body);
    return response.data;
  }

  async completeSubtask(subtaskId: string): Promise<any> {
    let response = await this.axios.put(`/subtasks/${subtaskId}`, { completed: 1 });
    return response.data;
  }

  async resumeSubtask(subtaskId: string): Promise<any> {
    let response = await this.axios.put(`/subtasks/${subtaskId}`, { resume: 1 });
    return response.data;
  }

  async deleteSubtask(subtaskId: string): Promise<any> {
    let response = await this.axios.delete(`/subtasks/${subtaskId}`);
    return response.data;
  }

  // ── Time Entries ─────────────────────────────────────────────

  async getTimeEntries(params?: {
    entryId?: string;
    userId?: string;
    clientId?: string;
    projectId?: string;
    taskId?: string;
    subtaskId?: string;
    hideBilled?: boolean;
    createdFrom?: string;
    createdTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let url = params?.entryId ? `/time_entries/${params.entryId}` : '/time_entries';
    let queryParams: Record<string, any> = {};
    if (params?.userId) queryParams.user_id = params.userId;
    if (params?.clientId) queryParams.client_id = params.clientId;
    if (params?.projectId) queryParams.project_id = params.projectId;
    if (params?.taskId) queryParams.task_id = params.taskId;
    if (params?.subtaskId) queryParams.subtask_id = params.subtaskId;
    if (params?.hideBilled) queryParams.hide_billed = 1;
    if (params?.createdFrom) queryParams.created_from = params.createdFrom;
    if (params?.createdTo) queryParams.created_to = params.createdTo;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createTimeEntry(
    taskId: string,
    data: {
      seconds: number;
      date?: string;
      subtaskId?: string;
      description?: string;
      userId?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = { seconds: data.seconds };
    if (data.date !== undefined) body.date = data.date;
    if (data.subtaskId !== undefined) body.subtask_id = data.subtaskId;
    if (data.description !== undefined) body.description = data.description;
    if (data.userId !== undefined) body.user_id = data.userId;
    let response = await this.axios.post(`/time_entries/${taskId}`, body);
    return response.data;
  }

  async updateTimeEntry(
    entryId: string,
    data: {
      seconds: number;
      dateStarted?: string;
      taskId?: string;
      subtaskId?: string;
      description?: string;
      userId?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = { seconds: data.seconds };
    if (data.dateStarted !== undefined) body.date_started = data.dateStarted;
    if (data.taskId !== undefined) body.task_id = data.taskId;
    if (data.subtaskId !== undefined) body.subtask_id = data.subtaskId;
    if (data.description !== undefined) body.description = data.description;
    if (data.userId !== undefined) body.user_id = data.userId;
    let response = await this.axios.put(`/time_entry/${entryId}`, body);
    return response.data;
  }

  async deleteTimeEntry(entryId: string): Promise<any> {
    let response = await this.axios.delete(`/time_entries/${entryId}`);
    return response.data;
  }

  // ── Comments ─────────────────────────────────────────────────

  async getComments(params?: {
    commentId?: string;
    projectId?: string;
    taskId?: string;
    subtaskId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let url = params?.commentId ? `/comments/${params.commentId}` : '/comments';
    let queryParams: Record<string, any> = {};
    if (params?.projectId) queryParams.project_id = params.projectId;
    if (params?.taskId) queryParams.task_id = params.taskId;
    if (params?.subtaskId) queryParams.subtask_id = params.subtaskId;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createComment(
    projectId: string,
    data: {
      comment: string;
      taskId?: string;
      subtaskId?: string;
      parentId?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = { comment: data.comment };
    if (data.taskId !== undefined) body.task_id = data.taskId;
    if (data.subtaskId !== undefined) body.subtask_id = data.subtaskId;
    if (data.parentId !== undefined) body.parent_id = data.parentId;
    let response = await this.axios.post(`/comments/${projectId}`, body);
    return response.data;
  }

  async deleteComment(commentId: string): Promise<any> {
    let response = await this.axios.delete(`/comments/${commentId}`);
    return response.data;
  }

  // ── Files ────────────────────────────────────────────────────

  async getFiles(params?: {
    projectId?: string;
    taskId?: string;
    subtaskId?: string;
    order?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.projectId) queryParams.project_id = params.projectId;
    if (params?.taskId) queryParams.task_id = params.taskId;
    if (params?.subtaskId) queryParams.subtask_id = params.subtaskId;
    if (params?.order) queryParams.order = params.order;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    let response = await this.axios.get('/files', { params: queryParams });
    return response.data;
  }

  // ── Events ───────────────────────────────────────────────────

  async getEvents(params?: {
    eventId?: string;
    projectId?: string;
    from?: string;
    to?: string;
    startFrom?: string;
    startTo?: string;
    dueFrom?: string;
    dueTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let url = params?.eventId ? `/events/${params.eventId}` : '/events';
    let queryParams: Record<string, any> = {};
    if (params?.projectId) queryParams.project_id = params.projectId;
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.startFrom) queryParams.start_from = params.startFrom;
    if (params?.startTo) queryParams.start_to = params.startTo;
    if (params?.dueFrom) queryParams.due_from = params.dueFrom;
    if (params?.dueTo) queryParams.due_to = params.dueTo;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createEvent(data: {
    eventName: string;
    startDate: string;
    dueDate: string;
    projectId?: string;
    userId?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      event_name: data.eventName,
      start_date: data.startDate,
      due_date: data.dueDate
    };
    if (data.projectId !== undefined) body.project_id = data.projectId;
    if (data.userId !== undefined) body.user_id = data.userId;
    let response = await this.axios.post('/events', body);
    return response.data;
  }

  async updateEvent(
    eventId: string,
    data: {
      eventName?: string;
      startDate?: string;
      dueDate?: string;
      projectId?: string;
      userId?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.eventName !== undefined) body.event_name = data.eventName;
    if (data.startDate !== undefined) body.start_date = data.startDate;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.projectId !== undefined) body.project_id = data.projectId;
    if (data.userId !== undefined) body.user_id = data.userId;
    let response = await this.axios.put(`/events/${eventId}`, body);
    return response.data;
  }

  async deleteEvent(eventId: string): Promise<any> {
    let response = await this.axios.delete(`/events/${eventId}`);
    return response.data;
  }

  // ── Clients ──────────────────────────────────────────────────

  async getClients(params?: {
    clientId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let url = params?.clientId ? `/clients/${params.clientId}` : '/clients';
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  // ── Contacts ─────────────────────────────────────────────────

  async getContacts(params?: {
    contactId?: string;
    clientId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let url = params?.contactId ? `/contacts/${params.contactId}` : '/contacts';
    let queryParams: Record<string, any> = {};
    if (params?.clientId) queryParams.client_id = params.clientId;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    let response = await this.axios.get(url, { params: queryParams });
    return response.data;
  }

  async createContact(data: {
    contactName: string;
    email?: string;
    tel?: string;
    fax?: string;
    mobile?: string;
    role?: string;
    companyName?: string;
    clientId?: string;
    userId?: string;
  }): Promise<any> {
    let body: Record<string, any> = { contact_name: data.contactName };
    if (data.email !== undefined) body.email = data.email;
    if (data.tel !== undefined) body.tel = data.tel;
    if (data.fax !== undefined) body.fax = data.fax;
    if (data.mobile !== undefined) body.mobile = data.mobile;
    if (data.role !== undefined) body.role = data.role;
    if (data.companyName !== undefined) body.company_name = data.companyName;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.userId !== undefined) body.user_id = data.userId;
    let response = await this.axios.post('/contacts', body);
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      contactName?: string;
      email?: string;
      tel?: string;
      fax?: string;
      mobile?: string;
      role?: string;
      companyName?: string;
      clientId?: string;
      userId?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.contactName !== undefined) body.contact_name = data.contactName;
    if (data.email !== undefined) body.email = data.email;
    if (data.tel !== undefined) body.tel = data.tel;
    if (data.fax !== undefined) body.fax = data.fax;
    if (data.mobile !== undefined) body.mobile = data.mobile;
    if (data.role !== undefined) body.role = data.role;
    if (data.companyName !== undefined) body.company_name = data.companyName;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.userId !== undefined) body.user_id = data.userId;
    let response = await this.axios.put(`/contacts/${contactId}`, body);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<any> {
    let response = await this.axios.delete(`/contacts/${contactId}`);
    return response.data;
  }

  // ── Webhooks ─────────────────────────────────────────────────

  async subscribeWebhook(targetUrl: string, event: string): Promise<any> {
    let response = await this.axios.post('/hooks', {
      target_url: targetUrl,
      event: event
    });
    return response.data;
  }

  async unsubscribeWebhook(subscriptionId: string): Promise<any> {
    let response = await this.axios.delete(`/hooks/${subscriptionId}`);
    return response.data;
  }

  // ── Generic resource fetch (used by webhooks) ────────────────

  async fetchResourceByUrl(resourceUrl: string): Promise<any> {
    let response = await this.axios.get(
      resourceUrl.replace('https://api.projectbubble.com/v2', '')
    );
    return response.data;
  }
}
