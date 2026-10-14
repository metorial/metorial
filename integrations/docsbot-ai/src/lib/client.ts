import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let createDocsBotAxios = (token: string, baseURL: string) => {
  if (!token.trim()) {
    throw createApiServiceError('Provide a DocsBot user API key.');
  }
  return createAuthenticatedAxios({
    baseURL,
    authHeader: { value: `Bearer ${token}` },
    timeout: 60_000,
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'DocsBot',
        reason: 'docsbot_api_error'
      })
  });
};

export interface PaginationInfo {
  perPage: number;
  page: number;
  totalCount: number;
  hasMorePages: boolean;
}

export interface TeamPlan {
  name: string;
  bots: number;
  sources: number;
  pages: number;
  questions: number;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
  status: string;
  roles: Record<string, string>;
  questionCount: number;
  pageCount: number;
  sourceCount: number;
  chunkCount: number;
  openAIKey?: string | null;
  botCount: number;
  plan: TeamPlan;
}

export interface BotLabels {
  firstMessage?: string;
  sources?: string;
  getSupport?: string;
  helpful?: string;
  unhelpful?: string;
  poweredBy?: string;
  floatingButton?: string;
  inputPlaceholder?: string;
}

export interface Bot {
  id: string;
  name: string;
  description: string;
  privacy: string;
  language: string;
  model: string;
  embeddingModel?: string | null;
  customPrompt?: string | null;
  createdAt: string;
  status: string;
  questionCount: number;
  pageCount: number;
  sourceCount: number;
  chunkCount: number;
  indexId?: string;
  color?: string;
  icon?: string;
  alignment?: string;
  botIcon?: string | boolean;
  allowedDomains?: string[];
  branding?: boolean;
  supportLink?: string;
  showButtonLabel?: string;
  showCopyButton?: boolean;
  hideSources?: boolean;
  labels?: BotLabels;
  rateLimitMessages?: number;
  rateLimitSeconds?: number;
  recordIP?: boolean;
  classify?: boolean;
}

export interface CreateBotParams {
  name: string;
  description: string;
  privacy: string;
  language: string;
  model?: string;
  embeddingModel?: string;
  copyFrom?: string;
}

export interface UpdateBotParams {
  name?: string;
  description?: string;
  customPrompt?: string;
  privacy?: string;
  language?: string;
  model?: string;
  allowedDomains?: string[];
  color?: string;
  icon?: string;
  alignment?: string;
  botIcon?: string | boolean;
  branding?: boolean;
  supportLink?: string;
  showButtonLabel?: string;
  showCopyButton?: boolean;
  hideSources?: boolean;
  labels?: BotLabels;
}

export interface Source {
  id: string;
  type: string;
  status: string;
  title?: string | null;
  url?: string | null;
  file?: string;
  createdAt: string;
  pageCount: number;
  chunkCount: number;
  scheduleInterval?: string;
  faqs?: Array<{ question: string; answer: string }>;
  indexedUrls?: Array<{ source: string; title: string }>;
  warnsList?: string[];
  files?: Array<{ p: string; n?: number }>;
  processedPages?: { count: number; total: number };
}

export interface ListSourcesParams {
  page?: number;
  limit?: number;
}

export interface ListSourcesResponse {
  sources: Source[];
  pagination: PaginationInfo;
}

export interface CreateSourceParams {
  type: string;
  title?: string;
  url?: string;
  file?: string;
  fileDir?: string;
  faqs?: Array<{ question: string; answer: string }>;
  scheduleInterval?: string;
}

export interface QuestionSource {
  type: string;
  title: string;
  url?: string | null;
  page?: string | null;
}

export interface Question {
  id: string;
  createdAt: string;
  alias: string;
  question: string | null;
  standaloneQuestion?: string | null;
  answer: string | null;
  sources: QuestionSource[] | null;
  ip: string;
  rating: number;
  escalation: boolean;
  metadata?: Record<string, unknown> | null;
  couldAnswer?: boolean | null;
  deleted?: boolean;
}

