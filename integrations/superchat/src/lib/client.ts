import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  pickDefined
} from 'slates';

type PageParams = { limit?: number; after?: string; before?: string };

let pageParams = (params?: PageParams) => {
  if (
    params?.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
  ) {
    throw createApiServiceError('The page limit must be a whole number between 1 and 100.');
  }
  if (params?.after !== undefined && params?.before !== undefined) {
    throw createApiServiceError('Provide either after or before for pagination, not both.');
  }
  return pickDefined(params ?? {});
};

export class SuperchatClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.superchat.com/v1.0',
      authHeader: { name: 'X-API-KEY', value: config.token },
      errorMapping: {
        mapAxiosError: error => ({
          message: extractApiErrorMessage(error, {
            detailKeys: ['title', 'detail', 'message']
          })
        })
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Superchat',
          reason: 'superchat_api_error',
          detailKeys: ['title', 'detail', 'message']
        })
    });
    this.axios.interceptors.response.use(response => {
      let pagination = response.data?.pagination;
      if (pagination) {
        response.data.pagination = {
          ...pagination,
          next: pagination.next_cursor ?? pagination.next ?? null,
          previous: pagination.previous_cursor ?? pagination.previous ?? null
        };
      }
      return response;
    });
  }

  // ─── Messages ───

  async sendMessage(params: {
    to: Array<{ identifier: string }>;
    from: { channelId: string; name?: string };
    content: Record<string, any>;
    inReplyTo?: string;
  }) {
    let body: Record<string, any> = {
      to: params.to,
      from: {
        channel_id: params.from.channelId,
        name: params.from.name ?? null
      },
      content: this.messageContent(params.content)
    };

    if (params.inReplyTo) {
      body.in_reply_to = params.inReplyTo;
    }

    let response = await this.axios.post('/messages', body);
    return response.data;
  }

  private messageContent(content: Record<string, any>) {
    if (content.type === 'email') {
      return pickDefined({ type: 'email', subject: content.subject, text: content.body });
    }
    if (content.type === 'media') {
      if (!content.file_id) {
        throw createApiServiceError(
          'Media messages require file_id from an uploaded Superchat file. Use list_files to find an existing file; a remote media_url cannot be sent directly.'
        );
      }
      return pickDefined({
        type: 'media',
        file_id: content.file_id,
        caption: content.caption
      });
    }
    if (content.type === 'whats_app_template' || content.type === 'generic_template') {
      if (!content.template_id) {
        throw createApiServiceError(
          'Template messages require template_id. Use list_templates to find the approved template; names and language codes cannot identify a template in this API.'
        );
      }
      return pickDefined({
        type: content.type,
        template_id: content.template_id,
        variables: content.template_variables?.map((value: string, index: number) => ({
          position: index + 1,
          value
        }))
      });
    }
    return content;
  }

  async getMessageAnalytics(messageIds: string[]) {
    if (messageIds.length > 100) {
      throw createApiServiceError('Request analytics for at most 100 message IDs at a time.');
    }
    let response = await this.axios.get('/analytics/messages', {
      params: { message_ids: messageIds },
      paramsSerializer: { indexes: null }
    });
    return Object.fromEntries(
      (response.data.results ?? []).map((result: { message_id: string }) => [
        result.message_id,
        result
      ])
    );
  }

  async getMessage(messageId: string) {
    let response = await this.axios.get(`/messages/${encodeURIComponent(messageId)}`);
    return response.data;
  }

  async getConversationMessages(
    conversationId: string,
    params: PageParams & {
      createdAfter?: string;
      createdBefore?: string;
      direction?: 'INBOUND' | 'OUTBOUND';
    }
  ) {
    let response = await this.axios.get(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        params: {
          ...pageParams({ limit: params.limit, after: params.after, before: params.before }),
          ...pickDefined({
            created_after: params.createdAfter,
            created_before: params.createdBefore,
            direction: params.direction
          })
        }
      }
    );
    return response.data;
  }

  // ─── Contacts ───

  async createContact(params: {
    handles: Array<{ type: string; value: string }>;
    firstName?: string;
    lastName?: string;
    gender?: string;
    customAttributes?: Record<string, any>[];
  }) {
    let body: Record<string, any> = {
      handles: params.handles.map(handle => ({ id: null, ...handle })),
      first_name: params.firstName ?? null,
      last_name: params.lastName ?? null,
      gender: params.gender ?? null
    };
    if (params.customAttributes) body.custom_attributes = params.customAttributes;

    let response = await this.axios.post('/contacts', body);
    return response.data;
  }

  async listContacts(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/contacts', {
      params: pageParams(params)
    });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async updateContact(
    contactId: string,
    params: {
      firstName?: string;
      lastName?: string;
      gender?: string;
      customAttributes?: Record<string, any>[];
    }
  ) {
    let body: Record<string, any> = {};
    if (params.firstName !== undefined) body.first_name = params.firstName;
    if (params.lastName !== undefined) body.last_name = params.lastName;
    if (params.gender !== undefined) body.gender = params.gender;
    if (params.customAttributes !== undefined)
      body.custom_attributes = params.customAttributes;

    let response = await this.axios.patch(`/contacts/${contactId}`, body);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contacts/${contactId}`);
    return response.data;
  }

  async searchContacts(field: string, value: string | null) {
    let response = await this.axios.post('/contacts/search', {
      query: {
        value: [
          {
            field,
            operator: '=',
            value
          }
        ]
      }
    });
    return response.data;
  }

  async getContactConversations(
    contactId: string,
    params?: { limit?: number; after?: string; before?: string }
  ) {
    let response = await this.axios.get(`/contacts/${contactId}/conversations`, {
      params: pageParams(params)
    });
    return response.data;
  }

  // ─── Contact Lists ───

  async listContactLists(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/contact-lists', {
      params: pageParams(params)
    });
    return response.data;
  }

  async getContactList(listId: string) {
    let response = await this.axios.get(`/contact-lists/${listId}`);
    return response.data;
  }

  async getContactListContacts(
    listId: string,
    params?: { limit?: number; after?: string; before?: string }
  ) {
    let response = await this.axios.get(`/contact-lists/${listId}/contacts`, {
      params: pageParams(params)
    });
    return response.data;
  }

  async getContactContactLists(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}/contact-lists`);
    return response.data;
  }

  async addContactToList(contactId: string, listId: string) {
    let response = await this.axios.post(`/contacts/${contactId}/contact-lists`, {
      id: listId
    });
    return response.data;
  }

  async removeContactFromList(contactId: string, listId: string) {
    let response = await this.axios.delete(`/contacts/${contactId}/contact-lists/${listId}`);
    return response.data;
  }

  // ─── Conversations ───

  async listConversations(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/conversations', {
      params: pageParams(params)
    });
    return response.data;
  }

  async getConversation(conversationId: string) {
    let response = await this.axios.get(`/conversations/${conversationId}`);
    return response.data;
  }

  async updateConversation(
    conversationId: string,
    params: {
      status?: string;
      snoozedUntil?: string;
      assignedUsers?: string[];
      labels?: string[];
      inboxId?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.status !== undefined) body.status = params.status;
    if (params.snoozedUntil !== undefined) body.snoozed_until = params.snoozedUntil;
    if (params.assignedUsers !== undefined) body.assigned_users = params.assignedUsers;
    if (params.labels !== undefined) body.labels = params.labels;
    if (params.inboxId !== undefined) body.inbox_id = params.inboxId;

    let response = await this.axios.patch(`/conversations/${conversationId}`, body);
    return response.data;
  }

  async deleteConversation(conversationId: string) {
    let response = await this.axios.delete(`/conversations/${conversationId}`);
    return response.data;
  }

  async createConversationExport(conversationId: string) {
    let response = await this.axios.post('/conversations/exports', {
      conversation_id: conversationId
    });
    return response.data;
  }

  async getConversationExport(exportId: string) {
    let response = await this.axios.get(`/conversations/exports/${exportId}`);
    return response.data;
  }

  // ─── Notes ───

  async createNote(conversationId: string, content: string) {
    let response = await this.axios.post(`/conversations/${conversationId}/notes`, {
      content
    });
    return response.data;
  }

  async listNotes(
    conversationId: string,
    params?: { limit?: number; after?: string; before?: string }
  ) {
    let response = await this.axios.get(`/conversations/${conversationId}/notes`, {
      params: pageParams(params)
    });
    return response.data;
  }

  async getNote(conversationId: string, noteId: string) {
    let response = await this.axios.get(`/conversations/${conversationId}/notes/${noteId}`);
    return response.data;
  }

  async updateNote(conversationId: string, noteId: string, content: string) {
    let response = await this.axios.put(`/conversations/${conversationId}/notes/${noteId}`, {
      content
    });
    return response.data;
  }

  async deleteNote(conversationId: string, noteId: string) {
    let response = await this.axios.delete(`/conversations/${conversationId}/notes/${noteId}`);
    return response.data;
  }

  // ─── Templates ───

  async listTemplates(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/templates', {
      params: pageParams(params)
    });
    return response.data;
  }

  async getTemplate(templateId: string) {
    let response = await this.axios.get(`/templates/${templateId}`);
    return response.data;
  }

  async createTemplate(params: Record<string, any>) {
    let response = await this.axios.post('/templates', params);
    return response.data;
  }

  async updateTemplate(templateId: string, params: Record<string, any>) {
    let response = await this.axios.patch(`/templates/${templateId}`, params);
    return response.data;
  }

  async deleteTemplate(templateId: string) {
    let response = await this.axios.delete(`/templates/${templateId}`);
    return response.data;
  }

  async getTemplateAnalytics(templateIds: string[]) {
    let response = await this.axios.post('/templates/analytics', templateIds);
    return response.data;
  }

  // ─── Template Folders ───

  async listTemplateFolders(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/template-folders', {
      params: pageParams(params)
    });
    return response.data;
  }

  async createTemplateFolder(params: Record<string, any>) {
    let response = await this.axios.post('/template-folders', params);
    return response.data;
  }

  async updateTemplateFolder(folderId: string, params: Record<string, any>) {
    let response = await this.axios.put(`/template-folders/${folderId}`, params);
    return response.data;
  }

  async deleteTemplateFolder(folderId: string) {
    let response = await this.axios.delete(`/template-folders/${folderId}`);
    return response.data;
  }

  // ─── Channels ───

  async listChannels(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/channels', {
      params: pageParams(params)
    });
    return response.data;
  }

  async getChannel(channelId: string) {
    let response = await this.axios.get(`/channels/${channelId}`);
    return response.data;
  }

  // ─── Inboxes ───

  async listInboxes(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/inboxes', {
      params: pageParams(params)
    });
    return response.data;
  }

  async getInbox(inboxId: string) {
    let response = await this.axios.get(`/inboxes/${inboxId}`);
    return response.data;
  }

  // ─── Labels ───

  async listLabels(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/labels', {
      params: pageParams(params)
    });
    return response.data;
  }

  async getLabel(labelId: string) {
    let response = await this.axios.get(`/labels/${labelId}`);
    return response.data;
  }

  // ─── Files ───

  async uploadFile(formData: any) {
    let response = await this.axios.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async listFiles(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/files', {
      params: pageParams(params)
    });
    return response.data;
  }

  async getFile(fileId: string) {
    let response = await this.axios.get(`/files/${fileId}`);
    return response.data;
  }

  async deleteFile(fileId: string) {
    let response = await this.axios.delete(`/files/${fileId}`);
    return response.data;
  }

  // ─── Users ───

  async getMe() {
    let response = await this.axios.get('/me');
    let user = response.data.user ?? response.data;
    return {
      ...user,
      name: user.name ?? [user.first_name, user.last_name].filter(Boolean).join(' ')
    };
  }

  async listUsers(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/users', {
      params: pageParams(params)
    });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  // ─── Custom Attributes ───

  async listContactAttributes(params?: PageParams) {
    let response = await this.axios.get('/custom-attributes', { params: pageParams(params) });
    return response.data;
  }

  // ─── Webhooks ───

  async createWebhook(
    targetUrl: string,
    events: Array<{ type: string; filters?: Record<string, any>[] }>
  ) {
    let response = await this.axios.post('/webhooks', {
      target_url: targetUrl,
      events
    });
    return response.data;
  }

  async listWebhooks(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/webhooks', {
      params: pageParams(params)
    });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    params: {
      targetUrl?: string;
      events?: Array<{ type: string; filters?: Record<string, any>[] }>;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.targetUrl !== undefined) body.target_url = params.targetUrl;
    if (params.events !== undefined) body.events = params.events;

    let response = await this.axios.put(`/webhooks/${webhookId}`, body);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }
}
