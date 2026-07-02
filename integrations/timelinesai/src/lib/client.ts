import { createAxios } from 'slates';

let BASE_URL = 'https://app.timelines.ai/integrations/api';

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get axios() {
    return createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Chats ---

  async getChats(
    params: {
      label?: string;
      whatsappAccountId?: string;
      group?: boolean;
      responsible?: string;
      name?: string;
      phone?: string;
      read?: boolean;
      closed?: boolean;
      page?: number;
      createdAfter?: string;
      createdBefore?: string;
    } = {}
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params.label) query.label = params.label;
    if (params.whatsappAccountId) query.whatsapp_account_id = params.whatsappAccountId;
    if (params.group !== undefined) query.group = params.group;
    if (params.responsible) query.responsible = params.responsible;
    if (params.name) query.name = params.name;
    if (params.phone) query.phone = params.phone;
    if (params.read !== undefined) query.read = params.read;
    if (params.closed !== undefined) query.closed = params.closed;
    if (params.page) query.page = params.page;
    if (params.createdAfter) query.created_after = params.createdAfter;
    if (params.createdBefore) query.created_before = params.createdBefore;

    let response = await this.axios.get('/chats', { params: query });
    return response.data;
  }

  async getChat(chatId: number): Promise<any> {
    let response = await this.axios.get(`/chats/${chatId}`);
    return response.data;
  }

  async updateChat(
    chatId: number,
    data: {
      name?: string;
      responsible?: string;
      closed?: boolean;
      read?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/chats/${chatId}`, data);
    return response.data;
  }

  // --- Messages ---

  async getChatMessages(
    chatId: number,
    params: {
      fromMe?: boolean;
      after?: string;
      before?: string;
      afterMessage?: string;
      beforeMessage?: string;
      sortingOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params.fromMe !== undefined) query.from_me = params.fromMe;
    if (params.after) query.after = params.after;
    if (params.before) query.before = params.before;
    if (params.afterMessage) query.after_message = params.afterMessage;
    if (params.beforeMessage) query.before_message = params.beforeMessage;
    if (params.sortingOrder) query.sorting_order = params.sortingOrder;

    let response = await this.axios.get(`/chats/${chatId}/messages`, { params: query });
    return response.data;
  }

  async sendMessageToPhone(data: {
    phone: string;
    whatsappAccountPhone?: string;
    text?: string;
    fileUid?: string;
    label?: string;
  }): Promise<any> {
    let body: Record<string, any> = { phone: data.phone };
    if (data.whatsappAccountPhone) body.whatsapp_account_phone = data.whatsappAccountPhone;
    if (data.text) body.text = data.text;
    if (data.fileUid) body.file_uid = data.fileUid;
    if (data.label) body.label = data.label;

    let response = await this.axios.post('/messages', body);
    return response.data;
  }

  async sendMessageToChat(
    chatId: number,
    data: {
      text?: string;
      fileUid?: string;
      label?: string;
      replyTo?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.text) body.text = data.text;
    if (data.fileUid) body.file_uid = data.fileUid;
    if (data.label) body.label = data.label;
    if (data.replyTo) body.reply_to = data.replyTo;

    let response = await this.axios.post(`/chats/${chatId}/messages`, body);
    return response.data;
  }

  async sendMessageToJid(data: {
    jid: string;
    whatsappAccountPhone?: string;
    text?: string;
    fileUid?: string;
    label?: string;
    replyTo?: string;
  }): Promise<any> {
    let body: Record<string, any> = { jid: data.jid };
    if (data.whatsappAccountPhone) body.whatsapp_account_phone = data.whatsappAccountPhone;
    if (data.text) body.text = data.text;
    if (data.fileUid) body.file_uid = data.fileUid;
    if (data.label) body.label = data.label;
    if (data.replyTo) body.reply_to = data.replyTo;

    let response = await this.axios.post('/messages/to_jid', body);
    return response.data;
  }

  async sendMessageToChatName(data: {
    chatName: string;
    whatsappAccountPhone?: string;
    text?: string;
    fileUid?: string;
    replyTo?: string;
  }): Promise<any> {
    let body: Record<string, any> = { chat_name: data.chatName };
    if (data.whatsappAccountPhone) body.whatsapp_account_phone = data.whatsappAccountPhone;
    if (data.text) body.text = data.text;
    if (data.fileUid) body.file_uid = data.fileUid;
    if (data.replyTo) body.reply_to = data.replyTo;

    let response = await this.axios.post('/messages/to_chat_name', body);
    return response.data;
  }

  async getMessage(messageUid: string): Promise<any> {
    let response = await this.axios.get(`/messages/${messageUid}`);
    return response.data;
  }

  async getMessageStatusHistory(messageUid: string): Promise<any> {
    let response = await this.axios.get(`/messages/${messageUid}/status_history`);
    return response.data;
  }

  // --- Labels ---

  async getChatLabels(chatId: number): Promise<any> {
    let response = await this.axios.get(`/chats/${chatId}/labels`);
    return response.data;
  }

  async replaceChatLabels(chatId: number, labels: string[]): Promise<any> {
    let response = await this.axios.post(`/chats/${chatId}/labels`, { labels });
    return response.data;
  }

  async addChatLabels(chatId: number, labels: string[]): Promise<any> {
    let response = await this.axios.put(`/chats/${chatId}/labels`, { labels });
    return response.data;
  }

  // --- Notes ---

  async addChatNote(
    chatId: number,
    data: {
      text: string;
      isPrivate?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = { text: data.text };
    if (data.isPrivate !== undefined) body.is_private = data.isPrivate;

    let response = await this.axios.post(`/chats/${chatId}/notes`, body);
    return response.data;
  }

  // --- Files ---

  async listFiles(filename?: string): Promise<any> {
    let params: Record<string, any> = {};
    if (filename) params.filename = filename;

    let response = await this.axios.get('/files', { params });
    return response.data;
  }

  async uploadFileFromUrl(data: {
    downloadUrl: string;
    filename?: string;
    contentType?: string;
  }): Promise<any> {
    let body: Record<string, any> = { download_url: data.downloadUrl };
    if (data.filename) body.filename = data.filename;
    if (data.contentType) body.content_type = data.contentType;

    let response = await this.axios.post('/files', body);
    return response.data;
  }

  async getFile(fileUid: string): Promise<any> {
    let response = await this.axios.get(`/files/${fileUid}`);
    return response.data;
  }

  async deleteFile(fileUid: string): Promise<any> {
    let response = await this.axios.delete(`/files/${fileUid}`);
    return response.data;
  }

  // --- WhatsApp Accounts ---

  async getWhatsAppAccounts(): Promise<any> {
    let response = await this.axios.get('/whatsapp_accounts');
    return response.data;
  }

  // --- Workspace ---

  async getWorkspaceTeammates(): Promise<any> {
    let response = await this.axios.get('/workspace/teammates');
    return response.data;
  }

  async getWorkspaceQuotas(): Promise<any> {
    let response = await this.axios.get('/workspace/quotas');
    return response.data;
  }

  // --- Webhooks ---

  async listWebhooks(): Promise<any> {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async createWebhook(data: {
    eventType: string;
    url: string;
    enabled?: boolean;
  }): Promise<any> {
    let body: Record<string, any> = {
      event_type: data.eventType,
      url: data.url
    };
    if (data.enabled !== undefined) body.enabled = data.enabled;

    let response = await this.axios.post('/webhooks', body);
    return response.data;
  }

  async getWebhook(webhookId: number): Promise<any> {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async updateWebhook(
    webhookId: number,
    data: {
      eventType?: string;
      url?: string;
      enabled?: boolean;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.eventType) body.event_type = data.eventType;
    if (data.url) body.url = data.url;
    if (data.enabled !== undefined) body.enabled = data.enabled;

    let response = await this.axios.put(`/webhooks/${webhookId}`, body);
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<any> {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  // --- Reactions ---

  async getMessageReactions(messageUid: string): Promise<any> {
    let response = await this.axios.get(`/messages/${messageUid}/reactions`);
    return response.data;
  }

  async setMessageReaction(messageUid: string, reaction: string): Promise<any> {
    let response = await this.axios.patch(`/messages/${messageUid}/reactions`, { reaction });
    return response.data;
  }
}
