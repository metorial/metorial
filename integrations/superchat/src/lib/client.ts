import { createAxios } from 'slates';

export class SuperchatClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.superchat.com/v1.0',
      headers: {
        'X-API-KEY': config.token,
        'Content-Type': 'application/json'
      }
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
        ...(params.from.name ? { name: params.from.name } : {})
      },
      content: params.content
    };

    if (params.inReplyTo) {
      body.in_reply_to = params.inReplyTo;
    }

    let response = await this.axios.post('/messages', body);
    return response.data;
  }

  async getMessageAnalytics(
    messageIds: string[],
    params?: { limit?: number; after?: string; before?: string }
  ) {
    let response = await this.axios.post('/messages/analytics', messageIds, {
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
    });
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
      handles: params.handles
    };
    if (params.firstName) body.first_name = params.firstName;
    if (params.lastName) body.last_name = params.lastName;
    if (params.gender) body.gender = params.gender;
    if (params.customAttributes) body.custom_attributes = params.customAttributes;

    let response = await this.axios.post('/contacts', body);
    return response.data;
  }

  async listContacts(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/contacts', {
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
    });
    return response.data;
  }

  // ─── Contact Lists ───

  async listContactLists(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/contact-lists', {
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
    });
    return response.data;
  }

  async getContactContactLists(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}/contact-lists`);
    return response.data;
  }

  async addContactToList(contactId: string, listId: string) {
    let response = await this.axios.post(`/contacts/${contactId}/contact-lists`, {
      contact_list_id: listId
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
    return response.data;
  }

  async listUsers(params?: { limit?: number; after?: string; before?: string }) {
    let response = await this.axios.get('/users', {
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
    });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  // ─── Custom Attributes ───

  async listContactAttributes() {
    let response = await this.axios.get('/contact-attributes');
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
      params: {
        ...(params?.limit ? { limit: params.limit } : {}),
        ...(params?.after ? { after: params.after } : {}),
        ...(params?.before ? { before: params.before } : {})
      }
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
