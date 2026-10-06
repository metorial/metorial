import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export type FlowisePagination = { page?: number; limit?: number };

export const parseFlowiseList = (result: unknown, pagination: FlowisePagination = {}) => {
  const items = Array.isArray(result)
    ? result
    : isApiErrorRecord(result) && Array.isArray(result.data)
      ? result.data
      : undefined;
  if (!items?.every(isApiErrorRecord)) {
    throw createApiServiceError(
      'Flowise returned an invalid list response. Verify the instance URL and API permissions.'
    );
  }
  const total =
    isApiErrorRecord(result) && typeof result.total === 'number' ? result.total : undefined;
  const page = pagination.page ?? (pagination.limit === undefined ? undefined : 1);
  const limit = pagination.limit ?? (pagination.page === undefined ? undefined : 100);
  return {
    items,
    total,
    page,
    limit,
    hasMore:
      total !== undefined && page !== undefined && limit !== undefined
        ? page * limit < total
        : false
  };
};

// Older endpoints expose JSON strings; newer document-store/message responses expose parsed values.
export const flowiseJsonString = (value: unknown): string | null | undefined =>
  value === undefined || value === null || typeof value === 'string'
    ? value
    : JSON.stringify(value);

const pageParams = (params: FlowisePagination) =>
  params.page !== undefined || params.limit !== undefined
    ? { ...params, page: params.page ?? 1, limit: params.limit ?? 100 }
    : params;

