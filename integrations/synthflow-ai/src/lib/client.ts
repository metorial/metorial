import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.synthflow.ai/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Agents ────────────────────────────────────────────────

  async listAgents(params?: { limit?: number; offset?: number }) {
    let res = await this.axios.get('/assistants/', { params });
    return res.data;
  }

  async getAgent(modelId: string) {
    let res = await this.axios.get(`/assistants/${modelId}`);
    return res.data;
  }

  async createAgent(body: Record<string, any>) {
    let res = await this.axios.post('/assistants', body);
    return res.data;
  }

  async updateAgent(modelId: string, body: Record<string, any>) {
    let res = await this.axios.put(`/assistants/${modelId}`, body);
    return res.data;
  }

  async deleteAgent(modelId: string) {
    let res = await this.axios.delete(`/assistants/${modelId}`);
    return res.data;
  }

  // ─── Calls ─────────────────────────────────────────────────

  async makeCall(body: Record<string, any>) {
    let res = await this.axios.post('/calls', body);
    return res.data;
  }

  async getCall(callId: string) {
    let res = await this.axios.get(`/calls/${callId}`);
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
    let res = await this.axios.get(`/knowledge_base/${knowledgeBaseId}`);
    return res.data;
  }

  async updateKnowledgeBase(knowledgeBaseId: string, body: Record<string, any>) {
    let res = await this.axios.put(`/knowledge_base/${knowledgeBaseId}`, body);
    return res.data;
  }

  async deleteKnowledgeBase(knowledgeBaseId: string) {
    let res = await this.axios.delete(`/knowledge_base/${knowledgeBaseId}`);
    return res.data;
  }

  // ─── Voices ────────────────────────────────────────────────

  async listVoices(params: { workspace: string; limit?: number; offset?: number }) {
    let res = await this.axios.get('/voices', { params });
    return res.data;
  }

  // ─── Phone Numbers ────────────────────────────────────────

  async listPhoneNumbers(params: { workspace: string; limit?: number; offset?: number }) {
    let res = await this.axios.get('/numbers', { params });
    return res.data;
  }

  // ─── Contacts ──────────────────────────────────────────────

  async createContact(body: Record<string, any>) {
    let res = await this.axios.post('/contacts', body);
    return res.data;
  }

  async listContacts(params?: { limit?: number; offset?: number }) {
    let res = await this.axios.get('/contacts', { params });
    return res.data;
  }

  async getContact(contactId: string) {
    let res = await this.axios.get(`/contacts/${contactId}`);
    return res.data;
  }

  async updateContact(contactId: string, body: Record<string, any>) {
    let res = await this.axios.put(`/contacts/${contactId}`, body);
    return res.data;
  }

  async deleteContact(contactId: string) {
    let res = await this.axios.delete(`/contacts/${contactId}`);
    return res.data;
  }

  // ─── Custom Actions ───────────────────────────────────────

  async createAction(body: Record<string, any>) {
    let res = await this.axios.post('/actions', body);
    return res.data;
  }

  async getAction(actionId: string) {
    let res = await this.axios.get(`/actions/${actionId}`);
    return res.data;
  }

  async listActions(params?: { limit?: number; offset?: number }) {
    let res = await this.axios.get('/actions', { params });
    return res.data;
  }

  async updateAction(actionId: string, body: Record<string, any>) {
    let res = await this.axios.put(`/actions/${actionId}`, body);
    return res.data;
  }

  async deleteAction(actionId: string) {
    let res = await this.axios.delete(`/actions/${actionId}`);
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
    let res = await this.axios.post(`/simulation_suites/${suiteId}/execute`, {}, { params });
    return res.data;
  }

  // ─── Subaccounts ──────────────────────────────────────────

  async listSubaccounts() {
    let res = await this.axios.get('/subaccounts/');
    return res.data;
  }

  async getSubaccount(subaccountId: string) {
    let res = await this.axios.get(`/subaccounts/${subaccountId}`);
    return res.data;
  }

  async createSubaccount(body: Record<string, any>) {
    let res = await this.axios.post('/subaccounts', body);
    return res.data;
  }

  async updateSubaccount(subaccountId: string, body: Record<string, any>) {
    let res = await this.axios.put(`/subaccounts/${subaccountId}`, body);
    return res.data;
  }

  async deleteSubaccount(subaccountId: string) {
    let res = await this.axios.delete(`/subaccounts/${subaccountId}`);
    return res.data;
  }

  // ─── Analytics ─────────────────────────────────────────────

  async exportAnalytics(params: { from_date?: string; to_date?: string }) {
    let res = await this.axios.get('/analytics/export', { params });
    return res.data;
  }

  // ─── Webhook Logs ─────────────────────────────────────────

  async listWebhookLogs(params?: { limit?: number; offset?: number }) {
    let res = await this.axios.get('/webhook_logs', { params });
    return res.data;
  }
}
