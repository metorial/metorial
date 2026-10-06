import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; baseUrl?: string }) {
    if (!config.token?.trim())
      throw createApiServiceError(
        'A Synthflow API key is required. Reconnect with a valid key.'
      );
    this.axios = createAuthenticatedAxios({
      baseURL: config.baseUrl ?? 'https://api.synthflow.ai/v2',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      paramsSerializer: { indexes: null },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Synthflow',
          reason: 'synthflow_api_error',
          detailKeys: ['description', 'message', 'error', 'detail']
        })
    });
    this.axios.interceptors.response.use(response => {
      if (['error', 'failed', 'failure'].includes(response.data?.status)) {
        throw createApiServiceError(
          `Synthflow rejected the request: ${response.data?.detail?.description ?? response.data?.message ?? response.data?.status}`
        );
      }
      return response;
    });
  }

  // ─── Agents ────────────────────────────────────────────────

  async listAgents(params?: { limit?: number; offset?: number }) {
    let res = await this.axios.get('/assistants/', { params });
    return res.data;
  }

  async getAgent(modelId: string, includeActions?: boolean) {
    let res = await this.axios.get(`/assistants/${encodeURIComponent(modelId)}`, {
      params: { include_actions: includeActions }
    });
    return res.data;
  }

  async createAgent(body: Record<string, any>) {
    let res = await this.axios.post('/assistants', body);
    return res.data;
  }

  async updateAgent(modelId: string, body: Record<string, any>) {
    let res = await this.axios.put(`/assistants/${encodeURIComponent(modelId)}`, body);
    return res.data;
  }

  async deleteAgent(modelId: string) {
    let res = await this.axios.delete(`/assistants/${encodeURIComponent(modelId)}`);
    return res.data;
  }

  // ─── Calls ─────────────────────────────────────────────────

  async makeCall(body: Record<string, any>) {
    let res = await this.axios.post('/calls', body);
    return res.data;
  }

  async getCall(callId: string) {
    let res = await this.axios.get(`/calls/${encodeURIComponent(callId)}`);
    return res.data;
  }

  async listCalls(params: {
    model_id: string;
    limit?: number;
    offset?: number;
    from_date?: number;
    to_date?: number;
    call_status?: string;
    duration_min?: number;
    duration_max?: number;
    lead_phone_number?: string;
  }) {
    let res = await this.axios.get('/calls', { params });
    return res.data;
  }

  // ─── Knowledge Bases ───────────────────────────────────────

  async createKnowledgeBase(body: Record<string, any>) {
    let res = await this.axios.post('/knowledge_base', body);
    return res.data;
  }

  async getKnowledgeBase(knowledgeBaseId: string) {
    let res = await this.axios.get(`/knowledge_base/${encodeURIComponent(knowledgeBaseId)}`);
    return res.data;
  }

  async updateKnowledgeBase(knowledgeBaseId: string, body: Record<string, any>) {
    let res = await this.axios.put(
      `/knowledge_base/${encodeURIComponent(knowledgeBaseId)}`,
      body
    );
    return res.data;
  }

  async deleteKnowledgeBase(knowledgeBaseId: string) {
    let res = await this.axios.delete(
      `/knowledge_base/${encodeURIComponent(knowledgeBaseId)}`
    );
    return res.data;
  }

  async listKnowledgeBases(params?: { limit?: number; offset?: number }) {
    let res = await this.axios.get('/knowledge_base', { params });
    return res.data;
  }

  async attachKnowledgeBase(id: string, modelId: string) {
    let res = await this.axios.post(
      `/knowledge_base/${encodeURIComponent(id)}/attach`,
      undefined,
      { params: { model_id: modelId } }
    );
    return res.data;
  }

  async detachKnowledgeBase(id: string, modelId: string) {
    let res = await this.axios.post(`/knowledge_base/${encodeURIComponent(id)}/detach`, {
      model_id: modelId
    });
    return res.data;
  }

  async listKnowledgeBaseSources(
    id: string,
    params?: { limit?: number; offset?: number; name?: string }
  ) {
    let res = await this.axios.get(`/knowledge_base/${encodeURIComponent(id)}/sources`, {
      params
    });
    return res.data;
  }

  async addKnowledgeBaseSource(id: string, body: Record<string, unknown>) {
    let res = await this.axios.post(`/knowledge_base/${encodeURIComponent(id)}/sources`, body);
    return res.data;
  }

  async updateKnowledgeBaseSource(
    id: string,
    sourceId: string,
    body: Record<string, unknown>
  ) {
    let res = await this.axios.put(
      `/knowledge_base/${encodeURIComponent(id)}/sources/${encodeURIComponent(sourceId)}`,
      body
    );
    return res.data;
  }

  async deleteKnowledgeBaseSource(id: string, sourceId: string) {
    let res = await this.axios.delete(
      `/knowledge_base/${encodeURIComponent(id)}/sources/${encodeURIComponent(sourceId)}`
    );
    return res.data;
  }

  // ─── Voices ────────────────────────────────────────────────

  async listVoices(params: {
    workspace: string;
    limit?: number;
    offset?: number;
    search?: string;
    provider?: string;
  }) {
    let res = await this.axios.get('/voices', { params });
    return res.data;
  }

  // ─── Phone Numbers ────────────────────────────────────────

  async listPhoneNumbers(params: {
    workspace: string;
    limit?: number;
    offset?: number;
    is_available?: boolean;
  }) {
    let res = await this.axios.get('/numbers', { params });
    return res.data;
  }

  // ─── Contacts ──────────────────────────────────────────────

  async createContact(body: Record<string, any>) {
    let res = await this.axios.post('/contacts', body);
    return res.data;
  }

  async listContacts(params?: { search?: string }) {
    let res = await this.axios.get('/contacts', { params });
    return res.data;
  }

  async getContact(contactId: string) {
    let res = await this.axios.get(`/contacts/${encodeURIComponent(contactId)}`);
    return res.data;
  }

  async updateContact(contactId: string, body: Record<string, any>) {
    let res = await this.axios.patch(`/contacts/${encodeURIComponent(contactId)}`, body);
    return res.data;
  }

  async deleteContact(contactId: string) {
    let res = await this.axios.delete(`/contacts/${encodeURIComponent(contactId)}`);
    return res.data;
  }

  // ─── Custom Actions ───────────────────────────────────────

  async createAction(body: Record<string, any>) {
    let res = await this.axios.post('/actions', body);
    return res.data;
  }

  async getAction(actionId: string, includeAssistants?: boolean) {
    let res = await this.axios.get(`/actions/${encodeURIComponent(actionId)}`, {
      params: { include_assistants: includeAssistants }
    });
    return res.data;
  }

  async listActions(params?: { limit?: number; offset?: number }) {
    let res = await this.axios.get('/actions', { params });
    return res.data;
  }

  async updateAction(actionId: string, body: Record<string, any>) {
    let res = await this.axios.put(`/actions/${encodeURIComponent(actionId)}`, body);
    return res.data;
  }

  async deleteAction(actionId: string) {
    let res = await this.axios.delete(`/actions/${encodeURIComponent(actionId)}`);
    return res.data;
  }

  async attachActions(modelId: string, actionIds: string[]) {
    let res = await this.axios.post('/actions/attach', {
      model_id: modelId,
      actions: actionIds
    });
    return res.data;
  }

  async detachActions(modelId: string, actionIds: string[]) {
    let res = await this.axios.post('/actions/detach', {
      model_id: modelId,
      actions: actionIds
    });
    return res.data;
  }

  // ─── Simulations ──────────────────────────────────────────

  async listSimulationSuites(params?: {
    page_number?: number;
    page_size?: number;
    search?: string;
    model_ids?: string[];
    start_date?: string;
    end_date?: string;
  }) {
    let res = await this.axios.get('/simulation_suites', { params });
    return res.data;
  }

  async executeSimulationSuite(
    suiteId: string,
    params: { target_agent_id: string; max_turns?: number }
  ) {
    let res = await this.axios.post(
      `/simulation_suites/${encodeURIComponent(suiteId)}/execute`,
      undefined,
      { params }
    );
    return res.data;
  }

  async getSimulationSession(sessionId: string) {
    let res = await this.axios.get(`/simulations/session/${encodeURIComponent(sessionId)}`);
    return res.data;
  }

  // ─── Subaccounts ──────────────────────────────────────────

  async listSubaccounts() {
    let res = await this.axios.get('/subaccounts/');
    return res.data;
  }

  async getSubaccount(subaccountId: string) {
    let res = await this.axios.get(`/subaccounts/${encodeURIComponent(subaccountId)}`);
    return res.data;
  }

  async createSubaccount(body: Record<string, any>) {
    let res = await this.axios.post('/subaccounts', body);
    return res.data;
  }

  async updateSubaccount(subaccountId: string, body: Record<string, any>) {
    let res = await this.axios.put(`/subaccounts/${encodeURIComponent(subaccountId)}`, body);
    return res.data;
  }

  async deleteSubaccount(subaccountId: string) {
    let res = await this.axios.delete(`/subaccounts/${encodeURIComponent(subaccountId)}`);
    return res.data;
  }

  // ─── Analytics ─────────────────────────────────────────────

  async exportAnalytics(params: {
    from_date?: string;
    to_date?: string;
    model_id?: string;
    type_of_call?: string;
  }) {
    let res = await this.axios.get('/analytics/', { params });
    return res.data;
  }
}
