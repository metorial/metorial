import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.hey-y.io/api/v2.0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // === Business ===

  async getBusiness() {
    let response = await this.axios.get('/business');
    return response.data?.data;
  }

  // === Contacts ===

  async createContact(data: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    labels?: Array<{ name: string }>;
    attributes?: Array<{ externalId: string; value: string }>;
  }) {
    let response = await this.axios.post('/contacts', data);
    return response.data?.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data?.data;
  }

  async listContacts(params?: {
    page?: string;
    pageSize?: string;
    sortBy?: string;
    order?: string;
    search?: string;
  }) {
    let response = await this.axios.get('/contacts', { params });
    return response.data?.data;
  }

  async updateContact(
    contactId: string,
    data: {
      firstName?: string | null;
      lastName?: string | null;
      labels?: Array<{ name: string }>;
      attributes?: Array<{ externalId: string; value: string }>;
    }
  ) {
    let response = await this.axios.put(`/contacts/${contactId}`, data);
    return response.data?.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contacts/${contactId}`);
    return response.data?.data;
  }

  async addContactAttribute(contactId: string, data: { externalId: string; value: string }) {
    let response = await this.axios.post(`/contacts/${contactId}/attributes`, data);
    return response.data?.data;
  }

  async removeContactAttribute(contactId: string, data: { externalId: string }) {
    let response = await this.axios.delete(`/contacts/${contactId}/attributes`, { data });
    return response.data?.data;
  }

  // === Channels ===

  async listChannels() {
    let response = await this.axios.get('/channels');
    return response.data?.data;
  }

  async getChannel(channelId: string) {
    let response = await this.axios.get(`/channels/${channelId}`);
    return response.data?.data;
  }

  // === Messaging ===

  async sendWhatsAppMessage(
    channelId: string,
    data: {
      phoneNumber: string;
      type: string;
      bodyText?: string;
      messageTemplateId?: string;
      variables?: Array<{ name: string; value: string }>;
      fileId?: string;
      scheduledAt?: string;
    }
  ) {
    let response = await this.axios.post(`/${channelId}/whatsapp_messages/send`, data);
    return response.data?.data;
  }

  // === File Upload ===

  async uploadFile(file: any, format: string) {
    let formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    let response = await this.axios.post('/upload_file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data?.data;
  }

  // === Message Templates ===

  async listMessageTemplates() {
    let response = await this.axios.get('/message_templates');
    return response.data?.data;
  }

  // === Broadcasts ===

  async createBroadcast(
    channelId: string,
    data: {
      name: string;
      workflowId: string;
      messageTemplateId?: string;
      isScheduled?: boolean;
      scheduledAt?: string;
      isReoccurring?: boolean;
      recurrenceRules?: string[];
      contacts?: Record<string, any>[];
      variables?: Array<{ name: string; value: string }>;
    }
  ) {
    let response = await this.axios.post(`/${channelId}/broadcasts`, data);
    return response.data?.data;
  }

  async listBroadcasts(channelId: string) {
    let response = await this.axios.get(`/${channelId}/broadcasts`);
    return response.data?.data;
  }

  async getBroadcast(channelId: string, broadcastId: string) {
    let response = await this.axios.get(`/${channelId}/broadcasts/${broadcastId}`);
    return response.data?.data;
  }

  async updateBroadcast(
    channelId: string,
    broadcastId: string,
    data: {
      name?: string;
      workflowId?: string;
      messageTemplateId?: string;
      isScheduled?: boolean;
      scheduledAt?: string;
      isReoccurring?: boolean;
      recurrenceRules?: string[];
      variables?: Array<{ name: string; value: string }>;
    }
  ) {
    let response = await this.axios.put(`/${channelId}/broadcasts/${broadcastId}`, data);
    return response.data?.data;
  }

  async deleteBroadcast(channelId: string, broadcastId: string) {
    let response = await this.axios.delete(`/${channelId}/broadcasts/${broadcastId}`);
    return response.data?.data;
  }

  async startBroadcast(channelId: string, broadcastId: string, mediaId: string) {
    let response = await this.axios.post(`/${channelId}/broadcasts/${broadcastId}/start`, {
      mediaId
    });
    return response.data?.data;
  }

  async addBroadcastRecipients(channelId: string, broadcastId: string, contactsIds: string[]) {
    let response = await this.axios.post(
      `/${channelId}/broadcasts/${broadcastId}/recipients`,
      { contactsIds }
    );
    return response.data?.data;
  }

  async removeBroadcastRecipients(
    channelId: string,
    broadcastId: string,
    contactsIds: string[]
  ) {
    let response = await this.axios.delete(
      `/${channelId}/broadcasts/${broadcastId}/recipients`,
      {
        data: { contactsIds }
      }
    );
    return response.data?.data;
  }

  async getBroadcastRecipients(channelId: string, broadcastId: string) {
    let response = await this.axios.get(`/${channelId}/broadcasts/${broadcastId}/recipients`);
    return response.data?.data;
  }

  // === Chats ===

  async listChats(channelId: string) {
    let response = await this.axios.get(`/${channelId}/chats`);
    return response.data?.data;
  }

  async getChat(channelId: string, chatId: string) {
    let response = await this.axios.get(`/${channelId}/chats/${chatId}`);
    return response.data?.data;
  }

  async updateChat(
    channelId: string,
    chatId: string,
    data: {
      isUnread?: boolean;
      status?: string;
      assignedUserId?: string | null;
      assignedTeamId?: string | null;
    }
  ) {
    let response = await this.axios.put(`/${channelId}/chats/${chatId}`, data);
    return response.data?.data;
  }

  // === Workflows / Automations ===

  async listWorkflows(channelId: string) {
    let response = await this.axios.get(`/${channelId}/workflows`);
    return response.data?.data;
  }

  async triggerWorkflow(
    channelId: string,
    workflowId: string,
    data: {
      phoneNumber: string;
      variables?: Array<{ name: string; value: string }>;
      scheduledAt?: string;
    }
  ) {
    let response = await this.axios.post(`/${channelId}/workflows/${workflowId}`, data);
    return response.data?.data;
  }

  // === Attributes ===

  async createAttribute(data: { externalId: string; value: string }) {
    let response = await this.axios.post('/attributes', data);
    return response.data?.data;
  }

  async listAttributes() {
    let response = await this.axios.get('/attributes');
    return response.data?.data;
  }

  async deleteAttribute(attributeId: string) {
    let response = await this.axios.delete(`/attributes/${attributeId}`);
    return response.data?.data;
  }

  // === Labels ===

  async createLabel(data: { name: string }) {
    let response = await this.axios.post('/labels', data);
    return response.data?.data;
  }

  async listLabels() {
    let response = await this.axios.get('/labels');
    return response.data?.data;
  }

  async deleteLabel(labelId: string) {
    let response = await this.axios.delete(`/labels/${labelId}`);
    return response.data?.data;
  }

  // === Webhooks ===

  async createWebhook(data: {
    tenantId: string;
    type: string;
    url: string;
    channelId?: string;
  }) {
    let response = await this.axios.post('/api_webhooks', data);
    return response.data?.data;
  }

  async listWebhooks() {
    let response = await this.axios.get('/api_webhooks');
    return response.data?.data;
  }

  async updateWebhook(
    webhookId: string,
    data: {
      type?: string;
      url?: string;
      channelId?: string;
    }
  ) {
    let response = await this.axios.put(`/api_webhooks/${webhookId}`, data);
    return response.data?.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/api_webhooks/${webhookId}`);
    return response.data?.data;
  }
}
