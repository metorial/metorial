import { createAxios } from 'slates';

export class FlowiseClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { baseUrl: string; token: string }) {
    this.http = createAxios({
      baseURL: `${config.baseUrl.replace(/\/+$/, '')}/api/v1`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Predictions ──

  async sendPrediction(
    chatflowId: string,
    body: {
      question: string;
      overrideConfig?: Record<string, any>;
      history?: Array<{ role: string; content: string }>;
      uploads?: Array<{ data: string; type: string; name?: string; mime?: string }>;
      streaming?: boolean;
    }
  ) {
    let res = await this.http.post(`/prediction/${chatflowId}`, body);
    return res.data;
  }

  // ── Chatflows ──

  async listChatflows() {
    let res = await this.http.get('/chatflows');
    return res.data;
  }

  async getChatflow(chatflowId: string) {
    let res = await this.http.get(`/chatflows/${chatflowId}`);
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
    let res = await this.http.put(`/chatflows/${chatflowId}`, body);
    return res.data;
  }

  async deleteChatflow(chatflowId: string) {
    let res = await this.http.delete(`/chatflows/${chatflowId}`);
    return res.data;
  }

  // ── Assistants ──

  async listAssistants() {
    let res = await this.http.get('/assistants');
    return res.data;
  }

  async getAssistant(assistantId: string) {
    let res = await this.http.get(`/assistants/${assistantId}`);
    return res.data;
  }

  async createAssistant(body: { details: string; credential?: string; iconSrc?: string }) {
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
    let res = await this.http.put(`/assistants/${assistantId}`, body);
    return res.data;
  }

  async deleteAssistant(assistantId: string) {
    let res = await this.http.delete(`/assistants/${assistantId}`);
    return res.data;
  }

  // ── Document Stores ──

  async listDocumentStores() {
    let res = await this.http.get('/document-store/store');
    return res.data;
  }

  async getDocumentStore(storeId: string) {
    let res = await this.http.get(`/document-store/store/${storeId}`);
    return res.data;
  }

  async createDocumentStore(body: { name: string; description?: string }) {
    let res = await this.http.post('/document-store/store', body);
    return res.data;
  }

  async updateDocumentStore(storeId: string, body: { name?: string; description?: string }) {
    let res = await this.http.put(`/document-store/store/${storeId}`, body);
    return res.data;
  }

  async deleteDocumentStore(storeId: string) {
    let res = await this.http.delete(`/document-store/store/${storeId}`);
    return res.data;
  }

  async upsertDocumentStore(storeId: string, body: Record<string, any>) {
    let res = await this.http.post(`/document-store/upsert/${storeId}`, body);
    return res.data;
  }

  async refreshDocumentStore(storeId: string) {
    let res = await this.http.post(`/document-store/refresh/${storeId}`);
    return res.data;
  }

  async queryDocumentStoreVectorStore(body: { storeId: string; query: string }) {
    let res = await this.http.post('/document-store/vectorstore/query', body);
    return res.data;
  }

  async deleteDocumentStoreVectorStore(storeId: string) {
    let res = await this.http.delete(`/document-store/vectorstore/${storeId}`);
    return res.data;
  }

  async getDocumentStoreChunks(storeId: string, loaderId: string, pageNo: number) {
    let res = await this.http.get(`/document-store/chunks/${storeId}/${loaderId}/${pageNo}`);
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
    let res = await this.http.post(`/vector/upsert/${chatflowId}`, body);
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
    let res = await this.http.get(`/chatmessage/${chatflowId}`, { params });
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
    let res = await this.http.delete(`/chatmessage/${chatflowId}`, { params });
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
    let res = await this.http.get(`/feedback/${chatflowId}`, { params });
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
    let res = await this.http.put(`/feedback/${feedbackId}`, body);
    return res.data;
  }

  // ── Leads ──

  async listLeads(chatflowId: string) {
    let res = await this.http.get(`/leads/${chatflowId}`);
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

  async listTools() {
    let res = await this.http.get('/tools');
    return res.data;
  }

  async getTool(toolId: string) {
    let res = await this.http.get(`/tools/${toolId}`);
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
    let res = await this.http.put(`/tools/${toolId}`, body);
    return res.data;
  }

  async deleteTool(toolId: string) {
    let res = await this.http.delete(`/tools/${toolId}`);
    return res.data;
  }

  // ── Variables ──

  async listVariables() {
    let res = await this.http.get('/variables');
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
    let res = await this.http.put(`/variables/${variableId}`, body);
    return res.data;
  }

  async deleteVariable(variableId: string) {
    let res = await this.http.delete(`/variables/${variableId}`);
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
    let res = await this.http.get(`/upsert-history/${chatflowId}`, { params });
    return res.data;
  }

  // ── Health Check ──

  async ping() {
    let res = await this.http.get('/ping');
    return res.data;
  }
}
