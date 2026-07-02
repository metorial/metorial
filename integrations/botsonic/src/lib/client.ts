import { createAxios } from 'slates';

export interface PaginationParams {
  page?: number;
  size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface BotOutput {
  id: string;
  owner_id: string;
  vectorstore_index_id: string;
  is_deleted: boolean;
  is_shared: boolean;
  vectorstore: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  bot_info_config: Record<string, any>;
  bot_prompt_config: Record<string, any>;
  bot_template_id: string;
  is_sample_bot?: boolean;
  migration_status?: string;
}

export interface BotDataOutput {
  id: string;
  bot_id: string;
  url: string;
  title: string;
  file_type: string;
  is_private: boolean;
  error_reason: string;
  status: string;
  sitemap_id: string;
  characters: number;
  is_paused: boolean;
  last_trained_at: string;
  is_deleted: boolean;
  migration_status: string;
  created_at: string;
  updated_at: string;
}

export interface FaqOutput {
  id: string;
  bot_id: string;
  question: string;
  answer: string;
  error_reason: string;
  status: string;
  characters: number;
  migration_status: string;
  created_at: string;
  updated_at: string;
}

export interface StarterQuestionOutput {
  id: string;
  bot_id: string;
  question: string;
  answer: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationOutput {
  chat_id: string;
  bot_id: string;
  owner_id: string;
  num_messages: number;
  chat_data: any[];
  created_at: string;
  updated_at: string;
}

export interface ConversationDetailOutput extends ConversationOutput {
  ip_address?: string;
  chat_user?: Record<string, any>;
  source?: string;
  is_resolved?: boolean;
  chat_ended?: boolean;
  additional_feedback?: string;
}

export interface GenerateResponseOutput {
  answer: string;
  message_id: string;
  sources: any[];
  chat_history: any[];
  generated_images: any[];
  follow_up_questions: any[];
  human_handoff_status: boolean;
  user_options: any[];
  chat_ended: boolean;
  end_chat_feedback: string;
}

export class BusinessClient {
  private http;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.botsonic.ai/v1/business',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        api_key_header_auth: token
      }
    });
  }

  // --- Response Generation ---

  async generateResponse(params: {
    inputText: string;
    chatId: string;
    chatHistory?: any[];
    responseType?: string;
    source?: string;
    starterQuestionId?: string;
    fullHistory?: boolean;
  }): Promise<GenerateResponseOutput> {
    let response = await this.http.post('/botsonic', {
      input_text: params.inputText,
      chat_id: params.chatId,
      chat_history: params.chatHistory,
      response_type: params.responseType,
      source: params.source,
      starter_question_id: params.starterQuestionId,
      full_history: params.fullHistory
    });
    return response.data;
  }

  // --- Bot Management ---

  async listBots(
    params?: PaginationParams & {
      searchQuery?: string;
      sortBy?: string;
      sortOrder?: string;
      workspaceId?: string;
    }
  ): Promise<PaginatedResponse<BotOutput>> {
    let response = await this.http.get('/bot/all', {
      params: {
        search_query: params?.searchQuery,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder,
        workspace_id: params?.workspaceId,
        page: params?.page,
        size: params?.size
      }
    });
    return response.data;
  }

  async getBot(botId: string, workspaceId?: string): Promise<BotOutput> {
    let response = await this.http.get(`/bot/${botId}`, {
      params: { workspace_id: workspaceId }
    });
    return response.data;
  }

  async createBot(params: Record<string, any>): Promise<BotOutput> {
    let response = await this.http.post('/bot', params);
    return response.data;
  }

  async deleteBot(botId: string, workspaceId?: string): Promise<BotOutput> {
    let response = await this.http.delete(`/bot/${botId}`, {
      params: { workspace_id: workspaceId }
    });
    return response.data;
  }

  async getBotApiKey(botId: string): Promise<any> {
    let response = await this.http.get(`/bot/${botId}/bot-api-key`);
    return response.data;
  }

  // --- Training Data Management ---

  async listBotData(
    params?: PaginationParams & {
      searchQuery?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<PaginatedResponse<BotDataOutput>> {
    let response = await this.http.get('/bot-data/all', {
      params: {
        search_query: params?.searchQuery,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder,
        page: params?.page,
        size: params?.size
      }
    });
    return response.data;
  }

  async uploadFile(params: {
    id: string;
    botId: string;
    fileUrl: string;
    fileName?: string;
  }): Promise<any> {
    let response = await this.http.post('/bot-data/upload-file', {
      id: params.id,
      bot_id: params.botId,
      file_url: params.fileUrl,
      file_name: params.fileName
    });
    return response.data;
  }

  async uploadText(params: {
    id: string;
    botId: string;
    text: string;
    title?: string;
  }): Promise<any> {
    let response = await this.http.post('/bot-data/upload-text', {
      id: params.id,
      bot_id: params.botId,
      text: params.text,
      title: params.title
    });
    return response.data;
  }

  async bulkUploadUrls(params: {
    urls: string[];
    sitemapId?: string;
    isSitemap?: boolean;
    sitemapRoot?: string;
  }): Promise<any> {
    let response = await this.http.post('/bot-data/bulk-upsert-urls', {
      urls: params.urls,
      sitemap_id: params.sitemapId,
      is_sitemap: params.isSitemap,
      sitemap_root: params.sitemapRoot
    });
    return response.data;
  }

  async deleteBotData(dataId: string): Promise<BotDataOutput> {
    let response = await this.http.delete(`/bot-data/${dataId}`);
    return response.data;
  }

  // --- FAQ Management ---

  async listFaqs(
    params?: PaginationParams & {
      searchQuery?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<PaginatedResponse<FaqOutput>> {
    let response = await this.http.get('/bot-faq/all', {
      params: {
        search_query: params?.searchQuery,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder,
        page: params?.page,
        size: params?.size
      }
    });
    return response.data;
  }

  async createFaq(params: { question: string; answer: string }): Promise<FaqOutput> {
    let response = await this.http.post('/bot-faq', params);
    return response.data;
  }

  async deleteFaq(faqId: string): Promise<any> {
    let response = await this.http.delete(`/bot-faq/${faqId}`);
    return response.data;
  }

  // --- Starter Questions ---

  async listStarterQuestions(
    params?: PaginationParams & {
      searchQuery?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<PaginatedResponse<StarterQuestionOutput>> {
    let response = await this.http.get('/bot-starter-questions/all', {
      params: {
        search_query: params?.searchQuery,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder,
        page: params?.page,
        size: params?.size
      }
    });
    return response.data;
  }

  async createStarterQuestion(params: {
    question: string;
    answer: string;
    order?: number;
  }): Promise<StarterQuestionOutput> {
    let response = await this.http.post('/bot-starter-questions', params);
    return response.data;
  }

  async updateStarterQuestion(
    starterQuestionId: string,
    params: {
      question?: string;
      answer?: string;
      order?: number;
    }
  ): Promise<StarterQuestionOutput> {
    let response = await this.http.patch(
      `/bot-starter-questions/${starterQuestionId}`,
      params
    );
    return response.data;
  }

  async deleteStarterQuestion(starterQuestionId: string): Promise<any> {
    let response = await this.http.delete(`/bot-starter-questions/${starterQuestionId}`);
    return response.data;
  }

  async listStarterPresets(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let response = await this.http.get('/bot-starter-presets/all', {
      params: {
        page: params?.page,
        size: params?.size
      }
    });
    return response.data;
  }

  // --- Conversation History ---

  async listConversations(
    params?: PaginationParams & {
      searchQuery?: string;
      sortBy?: string;
      sortOrder?: string;
      updatedAfter?: string;
      updatedBefore?: string;
    }
  ): Promise<PaginatedResponse<ConversationOutput>> {
    let response = await this.http.get('/bot-data/conversations/all', {
      params: {
        search_query: params?.searchQuery,
        sort_by: params?.sortBy,
        sort_order: params?.sortOrder,
        updated_after: params?.updatedAfter,
        updated_before: params?.updatedBefore,
        page: params?.page,
        size: params?.size
      }
    });
    return response.data;
  }

  async getConversation(chatId: string): Promise<ConversationDetailOutput> {
    let response = await this.http.get(`/bot-data/conversations/${chatId}`);
    return response.data;
  }

  async endChat(
    chatId: string,
    params?: {
      status?: string;
      feedback?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/bot-data/conversations/${chatId}/end-chat`, {
      status: params?.status || 'none',
      feedback: params?.feedback
    });
    return response.data;
  }
}
