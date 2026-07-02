import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.respond.io/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Contact Methods ───

  async getContact(identifierType: string, identifierValue: string) {
    let response = await this.axios.get(`/contact/${identifierType}:${identifierValue}`);
    return response.data;
  }

  async createContact(
    identifierType: string,
    identifierValue: string,
    fields: Record<string, any>
  ) {
    let response = await this.axios.post(
      `/contact/${identifierType}:${identifierValue}`,
      fields
    );
    return response.data;
  }

  async updateContact(
    identifierType: string,
    identifierValue: string,
    fields: Record<string, any>
  ) {
    let response = await this.axios.put(
      `/contact/${identifierType}:${identifierValue}`,
      fields
    );
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contact/${contactId}`);
    return response.data;
  }

  async listContacts(filters?: Record<string, any>, limit?: number, cursorId?: string) {
    let params: Record<string, any> = {};
    if (limit) params.limit = limit;
    if (cursorId) params.cursorId = cursorId;
    let response = await this.axios.post('/contact/list', filters || {}, { params });
    return response.data;
  }

  async mergeContacts(primaryContactId: string, secondaryContactId: string) {
    let response = await this.axios.post('/contact/merge', {
      primaryContactId,
      secondaryContactId
    });
    return response.data;
  }

  async addContactTags(contactId: string, tags: string[]) {
    let response = await this.axios.post(`/contact/${contactId}/tag`, tags);
    return response.data;
  }

  async removeContactTags(contactId: string, tags: string[]) {
    let response = await this.axios.delete(`/contact/${contactId}/tag`, { data: tags });
    return response.data;
  }

  // ─── Messaging Methods ───

  async sendMessage(contactId: string, message: Record<string, any>, channelId?: string) {
    let body: Record<string, any> = { message };
    if (channelId) {
      body.channelId = channelId;
    }
    let response = await this.axios.post(`/contact/${contactId}/message`, body);
    return response.data;
  }

  async getMessage(contactId: string, messageId: string) {
    let response = await this.axios.get(`/contact/${contactId}/message/${messageId}`);
    return response.data;
  }

  async listMessages(contactId: string, limit?: number, cursorId?: string) {
    let params: Record<string, any> = {};
    if (limit) params.limit = limit;
    if (cursorId) params.cursorId = cursorId;
    let response = await this.axios.get(`/contact/${contactId}/message`, { params });
    return response.data;
  }

  async listMessageTemplates(channelId: string) {
    let response = await this.axios.get(`/space/channel/${channelId}/template`);
    return response.data;
  }

  // ─── Conversation Methods ───

  async openConversation(contactId: string) {
    let response = await this.axios.post(`/contact/${contactId}/conversation`, {
      status: 'open'
    });
    return response.data;
  }

  async closeConversation(contactId: string, category?: string, summary?: string) {
    let body: Record<string, any> = { status: 'closed' };
    if (category) body.category = category;
    if (summary) body.summary = summary;
    let response = await this.axios.post(`/contact/${contactId}/conversation`, body);
    return response.data;
  }

  async assignConversation(contactId: string, assigneeId: number) {
    let response = await this.axios.post(`/contact/${contactId}/assignee`, {
      assignee: { id: assigneeId }
    });
    return response.data;
  }

  async unassignConversation(contactId: string) {
    let response = await this.axios.post(`/contact/${contactId}/assignee`, {
      assignee: null
    });
    return response.data;
  }

  // ─── Comment Methods ───

  async addComment(contactId: string, text: string) {
    let response = await this.axios.post(`/contact/${contactId}/comment`, { text });
    return response.data;
  }

  // ─── Custom Fields Methods ───

  async getCustomField(customFieldId: string) {
    let response = await this.axios.get(`/space/custom_field/${customFieldId}`);
    return response.data;
  }

  async listCustomFields() {
    let response = await this.axios.get('/space/custom_fields');
    return response.data;
  }

  // ─── Workspace Methods ───

  async listChannels() {
    let response = await this.axios.get('/space/channels');
    return response.data;
  }

  async listUsers() {
    let response = await this.axios.get('/space/users');
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/space/user/${userId}`);
    return response.data;
  }
}
