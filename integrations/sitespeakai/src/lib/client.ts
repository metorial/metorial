import { createAxios } from 'slates';

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get axios() {
    return createAxios({
      baseURL: 'https://api.sitespeak.ai/v1',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ── User & Account ──

  async getMe() {
    let response = await this.axios.get('/me');
    return response.data.user ?? response.data;
  }

  async listChatbots() {
    let response = await this.axios.get('/me/chatbots');
    return response.data;
  }

  // ── Chatbot Settings ──

  async getChatbotSettings(chatbotId: string) {
    let response = await this.axios.get(`/${chatbotId}`);
    return response.data;
  }

  // ── Query ──

  async queryChatbot(
    chatbotId: string,
    params: {
      prompt: string;
      conversationId?: string;
      format?: 'html' | 'markdown';
    }
  ) {
    let response = await this.axios.post(`/${chatbotId}/query`, {
      prompt: params.prompt,
      conversation_id: params.conversationId,
      format: params.format
    });
    return response.data;
  }

  // ── Conversations ──

  async getConversations(
    chatbotId: string,
    params?: {
      conversationId?: string;
      includeDeleted?: boolean;
      includeSources?: boolean;
      limit?: number;
      order?: 'asc' | 'desc';
    }
  ) {
    let queryParams: Record<string, string> = {};

    if (params?.conversationId) queryParams.conversation_id = params.conversationId;
    if (params?.includeDeleted !== undefined)
      queryParams.include_deleted = String(params.includeDeleted);
    if (params?.includeSources !== undefined)
      queryParams.include_sources = String(params.includeSources);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.order) queryParams.order = params.order;

    let response = await this.axios.get(`/${chatbotId}/conversations`, {
      params: queryParams
    });
    return response.data;
  }

  // ── Leads ──

  async getLeads(chatbotId: string) {
    let response = await this.axios.get(`/${chatbotId}/leads`);
    return response.data;
  }

  // ── Updated Answers (Finetunes) ──

  async getUpdatedAnswers(chatbotId: string) {
    let response = await this.axios.get(`/${chatbotId}/finetunes`);
    return response.data;
  }

  async createUpdatedAnswer(
    chatbotId: string,
    params: {
      question: string;
      suggestedAnswer: string;
    }
  ) {
    let response = await this.axios.post(`/${chatbotId}/finetunes`, {
      question: params.question,
      suggested_answer: params.suggestedAnswer
    });
    return response.data;
  }

  async deleteUpdatedAnswer(chatbotId: string, finetuneId: string) {
    let response = await this.axios.delete(`/${chatbotId}/finetunes/${finetuneId}`);
    return response.data;
  }

  // ── Suggested Messages (Prompts) ──

  async getSuggestedMessages(chatbotId: string) {
    let response = await this.axios.get(`/${chatbotId}/prompts`);
    return response.data;
  }

  // ── Sources ──

  async getSources(chatbotId: string) {
    let response = await this.axios.get(`/${chatbotId}/sources`);
    return response.data;
  }
}
