import { createAxios } from 'slates';
import { encodeFormBody } from './client';

export class ConversationsClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://conversations.twilio.com/v1',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  // Conversations
  async listConversations(pageSize?: number): Promise<any> {
    let response = await this.axios.get('/Conversations', {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getConversation(conversationSid: string): Promise<any> {
    let response = await this.axios.get(`/Conversations/${conversationSid}`);
    return response.data;
  }

  async createConversation(params: Record<string, string | undefined>): Promise<any> {
    let response = await this.axios.post('/Conversations', encodeFormBody(params));
    return response.data;
  }

  async updateConversation(
    conversationSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Conversations/${conversationSid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteConversation(conversationSid: string): Promise<void> {
    await this.axios.delete(`/Conversations/${conversationSid}`);
  }

  // Participants
  async listParticipants(conversationSid: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`/Conversations/${conversationSid}/Participants`, {
      params: { PageSize: pageSize || 50 }
    });
    return response.data;
  }

  async getParticipant(conversationSid: string, participantSid: string): Promise<any> {
    let response = await this.axios.get(
      `/Conversations/${conversationSid}/Participants/${participantSid}`
    );
    return response.data;
  }

  async addParticipant(
    conversationSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Conversations/${conversationSid}/Participants`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async updateParticipant(
    conversationSid: string,
    participantSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Conversations/${conversationSid}/Participants/${participantSid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async removeParticipant(conversationSid: string, participantSid: string): Promise<void> {
    await this.axios.delete(
      `/Conversations/${conversationSid}/Participants/${participantSid}`
    );
  }

  // Messages
  async listMessages(
    conversationSid: string,
    pageSize?: number,
    order?: string
  ): Promise<any> {
    let response = await this.axios.get(`/Conversations/${conversationSid}/Messages`, {
      params: { PageSize: pageSize || 50, Order: order }
    });
    return response.data;
  }

  async getMessage(conversationSid: string, messageSid: string): Promise<any> {
    let response = await this.axios.get(
      `/Conversations/${conversationSid}/Messages/${messageSid}`
    );
    return response.data;
  }

  async sendMessage(
    conversationSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Conversations/${conversationSid}/Messages`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async updateMessage(
    conversationSid: string,
    messageSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Conversations/${conversationSid}/Messages/${messageSid}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteMessage(conversationSid: string, messageSid: string): Promise<void> {
    await this.axios.delete(`/Conversations/${conversationSid}/Messages/${messageSid}`);
  }

  // Webhooks
  async listWebhooks(conversationSid: string): Promise<any> {
    let response = await this.axios.get(`/Conversations/${conversationSid}/Webhooks`);
    return response.data;
  }

  async createWebhook(
    conversationSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Conversations/${conversationSid}/Webhooks`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteWebhook(conversationSid: string, webhookSid: string): Promise<void> {
    await this.axios.delete(`/Conversations/${conversationSid}/Webhooks/${webhookSid}`);
  }
}