export class FlowiseClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { baseUrl: string; token: string }) {
    let baseUrl: URL;
    try {
      baseUrl = new URL(config.baseUrl);
    } catch {
      throw createApiServiceError('Provide a valid HTTP or HTTPS Flowise instance URL.');
    }
    if (
      !['http:', 'https:'].includes(baseUrl.protocol) ||
      baseUrl.username ||
      baseUrl.password ||
      baseUrl.search ||
      baseUrl.hash
    ) {
      throw createApiServiceError(
        'Provide an HTTP or HTTPS Flowise instance URL without credentials, query parameters, or a fragment.'
      );
    }
    if (!config.token.trim()) throw createApiServiceError('Provide a Flowise API key.');
    this.http = createAuthenticatedAxios({
      baseURL: `${baseUrl
        .toString()
        .replace(/\/+$/, '')
        .replace(/\/api\/v1$/, '')}/api/v1`,
      timeout: 300000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Flowise',
          reason: 'flowise_api_error',
          operation: 'request'
        }),
      headers: {
        Authorization: `Bearer ${config.token.trim()}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Predictions ──

  async sendPrediction(
    chatflowId: string,
    body: {
      question?: string;
      form?: Record<string, unknown>;
      humanInput?: { type: 'proceed' | 'reject'; feedback?: string };
      overrideConfig?: Record<string, any>;
      history?: Array<{ role: string; content: string }>;
      uploads?: Array<{ data: string; type: string; name?: string; mime?: string }>;
      streaming?: boolean;
    }
  ) {
    let res = await this.http.post(`/prediction/${encodeURIComponent(chatflowId)}`, body);
    return res.data;
  }

  // ── Chatflows ──

  async listChatflows(params: FlowisePagination & { type?: string } = {}) {
    let res = await this.http.get('/chatflows', { params: pageParams(params) });
    return res.data;
  }

  async getChatflow(chatflowId: string) {
    let res = await this.http.get(`/chatflows/${encodeURIComponent(chatflowId)}`);
    return res.data;
  }

  async createChatflow(body: {
    name: string;
    flowData?: string;
    deployed?: boolean;
    isPublic?: boolean;
    apikeyid?: string;
    chatbotConfig?: string;
    category?: string;
    type?: string;
  }) {
    let res = await this.http.post('/chatflows', body);
    return res.data;
  }

  async updateChatflow(
    chatflowId: string,
    body: {
      name?: string;
      flowData?: string;
      deployed?: boolean;
      isPublic?: boolean;
      apikeyid?: string;
      chatbotConfig?: string;
      category?: string;
      type?: string;
    }
  ) {
    let res = await this.http.put(`/chatflows/${encodeURIComponent(chatflowId)}`, body);
    return res.data;
  }

  async deleteChatflow(chatflowId: string) {
    let res = await this.http.delete(`/chatflows/${encodeURIComponent(chatflowId)}`);
    return res.data;
  }

  // ── Assistants ──

  async listAssistants(params: { type?: string } = {}) {
    let res = await this.http.get('/assistants', { params });
    return res.data;
  }

  async getAssistant(assistantId: string) {
    let res = await this.http.get(`/assistants/${encodeURIComponent(assistantId)}`);
    return res.data;
  }

  async createAssistant(body: {
    details: string;
    credential?: string;
    iconSrc?: string;
    type?: string;
  }) {
    let res = await this.http.post('/assistants', body);
    return res.data;
  }

  async updateAssistant(
    assistantId: string,
    body: {
      details?: string;
      credential?: string;
      iconSrc?: string;
    }
  ) {
    let res = await this.http.put(`/assistants/${encodeURIComponent(assistantId)}`, body);
    return res.data;
  }

  async deleteAssistant(assistantId: string) {
    let res = await this.http.delete(`/assistants/${encodeURIComponent(assistantId)}`);
    return res.data;
  }

  // ── Document Stores ──

  async listDocumentStores(params: FlowisePagination = {}) {
    let res = await this.http.get('/document-store/store', { params: pageParams(params) });
    return res.data;
  }

  async getDocumentStore(storeId: string) {
    let res = await this.http.get(`/document-store/store/${encodeURIComponent(storeId)}`);
    return res.data;
  }

  async createDocumentStore(body: { name: string; description?: string }) {
    let res = await this.http.post('/document-store/store', body);
    return res.data;
  }

  async updateDocumentStore(storeId: string, body: { name?: string; description?: string }) {
    let res = await this.http.put(
      `/document-store/store/${encodeURIComponent(storeId)}`,
      body
    );
    return res.data;
  }

  async deleteDocumentStore(storeId: string) {
    let res = await this.http.delete(`/document-store/store/${encodeURIComponent(storeId)}`);
    return res.data;
  }

  async upsertDocumentStore(storeId: string, body: Record<string, any>) {
    let res = await this.http.post(
      `/document-store/upsert/${encodeURIComponent(storeId)}`,
      body
    );
    return res.data;
  }

  async refreshDocumentStore(storeId: string) {
    let res = await this.http.post(`/document-store/refresh/${encodeURIComponent(storeId)}`);
    return res.data;
  }

  async queryDocumentStoreVectorStore(body: { storeId: string; query: string }) {
    let res = await this.http.post('/document-store/vectorstore/query', body);
    return res.data;
  }

  async deleteDocumentStoreVectorStore(storeId: string) {
    let res = await this.http.delete(
      `/document-store/vectorstore/${encodeURIComponent(storeId)}`
    );
    return res.data;
  }

  async getDocumentStoreChunks(storeId: string, loaderId: string, pageNo: number) {
    let res = await this.http.get(
      `/document-store/chunks/${encodeURIComponent(storeId)}/${encodeURIComponent(loaderId)}/${pageNo}`
    );
    return res.data;
  }

  // ── Vector Upsert (Chatflow-level) ──

  async vectorUpsert(
    chatflowId: string,
    body: {
      stopNodeId?: string;
      overrideConfig?: Record<string, any>;
    }
  ) {
    let res = await this.http.post(`/vector/upsert/${encodeURIComponent(chatflowId)}`, body);
    return res.data;
  }

  // ── Chat Messages ──

  async getChatMessages(
    chatflowId: string,
    params?: {
      chatType?: string;
      order?: string;
      chatId?: string;
      memoryType?: string;
      sessionId?: string;
      startDate?: string;
      endDate?: string;
      feedback?: boolean;
      feedbackType?: string;
    }
  ) {
    let res = await this.http.get(`/chatmessage/${encodeURIComponent(chatflowId)}`, {
      params
    });
    return res.data;
  }

  async deleteChatMessages(
    chatflowId: string,
    params?: {
      chatId?: string;
      chatType?: string;
      sessionId?: string;
      memoryType?: string;
      startDate?: string;
      endDate?: string;
      feedbackType?: string;
      hardDelete?: boolean;
    }
  ) {
    let res = await this.http.delete(`/chatmessage/${encodeURIComponent(chatflowId)}`, {
      params
    });
    return res.data;
  }

  // ── Feedback ──

  async listFeedback(
    chatflowId: string,
    params?: {
      chatId?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    let res = await this.http.get(`/feedback/${encodeURIComponent(chatflowId)}`, { params });
    return res.data;
  }

  async createFeedback(body: {
    chatflowid: string;
    chatId: string;
    messageId: string;
    rating: string;
    content?: string;
  }) {
    let res = await this.http.post('/feedback', body);
    return res.data;
  }

  async updateFeedback(
    feedbackId: string,
    body: {
      rating?: string;
      content?: string;
    }
  ) {
    let res = await this.http.put(`/feedback/${encodeURIComponent(feedbackId)}`, body);
    return res.data;
  }

  // ── Leads ──

  async listLeads(chatflowId: string) {
    let res = await this.http.get(`/leads/${encodeURIComponent(chatflowId)}`);
    return res.data;
  }

  async createLead(body: {
    chatflowid: string;
    chatId: string;
    name?: string;
    email?: string;
    phone?: string;
  }) {
    let res = await this.http.post('/leads', body);
    return res.data;
  }

  // ── Tools ──

  async listTools(params: FlowisePagination = {}) {
    let res = await this.http.get('/tools', { params: pageParams(params) });
    return res.data;
  }

  async getTool(toolId: string) {
    let res = await this.http.get(`/tools/${encodeURIComponent(toolId)}`);
    return res.data;
  }

  async createTool(body: {
    name: string;
    description?: string;
    color?: string;
    schema?: string;
    func?: string;
    iconSrc?: string;
  }) {
    let res = await this.http.post('/tools', body);
    return res.data;
  }

  async updateTool(
    toolId: string,
    body: {
      name?: string;
      description?: string;
      color?: string;
      schema?: string;
      func?: string;
      iconSrc?: string;
    }
  ) {
    let res = await this.http.put(`/tools/${encodeURIComponent(toolId)}`, body);
    return res.data;
  }

  async deleteTool(toolId: string) {
    let res = await this.http.delete(`/tools/${encodeURIComponent(toolId)}`);
    return res.data;
  }

  // ── Variables ──

  async listVariables(params: FlowisePagination = {}) {
    let res = await this.http.get('/variables', { params: pageParams(params) });
    return res.data;
  }

  async createVariable(body: { name: string; value?: string; type?: string }) {
    let res = await this.http.post('/variables', body);
    return res.data;
  }

  async updateVariable(
    variableId: string,
    body: {
      name?: string;
      value?: string;
      type?: string;
    }
  ) {
    let res = await this.http.put(`/variables/${encodeURIComponent(variableId)}`, body);
    return res.data;
  }

  async deleteVariable(variableId: string) {
    let res = await this.http.delete(`/variables/${encodeURIComponent(variableId)}`);
    return res.data;
  }

  // ── Upsert History ──

  async getUpsertHistory(
    chatflowId: string,
    params?: {
      order?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    let res = await this.http.get(`/upsert-history/${encodeURIComponent(chatflowId)}`, {
      params
    });
    return res.data;
  }

  // ── Health Check ──

  async ping() {
    let res = await this.http.get('/ping');
    return res.data;
  }
}
