import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios;

  constructor(params: { token: string; apiEndpoint: string }) {
    let endpoint: URL;
    try {
      endpoint = new URL(params.apiEndpoint);
    } catch {
      throw createApiServiceError('Enter a valid Wati API endpoint URL.');
    }
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
      throw createApiServiceError(
        'The Wati API endpoint must be an HTTPS URL without embedded credentials.'
      );
    }
    let token = params.token.trim().replace(/^Bearer\s+/i, '');
    if (!token) {
      throw createApiServiceError('A Wati API token is required.');
    }
    this.axios = createAuthenticatedAxios({
      // V3 resolves the workspace from the token, without a tenant path segment.
      baseURL: endpoint.origin,
      timeout: 30_000,
      maxRedirects: 0,
      authHeader: { value: `Bearer ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Wati',
          reason: 'wati_api_error',
          operation: 'request'
        })
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.result === false || response.data?.success === false) {
        throw createApiServiceError(
          response.data.error || response.data.message || 'Wati rejected the request.'
        );
      }
      return response;
    });
  }

  // ─── Contacts ───

  async listContacts(options: { pageNumber: number; pageSize: number }) {
    let response = await this.axios.get('/api/ext/v3/contacts', {
      params: {
        page_number: options.pageNumber,
        page_size: options.pageSize
      }
    });
    return response.data;
  }

  async getContact(target: string) {
    let response = await this.axios.get(`/api/ext/v3/contacts/${encodeURIComponent(target)}`);
    return response.data;
  }

  async createContact(data: {
    whatsappNumber: string;
    name: string;
    customParams?: Array<{ name: string; value: string }>;
  }) {
    let response = await this.axios.post('/api/ext/v3/contacts', {
      whatsapp_number: data.whatsappNumber,
      name: data.name,
      custom_params: data.customParams
    });
    return response.data;
  }

  async updateContacts(
    contacts: Array<{
      target: string;
      customParams?: Array<{ name: string; value: string }>;
    }>
  ) {
    let response = await this.axios.put('/api/ext/v3/contacts', {
      contacts: contacts.map(c => ({
        target: c.target,
        customParams: c.customParams
      }))
    });
    return response.data;
  }

  async assignContactToTeams(target: string, teamIds: string[]) {
    let response = await this.axios.put('/api/ext/v3/contacts/teams', {
      target,
      teams: teamIds
    });
    return response.data;
  }

  async getContactCount(options: { dateFrom?: string; dateTo?: string } = {}) {
    let response = await this.axios.get('/api/ext/v3/contacts/count', {
      params: { date_from: options.dateFrom, date_to: options.dateTo }
    });
    return response.data;
  }

  // ─── Conversations / Messaging ───

  async getMessages(target: string, options: { pageNumber: number; pageSize: number }) {
    let response = await this.axios.get(
      `/api/ext/v3/conversations/${encodeURIComponent(target)}/messages`,
      {
        params: {
          page_number: options.pageNumber,
          page_size: options.pageSize
        }
      }
    );
    return response.data;
  }

  async sendTextMessage(target: string, messageText: string) {
    let response = await this.axios.post('/api/ext/v3/conversations/messages/text', {
      target,
      text: messageText
    });
    return response.data;
  }

  async sendFileViaUrl(target: string, fileUrl: string, caption?: string) {
    let response = await this.axios.post('/api/ext/v3/conversations/messages/fileViaUrl', {
      target,
      file_url: fileUrl,
      caption
    });
    return response.data;
  }

  async sendInteractiveMessage(target: string, interactiveMessage: Record<string, unknown>) {
    let response = await this.axios.post('/api/ext/v3/conversations/messages/interactive', {
      target,
      interactive_message: interactiveMessage
    });
    return response.data;
  }

  async getMediaByMessageId(messageId: string) {
    let response = await this.axios.get(
      `/api/ext/v3/conversations/messages/file/${encodeURIComponent(messageId)}`
    );
    return response.data;
  }

  async assignOperator(target: string, operatorEmail: string) {
    let response = await this.axios.put(
      `/api/ext/v3/conversations/${encodeURIComponent(target)}/operator`,
      {
        assignee_email: operatorEmail
      }
    );
    return response.data;
  }

  async updateConversationStatus(target: string, status: string) {
    let response = await this.axios.put(
      `/api/ext/v3/conversations/${encodeURIComponent(target)}/status`,
      {
        new_status: status
      }
    );
    return response.data;
  }

  // ─── Template Messages ───

  async listTemplates(options: { pageNumber: number; pageSize: number; channel?: string }) {
    let response = await this.axios.get('/api/ext/v3/messageTemplates', {
      params: {
        page_number: options.pageNumber,
        page_size: options.pageSize,
        channel: options.channel
      }
    });
    return response.data;
  }

  async getTemplate(templateId: string) {
    let response = await this.axios.get(
      `/api/ext/v3/messageTemplates/${encodeURIComponent(templateId)}`
    );
    return response.data;
  }

  async sendTemplateMessage(data: {
    templateName: string;
    broadcastName: string;
    phoneNumber: string;
    customParams?: Array<{ name: string; value: string }>;
    channel?: string;
  }) {
    let response = await this.axios.post('/api/ext/v3/messageTemplates/send', {
      template_name: data.templateName,
      broadcast_name: data.broadcastName,
      recipients: [{ phone_number: data.phoneNumber, custom_params: data.customParams }],
      channel: data.channel
    });
    return response.data;
  }

  async scheduleTemplateMessage(data: {
    templateName: string;
    broadcastName: string;
    phoneNumber: string;
    scheduledAt: string;
    customParams?: Array<{ name: string; value: string }>;
    channel?: string;
  }) {
    let response = await this.axios.post('/api/ext/v3/messageTemplates/schedule', {
      template_name: data.templateName,
      broadcast_name: data.broadcastName,
      scheduled_at: data.scheduledAt,
      recipients: [{ phone_number: data.phoneNumber, custom_params: data.customParams }],
      channel: data.channel
    });
    return response.data;
  }

  // ─── Campaigns (Broadcasts) ───

  async listCampaigns(options: { pageNumber: number; pageSize: number; channel?: string }) {
    let response = await this.axios.get('/api/ext/v3/broadcasts', {
      params: {
        page_number: options.pageNumber,
        page_size: options.pageSize,
        channel: options.channel
      }
    });
    return response.data;
  }

  async getCampaign(campaignId: string) {
    let response = await this.axios.get(
      `/api/ext/v3/broadcasts/${encodeURIComponent(campaignId)}`
    );
    return response.data;
  }

  async getCampaignRecipients(campaignId: string) {
    let response = await this.axios.get(
      `/api/ext/v3/broadcasts/${encodeURIComponent(campaignId)}/recipients`
    );
    return response.data;
  }

  async getCampaignOverview() {
    let response = await this.axios.get('/api/ext/v3/broadcasts/overview');
    return response.data;
  }

  // ─── Channels ───

  async listChannels(options: { pageNumber: number; pageSize: number }) {
    let response = await this.axios.get('/api/ext/v3/channels', {
      params: {
        page_number: options.pageNumber,
        page_size: options.pageSize
      }
    });
    return response.data;
  }

  // ─── Chatbots ───

  async listChatbots(options: { pageNumber: number; pageSize: number }) {
    let response = await this.axios.get('/api/ext/v3/chatbots', {
      params: {
        page_number: options.pageNumber,
        page_size: options.pageSize
      }
    });
    return response.data;
  }

  async startChatbot(chatbotId: string, target: string) {
    let response = await this.axios.post('/api/ext/v3/chatbots/start', {
      chatbot_id: chatbotId,
      target
    });
    return response.data;
  }

  // ─── Sales Analytics ───

  async getSalesPipeline(data?: Record<string, unknown>) {
    let response = await this.axios.post('/api/ext/v3/salesanalytics/pipeline', data || {});
    return response.data;
  }

  async getLeadStages() {
    let response = await this.axios.get('/api/ext/v3/salesanalytics/leadstages');
    return response.data;
  }

  // ─── Webhooks ───

  async createWebhook(data: { url: string; eventTypes: string[]; phoneNumber?: string }) {
    let response = await this.axios.post('/api/v2/webhookEndpoints', [
      {
        url: data.url,
        eventTypes: data.eventTypes,
        status: 1,
        phoneNumber: data.phoneNumber || ''
      }
    ]);
    return response.data;
  }
}