export interface ListQuestionsParams {
  page?: number;
  perPage?: number;
  ascending?: boolean;
  ip?: string;
  rating?: number;
  escalated?: boolean;
  couldAnswer?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ListQuestionsResponse {
  questions: Question[];
  pagination: PaginationInfo;
}

export interface ConversationMessage {
  timestamp: string;
  Human?: string | null;
  AI?: string | null;
  type?: string | null;
  id?: string | null;
  options?: Record<string, any> | null;
}

export interface Conversation {
  id: string;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  truncated?: boolean;
  model?: string | null;
  ip: string;
  answered?: boolean;
  summary?: string | null;
  metadata?: Record<string, any> | null;
  sentiment?: string | null;
  history?: ConversationMessage[];
  resolved?: string;
  escalated?: string;
  ticketContent?: string | null;
  ticketSubject?: string | null;
  alias?: string;
}

export interface ListConversationsParams {
  page?: number;
  perPage?: number;
}

export interface ConversationsPagination extends PaginationInfo {
  viewableCount: number;
  planLimit: number;
}

export interface ListConversationsResponse {
  conversations: Conversation[];
  pagination: ConversationsPagination;
}

export interface ChatAgentParams {
  conversationId: string;
  question: string;
  metadata?: { name?: string; email?: string; referrer?: string };
  contextItems?: number;
  humanEscalation?: boolean;
  followupRating?: boolean;
  documentRetriever?: boolean;
  fullSource?: boolean;
  autocut?: number | boolean;
  testing?: boolean;
  imageUrls?: string[];
  model?: string;
  defaultLanguage?: string;
  reasoningEffort?: string;
  searchLimit?: number;
}

export interface ChatEventSource {
  type: string;
  title: string;
  url?: string | null;
  page?: string | null;
  content?: string | null;
  used?: boolean;
}

export interface ChatEvent {
  event: string;
  data: {
    answer?: string;
    history?: any[];
    sources?: ChatEventSource[];
    id?: string;
    couldAnswer?: boolean;
    options?: Record<string, any>;
    [key: string]: any;
  };
}

export interface UploadUrlResponse {
  url: string;
  file: string;
}

export class DocsBotAdminClient {
  private axios;

  constructor(token: string) {
    this.axios = createDocsBotAxios(token, 'https://docsbot.ai/api/');
  }

  // Teams
  async listTeams(): Promise<Team[]> {
    let response = await this.axios.get('/teams');
    return response.data;
  }

  async getTeam(teamId: string): Promise<Team> {
    let response = await this.axios.get(`/teams/${encodeURIComponent(teamId)}`);
    return response.data;
  }

  async updateTeam(
    teamId: string,
    params: { name?: string; openAIKey?: string }
  ): Promise<Team> {
    let response = await this.axios.put(`/teams/${encodeURIComponent(teamId)}`, params);
    return response.data;
  }

  // Bots
  async listBots(teamId: string): Promise<Bot[]> {
    let response = await this.axios.get(`/teams/${encodeURIComponent(teamId)}/bots`);
    return response.data;
  }

  async getBot(teamId: string, botId: string): Promise<Bot> {
    let response = await this.axios.get(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}`
    );
    return response.data;
  }

  async createBot(teamId: string, params: CreateBotParams): Promise<Bot> {
    let response = await this.axios.post(`/teams/${encodeURIComponent(teamId)}/bots`, params);
    return response.data;
  }

  async updateBot(teamId: string, botId: string, params: UpdateBotParams): Promise<Bot> {
    let response = await this.axios.put(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}`,
      params
    );
    return response.data;
  }

