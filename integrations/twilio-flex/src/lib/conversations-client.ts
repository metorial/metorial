import { encodeFormBody } from './client';
import { createTwilioAxios } from './http';
import { pathId } from './validation';

export class ConversationsClient {
  private axios: ReturnType<typeof createTwilioAxios>;

  constructor(token: string, accountSid?: string, pageToken?: string) {
    this.axios = createTwilioAxios('conversations', token, accountSid, pageToken);
  }

  private async conversationId(value: string): Promise<string> {
    if (/^CH[0-9a-fA-F]{32}$/.test(value)) return pathId(value);
    const resolved = await this.axios.get(`/Conversations/${pathId(value)}`);
    return pathId(resolved.data.sid);
  }

  // Conversations
  async listConversations(pageSize?: number): Promise<any> {
    let response = await this.axios.get('/Conversations', {
      params: { PageSize: pageSize ?? 50 }
    });
    return response.data;
  }

  async getConversation(conversationSid: string): Promise<any> {
    let response = await this.axios.get(`/Conversations/${pathId(conversationSid)}`);
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
      `/Conversations/${pathId(conversationSid)}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteConversation(conversationSid: string): Promise<void> {
    await this.axios.delete(`/Conversations/${pathId(conversationSid)}`);
  }

  // Participants
  async listParticipants(conversationSid: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(
      `/Conversations/${await this.conversationId(conversationSid)}/Participants`,
      {
        params: { PageSize: pageSize ?? 50 }
      }
    );
    return response.data;
  }

  async getParticipant(conversationSid: string, participantSid: string): Promise<any> {
    let response = await this.axios.get(
      `/Conversations/${await this.conversationId(conversationSid)}/Participants/${pathId(participantSid)}`
    );
    return response.data;
  }

  async addParticipant(
    conversationSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Conversations/${await this.conversationId(conversationSid)}/Participants`,
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
      `/Conversations/${await this.conversationId(conversationSid)}/Participants/${pathId(participantSid)}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async removeParticipant(conversationSid: string, participantSid: string): Promise<void> {
    await this.axios.delete(
      `/Conversations/${await this.conversationId(conversationSid)}/Participants/${pathId(participantSid)}`
    );
  }

  // Messages
  async listMessages(
    conversationSid: string,
    pageSize?: number,
    order?: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/Conversations/${await this.conversationId(conversationSid)}/Messages`,
      {
        params: { PageSize: pageSize ?? 50, Order: order }
      }
    );
    return response.data;
  }

  async getMessage(conversationSid: string, messageSid: string): Promise<any> {
    let response = await this.axios.get(
      `/Conversations/${await this.conversationId(conversationSid)}/Messages/${pathId(messageSid)}`
    );
    return response.data;
  }

  async sendMessage(
    conversationSid: string,
    params: Record<string, string | undefined>
  ): Promise<any> {
    let response = await this.axios.post(
      `/Conversations/${await this.conversationId(conversationSid)}/Messages`,
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
      `/Conversations/${await this.conversationId(conversationSid)}/Messages/${pathId(messageSid)}`,
      encodeFormBody(params)
    );
    return response.data;
  }

  async deleteMessage(conversationSid: string, messageSid: string): Promise<void> {
    await this.axios.delete(
      `/Conversations/${await this.conversationId(conversationSid)}/Messages/${pathId(messageSid)}`
    );
  }
}
