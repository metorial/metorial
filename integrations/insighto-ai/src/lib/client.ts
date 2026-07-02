import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.insighto.ai',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Assistants ──

  async listAssistants(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/assistant', { params });
    return response.data;
  }

  async getAssistant(assistantId: string) {
    let response = await this.axios.get(`/api/v1/assistant/${assistantId}`);
    return response.data;
  }

  async createAssistant(data: {
    assistant_type: string;
    llm_model: string;
    name?: string;
    description?: string;
    system_prompt?: string;
    voice?: boolean;
    voice_languages?: string[];
    webhook_id?: string;
    has_human_agent?: boolean;
    use_tools?: boolean;
    show_images?: boolean;
    conversation_flow_id?: string;
  }) {
    let response = await this.axios.post('/api/v1/assistant', data);
    return response.data;
  }

  async updateAssistant(
    assistantId: string,
    data: {
      name?: string;
      description?: string;
      system_prompt?: string;
      llm_model?: string;
      voice?: boolean;
      voice_languages?: string[];
      webhook_id?: string | null;
      has_human_agent?: boolean;
      use_tools?: boolean;
      show_images?: boolean;
      conversation_flow_id?: string | null;
    }
  ) {
    let response = await this.axios.put(`/api/v1/assistant/${assistantId}`, data);
    return response.data;
  }

  async deleteAssistant(assistantId: string) {
    let response = await this.axios.delete(`/api/v1/assistant/${assistantId}`);
    return response.data;
  }

  async getAssistantWidgets(assistantId: string) {
    let response = await this.axios.get(`/api/v1/assistant/${assistantId}/widgets`);
    return response.data;
  }

  async getAssistantDataSources(assistantId: string) {
    let response = await this.axios.get(`/api/v1/assistant/${assistantId}/data_sources`);
    return response.data;
  }

  async linkDataSourceToAssistant(assistantId: string, datasourceId: string) {
    let response = await this.axios.post(
      `/api/v1/assistant/${assistantId}/data_source/${datasourceId}`
    );
    return response.data;
  }

  // ── Widgets ──

  async listWidgets(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/widget', { params });
    return response.data;
  }

  async getWidget(widgetId: string) {
    let response = await this.axios.get(`/api/v1/widget/${widgetId}`);
    return response.data;
  }

  async createWidget(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/widget', data);
    return response.data;
  }

  async updateWidget(widgetId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/api/v1/widget/${widgetId}`, data);
    return response.data;
  }

  async deleteWidget(widgetId: string) {
    let response = await this.axios.delete(`/api/v1/widget/${widgetId}`);
    return response.data;
  }

  // ── Contacts ──

  async listContacts(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/contact', { params });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/api/v1/contact/${contactId}`);
    return response.data;
  }

  async upsertContact(data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    custom_fields?: Record<string, unknown>;
  }) {
    let response = await this.axios.post('/api/v1/contact/upsert', data);
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      custom_fields?: Record<string, unknown>;
    }
  ) {
    let response = await this.axios.put(`/api/v1/contact/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/api/v1/contact/${contactId}`);
    return response.data;
  }

  // ── Conversations ──

  async listConversations(params?: {
    page?: number;
    size?: number;
    date_from?: string;
    date_to?: string;
  }) {
    let response = await this.axios.get('/api/v1/conversation', { params });
    return response.data;
  }

  async getConversation(conversationId: string) {
    let response = await this.axios.get(`/api/v1/conversation/${conversationId}`);
    return response.data;
  }

  async getConversationTranscript(conversationId: string) {
    let response = await this.axios.get(`/api/v1/conversation/${conversationId}/transcript`);
    return response.data;
  }

  async getConversationsByContact(contactId: string) {
    let response = await this.axios.get(`/api/v1/conversation/by-contact/${contactId}`);
    return response.data;
  }

  async deleteConversation(conversationId: string) {
    let response = await this.axios.delete(`/api/v1/conversation/${conversationId}`);
    return response.data;
  }

  // ── Calling ──

  async makeCall(
    widgetId: string,
    data: {
      to: string;
      prompt_dynamic_variables?: Record<string, string>;
    }
  ) {
    let response = await this.axios.post(`/api/v1/call/${widgetId}`, data);
    return response.data;
  }

  async bulkCall(
    widgetId: string,
    data: {
      contact_ids?: string[];
      prompt_dynamic_variables?: Record<string, string>;
    }
  ) {
    let response = await this.axios.post(`/api/v1/call/${widgetId}/contacts`, data);
    return response.data;
  }

  async disconnectCall(conversationId: string) {
    let response = await this.axios.patch(`/api/v1/call/disconnect/${conversationId}`);
    return response.data;
  }

  // ── Messaging ──

  async sendMessage(
    widgetId: string,
    data: {
      to: string;
      message: string;
    }
  ) {
    let response = await this.axios.post(`/api/v1/messaging/${widgetId}`, data);
    return response.data;
  }

  // ── Data Sources ──

  async listDataSources(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/datasource', { params });
    return response.data;
  }

  async getDataSource(datasourceId: string) {
    let response = await this.axios.get(`/api/v1/datasource/${datasourceId}`);
    return response.data;
  }

  async createDataSource(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/datasource', data);
    return response.data;
  }

  async deleteDataSource(datasourceId: string) {
    let response = await this.axios.delete(`/api/v1/datasource/${datasourceId}`);
    return response.data;
  }

  async addTextBlob(datasourceId: string, data: { text: string; name?: string }) {
    let response = await this.axios.post(`/api/v1/datasource/${datasourceId}/text_blob`, data);
    return response.data;
  }

  async listDataSourceFiles(datasourceId: string) {
    let response = await this.axios.get(
      `/api/v1/datasource/${datasourceId}/data_source_files`
    );
    return response.data;
  }

  // ── Campaigns ──

  async listCampaigns(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/campaign/list', { params });
    return response.data;
  }

  async getCampaign(campaignId: string) {
    let response = await this.axios.get(`/api/v1/campaign/get/${campaignId}`);
    return response.data;
  }

  async createCampaign(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/campaign/create', data);
    return response.data;
  }

  async updateCampaign(campaignId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/api/v1/campaign/update/${campaignId}`, data);
    return response.data;
  }

  async deleteCampaign(campaignId: string) {
    let response = await this.axios.delete(`/api/v1/campaign/${campaignId}`);
    return response.data;
  }

  async runCampaign(widgetId: string, data: Record<string, unknown>) {
    let response = await this.axios.post(`/api/v1/campaign/run/${widgetId}`, data);
    return response.data;
  }

  // ── Forms ──

  async listForms(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/form/list', { params });
    return response.data;
  }

  async getForm(formId: string) {
    let response = await this.axios.get(`/api/v1/form/${formId}`);
    return response.data;
  }

  async createForm(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/form', data);
    return response.data;
  }

  async updateForm(formId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/api/v1/form/${formId}`, data);
    return response.data;
  }

  async deleteForm(formId: string) {
    let response = await this.axios.delete(`/api/v1/form/${formId}`);
    return response.data;
  }

  async listCapturedForms(formId: string) {
    let response = await this.axios.get(`/api/v1/capturedform/${formId}`);
    return response.data;
  }

  // ── Webhooks ──

  async listWebhooks() {
    let response = await this.axios.get('/api/v1/outbound_webhook/list');
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`/api/v1/outbound_webhook/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: { endpoint: string; name: string; enabled?: boolean }) {
    let response = await this.axios.post('/api/v1/outbound_webhook', data);
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    data: { endpoint?: string; name?: string; enabled?: boolean }
  ) {
    let response = await this.axios.put(`/api/v1/outbound_webhook/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/api/v1/outbound_webhook/${webhookId}`);
    return response.data;
  }

  async getWebhookLogs(webhookId: string) {
    let response = await this.axios.get(`/api/v1/outbound_webhook/${webhookId}/logs`);
    return response.data;
  }

  // ── Intents ──

  async listIntents() {
    let response = await this.axios.get('/api/v1/intent/list');
    return response.data;
  }

  async getIntent(intentId: string) {
    let response = await this.axios.get(`/api/v1/intent/${intentId}`);
    return response.data;
  }

  async createIntent(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/intent', data);
    return response.data;
  }

  async deleteIntent(intentId: string) {
    let response = await this.axios.delete(`/api/v1/intent/${intentId}`);
    return response.data;
  }

  async listCapturedIntents() {
    let response = await this.axios.get('/api/v1/capturedintent');
    return response.data;
  }

  // ── Prompts ──

  async listPrompts(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/prompt', { params });
    return response.data;
  }

  async getPrompt(promptId: string) {
    let response = await this.axios.get(`/api/v1/prompt/${promptId}`);
    return response.data;
  }

  async createPrompt(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/prompt', data);
    return response.data;
  }

  async updatePrompt(promptId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(`/api/v1/prompt/${promptId}`, data);
    return response.data;
  }

  async deletePrompt(promptId: string) {
    let response = await this.axios.delete(`/api/v1/prompt/${promptId}`);
    return response.data;
  }

  // ── Tags ──

  async listTags() {
    let response = await this.axios.get('/api/v1/tag/list');
    return response.data;
  }

  // ── Custom Fields ──

  async listCustomFields() {
    let response = await this.axios.get('/api/v1/contact_custom_field');
    return response.data;
  }

  async createCustomField(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/contact_custom_field', data);
    return response.data;
  }

  async deleteCustomField(fieldId: string) {
    let response = await this.axios.delete(`/api/v1/contact_custom_field/${fieldId}`);
    return response.data;
  }

  // ── User ──

  async getUser() {
    let response = await this.axios.get('/api/v1/user');
    return response.data;
  }

  // ── Voices ──

  async listVoices() {
    let response = await this.axios.get('/api/v1/voice/voices');
    return response.data;
  }

  // ── Tools ──

  async listTools() {
    let response = await this.axios.get('/api/v1/tool/list');
    return response.data;
  }

  async getTool(toolId: string) {
    let response = await this.axios.get(`/api/v1/tool/${toolId}`);
    return response.data;
  }
}
