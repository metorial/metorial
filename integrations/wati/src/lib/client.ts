import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(params: { token: string; apiEndpoint: string }) {
    let baseURL = params.apiEndpoint.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
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
      team_ids: teamIds
    });
    return response.data;
  }

  async getContactCount() {
    let response = await this.axios.get('/api/ext/v3/contacts/count');
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
      message_text: messageText
    });
    return response.data;
  }

  async sendFileViaUrl(target: string, fileUrl: string, caption?: string) {
    let response = await this.axios.post('/api/ext/v3/conversations/messages/fileViaUrl', {
      target,
      fileUrl,
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
        email: operatorEmail
      }
    );
    return response.data;
  }

  async updateConversationStatus(target: string, status: string) {
    let response = await this.axios.put(
      `/api/ext/v3/conversations/${encodeURIComponent(target)}/status`,
      {
        status
      }
    );
    return response.data;
  }

  // ─── Template Messages ───

  async listTemplates() {
    let response = await this.axios.get('/api/ext/v3/messageTemplates');
    return response.data;
  }

  async getTemplate(templateId: string) {
    let response = await this.axios.get(
      `/api/ext/v3/messageTemplates/${encodeURIComponent(templateId)}`
    );
    return response.data;
  }

  async sendTemplateMessage(data: {
    templateId: string;
    target: string;
    customParams?: Array<{ name: string; value: string }>;
    channel?: string;
  }) {
    let response = await this.axios.post('/api/ext/v3/messageTemplates/send', {
      template_id: data.templateId,
      target: data.target,
      custom_params: data.customParams,
      channel: data.channel
    });
    return response.data;
  }

  async scheduleTemplateMessage(data: {
    templateId: string;
    target: string;
    scheduledAt: string;
    customParams?: Array<{ name: string; value: string }>;
    channel?: string;
  }) {
    let response = await this.axios.post('/api/ext/v3/messageTemplates/schedule', {
      template_id: data.templateId,
      target: data.target,
      scheduled_at: data.scheduledAt,
      custom_params: data.customParams,
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
