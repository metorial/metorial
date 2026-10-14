import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

let recordSchema = z.record(z.string(), z.any());
let recordsSchema = z.array(recordSchema);

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Connect a SiteSpeakAI API token before making a request.');
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.sitespeak.ai/v1',
      authHeader: { value: `Bearer ${config.token}` },
      headers: {
        Accept: 'application/json'
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'SiteSpeakAI',
          reason: 'sitespeakai_api_error'
        })
    });
  }

  private parseResponse<T extends z.ZodType>(schema: T, data: unknown, operation: string) {
    let result = schema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError(`SiteSpeakAI returned an invalid ${operation} response.`, {
        reason: 'sitespeakai_invalid_response'
      });
    }
    return result.data;
  }

  async getMe() {
    let response = await this.axios.get('/me');
    let data = this.parseResponse(recordSchema, response.data, 'account');
    return this.parseResponse(recordSchema, data.user ?? data, 'account');
  }

  async listChatbots() {
    let response = await this.axios.get('/me/chatbots');
    return this.parseResponse(recordsSchema, response.data, 'chatbot list');
  }

  async getChatbotSettings(chatbotId: string) {
    let response = await this.axios.get(`/${encodeURIComponent(chatbotId)}`);
    return this.parseResponse(recordSchema, response.data, 'chatbot settings');
  }

  async queryChatbot(
    chatbotId: string,
    params: {
      prompt: string;
      conversationId?: string;
      format?: 'html' | 'markdown';
    }
  ) {
    let response = await this.axios.post(
      `/${encodeURIComponent(chatbotId)}/query`,
      pickDefined({
        prompt: params.prompt,
        conversation_id: params.conversationId,
        format: params.format
      })
    );
    return this.parseResponse(recordSchema, response.data, 'chatbot query');
  }

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
    if (params?.limit !== undefined && !Number.isInteger(params.limit)) {
      throw createApiServiceError('The conversation limit must be a whole number.');
    }

    let response = await this.axios.get(`/${encodeURIComponent(chatbotId)}/conversations`, {
      params: pickDefined({
        conversation_id: params?.conversationId,
        include_deleted: params?.includeDeleted,
        include_sources: params?.includeSources,
        limit: params?.limit,
        order: params?.order
      })
    });
    return this.parseResponse(recordsSchema, response.data, 'conversation history');
  }

  async getLeads(chatbotId: string) {
    let response = await this.axios.get(`/${encodeURIComponent(chatbotId)}/leads`);
    return this.parseResponse(recordsSchema, response.data, 'lead list');
  }

  async getUpdatedAnswers(chatbotId: string) {
    let response = await this.axios.get(`/${encodeURIComponent(chatbotId)}/finetunes`);
    return this.parseResponse(recordsSchema, response.data, 'updated answer list');
  }

  async createUpdatedAnswer(
    chatbotId: string,
    params: {
      question: string;
      suggestedAnswer: string;
    }
  ) {
    let response = await this.axios.post(`/${encodeURIComponent(chatbotId)}/finetunes`, {
      question: params.question,
      suggested_answer: params.suggestedAnswer
    });
    let data = this.parseResponse(recordSchema, response.data, 'updated answer');
    if (data.finetune !== undefined) {
      this.parseResponse(recordSchema, data.finetune, 'updated answer');
    }
    return data;
  }

  async deleteUpdatedAnswer(chatbotId: string, finetuneId: string) {
    let response = await this.axios.delete(
      `/${encodeURIComponent(chatbotId)}/finetunes/${encodeURIComponent(finetuneId)}`
    );
    return this.parseResponse(recordSchema, response.data, 'updated answer deletion');
  }

  async getSuggestedMessages(chatbotId: string) {
    let response = await this.axios.get(`/${encodeURIComponent(chatbotId)}/prompts`);
    return this.parseResponse(recordsSchema, response.data, 'suggested message list');
  }

  async getSources(chatbotId: string) {
    let response = await this.axios.get(`/${encodeURIComponent(chatbotId)}/sources`);
    return this.parseResponse(recordsSchema, response.data, 'source list');
  }

  async getAnalytics(chatbotId: string, params: { from?: string; to?: string }) {
    let response = await this.axios.get(`/${encodeURIComponent(chatbotId)}/analytics`, {
      params: pickDefined(params)
    });
    return this.parseResponse(recordSchema, response.data, 'analytics');
  }
}
