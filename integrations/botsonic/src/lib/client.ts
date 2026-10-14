import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface PaginationParams {
  page?: number;
  size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  size?: number;
  pages?: number;
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
  message_id?: string;
  sources: any[];
  chat_history: any[];
  generated_images: any[];
  follow_up_questions: any[];
  human_handoff_status: boolean;
  user_options: any[];
  chat_ended: boolean;
  end_chat_feedback: string;
}

export interface BotApiOutput {
  id: string;
  bot_id: string;
  token: string;
  bot_api_type: string;
  end_user_rate_limit: number;
  created_at: string;
  updated_at: string;
}

export interface StarterPresetsOutput {
  starter_questions: StarterQuestionOutput[];
  welcome_message: string;
}

export class BusinessClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private botToken?: string;

  constructor(
    private token: string,
    private credentialType?: 'account' | 'bot',
    private botId?: string,
    private workspaceId?: string
  ) {
    if (!token.trim()) {
      throw createApiServiceError(
        'Botsonic API credentials are missing. Reconnect the account.',
        {
          reason: 'missing_credentials'
        }
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.botsonic.ai/v1/business',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'USER-API-KEY': token
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Botsonic',
          reason: 'botsonic_api_error'
        })
    });
  }

  private ensureAccountKey() {
    if (this.credentialType === 'bot') {
      throw createApiServiceError(
        'This operation needs an account API Secret Key connection.',
        {
          reason: 'account_key_required'
        }
      );
    }
  }

  private async botHeaders() {
    if (this.credentialType === 'bot' || (!this.credentialType && !this.botId)) {
      // Older connections did not persist a credential type; preserve bot-token callers.
      return { 'USER-API-KEY': undefined, 'X-BOT-KEY': this.token };
    }
    if (!this.botId) {
      throw createApiServiceError(
        'Provide botId from list_bots, or use a Bot API Token connection.',
        {
          reason: 'bot_id_required'
        }
      );
    }
    if (!this.botToken) {
      let result = await this.getBotApiKey(this.botId, this.workspaceId);
      if (!result.token) {
        throw createApiServiceError('Botsonic did not return an API token for this bot.', {
          reason: 'missing_bot_token'
        });
      }
      this.botToken = result.token;
    }
    return { 'USER-API-KEY': undefined, 'X-BOT-KEY': this.botToken };
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
    let response = await this.http.post(
      '/botsonic',
      {
        input_text: params.inputText,
        chat_id: params.chatId,
        chat_history: params.chatHistory,
        response_type: params.responseType,
        source: params.source,
        starter_question_id: params.starterQuestionId,
        full_history: params.fullHistory
      },
      { headers: await this.botHeaders(), params: { stream: false } }
    );
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
    this.ensureAccountKey();
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
    this.ensureAccountKey();
    let response = await this.http.get(`/bot/${encodeURIComponent(botId)}`, {
      params: { workspace_id: workspaceId }
    });
    return response.data;
  }

  async createBot(params: {
    bot_name?: string;
    bot_template_id?: string;
    workspace_id?: string;
  }): Promise<BotOutput> {
    this.ensureAccountKey();
    let response = await this.http.post('/bot', params, {
      params: { workspace_id: params.workspace_id }
    });
    return response.data;
  }

  async deleteBot(botId: string, workspaceId?: string): Promise<BotOutput> {
    this.ensureAccountKey();
    let response = await this.http.delete(`/bot/${encodeURIComponent(botId)}`, {
      params: { workspace_id: workspaceId }
    });
    return response.data;
  }

  async getBotApiKey(botId: string, workspaceId?: string): Promise<BotApiOutput> {
    this.ensureAccountKey();
    let response = await this.http.get(`/bot/${encodeURIComponent(botId)}/bot-api-key`, {
      params: { workspace_id: workspaceId }
    });
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
      headers: await this.botHeaders(),
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
    let response = await this.http.post(
      '/bot-data/upload-file',
      {
        id: params.id,
        bot_id: params.botId,
        file_url: params.fileUrl,
        file_name: params.fileName
      },
      { headers: await this.botHeaders() }
    );
    return response.data;
  }

  async uploadText(params: {
    id: string;
    botId: string;
    text: string;
    title?: string;
  }): Promise<any> {
    let response = await this.http.post(
      '/bot-data/upload-text',
      {
        id: params.id,
        bot_id: params.botId,
        text: params.text,
        title: params.title
      },
      { headers: await this.botHeaders() }
    );
    return response.data;
  }

  async bulkUploadUrls(params: {
    urls: string[];
    sitemapId?: string;
    isSitemap?: boolean;
    sitemapRoot?: string;
  }): Promise<any> {
    let response = await this.http.post(
      '/bot-data/bulk-upsert-urls',
      {
        urls: params.urls,
        sitemap_id: params.sitemapId,
        is_sitemap: params.isSitemap,
        sitemap_root: params.sitemapRoot
      },
      { headers: await this.botHeaders() }
    );
    return response.data;
  }

  async deleteBotData(dataId: string): Promise<BotDataOutput> {
    let response = await this.http.delete(`/bot-data/${encodeURIComponent(dataId)}`, {
      headers: await this.botHeaders()
    });
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
      headers: await this.botHeaders(),
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
    let response = await this.http.post('/bot-faq', params, {
      headers: await this.botHeaders()
    });
    return response.data;
  }

  async deleteFaq(faqId: string): Promise<any> {
    let response = await this.http.delete(`/bot-faq/${encodeURIComponent(faqId)}`, {
      headers: await this.botHeaders()
    });
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
      headers: await this.botHeaders(),
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
    let response = await this.http.post('/bot-starter-questions', params, {
      headers: await this.botHeaders()
    });
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
      `/bot-starter-questions/${encodeURIComponent(starterQuestionId)}`,
      params,
      { headers: await this.botHeaders() }
    );
    return response.data;
  }

  async deleteStarterQuestion(starterQuestionId: string): Promise<any> {
    let response = await this.http.delete(
      `/bot-starter-questions/${encodeURIComponent(starterQuestionId)}`,
      { headers: await this.botHeaders() }
    );
    return response.data;
  }

  async listStarterPresets(): Promise<StarterPresetsOutput> {
    let response = await this.http.get('/bot-starter-presets/all', {
      headers: await this.botHeaders()
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
      headers: await this.botHeaders(),
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
    let response = await this.http.get(
      `/bot-data/conversations/${encodeURIComponent(chatId)}`,
      { headers: await this.botHeaders() }
    );
    return response.data;
  }

  async endChat(
    chatId: string,
    params?: {
      status?: string;
      feedback?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/bot-data/conversations/${encodeURIComponent(chatId)}/end-chat`,
      {
        status: params?.status || 'none',
        feedback: params?.feedback
      },
      { headers: await this.botHeaders() }
    );
    return response.data;
  }
}
