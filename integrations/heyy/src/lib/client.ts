import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; version?: 'v2' | 'v3' }) {
    this.axios = createAuthenticatedAxios({
      baseURL: `https://api.heyy.io/${config.version ?? 'v2'}`,
      authHeader: { value: `Bearer ${config.token}` },
      errorMapping: {
        mapAxiosError: (error, inferred) => {
          let body = error.response?.data;
          if (!isApiErrorRecord(body) || !isApiErrorRecord(body.error)) return;

          let details: string[] = [];
          collectApiErrorDetails(body.error, details, {
            detailKeys: ['messageKey', 'message']
          });
          if (isApiErrorRecord(body.error.invalidParams)) {
            for (let [field, detail] of Object.entries(body.error.invalidParams)) {
              if (isApiErrorRecord(detail) && typeof detail.message === 'string') {
                details.push(`${field}: ${detail.message}`);
              }
            }
          }

          return {
            message: details.length ? details.join(' - ') : inferred.message,
            upstream: {
              ...inferred.upstream,
              code:
                typeof body.error.messageKey === 'string'
                  ? body.error.messageKey
                  : inferred.upstream?.code
            }
          };
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Heyy',
          reason: 'heyy_api_error',
          extractStatus: (error, response) => {
            if (!isApiErrorRecord(error) || !isApiErrorRecord(error.data)) {
              return response?.status;
            }
            let upstream = error.data.upstream;
            return isApiErrorRecord(upstream) && typeof upstream.status === 'number'
              ? upstream.status
              : response?.status;
          },
          extractUpstreamCode: error => {
            if (!isApiErrorRecord(error) || !isApiErrorRecord(error.data)) return;
            let upstream = error.data.upstream;
            return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
              ? upstream.code
              : undefined;
          }
        })
    });

    this.axios.interceptors.response.use(response => {
      let body = response.data;
      if (isApiErrorRecord(body) && body.success === false) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'Heyy',
            reason: 'heyy_api_error',
            detailKeys: ['messageKey', 'message'],
            nestedKeys: ['error']
          }
        );
      }
      if (!isApiErrorRecord(body) || !('data' in body) || body.data == null) {
        throw createApiServiceError(
          'Heyy returned an invalid API response. Please try again.',
          {
            reason: 'heyy_invalid_response'
          }
        );
      }
      return response;
    });
  }

  async getWorkspace() {
    let response = await this.axios.get('/workspace');
    return response.data.data;
  }

  async getChatById(chatId: string) {
    let response = await this.axios.get(`/chats/${encodeURIComponent(chatId)}`);
    return response.data.data;
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
    let response = await this.axios.get(`/contacts/${encodeURIComponent(contactId)}`);
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
    let response = await this.axios.put(`/contacts/${encodeURIComponent(contactId)}`, data);
    return response.data?.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contacts/${encodeURIComponent(contactId)}`);
    return response.data?.data;
  }

  async addContactAttribute(contactId: string, data: { externalId: string; value: string }) {
    let response = await this.axios.post(
      `/contacts/${encodeURIComponent(contactId)}/attributes`,
      data
    );
    return response.data?.data;
  }

  async removeContactAttribute(contactId: string, data: { externalId: string }) {
    let response = await this.axios.delete(
      `/contacts/${encodeURIComponent(contactId)}/attributes`,
      { data }
    );
    return response.data?.data;
  }

  // === Channels ===

  async listChannels() {
    let response = await this.axios.get('/channels');
    return response.data?.data;
  }

  async getChannel(channelId: string) {
    let response = await this.axios.get(`/channels/${encodeURIComponent(channelId)}`);
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
    let response = await this.axios.post(
      `/${encodeURIComponent(channelId)}/whatsapp_messages/send`,
      data
    );
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
    let response = await this.axios.post(`/${encodeURIComponent(channelId)}/broadcasts`, data);
    return response.data?.data;
  }

  async listBroadcasts(channelId: string) {
    let response = await this.axios.get(`/${encodeURIComponent(channelId)}/broadcasts`);
    return response.data?.data;
  }

  async getBroadcast(channelId: string, broadcastId: string) {
    let response = await this.axios.get(
      `/${encodeURIComponent(channelId)}/broadcasts/${encodeURIComponent(broadcastId)}`
    );
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
    let response = await this.axios.put(
      `/${encodeURIComponent(channelId)}/broadcasts/${encodeURIComponent(broadcastId)}`,
      data
    );
    return response.data?.data;
  }

  async deleteBroadcast(channelId: string, broadcastId: string) {
    let response = await this.axios.delete(
      `/${encodeURIComponent(channelId)}/broadcasts/${encodeURIComponent(broadcastId)}`
    );
    return response.data?.data;
  }

  async startBroadcast(channelId: string, broadcastId: string, mediaId: string) {
    let response = await this.axios.post(
      `/${encodeURIComponent(channelId)}/broadcasts/${encodeURIComponent(broadcastId)}/start`,
      {
        mediaId
      }
    );
    return response.data?.data;
  }

  async addBroadcastRecipients(channelId: string, broadcastId: string, contactsIds: string[]) {
    let response = await this.axios.post(
      `/${encodeURIComponent(channelId)}/broadcasts/${encodeURIComponent(broadcastId)}/recipients`,
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
      `/${encodeURIComponent(channelId)}/broadcasts/${encodeURIComponent(broadcastId)}/recipients`,
      {
        data: { contactsIds }
      }
    );
    return response.data?.data;
  }

  async getBroadcastRecipients(channelId: string, broadcastId: string) {
    let response = await this.axios.get(
      `/${encodeURIComponent(channelId)}/broadcasts/${encodeURIComponent(broadcastId)}/recipients`
    );
    return response.data?.data;
  }

  // === Chats ===

  async listChats(channelId: string) {
    let response = await this.axios.get(`/${encodeURIComponent(channelId)}/chats`);
    return response.data?.data;
  }

  async getChat(channelId: string, chatId: string) {
    let response = await this.axios.get(
      `/${encodeURIComponent(channelId)}/chats/${encodeURIComponent(chatId)}`
    );
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
    let response = await this.axios.put(
      `/${encodeURIComponent(channelId)}/chats/${encodeURIComponent(chatId)}`,
      data
    );
    return response.data?.data;
  }

  // === Workflows / Automations ===

  async listWorkflows(channelId: string) {
    let response = await this.axios.get(`/${encodeURIComponent(channelId)}/workflows`);
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
    let response = await this.axios.post(
      `/${encodeURIComponent(channelId)}/workflows/${encodeURIComponent(workflowId)}`,
      data
    );
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
