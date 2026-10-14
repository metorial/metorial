import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord
} from 'slates';

export interface PaginatedResponse<T> {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
  items: T[];
}

export interface Agent {
  projectId: number;
  projectName: string;
  sitemapPath: string | null;
  isChatActive: boolean;
  userId: number;
  teamId: number;
  createdAt: string;
  updatedAt: string;
  type: string;
  isShared: boolean;
  shareableSlug: string | null;
  shareableLink: string | null;
  embedCode: string | null;
  liveChatCode: string | null;
  areLicensesAllowed: boolean;
}

export interface Conversation {
  sessionId: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  promptId: number;
  userQuery: string;
  openaiResponse: string;
  citations: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  sourceId: number;
  sourceName: string;
  sourceType: string;
  sourceUrl: string | null;
  crawlStatus: string;
  indexStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  pageId: number;
  pageUrl: string;
  projectId: number;
  crawlStatus: string;
  indexStatus: string;
  isFile: boolean;
  filename: string | null;
  filesize: number | null;
  createdAt: string;
  updatedAt: string;
}

export class CustomGPTClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A CustomGPT API key is required. Reconnect with a valid key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.customgpt.ai/api/v1',
      timeout: 60000,
      authHeader: { value: `Bearer ${config.token}` },
      contentType: false,
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'CustomGPT',
          reason: 'customgpt_api_error'
        })
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.status === 'error') {
        let details = isApiErrorRecord(response.data.data)
          ? response.data.data
          : response.data;
        throw createApiServiceError(
          `CustomGPT API request failed: ${extractApiErrorMessage(response.data, {
            response: { data: response.data },
            nestedKeys: ['data', 'errors'],
            fallbackMessage: 'CustomGPT request failed.'
          })}`,
          {
            reason: 'customgpt_api_error',
            upstreamStatus: response.status,
            upstreamCode:
              typeof details.code === 'string' || typeof details.code === 'number'
                ? String(details.code)
                : undefined
          }
        );
      }
      return response;
    });
  }

  // ---- Agent (Project) Management ----

  async listAgents(params?: {
    page?: number;
    order?: string;
    orderBy?: string;
    name?: string;
  }): Promise<PaginatedResponse<Agent>> {
    let queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.order !== undefined) queryParams.order = params.order;
    if (params?.orderBy !== undefined) queryParams.orderBy = params.orderBy;
    if (params?.name !== undefined) queryParams.name = params.name;

    let response = await this.axios.get('/projects', { params: queryParams });
    let data = response.data?.data;
    if (!isApiErrorRecord(data))
      throw createApiServiceError('CustomGPT returned an invalid paginated response.');

    return {
      currentPage: typeof data.current_page === 'number' ? data.current_page : 1,
      perPage: typeof data.per_page === 'number' ? data.per_page : 20,
      total: typeof data.total === 'number' ? data.total : this.readItems(data).length,
      lastPage: typeof data.last_page === 'number' ? data.last_page : 1,
      items: this.readItems(data).map(p => this.normalizeAgent(p))
    };
  }

  async getAgent(projectId: number): Promise<Agent> {
    let response = await this.axios.get(`/projects/${projectId}`);
    return this.normalizeAgent(response.data?.data);
  }

  async createAgent(params: {
    projectName: string;
    sitemapPath?: string;
    isOcrEnabled?: boolean;
    isVisionEnabled?: boolean;
  }): Promise<Agent> {
    let formData = new FormData();
    formData.append('project_name', params.projectName);
    if (params.sitemapPath !== undefined) formData.append('sitemap_path', params.sitemapPath);
    if (params.isOcrEnabled !== undefined)
      formData.append('is_ocr_enabled', params.isOcrEnabled ? '1' : '0');
    if (params.isVisionEnabled !== undefined)
      formData.append('is_vision_enabled', String(params.isVisionEnabled));

    let response = await this.axios.post('/projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return this.normalizeAgent(response.data?.data);
  }

  async updateAgent(
    projectId: number,
    params: {
      projectName?: string;
      sitemapPath?: string;
      isShared?: boolean;
      isOcrEnabled?: boolean;
      areLicensesAllowed?: boolean;
    }
  ): Promise<Agent> {
    let formData = new FormData();
    if (params.projectName !== undefined) formData.append('project_name', params.projectName);
    if (params.sitemapPath !== undefined) formData.append('sitemap_path', params.sitemapPath);
    if (params.isShared !== undefined) formData.append('is_shared', String(params.isShared));
    if (params.isOcrEnabled !== undefined)
      formData.append('is_ocr_enabled', params.isOcrEnabled ? '1' : '0');
    if (params.areLicensesAllowed !== undefined)
      formData.append('are_licenses_allowed', String(params.areLicensesAllowed));

    let response = await this.axios.post(`/projects/${projectId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return this.normalizeAgent(response.data?.data);
  }

  async deleteAgent(projectId: number): Promise<void> {
    await this.axios.delete(`/projects/${projectId}`);
  }

  async cloneAgent(projectId: number): Promise<Agent> {
    let response = await this.axios.post(`/projects/${projectId}/replicate`);
    return this.normalizeAgent(response.data?.data);
  }

  async getAgentStats(projectId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/projects/${projectId}/stats`);
    return response.data?.data;
  }

  // ---- Conversation Management ----

  async listConversations(
    projectId: number,
    params?: {
      page?: number;
      order?: string;
      orderBy?: string;
    }
  ): Promise<PaginatedResponse<Conversation>> {
    let queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.order !== undefined) queryParams.order = params.order;
    if (params?.orderBy !== undefined) queryParams.orderBy = params.orderBy;

    let response = await this.axios.get(`/projects/${projectId}/conversations`, {
      params: queryParams
    });
    let data = response.data?.data;
    if (!isApiErrorRecord(data))
      throw createApiServiceError('CustomGPT returned an invalid paginated response.');

    return {
      currentPage: typeof data.current_page === 'number' ? data.current_page : 1,
      perPage: typeof data.per_page === 'number' ? data.per_page : 20,
      total: typeof data.total === 'number' ? data.total : this.readItems(data).length,
      lastPage: typeof data.last_page === 'number' ? data.last_page : 1,
      items: this.readItems(data).map(c => this.normalizeConversation(c))
    };
  }

  async createConversation(
    projectId: number,
    params?: {
      name?: string;
    }
  ): Promise<Conversation> {
    let body: Record<string, unknown> = {};
    if (params?.name !== undefined) body.name = params.name;

    let response = await this.axios.post(`/projects/${projectId}/conversations`, body);
    return this.normalizeConversation(response.data?.data);
  }

  async updateConversation(
    projectId: number,
    sessionId: string,
    params: {
      name?: string;
    }
  ): Promise<Conversation> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;

    let response = await this.axios.put(
      `/projects/${projectId}/conversations/${encodeURIComponent(sessionId)}`,
      body
    );
    return this.normalizeConversation(response.data?.data);
  }

  async deleteConversation(projectId: number, sessionId: string): Promise<void> {
    await this.axios.delete(
      `/projects/${projectId}/conversations/${encodeURIComponent(sessionId)}`
    );
  }

  // ---- Messages ----

  async listMessages(
    projectId: number,
    sessionId: string,
    params?: {
      page?: number;
      order?: string;
    }
  ): Promise<PaginatedResponse<Message>> {
    let queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.order !== undefined) queryParams.order = params.order;

    let response = await this.axios.get(
      `/projects/${projectId}/conversations/${encodeURIComponent(sessionId)}/messages`,
      { params: queryParams }
    );
    let data = response.data?.messages ?? response.data?.data?.messages ?? response.data?.data;
    if (!isApiErrorRecord(data))
      throw createApiServiceError('CustomGPT returned an invalid paginated response.');

    return {
      currentPage: typeof data.current_page === 'number' ? data.current_page : 1,
      perPage: typeof data.per_page === 'number' ? data.per_page : 20,
      total: typeof data.total === 'number' ? data.total : this.readItems(data).length,
      lastPage: typeof data.last_page === 'number' ? data.last_page : 1,
      items: this.readItems(data).map(m => this.normalizeMessage(m))
    };
  }

  async sendMessage(
    projectId: number,
    sessionId: string,
    params: {
      message: string;
      lang?: string;
      labels?: string[];
      labelsExclusive?: boolean;
    }
  ): Promise<Message> {
    let body: Record<string, unknown> = {
      prompt: params.message
    };
    let query = { stream: false, lang: params.lang };
    if (params.labels !== undefined) body.labels = params.labels;
    if (params.labelsExclusive !== undefined) body.labels_exclusive = params.labelsExclusive;

    let response = await this.axios.post(
      `/projects/${projectId}/conversations/${encodeURIComponent(sessionId)}/messages`,
      body,
      { params: query }
    );
    return this.normalizeMessage(response.data?.data);
  }

  async getMessageDetails(
    projectId: number,
    sessionId: string,
    promptId: number,
    includeInsights?: boolean
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${projectId}/conversations/${encodeURIComponent(sessionId)}/messages/${promptId}`,
      { params: { includeInsights } }
    );
    if (!isApiErrorRecord(response.data?.data)) {
      throw createApiServiceError('CustomGPT returned invalid message details.');
    }
    return response.data.data;
  }

  async submitMessageFeedback(
    projectId: number,
    sessionId: string,
    promptId: number,
    feedback: string
  ): Promise<void> {
    let reaction =
      feedback === 'thumbs_up' ? 'liked' : feedback === 'thumbs_down' ? 'disliked' : feedback;
    if (!['neutral', 'liked', 'disliked'].includes(reaction)) {
      throw createApiServiceError(
        'feedback must be liked, disliked, neutral, thumbs_up, or thumbs_down.'
      );
    }
    await this.axios.put(
      `/projects/${projectId}/conversations/${encodeURIComponent(sessionId)}/messages/${promptId}/feedback`,
      {
        reaction
      }
    );
  }

  async getMessageClaims(
    projectId: number,
    sessionId: string,
    promptId: number
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/projects/${projectId}/conversations/${encodeURIComponent(sessionId)}/messages/${promptId}/claims`
    );
    return this.readItems(response.data?.data);
  }

  async getMessageTrustScore(
    projectId: number,
    sessionId: string,
    promptId: number
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${projectId}/conversations/${encodeURIComponent(sessionId)}/messages/${promptId}/trust-score`
    );
    return response.data?.data;
  }

  async verifyMessage(
    projectId: number,
    sessionId: string,
    promptId: number
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/projects/${projectId}/conversations/${encodeURIComponent(sessionId)}/messages/${promptId}/verify`
    );
    return response.data?.data;
  }

  // ---- Sources ----

  async listSources(projectId: number): Promise<Source[]> {
    let response = await this.axios.get(`/projects/${projectId}/sources`);
    let data = response.data?.data;
    let items: Record<string, unknown>[];
    if (Array.isArray(data) || Array.isArray(data?.data)) {
      items = this.readItems(data);
    } else if (isApiErrorRecord(data)) {
      items = Object.values(data).flatMap(group => {
        if (Array.isArray(group)) return this.readItems(group);
        if (isApiErrorRecord(group) && typeof group.id === 'number') return [group];
        return [];
      });
    } else {
      throw createApiServiceError('CustomGPT returned an invalid source list.');
    }
    return items.map(source => this.normalizeSource(source));
  }

  async addSource(
    projectId: number,
    params: {
      sourceType: string;
      sourceName?: string;
      sourceUrl?: string;
      isOcrEnabled?: boolean;
      isVisionEnabled?: boolean;
    }
  ): Promise<Source> {
    let formData = new FormData();
    if (!params.sourceUrl) {
      throw createApiServiceError('sourceUrl is required to add a URL or sitemap source.');
    }
    if (params.sourceName !== undefined) formData.append('source_name', params.sourceName);
    if (params.sourceUrl !== undefined) formData.append('sitemap_path', params.sourceUrl);
    if (params.isOcrEnabled !== undefined)
      formData.append('is_ocr_enabled', params.isOcrEnabled ? '1' : '0');
    if (params.isVisionEnabled !== undefined)
      formData.append('is_vision_enabled', String(params.isVisionEnabled));

    let response = await this.axios.post(`/projects/${projectId}/sources`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return this.normalizeSource(response.data?.data);
  }

  async updateSource(
    projectId: number,
    sourceId: number,
    params: Record<string, unknown>
  ): Promise<Source> {
    let response = await this.axios.put(`/projects/${projectId}/sources/${sourceId}`, params);
    return this.normalizeSource(response.data?.data);
  }

  async deleteSource(projectId: number, sourceId: number): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/sources/${sourceId}`);
  }

  async syncSource(projectId: number, sourceId: number): Promise<void> {
    await this.axios.put(`/projects/${projectId}/sources/${sourceId}/instant-sync`);
  }

  // ---- Pages (Documents) ----

  async listPages(
    projectId: number,
    params?: {
      page?: number;
      limit?: number;
      order?: string;
      search?: string;
      crawlStatus?: string;
      indexStatus?: string;
    }
  ): Promise<PaginatedResponse<Page>> {
    let queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.order !== undefined) queryParams.order = params.order;
    if (params?.search !== undefined) queryParams.search = params.search;
    if (params?.crawlStatus !== undefined) queryParams.crawl_status = params.crawlStatus;
    if (params?.indexStatus !== undefined) queryParams.index_status = params.indexStatus;

    let response = await this.axios.get(`/projects/${projectId}/pages`, {
      params: queryParams
    });
    let data = response.data?.data?.pages ?? response.data?.data;
    if (!isApiErrorRecord(data))
      throw createApiServiceError('CustomGPT returned an invalid document list.');

    return {
      currentPage: typeof data.current_page === 'number' ? data.current_page : 1,
      perPage: typeof data.per_page === 'number' ? data.per_page : 20,
      total: typeof data.total === 'number' ? data.total : this.readItems(data).length,
      lastPage: typeof data.last_page === 'number' ? data.last_page : 1,
      items: this.readItems(data).map(p => this.normalizePage(p))
    };
  }

  async deletePage(projectId: number, pageId: number): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/pages/${pageId}`);
  }

  async reindexPage(projectId: number, pageId: number): Promise<void> {
    await this.axios.post(`/projects/${projectId}/pages/${pageId}/reindex`);
  }

  async getPageMetadata(projectId: number, pageId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/projects/${projectId}/pages/${pageId}/metadata`);
    return response.data?.data;
  }

  async updatePageMetadata(
    projectId: number,
    pageId: number,
    metadata: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/projects/${projectId}/pages/${pageId}/metadata`,
      metadata
    );
    return response.data?.data;
  }

  async getPageLabels(projectId: number, pageId: number): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/projects/${projectId}/pages/${pageId}/labels`);
    return this.readItems(response.data?.data);
  }

  async setPageLabels(projectId: number, pageId: number, labelIds: number[]): Promise<void> {
    await this.axios.put(`/projects/${projectId}/pages/${pageId}/labels`, {
      label_ids: labelIds
    });
  }

  // ---- Agent Settings ----

  async getSettings(projectId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/projects/${projectId}/settings`);
    return response.data?.data;
  }

  async updateSettings(
    projectId: number,
    settings: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/projects/${projectId}/settings`, settings);
    return response.data?.data;
  }

  async listPersonaVersions(projectId: number): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/projects/${projectId}/settings/personas`);
    return this.readItems(response.data?.data);
  }

  async getPersonaVersion(
    projectId: number,
    params: { version: number }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${projectId}/settings/persona/${params.version}`
    );
    let persona = response.data?.persona ?? response.data?.data;
    if (!isApiErrorRecord(persona)) {
      throw createApiServiceError('CustomGPT returned invalid persona version data.');
    }
    return persona;
  }

  async restorePersonaVersion(
    projectId: number,
    version: number
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/projects/${projectId}/settings/persona-activate/${version}`
    );
    return response.data?.data;
  }

  // ---- Labels ----

  async listLabels(projectId: number): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/projects/${projectId}/labels`);
    return this.readItems(response.data?.data);
  }

  async createLabel(projectId: number, name: string): Promise<Record<string, unknown>> {
    if (!name.trim() || name.length > 20 || /^\d/.test(name)) {
      throw createApiServiceError(
        'Label names must be non-empty, no more than 20 characters, and must not start with a digit.'
      );
    }
    let response = await this.axios.post(`/projects/${projectId}/labels`, { names: [name] });
    let data = response.data?.data;
    if (Array.isArray(data) || Array.isArray(data?.data)) {
      let label = this.readItems(data).find(item => item.name === name);
      if (!label) throw createApiServiceError('CustomGPT did not return the created label.');
      return label;
    }
    if (!isApiErrorRecord(data))
      throw createApiServiceError('CustomGPT returned an invalid created label.');
    return data;
  }

  async renameLabel(
    projectId: number,
    labelId: number,
    name: string
  ): Promise<Record<string, unknown>> {
    if (!name.trim() || name.length > 20 || /^\d/.test(name)) {
      throw createApiServiceError(
        'Label names must be non-empty, no more than 20 characters, and must not start with a digit.'
      );
    }
    let response = await this.axios.put(`/projects/${projectId}/labels/${labelId}`, { name });
    return response.data?.data;
  }

  async deleteLabel(projectId: number, labelId: number): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/labels/${labelId}`);
  }

  // ---- Citations ----

  async getCitation(projectId: number, citationId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${projectId}/citations/${encodeURIComponent(citationId)}`
    );
    return response.data?.data;
  }

  // ---- Reports ----

  async getReport(
    projectId: number,
    reportType: string,
    params?: Record<string, string>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/projects/${projectId}/reports/${reportType}`, {
      params
    });
    return response.data?.data;
  }

  // ---- User ----

  async getUser(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/user');
    if (!isApiErrorRecord(response.data?.data)) {
      throw createApiServiceError('CustomGPT returned invalid user profile data.');
    }
    return response.data.data;
  }

  // ---- Account Limits ----

  async getAccountLimits(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/limits/usage');
    return response.data?.data;
  }

  // CustomGPT returns either a collection array or a paginated data envelope.
  private readItems(data: unknown): Record<string, unknown>[] {
    let items = Array.isArray(data) ? data : isApiErrorRecord(data) ? data.data : undefined;
    if (!Array.isArray(items) || !items.every(isApiErrorRecord)) {
      throw createApiServiceError('CustomGPT returned an invalid collection response.');
    }
    return items;
  }

  // ---- Normalizers ----

  private normalizeAgent(data: Record<string, unknown>): Agent {
    if (!isApiErrorRecord(data))
      throw createApiServiceError('CustomGPT returned invalid agent data.');
    return {
      projectId: data.id as number,
      projectName: data.project_name as string,
      sitemapPath: (data.sitemap_path as string) ?? null,
      isChatActive: data.is_chat_active as boolean,
      userId: data.user_id as number,
      teamId: data.team_id as number,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      type: data.type as string,
      isShared: data.is_shared as boolean,
      shareableSlug: (data.shareable_slug as string) ?? null,
      shareableLink: (data.shareable_link as string) ?? null,
      embedCode: (data.embed_code as string) ?? null,
      liveChatCode: (data.live_chat_code as string) ?? null,
      areLicensesAllowed: data.are_licenses_allowed as boolean
    };
  }

  private normalizeConversation(data: Record<string, unknown>): Conversation {
    if (!isApiErrorRecord(data))
      throw createApiServiceError('CustomGPT returned invalid conversation data.');
    return {
      sessionId: data.session_id as string,
      name: (data.name as string) ?? null,
      createdAt: data.created_at as string,
      updatedAt: (data.updated_at as string) ?? (data.created_at as string)
    };
  }

  private normalizeMessage(data: Record<string, unknown>): Message {
    if (!isApiErrorRecord(data))
      throw createApiServiceError('CustomGPT returned invalid message data.');
    return {
      promptId: (data.id as number) ?? (data.prompt_id as number),
      userQuery: (data.user_query as string) ?? (data.prompt as string) ?? '',
      openaiResponse: (data.openai_response as string) ?? (data.response as string) ?? '',
      citations: Array.isArray(data.citations)
        ? data.citations.map(citation => {
            if (isApiErrorRecord(citation)) return citation;
            if (typeof citation === 'string' || typeof citation === 'number') {
              return { citationId: String(citation) };
            }
            throw createApiServiceError('CustomGPT returned an invalid citation reference.');
          })
        : [],
      createdAt: data.created_at as string,
      updatedAt: (data.updated_at as string) ?? (data.created_at as string)
    };
  }

  private normalizeSource(data: Record<string, unknown>): Source {
    if (!isApiErrorRecord(data))
      throw createApiServiceError('CustomGPT returned invalid source data.');
    let settings = isApiErrorRecord(data.settings) ? data.settings : {};
    return {
      sourceId: data.id as number,
      sourceName:
        (data.source_name as string) ??
        (data.name as string) ??
        (settings.sitemap_path as string) ??
        '',
      sourceType: (data.source_type as string) ?? (data.type as string) ?? '',
      sourceUrl:
        (data.source_url as string) ??
        (data.url as string) ??
        (settings.sitemap_path as string) ??
        null,
      crawlStatus: (data.crawl_status as string) ?? '',
      indexStatus: (data.index_status as string) ?? '',
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string
    };
  }

  private normalizePage(data: Record<string, unknown>): Page {
    if (!isApiErrorRecord(data))
      throw createApiServiceError('CustomGPT returned invalid page data.');
    return {
      pageId: data.id as number,
      pageUrl: data.page_url as string,
      projectId: data.project_id as number,
      crawlStatus: (data.crawl_status as string) ?? '',
      indexStatus: (data.index_status as string) ?? '',
      isFile: data.is_file as boolean,
      filename: (data.filename as string) ?? null,
      filesize: (data.filesize as number) ?? null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string
    };
  }
}
