import { createAxios } from 'slates';

export class Client {
  private accountId: string;
  private token: string;
  private axios;

  constructor(config: { token: string; accountId: string }) {
    this.accountId = config.accountId;
    this.token = config.token;
    this.axios = createAxios({
      baseURL: `https://3.basecampapi.com/${this.accountId}`,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Slates Basecamp Integration (https://slates.dev)'
      }
    });
  }

  // ---- Projects ----

  async listProjects(params?: { status?: string; page?: number }): Promise<any[]> {
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get('/projects.json', { params: query });
    return response.data;
  }

  async getProject(projectId: string): Promise<any> {
    let response = await this.axios.get(`/projects/${projectId}.json`);
    return response.data;
  }

  async createProject(data: { name: string; description?: string }): Promise<any> {
    let response = await this.axios.post('/projects.json', data);
    return response.data;
  }

  async updateProject(
    projectId: string,
    data: { name?: string; description?: string }
  ): Promise<any> {
    let response = await this.axios.put(`/projects/${projectId}.json`, data);
    return response.data;
  }

  async trashProject(projectId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}.json`);
  }

  // ---- People ----

  async listPeople(): Promise<any[]> {
    let response = await this.axios.get('/people.json');
    return response.data;
  }

  async listProjectPeople(projectId: string): Promise<any[]> {
    let response = await this.axios.get(`/projects/${projectId}/people.json`);
    return response.data;
  }

  async getPerson(personId: string): Promise<any> {
    let response = await this.axios.get(`/people/${personId}.json`);
    return response.data;
  }

  async getMyProfile(): Promise<any> {
    let response = await this.axios.get('/my/profile.json');
    return response.data;
  }

  // ---- To-do Sets ----

  async getTodoSet(projectId: string, todoSetId: string): Promise<any> {
    let response = await this.axios.get(`/buckets/${projectId}/todosets/${todoSetId}.json`);
    return response.data;
  }

  // ---- To-do Lists ----

  async listTodoLists(
    projectId: string,
    todoSetId: string,
    params?: { status?: string; page?: number }
  ): Promise<any[]> {
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get(
      `/buckets/${projectId}/todosets/${todoSetId}/todolists.json`,
      { params: query }
    );
    return response.data;
  }

  async getTodoList(projectId: string, todoListId: string): Promise<any> {
    let response = await this.axios.get(`/buckets/${projectId}/todolists/${todoListId}.json`);
    return response.data;
  }

  async createTodoList(
    projectId: string,
    todoSetId: string,
    data: { name: string; description?: string }
  ): Promise<any> {
    let response = await this.axios.post(
      `/buckets/${projectId}/todosets/${todoSetId}/todolists.json`,
      data
    );
    return response.data;
  }

  async updateTodoList(
    projectId: string,
    todoListId: string,
    data: { name: string; description?: string }
  ): Promise<any> {
    let response = await this.axios.put(
      `/buckets/${projectId}/todolists/${todoListId}.json`,
      data
    );
    return response.data;
  }

  // ---- To-dos ----

  async listTodos(
    projectId: string,
    todoListId: string,
    params?: { status?: string; completed?: boolean; page?: number }
  ): Promise<any[]> {
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.completed !== undefined) query.completed = String(params.completed);
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get(
      `/buckets/${projectId}/todolists/${todoListId}/todos.json`,
      { params: query }
    );
    return response.data;
  }

  async getTodo(projectId: string, todoId: string): Promise<any> {
    let response = await this.axios.get(`/buckets/${projectId}/todos/${todoId}.json`);
    return response.data;
  }

  async createTodo(
    projectId: string,
    todoListId: string,
    data: {
      content: string;
      description?: string;
      assigneeIds?: number[];
      completionSubscriberIds?: number[];
      notify?: boolean;
      dueOn?: string;
      startsOn?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = { content: data.content };
    if (data.description !== undefined) body.description = data.description;
    if (data.assigneeIds) body.assignee_ids = data.assigneeIds;
    if (data.completionSubscriberIds)
      body.completion_subscriber_ids = data.completionSubscriberIds;
    if (data.notify !== undefined) body.notify = data.notify;
    if (data.dueOn) body.due_on = data.dueOn;
    if (data.startsOn) body.starts_on = data.startsOn;
    let response = await this.axios.post(
      `/buckets/${projectId}/todolists/${todoListId}/todos.json`,
      body
    );
    return response.data;
  }

  async updateTodo(
    projectId: string,
    todoId: string,
    data: {
      content?: string;
      description?: string;
      assigneeIds?: number[];
      completionSubscriberIds?: number[];
      notify?: boolean;
      dueOn?: string | null;
      startsOn?: string | null;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.content !== undefined) body.content = data.content;
    if (data.description !== undefined) body.description = data.description;
    if (data.assigneeIds !== undefined) body.assignee_ids = data.assigneeIds;
    if (data.completionSubscriberIds !== undefined)
      body.completion_subscriber_ids = data.completionSubscriberIds;
    if (data.notify !== undefined) body.notify = data.notify;
    if (data.dueOn !== undefined) body.due_on = data.dueOn;
    if (data.startsOn !== undefined) body.starts_on = data.startsOn;
    let response = await this.axios.put(`/buckets/${projectId}/todos/${todoId}.json`, body);
    return response.data;
  }

  async completeTodo(projectId: string, todoId: string): Promise<void> {
    await this.axios.post(`/buckets/${projectId}/todos/${todoId}/completion.json`);
  }

  async uncompleteTodo(projectId: string, todoId: string): Promise<void> {
    await this.axios.delete(`/buckets/${projectId}/todos/${todoId}/completion.json`);
  }

  async repositionTodo(projectId: string, todoId: string, position: number): Promise<void> {
    await this.axios.put(`/buckets/${projectId}/todos/${todoId}/position.json`, { position });
  }

  // ---- Message Boards ----

  async getMessageBoard(projectId: string, messageBoardId: string): Promise<any> {
    let response = await this.axios.get(
      `/buckets/${projectId}/message_boards/${messageBoardId}.json`
    );
    return response.data;
  }

  // ---- Messages ----

  async listMessages(
    projectId: string,
    messageBoardId: string,
    params?: { page?: number }
  ): Promise<any[]> {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get(
      `/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`,
      { params: query }
    );
    return response.data;
  }

  async getMessage(projectId: string, messageId: string): Promise<any> {
    let response = await this.axios.get(`/buckets/${projectId}/messages/${messageId}.json`);
    return response.data;
  }

  async createMessage(
    projectId: string,
    messageBoardId: string,
    data: {
      subject: string;
      content?: string;
      categoryId?: number;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      subject: data.subject,
      status: 'active'
    };
    if (data.content !== undefined) body.content = data.content;
    if (data.categoryId !== undefined) body.category_id = data.categoryId;
    let response = await this.axios.post(
      `/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`,
      body
    );
    return response.data;
  }

  async updateMessage(
    projectId: string,
    messageId: string,
    data: {
      subject?: string;
      content?: string;
      categoryId?: number;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.subject !== undefined) body.subject = data.subject;
    if (data.content !== undefined) body.content = data.content;
    if (data.categoryId !== undefined) body.category_id = data.categoryId;
    let response = await this.axios.put(
      `/buckets/${projectId}/messages/${messageId}.json`,
      body
    );
    return response.data;
  }

  // ---- Comments ----

  async listComments(
    projectId: string,
    recordingId: string,
    params?: { page?: number }
  ): Promise<any[]> {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get(
      `/buckets/${projectId}/recordings/${recordingId}/comments.json`,
      { params: query }
    );
    return response.data;
  }

  async getComment(projectId: string, commentId: string): Promise<any> {
    let response = await this.axios.get(`/buckets/${projectId}/comments/${commentId}.json`);
    return response.data;
  }

  async createComment(
    projectId: string,
    recordingId: string,
    data: { content: string }
  ): Promise<any> {
    let response = await this.axios.post(
      `/buckets/${projectId}/recordings/${recordingId}/comments.json`,
      {
        content: data.content
      }
    );
    return response.data;
  }

  async updateComment(
    projectId: string,
    commentId: string,
    data: { content: string }
  ): Promise<any> {
    let response = await this.axios.put(`/buckets/${projectId}/comments/${commentId}.json`, {
      content: data.content
    });
    return response.data;
  }

  // ---- Campfires ----

  async listCampfires(): Promise<any[]> {
    let response = await this.axios.get('/chats.json');
    return response.data;
  }

  async getCampfire(projectId: string, chatId: string): Promise<any> {
    let response = await this.axios.get(`/buckets/${projectId}/chats/${chatId}.json`);
    return response.data;
  }

  async listCampfireLines(
    projectId: string,
    chatId: string,
    params?: { page?: number }
  ): Promise<any[]> {
    let query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get(`/buckets/${projectId}/chats/${chatId}/lines.json`, {
      params: query
    });
    return response.data;
  }

  async createCampfireLine(
    projectId: string,
    chatId: string,
    data: { content: string }
  ): Promise<any> {
    let response = await this.axios.post(`/buckets/${projectId}/chats/${chatId}/lines.json`, {
      content: data.content
    });
    return response.data;
  }

  // ---- Schedule Entries ----

  async listScheduleEntries(
    projectId: string,
    scheduleId: string,
    params?: { status?: string; page?: number }
  ): Promise<any[]> {
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.page) query.page = String(params.page);
    let response = await this.axios.get(
      `/buckets/${projectId}/schedules/${scheduleId}/entries.json`,
      { params: query }
    );
    return response.data;
  }

  async getScheduleEntry(projectId: string, entryId: string): Promise<any> {
    let response = await this.axios.get(
      `/buckets/${projectId}/schedule_entries/${entryId}.json`
    );
    return response.data;
  }

  async createScheduleEntry(
    projectId: string,
    scheduleId: string,
    data: {
      summary: string;
      startsAt: string;
      endsAt: string;
      description?: string;
      participantIds?: number[];
      allDay?: boolean;
      notify?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      summary: data.summary,
      starts_at: data.startsAt,
      ends_at: data.endsAt
    };
    if (data.description !== undefined) body.description = data.description;
    if (data.participantIds) body.participant_ids = data.participantIds;
    if (data.allDay !== undefined) body.all_day = data.allDay;
    if (data.notify !== undefined) body.notify = data.notify;
    let response = await this.axios.post(
      `/buckets/${projectId}/schedules/${scheduleId}/entries.json`,
      body
    );
    return response.data;
  }

  async updateScheduleEntry(
    projectId: string,
    entryId: string,
    data: {
      summary?: string;
      startsAt?: string;
      endsAt?: string;
      description?: string;
      participantIds?: number[];
      allDay?: boolean;
      notify?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.summary !== undefined) body.summary = data.summary;
    if (data.startsAt !== undefined) body.starts_at = data.startsAt;
    if (data.endsAt !== undefined) body.ends_at = data.endsAt;
    if (data.description !== undefined) body.description = data.description;
    if (data.participantIds !== undefined) body.participant_ids = data.participantIds;
    if (data.allDay !== undefined) body.all_day = data.allDay;
    if (data.notify !== undefined) body.notify = data.notify;
    let response = await this.axios.put(
      `/buckets/${projectId}/schedule_entries/${entryId}.json`,
      body
    );
    return response.data;
  }

  // ---- Recordings ----

  async trashRecording(projectId: string, recordingId: string): Promise<void> {
    await this.axios.put(
      `/buckets/${projectId}/recordings/${recordingId}/status/trashed.json`
    );
  }

  async archiveRecording(projectId: string, recordingId: string): Promise<void> {
    await this.axios.put(
      `/buckets/${projectId}/recordings/${recordingId}/status/archived.json`
    );
  }

  async activateRecording(projectId: string, recordingId: string): Promise<void> {
    await this.axios.put(`/buckets/${projectId}/recordings/${recordingId}/status/active.json`);
  }

  // ---- Webhooks ----

  async listWebhooks(projectId: string): Promise<any[]> {
    let response = await this.axios.get(`/buckets/${projectId}/webhooks.json`);
    return response.data;
  }

  async getWebhook(projectId: string, webhookId: string): Promise<any> {
    let response = await this.axios.get(`/buckets/${projectId}/webhooks/${webhookId}.json`);
    return response.data;
  }

  async createWebhook(
    projectId: string,
    data: { payloadUrl: string; types?: string[] }
  ): Promise<any> {
    let body: Record<string, any> = {
      payload_url: data.payloadUrl
    };
    if (data.types) body.types = data.types;
    let response = await this.axios.post(`/buckets/${projectId}/webhooks.json`, body);
    return response.data;
  }

  async updateWebhook(
    projectId: string,
    webhookId: string,
    data: { payloadUrl?: string; types?: string[]; active?: boolean }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.payloadUrl !== undefined) body.payload_url = data.payloadUrl;
    if (data.types !== undefined) body.types = data.types;
    if (data.active !== undefined) body.active = data.active;
    let response = await this.axios.put(
      `/buckets/${projectId}/webhooks/${webhookId}.json`,
      body
    );
    return response.data;
  }

  async deleteWebhook(projectId: string, webhookId: string): Promise<void> {
    await this.axios.delete(`/buckets/${projectId}/webhooks/${webhookId}.json`);
  }
}
