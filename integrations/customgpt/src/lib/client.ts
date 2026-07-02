import { createAxios } from 'slates';

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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.customgpt.ai/api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json'
      }
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

    return {
      currentPage: data.current_page,
      perPage: data.per_page,
      total: data.total,
      lastPage: data.last_page,
      items: (data.data as Record<string, unknown>[]).map(p => this.normalizeAgent(p))
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
      formData.append('is_ocr_enabled', String(params.isOcrEnabled));
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
      formData.append('is_ocr_enabled', String(params.isOcrEnabled));
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

    return {
      currentPage: data.current_page,
      perPage: data.per_page,
      total: data.total,
      lastPage: data.last_page,
      items: (data.data as Record<string, unknown>[]).map(c => this.normalizeConversation(c))
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
      `/projects/${projectId}/conversations/${sessionId}`,
      body
    );
    return this.normalizeConversation(response.data?.data);
  }

  async deleteConversation(projectId: number, sessionId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/conversations/${sessionId}`);
  }

  async exportConversation(
    projectId: number,
    sessionId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${projectId}/conversations/${sessionId}/export`
    );
    return response.data?.data;
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
      `/projects/${projectId}/conversations/${sessionId}/messages`,
      { params: queryParams }
    );
    let data = response.data?.data;

    return {
      currentPage: data.current_page ?? 1,
      perPage: data.per_page ?? 20,
      total: data.total ?? 0,
      lastPage: data.last_page ?? 1,
      items: (data.data as Record<string, unknown>[]).map(m => this.normalizeMessage(m))
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
    if (params.lang !== undefined) body.lang = params.lang;
    if (params.labels !== undefined) body.labels = params.labels;
    if (params.labelsExclusive !== undefined) body.labels_exclusive = params.labelsExclusive;

    let response = await this.axios.post(
      `/projects/${projectId}/conversations/${sessionId}/messages`,
      body
    );
    return this.normalizeMessage(response.data?.data);
  }

  async getMessageDetails(
    projectId: number,
    sessionId: string,
    promptId: number
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${projectId}/conversations/${sessionId}/messages/${promptId}`
    );
    return response.data?.data;
  }

  async submitMessageFeedback(
    projectId: number,
    sessionId: string,
    promptId: number,
    feedback: string
  ): Promise<void> {
    await this.axios.put(
      `/projects/${projectId}/conversations/${sessionId}/messages/${promptId}/feedback`,
      {
        feedback
      }
    );
  }

  async getMessageClaims(
    projectId: number,
    sessionId: string,
    promptId: number
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/projects/${projectId}/conversations/${sessionId}/messages/${promptId}/claims`
    );
    return response.data?.data ?? [];
  }

  async getMessageTrustScore(
    projectId: number,
    sessionId: string,
    promptId: number
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/projects/${projectId}/conversations/${sessionId}/messages/${promptId}/trust-score`
    );
    return response.data?.data;
  }

  async verifyMessage(
    projectId: number,
    sessionId: string,
    promptId: number
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/projects/${projectId}/conversations/${sessionId}/messages/${promptId}/verify`
    );
    return response.data?.data;
  }

  // ---- Sources ----

  async listSources(projectId: number): Promise<Source[]> {
    let response = await this.axios.get(`/projects/${projectId}/sources`);
    let items = response.data?.data?.data ?? response.data?.data ?? [];
    return (items as Record<string, unknown>[]).map(s => this.normalizeSource(s));
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
    formData.append('source_type', params.sourceType);
    if (params.sourceName !== undefined) formData.append('source_name', params.sourceName);
    if (params.sourceUrl !== undefined) formData.append('source_url', params.sourceUrl);
    if (params.isOcrEnabled !== undefined)
      formData.append('is_ocr_enabled', String(params.isOcrEnabled));
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
      crawlStatus?: string;
      indexStatus?: string;
    }
  ): Promise<PaginatedResponse<Page>> {
    let queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.order !== undefined) queryParams.order = params.order;
    if (params?.crawlStatus !== undefined) queryParams.crawl_status = params.crawlStatus;
    if (params?.indexStatus !== undefined) queryParams.index_status = params.indexStatus;

    let response = await this.axios.get(`/projects/${projectId}/pages`, {
      params: queryParams
    });
    let data = response.data?.data?.pages ?? response.data?.data;

    return {
      currentPage: data.current_page ?? 1,
      perPage: data.per_page ?? 20,
      total: data.total ?? 0,
      lastPage: data.last_page ?? 1,
      items: (data.data as Record<string, unknown>[]).map(p => this.normalizePage(p))
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
    return response.data?.data ?? [];
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
    return response.data?.data ?? [];
  }

  async getPersonaVersion(
    projectId: number,
    params?: { version?: number }
  ): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = {};
    if (params?.version !== undefined) queryParams.version = String(params.version);

    let response = await this.axios.get(`/projects/${projectId}/settings/persona-version`, {
      params: queryParams
    });
    return response.data?.data;
  }

  async restorePersonaVersion(
    projectId: number,
    version: number
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/projects/${projectId}/settings/persona-activate-version`,
      {
        version
      }
    );
    return response.data?.data;
  }

  // ---- Labels ----

  async listLabels(projectId: number): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/projects/${projectId}/labels`);
    return response.data?.data ?? [];
  }

  async createLabel(projectId: number, name: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/projects/${projectId}/labels`, { name });
    return response.data?.data;
  }

  async renameLabel(
    projectId: number,
    labelId: number,
    name: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/projects/${projectId}/labels/${labelId}`, { name });
    return response.data?.data;
  }

  async deleteLabel(projectId: number, labelId: number): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/labels/${labelId}`);
  }

  // ---- Citations ----

  async getCitation(projectId: number, citationId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/projects/${projectId}/citations/${citationId}`);
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
    return response.data?.data;
  }

  // ---- Account Limits ----

  async getAccountLimits(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/limits/usage');
    return response.data?.data;
  }

  // ---- Normalizers ----

  private normalizeAgent(data: Record<string, unknown>): Agent {
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
    return {
      sessionId: data.session_id as string,
      name: (data.name as string) ?? null,
      createdAt: data.created_at as string,
      updatedAt: (data.updated_at as string) ?? (data.created_at as string)
    };
  }

  private normalizeMessage(data: Record<string, unknown>): Message {
    return {
      promptId: (data.id as number) ?? (data.prompt_id as number),
      userQuery: (data.user_query as string) ?? (data.prompt as string) ?? '',
      openaiResponse: (data.openai_response as string) ?? (data.response as string) ?? '',
      citations: (data.citations as Record<string, unknown>[]) ?? [],
      createdAt: data.created_at as string,
      updatedAt: (data.updated_at as string) ?? (data.created_at as string)
    };
  }

  private normalizeSource(data: Record<string, unknown>): Source {
    return {
      sourceId: data.id as number,
      sourceName: (data.source_name as string) ?? (data.name as string) ?? '',
      sourceType: (data.source_type as string) ?? (data.type as string) ?? '',
      sourceUrl: (data.source_url as string) ?? (data.url as string) ?? null,
      crawlStatus: (data.crawl_status as string) ?? '',
      indexStatus: (data.index_status as string) ?? '',
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string
    };
  }

  private normalizePage(data: Record<string, unknown>): Page {
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
