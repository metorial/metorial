import { createAxios } from 'slates';

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
  openAIKey: string;
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
  customPrompt?: string;
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
  title?: string;
  url?: string;
  file?: string;
  createdAt: string;
  pageCount: number;
  chunkCount: number;
  scheduleInterval?: string;
  faqs?: Array<{ question: string; answer: string }>;
  indexedUrls?: Array<{ url: string; title: string }>;
  warnsList?: string[];
}

export interface CreateSourceParams {
  type: string;
  title?: string;
  url?: string;
  file?: string;
  faqs?: Array<{ question: string; answer: string }>;
  scheduleInterval?: string;
}

export interface EditSourceParams {
  scheduleInterval?: string;
  title?: string;
  url?: string;
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
  question: string;
  standaloneQuestion?: string | null;
  answer: string;
  sources: QuestionSource[];
  ip: string;
  rating: number;
  escalation: boolean;
  metadata?: Record<string, string>;
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
  metadata?: Record<string, any>;
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
    this.axios = createAxios({
      baseURL: 'https://docsbot.ai/api/',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Teams
  async listTeams(): Promise<Team[]> {
    let response = await this.axios.get('/teams');
    return response.data;
  }

  async getTeam(teamId: string): Promise<Team> {
    let response = await this.axios.get(`/teams/${teamId}`);
    return response.data;
  }

  async updateTeam(
    teamId: string,
    params: { name?: string; openAIKey?: string }
  ): Promise<Team> {
    let response = await this.axios.put(`/teams/${teamId}`, params);
    return response.data;
  }

  // Bots
  async listBots(teamId: string): Promise<Bot[]> {
    let response = await this.axios.get(`/teams/${teamId}/bots`);
    return response.data;
  }

  async getBot(teamId: string, botId: string): Promise<Bot> {
    let response = await this.axios.get(`/teams/${teamId}/bots/${botId}`);
    return response.data;
  }

  async createBot(teamId: string, params: CreateBotParams): Promise<Bot> {
    let response = await this.axios.post(`/teams/${teamId}/bots`, params);
    return response.data;
  }

  async updateBot(teamId: string, botId: string, params: UpdateBotParams): Promise<Bot> {
    let response = await this.axios.put(`/teams/${teamId}/bots/${botId}`, params);
    return response.data;
  }

  async deleteBot(teamId: string, botId: string): Promise<{ message: string }> {
    let response = await this.axios.delete(`/teams/${teamId}/bots/${botId}`);
    return response.data;
  }

  // Sources
  async listSources(teamId: string, botId: string): Promise<Source[]> {
    let response = await this.axios.get(`/teams/${teamId}/bots/${botId}/sources`);
    return response.data;
  }

  async getSource(teamId: string, botId: string, sourceId: string): Promise<Source> {
    let response = await this.axios.get(`/teams/${teamId}/bots/${botId}/sources/${sourceId}`);
    return response.data;
  }

  async createSource(
    teamId: string,
    botId: string,
    params: CreateSourceParams
  ): Promise<Source> {
    let response = await this.axios.post(`/teams/${teamId}/bots/${botId}/sources`, params);
    return response.data;
  }

  async editSource(
    teamId: string,
    botId: string,
    sourceId: string,
    params: EditSourceParams
  ): Promise<Source> {
    let response = await this.axios.put(
      `/teams/${teamId}/bots/${botId}/sources/${sourceId}`,
      params
    );
    return response.data;
  }

  async deleteSource(
    teamId: string,
    botId: string,
    sourceId: string
  ): Promise<{ message: string }> {
    let response = await this.axios.delete(
      `/teams/${teamId}/bots/${botId}/sources/${sourceId}`
    );
    return response.data;
  }

  async getUploadUrl(
    teamId: string,
    botId: string,
    fileName: string
  ): Promise<UploadUrlResponse> {
    let response = await this.axios.get(`/teams/${teamId}/bots/${botId}/upload-url`, {
      params: { fileName }
    });
    return response.data;
  }

  // Questions
  async listQuestions(
    teamId: string,
    botId: string,
    params?: ListQuestionsParams
  ): Promise<ListQuestionsResponse> {
    let response = await this.axios.get(`/teams/${teamId}/bots/${botId}/questions`, {
      params
    });
    return response.data;
  }

  async deleteQuestion(
    teamId: string,
    botId: string,
    questionId: string
  ): Promise<{ message: string }> {
    let response = await this.axios.delete(
      `/teams/${teamId}/bots/${botId}/questions/${questionId}`
    );
    return response.data;
  }

  // Conversations
  async listConversations(
    teamId: string,
    botId: string,
    params?: ListConversationsParams
  ): Promise<ListConversationsResponse> {
    let response = await this.axios.get(`/teams/${teamId}/bots/${botId}/conversations`, {
      params
    });
    return response.data;
  }

  async getConversation(
    teamId: string,
    botId: string,
    conversationId: string
  ): Promise<Conversation> {
    let response = await this.axios.get(
      `/teams/${teamId}/bots/${botId}/conversations/${conversationId}`
    );
    return response.data;
  }

  async deleteConversation(
    teamId: string,
    botId: string,
    conversationId: string
  ): Promise<{ message: string }> {
    let response = await this.axios.delete(
      `/teams/${teamId}/bots/${botId}/conversations/${conversationId}`
    );
    return response.data;
  }
}

export class DocsBotChatClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.docsbot.ai/',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
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

    let response = await this.axios.post(`/teams/${teamId}/bots/${botId}/chat-agent`, body);
    return response.data;
  }

  async rateAnswer(
    teamId: string,
    botId: string,
    answerId: string,
    rating: number
  ): Promise<boolean> {
    let response = await this.axios.put(`/teams/${teamId}/bots/${botId}/rate/${answerId}`, {
      rating
    });
    return response.data;
  }

  async recordEscalation(teamId: string, botId: string, answerId: string): Promise<boolean> {
    let response = await this.axios.put(`/teams/${teamId}/bots/${botId}/support/${answerId}`);
    return response.data;
  }
}
