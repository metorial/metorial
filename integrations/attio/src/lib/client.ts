import { createAxios } from 'slates';

type TaskLinkedRecordInput =
  | string
  | {
      targetObject: string;
      targetRecordId: string;
    };

let normalizeTaskLinkedRecord = (record: TaskLinkedRecordInput) =>
  typeof record === 'string'
    ? record
    : {
        target_object: record.targetObject,
        target_record_id: record.targetRecordId
      };

export class AttioClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.attio.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Objects ----

  async listObjects(): Promise<any[]> {
    let response = await this.axios.get('/v2/objects');
    return response.data.data ?? [];
  }

  async getObject(objectSlugOrId: string): Promise<any> {
    let response = await this.axios.get(`/v2/objects/${objectSlugOrId}`);
    return response.data.data;
  }

  // ---- Object Attributes ----

  async listObjectAttributes(objectSlugOrId: string): Promise<any[]> {
    let response = await this.axios.get(`/v2/objects/${objectSlugOrId}/attributes`);
    return response.data.data ?? [];
  }

  async getObjectAttribute(objectSlugOrId: string, attributeSlugOrId: string): Promise<any> {
    let response = await this.axios.get(
      `/v2/objects/${objectSlugOrId}/attributes/${attributeSlugOrId}`
    );
    return response.data.data;
  }

  // ---- Records ----

  async getRecord(objectSlugOrId: string, recordId: string): Promise<any> {
    let response = await this.axios.get(`/v2/objects/${objectSlugOrId}/records/${recordId}`);
    return response.data.data;
  }

  async createRecord(objectSlugOrId: string, values: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/v2/objects/${objectSlugOrId}/records`, {
      data: { values }
    });
    return response.data.data;
  }

  async assertRecord(
    objectSlugOrId: string,
    matchingAttribute: string,
    values: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/v2/objects/${objectSlugOrId}/records`,
      {
        data: { values }
      },
      {
        params: { matching_attribute: matchingAttribute }
      }
    );
    return response.data.data;
  }

  async updateRecord(
    objectSlugOrId: string,
    recordId: string,
    values: Record<string, any>,
    overwrite: boolean = false
  ): Promise<any> {
    if (overwrite) {
      let response = await this.axios.put(
        `/v2/objects/${objectSlugOrId}/records/${recordId}`,
        {
          data: { values }
        }
      );
      return response.data.data;
    }
    let response = await this.axios.patch(
      `/v2/objects/${objectSlugOrId}/records/${recordId}`,
      {
        data: { values }
      }
    );
    return response.data.data;
  }

  async deleteRecord(objectSlugOrId: string, recordId: string): Promise<void> {
    await this.axios.delete(`/v2/objects/${objectSlugOrId}/records/${recordId}`);
  }

  async queryRecords(
    objectSlugOrId: string,
    params: {
      filter?: any;
      sorts?: any[];
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    let response = await this.axios.post(
      `/v2/objects/${objectSlugOrId}/records/query`,
      params
    );
    return response.data.data ?? [];
  }

  async searchRecords(
    query: string,
    params: {
      objects: string[];
      limit?: number;
    }
  ): Promise<any[]> {
    let response = await this.axios.post('/v2/objects/records/search', {
      query,
      ...params,
      request_as: { type: 'workspace' }
    });
    return response.data.data ?? [];
  }

  // ---- Lists ----

  async listLists(): Promise<any[]> {
    let response = await this.axios.get('/v2/lists');
    return response.data.data ?? [];
  }

  async getList(listSlugOrId: string): Promise<any> {
    let response = await this.axios.get(`/v2/lists/${listSlugOrId}`);
    return response.data.data;
  }

  // ---- List Attributes ----

  async listListAttributes(listSlugOrId: string): Promise<any[]> {
    let response = await this.axios.get(`/v2/lists/${listSlugOrId}/attributes`);
    return response.data.data ?? [];
  }

  // ---- List Entries ----

  async getListEntry(listSlugOrId: string, entryId: string): Promise<any> {
    let response = await this.axios.get(`/v2/lists/${listSlugOrId}/entries/${entryId}`);
    return response.data.data;
  }

  async createListEntry(
    listSlugOrId: string,
    parentRecordId: string,
    parentObject: string,
    entryValues?: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(`/v2/lists/${listSlugOrId}/entries`, {
      data: {
        parent_record_id: parentRecordId,
        parent_object: parentObject,
        entry_values: entryValues ?? {}
      }
    });
    return response.data.data;
  }

  async assertListEntry(
    listSlugOrId: string,
    parentRecordId: string,
    parentObject: string,
    entryValues?: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(`/v2/lists/${listSlugOrId}/entries`, {
      data: {
        parent_record_id: parentRecordId,
        parent_object: parentObject,
        entry_values: entryValues ?? {}
      }
    });
    return response.data.data;
  }

  async updateListEntry(
    listSlugOrId: string,
    entryId: string,
    entryValues: Record<string, any>,
    overwrite: boolean = false
  ): Promise<any> {
    if (overwrite) {
      let response = await this.axios.put(`/v2/lists/${listSlugOrId}/entries/${entryId}`, {
        data: { entry_values: entryValues }
      });
      return response.data.data;
    }
    let response = await this.axios.patch(`/v2/lists/${listSlugOrId}/entries/${entryId}`, {
      data: { entry_values: entryValues }
    });
    return response.data.data;
  }

  async deleteListEntry(listSlugOrId: string, entryId: string): Promise<void> {
    await this.axios.delete(`/v2/lists/${listSlugOrId}/entries/${entryId}`);
  }

  async queryListEntries(
    listSlugOrId: string,
    params: {
      filter?: any;
      sorts?: any[];
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    let response = await this.axios.post(`/v2/lists/${listSlugOrId}/entries/query`, params);
    return response.data.data ?? [];
  }

  // ---- Notes ----

  async listNotes(params?: {
    parentObject?: string;
    parentRecordId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.parentObject) queryParams.parent_object = params.parentObject;
    if (params?.parentRecordId) queryParams.parent_record_id = params.parentRecordId;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/v2/notes', { params: queryParams });
    return response.data.data ?? [];
  }

  async getNote(noteId: string): Promise<any> {
    let response = await this.axios.get(`/v2/notes/${noteId}`);
    return response.data.data;
  }

  async createNote(params: {
    parentObject: string;
    parentRecordId: string;
    title: string;
    format?: string;
    content?: string;
    createdAt?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      parent_object: params.parentObject,
      parent_record_id: params.parentRecordId,
      title: params.title
    };
    if (params.format) body.format = params.format;
    if (params.content) body.content = params.content;
    if (params.createdAt) body.created_at = params.createdAt;

    let response = await this.axios.post('/v2/notes', { data: body });
    return response.data.data;
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.axios.delete(`/v2/notes/${noteId}`);
  }

  // ---- Tasks ----

  async listTasks(params?: {
    limit?: number;
    offset?: number;
    sort?: string;
    linkedObject?: string;
    linkedRecordId?: string;
    assignee?: string;
    isCompleted?: boolean;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.linkedObject) queryParams.linked_object = params.linkedObject;
    if (params?.linkedRecordId) queryParams.linked_record_id = params.linkedRecordId;
    if (params?.assignee) queryParams.assignee = params.assignee;
    if (params?.isCompleted !== undefined) queryParams.is_completed = params.isCompleted;

    let response = await this.axios.get('/v2/tasks', { params: queryParams });
    return response.data.data ?? [];
  }

  async getTask(taskId: string): Promise<any> {
    let response = await this.axios.get(`/v2/tasks/${taskId}`);
    return response.data.data;
  }

  async createTask(params: {
    content: string;
    format?: string;
    deadlineAt?: string;
    isCompleted?: boolean;
    linkedRecords?: TaskLinkedRecordInput[];
    assignees?: Array<{ referencedActorType: string; referencedActorId: string }>;
  }): Promise<any> {
    let body: Record<string, any> = {
      content: params.content,
      format: params.format ?? 'plaintext',
      deadline_at: params.deadlineAt ?? null,
      is_completed: params.isCompleted ?? false,
      linked_records: (params.linkedRecords ?? []).map(normalizeTaskLinkedRecord),
      assignees: (params.assignees ?? []).map(a => ({
        referenced_actor_type: a.referencedActorType,
        referenced_actor_id: a.referencedActorId
      }))
    };

    let response = await this.axios.post('/v2/tasks', { data: body });
    return response.data.data;
  }

  async updateTask(
    taskId: string,
    params: {
      deadlineAt?: string | null;
      isCompleted?: boolean;
      linkedRecords?: TaskLinkedRecordInput[];
      assignees?: Array<{ referencedActorType: string; referencedActorId: string }>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.deadlineAt !== undefined) body.deadline_at = params.deadlineAt;
    if (params.isCompleted !== undefined) body.is_completed = params.isCompleted;
    if (params.linkedRecords) {
      body.linked_records = params.linkedRecords.map(normalizeTaskLinkedRecord);
    }
    if (params.assignees) {
      body.assignees = params.assignees.map(a => ({
        referenced_actor_type: a.referencedActorType,
        referenced_actor_id: a.referencedActorId
      }));
    }

    let response = await this.axios.patch(`/v2/tasks/${taskId}`, { data: body });
    return response.data.data;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.axios.delete(`/v2/tasks/${taskId}`);
  }

  // ---- Comments ----

  async getComment(commentId: string): Promise<any> {
    let response = await this.axios.get(`/v2/comments/${commentId}`);
    return response.data.data;
  }

  async createComment(params: {
    content: string;
    format?: string;
    threadId?: string;
    record?: { object: string; recordId: string };
    entry?: { list: string; entryId: string };
    author?: { type: string; id: string };
  }): Promise<any> {
    let body: Record<string, any> = {
      content: params.content,
      format: params.format ?? 'plaintext'
    };
    if (params.threadId) body.thread_id = params.threadId;
    if (params.record) {
      body.record = {
        object: params.record.object,
        record_id: params.record.recordId
      };
    }
    if (params.entry) {
      body.entry = {
        list: params.entry.list,
        entry_id: params.entry.entryId
      };
    }
    if (params.author) body.author = params.author;

    let response = await this.axios.post('/v2/comments', { data: body });
    return response.data.data;
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.axios.delete(`/v2/comments/${commentId}`);
  }

  // ---- Threads ----

  async getThread(threadId: string): Promise<any> {
    let response = await this.axios.get(`/v2/threads/${threadId}`);
    return response.data.data;
  }

  async listThreads(params?: {
    recordId?: string;
    object?: string;
    entryId?: string;
    list?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.recordId) queryParams.record_id = params.recordId;
    if (params?.object) queryParams.object = params.object;
    if (params?.entryId) queryParams.entry_id = params.entryId;
    if (params?.list) queryParams.list = params.list;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/v2/threads', { params: queryParams });
    return response.data.data ?? [];
  }

  // ---- Workspace Members ----

  async listWorkspaceMembers(): Promise<any[]> {
    let response = await this.axios.get('/v2/workspace_members');
    return response.data.data ?? [];
  }

  async getWorkspaceMember(memberId: string): Promise<any> {
    let response = await this.axios.get(`/v2/workspace_members/${memberId}`);
    return response.data.data;
  }

  // ---- Webhooks ----

  async createWebhook(
    targetUrl: string,
    subscriptions: Array<{
      eventType: string;
      filter?: any;
    }>
  ): Promise<any> {
    let response = await this.axios.post('/v2/webhooks', {
      data: {
        target_url: targetUrl,
        subscriptions: subscriptions.map(s => ({
          event_type: s.eventType,
          ...(s.filter ? { filter: s.filter } : {})
        }))
      }
    });
    return response.data.data;
  }

  async listWebhooks(params?: { limit?: number; offset?: number }): Promise<any[]> {
    let response = await this.axios.get('/v2/webhooks', { params });
    return response.data.data ?? [];
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.axios.get(`/v2/webhooks/${webhookId}`);
    return response.data.data;
  }

  async updateWebhook(
    webhookId: string,
    params: {
      targetUrl?: string;
      subscriptions?: Array<{ eventType: string; filter?: any }>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.targetUrl) body.target_url = params.targetUrl;
    if (params.subscriptions) {
      body.subscriptions = params.subscriptions.map(s => ({
        event_type: s.eventType,
        ...(s.filter ? { filter: s.filter } : {})
      }));
    }

    let response = await this.axios.patch(`/v2/webhooks/${webhookId}`, { data: body });
    return response.data.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/v2/webhooks/${webhookId}`);
  }
}