  async deleteBot(teamId: string, botId: string): Promise<{ message: string }> {
    let response = await this.axios.delete(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}`
    );
    return response.data;
  }

  // Sources
  async listSources(
    teamId: string,
    botId: string,
    params?: ListSourcesParams
  ): Promise<ListSourcesResponse> {
    let response = await this.axios.get(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/sources`,
      { params }
    );
    // Older API responses were arrays; continue accepting them for existing deployments.
    if (Array.isArray(response.data)) {
      return {
        sources: response.data,
        pagination: {
          page: params?.page ?? 0,
          perPage: response.data.length,
          totalCount: response.data.length,
          hasMorePages: false
        }
      };
    }
    return response.data;
  }

  async getSource(teamId: string, botId: string, sourceId: string): Promise<Source> {
    let response = await this.axios.get(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/sources/${encodeURIComponent(sourceId)}`
    );
    return response.data;
  }

  async createSource(
    teamId: string,
    botId: string,
    params: CreateSourceParams
  ): Promise<Source> {
    let response = await this.axios.post(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/sources`,
      params
    );
    return response.data;
  }

  async updateSourceTitle(
    teamId: string,
    botId: string,
    sourceId: string,
    title: string
  ): Promise<Source> {
    let response = await this.axios.patch(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/sources/${encodeURIComponent(sourceId)}`,
      { title }
    );
    return response.data;
  }

  async retrySource(teamId: string, botId: string, sourceId: string): Promise<Source> {
    let response = await this.axios.put(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/sources/${encodeURIComponent(sourceId)}`
    );
    return response.data;
  }

  async deleteSource(
    teamId: string,
    botId: string,
    sourceId: string
  ): Promise<{ message: string }> {
    let response = await this.axios.delete(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/sources/${encodeURIComponent(sourceId)}`
    );
    return response.data;
  }

  async getUploadUrl(
    teamId: string,
    botId: string,
    fileName: string
  ): Promise<UploadUrlResponse> {
    let response = await this.axios.get(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/upload-url`,
      {
        params: { fileName }
      }
    );
    return response.data;
  }

  // Questions
  async listQuestions(
    teamId: string,
    botId: string,
    params?: ListQuestionsParams
  ): Promise<ListQuestionsResponse> {
    let response = await this.axios.get(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/questions`,
      {
        params
      }
    );
    return response.data;
  }

  async deleteQuestion(
    teamId: string,
    botId: string,
    questionId: string
  ): Promise<{ message: string }> {
    let response = await this.axios.delete(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/questions/${encodeURIComponent(questionId)}`
    );
    return response.data;
  }

  // Conversations
  async listConversations(
    teamId: string,
    botId: string,
    params?: ListConversationsParams
  ): Promise<ListConversationsResponse> {
    let response = await this.axios.get(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/conversations`,
      {
        params
      }
    );
    return response.data;
  }

  async getConversation(
    teamId: string,
    botId: string,
    conversationId: string
  ): Promise<Conversation> {
    let response = await this.axios.get(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/conversations/${encodeURIComponent(conversationId)}`
    );
    return response.data;
  }

  async deleteConversation(
    teamId: string,
    botId: string,
    conversationId: string
  ): Promise<{ message: string }> {
    let response = await this.axios.delete(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/conversations/${encodeURIComponent(conversationId)}`
    );
    return response.data;
  }
}

export class DocsBotChatClient {
  private axios;

  constructor(token: string) {
    this.axios = createDocsBotAxios(token, 'https://api.docsbot.ai/');
  }

  async chatAgent(
    teamId: string,
    botId: string,
    params: ChatAgentParams
  ): Promise<ChatEvent[]> {
    let body: Record<string, any> = {
      conversationId: params.conversationId,
      question: params.question,
      stream: false
    };
    if (params.metadata) body.metadata = params.metadata;
    if (params.contextItems !== undefined) body.context_items = params.contextItems;
    if (params.humanEscalation !== undefined) body.human_escalation = params.humanEscalation;
    if (params.followupRating !== undefined) body.followup_rating = params.followupRating;
    if (params.documentRetriever !== undefined)
      body.document_retriever = params.documentRetriever;
    if (params.fullSource !== undefined) body.full_source = params.fullSource;
    if (params.autocut !== undefined) body.autocut = params.autocut;
    if (params.testing !== undefined) body.testing = params.testing;
    if (params.imageUrls) body.image_urls = params.imageUrls;
    if (params.model) body.model = params.model;
    if (params.defaultLanguage) body.default_language = params.defaultLanguage;
    if (params.reasoningEffort) body.reasoning_effort = params.reasoningEffort;
    if (params.searchLimit !== undefined) body.search_limit = params.searchLimit;

    let response = await this.axios.post(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/chat-agent`,
      body
    );
    return response.data;
  }

  async rateAnswer(
    teamId: string,
    botId: string,
    answerId: string,
    rating: number
  ): Promise<boolean> {
    let response = await this.axios.put(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/rate/${encodeURIComponent(answerId)}`,
      {
        rating
      }
    );
    if (response.data !== true) {
      throw createApiServiceError(
        'DocsBot did not confirm that the answer rating was recorded.'
      );
    }
    return response.data;
  }

  async recordEscalation(teamId: string, botId: string, answerId: string): Promise<boolean> {
    let response = await this.axios.put(
      `/teams/${encodeURIComponent(teamId)}/bots/${encodeURIComponent(botId)}/support/${encodeURIComponent(answerId)}`
    );
    if (response.data !== true) {
      throw createApiServiceError('DocsBot did not confirm that the escalation was recorded.');
    }
    return response.data;
  }
}
