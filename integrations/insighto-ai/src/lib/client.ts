import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export let getObjectResult = (result: any): Record<string, any> => {
  let data = result?.data ?? result;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw createApiServiceError('Insighto.ai returned an invalid resource response.');
  }
  return data;
};

export let getListResult = (result: any) => {
  let data = result?.data ?? result;
  let items = Array.isArray(data) ? data : data?.items;
  if (!Array.isArray(items)) {
    throw createApiServiceError('Insighto.ai returned an invalid list response.');
  }
  return {
    items: items as any[],
    total: data?.total ?? result?.total ?? items.length,
    nextPage: data?.next_page as number | null | undefined
  };
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'An Insighto.ai API key is required. Reconnect your account.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.insighto.ai',
      params: { api_key: config.token },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Insighto.ai',
          reason: 'insighto_ai_api_error'
        })
    });
    this.axios.interceptors.request.use(request => {
      let { page, size } = request.params ?? {};
      let maxSize = request.url === '/api/v1/voice/voices' ? 1000 : 100;
      if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
        throw createApiServiceError('page must be a whole number of at least 1.');
      }
      if (size !== undefined && (!Number.isInteger(size) || size < 1 || size > maxSize)) {
        throw createApiServiceError(`size must be a whole number between 1 and ${maxSize}.`);
      }
      return request;
    });
  }

  private pathId(id: string, label: string) {
    if (!id?.trim()) {
      throw createApiServiceError(`${label} is required for this operation.`);
    }
    return encodeURIComponent(id);
  }

  // ── Assistants ──

  async listAssistants(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/assistant', { params });
    return response.data;
  }

  async getAssistant(assistantId: string) {
    let response = await this.axios.get(
      `/api/v1/assistant/${this.pathId(assistantId, 'Assistant ID')}`
    );
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
    let response = await this.axios.put(
      `/api/v1/assistant/${this.pathId(assistantId, 'Assistant ID')}`,
      data
    );
    return response.data;
  }

  async deleteAssistant(assistantId: string) {
    let response = await this.axios.delete(
      `/api/v1/assistant/${this.pathId(assistantId, 'Assistant ID')}`
    );
    return response.data;
  }

  async getAssistantWidgets(assistantId: string) {
    let response = await this.axios.get(
      `/api/v1/assistant/${this.pathId(assistantId, 'Assistant ID')}/widgets`
    );
    return response.data;
  }

  async getAssistantDataSources(assistantId: string) {
    let response = await this.axios.get(
      `/api/v1/assistant/${this.pathId(assistantId, 'Assistant ID')}/data_sources`
    );
    return response.data;
  }

  async linkDataSourceToAssistant(assistantId: string, datasourceId: string) {
    let response = await this.axios.post(
      `/api/v1/assistant/${this.pathId(assistantId, 'Assistant ID')}/data_source/${this.pathId(datasourceId, 'Data source ID')}`
    );
    return response.data;
  }

  // ── Widgets ──

  async listWidgets(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/widget', { params });
    return response.data;
  }

  async getWidget(widgetId: string) {
    let response = await this.axios.get(
      `/api/v1/widget/${this.pathId(widgetId, 'Widget ID')}`
    );
    return response.data;
  }

  async createWidget(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/widget', data);
    return response.data;
  }

  async updateWidget(widgetId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(
      `/api/v1/widget/${this.pathId(widgetId, 'Widget ID')}`,
      data
    );
    return response.data;
  }

  async deleteWidget(widgetId: string) {
    let response = await this.axios.delete(
      `/api/v1/widget/${this.pathId(widgetId, 'Widget ID')}`
    );
    return response.data;
  }

  // ── Contacts ──

  async listContacts(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/contact', { params });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(
      `/api/v1/contact/${this.pathId(contactId, 'Contact ID')}`
    );
    return response.data;
  }

  async upsertContact(data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    custom_fields?: Record<string, unknown>;
  }) {
    if (!data.email && !data.phone) {
      throw createApiServiceError(
        'Provide an email address or phone number to upsert a contact.'
      );
    }
    let response = await this.axios.post('/api/v1/contact/upsert', undefined, {
      params: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone
      }
    });
    if (data.custom_fields !== undefined) {
      let contact = getObjectResult(response.data);
      await this.updateContact(contact.id, { custom_fields: data.custom_fields });
    }
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      channels?: Record<string, unknown>;
      custom_fields?: Record<string, unknown>;
    }
  ) {
    let response = await this.axios.put(
      `/api/v1/contact/${this.pathId(contactId, 'Contact ID')}`,
      data
    );
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(
      `/api/v1/contact/${this.pathId(contactId, 'Contact ID')}`
    );
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
    let response = await this.axios.get(
      `/api/v1/conversation/${this.pathId(conversationId, 'Conversation ID')}`
    );
    return response.data;
  }

  async getConversationTranscript(conversationId: string) {
    let response = await this.axios.get(
      `/api/v1/conversation/${this.pathId(conversationId, 'Conversation ID')}/transcript`
    );
    return response.data;
  }

  async getConversationsByContact(
    contactId: string,
    params?: { page?: number; size?: number }
  ) {
    let response = await this.axios.get(
      `/api/v1/conversation/by-contact/${this.pathId(contactId, 'Contact ID')}`,
      { params }
    );
    return response.data;
  }

  async deleteConversation(conversationId: string) {
    let response = await this.axios.delete(
      `/api/v1/conversation/${this.pathId(conversationId, 'Conversation ID')}`
    );
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
    let response = await this.axios.post(
      `/api/v1/call/${this.pathId(widgetId, 'Widget ID')}`,
      data
    );
    return response.data;
  }

  async bulkCall(
    widgetId: string,
    data: {
      contact_ids?: string[];
      prompt_dynamic_variables?: Record<string, string>;
    }
  ) {
    let response = await this.axios.post(
      `/api/v1/call/${this.pathId(widgetId, 'Widget ID')}/contacts`,
      data
    );
    return response.data;
  }

  async disconnectCall(conversationId: string) {
    let response = await this.axios.patch(
      `/api/v1/call/disconnect/${this.pathId(conversationId, 'Conversation ID')}`
    );
    return response.data;
  }

  // ── Messaging ──

  async sendMessage(
    widgetId: string,
    data: {
      to: string;
      message: string;
      start_new_conversation?: boolean;
      conversation_id?: string;
      widget_parameters?: Record<string, unknown>;
    }
  ) {
    let response = await this.axios.post(
      `/api/v1/messaging/${this.pathId(widgetId, 'Widget ID')}`,
      data
    );
    return response.data;
  }

  // ── Data Sources ──

  async listDataSources(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/datasource', { params });
    return response.data;
  }

  async getDataSource(datasourceId: string) {
    let response = await this.axios.get(
      `/api/v1/datasource/${this.pathId(datasourceId, 'Data source ID')}`
    );
    return response.data;
  }

  async createDataSource(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/datasource', data);
    return response.data;
  }

  async deleteDataSource(datasourceId: string) {
    let response = await this.axios.delete(
      `/api/v1/datasource/${this.pathId(datasourceId, 'Data source ID')}`
    );
    return response.data;
  }

  async addTextBlob(datasourceId: string, data: { text: string; name?: string }) {
    let response = await this.axios.post(
      `/api/v1/datasource/${this.pathId(datasourceId, 'Data source ID')}/text_blob`,
      { text: data.text },
      { params: { ds_type: 'text_blob', name: data.name } }
    );
    return response.data;
  }

  async listDataSourceFiles(datasourceId: string) {
    let response = await this.axios.get(
      `/api/v1/datasource/${this.pathId(datasourceId, 'Data source ID')}/data_source_files`
    );
    return response.data;
  }

  // ── Campaigns ──

  async listCampaigns(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/campaign/list', { params });
    return response.data;
  }

  async getCampaign(campaignId: string) {
    let response = await this.axios.get(
      `/api/v1/campaign/get/${this.pathId(campaignId, 'Campaign ID')}`
    );
    return response.data;
  }

  async createCampaign(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/campaign/create', data);
    return response.data;
  }

  async updateCampaign(campaignId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(
      `/api/v1/campaign/update/${this.pathId(campaignId, 'Campaign ID')}`,
      data
    );
    return response.data;
  }

  async deleteCampaign(campaignId: string) {
    let response = await this.axios.delete(
      `/api/v1/campaign/${this.pathId(campaignId, 'Campaign ID')}`
    );
    return response.data;
  }

  async runCampaign(widgetId: string, data: Record<string, unknown>) {
    let response = await this.axios.post(
      `/api/v1/campaign/run/${this.pathId(widgetId, 'Widget ID')}`,
      data
    );
    return response.data;
  }

  async updateCampaignContacts(campaignId: string, contactIds: string[]) {
    let response = await this.axios.put(
      `/api/v1/campaign_contact/${this.pathId(campaignId, 'Campaign ID')}`,
      contactIds
    );
    return response.data;
  }

  async listCampaignContacts(campaignId: string, params?: { page?: number; size?: number }) {
    let response = await this.axios.get(
      `/api/v1/campaign_contact/list/${this.pathId(campaignId, 'Campaign ID')}`,
      { params }
    );
    return response.data;
  }

  // ── Forms ──

  async listForms(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/form/list', { params });
    return response.data;
  }

  async getForm(formId: string) {
    let response = await this.axios.get(`/api/v1/form/${this.pathId(formId, 'Form ID')}`);
    return response.data;
  }

  async createForm(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/form', data);
    return response.data;
  }

  async updateForm(formId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(
      `/api/v1/form/${this.pathId(formId, 'Form ID')}`,
      data
    );
    return response.data;
  }

  async deleteForm(formId: string) {
    let response = await this.axios.delete(`/api/v1/form/${this.pathId(formId, 'Form ID')}`);
    return response.data;
  }

  async listCapturedForms(formId: string, params?: { page?: number; size?: number }) {
    let response = await this.axios.get(
      `/api/v1/capturedform/${this.pathId(formId, 'Form ID')}`,
      { params }
    );
    return response.data;
  }

  // ── Webhooks ──

  async listWebhooks(params?: { page?: number; size?: number }) {
    let response = await this.axios.get('/api/v1/outbound_webhook/list', { params });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(
      `/api/v1/outbound_webhook/${this.pathId(webhookId, 'Webhook ID')}`
    );
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
    let response = await this.axios.put(
      `/api/v1/outbound_webhook/${this.pathId(webhookId, 'Webhook ID')}`,
      data
    );
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(
      `/api/v1/outbound_webhook/${this.pathId(webhookId, 'Webhook ID')}`
    );
    return response.data;
  }

  async getWebhookLogs(webhookId: string, params?: { page?: number; size?: number }) {
    let response = await this.axios.get(
      `/api/v1/outbound_webhook/${this.pathId(webhookId, 'Webhook ID')}/logs`,
      { params }
    );
    return response.data;
  }

  // ── Intents ──

  async listIntents() {
    let response = await this.axios.get('/api/v1/intent/list');
    return response.data;
  }

  async getIntent(intentId: string) {
    let response = await this.axios.get(
      `/api/v1/intent/${this.pathId(intentId, 'Intent ID')}`
    );
    return response.data;
  }

  async createIntent(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/intent', data);
    return response.data;
  }

  async deleteIntent(intentId: string) {
    let response = await this.axios.delete(
      `/api/v1/intent/${this.pathId(intentId, 'Intent ID')}`
    );
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
    let response = await this.axios.get(
      `/api/v1/prompt/${this.pathId(promptId, 'Prompt ID')}`
    );
    return response.data;
  }

  async createPrompt(data: Record<string, unknown>) {
    let response = await this.axios.post('/api/v1/prompt', data);
    return response.data;
  }

  async updatePrompt(promptId: string, data: Record<string, unknown>) {
    let response = await this.axios.put(
      `/api/v1/prompt/${this.pathId(promptId, 'Prompt ID')}`,
      data
    );
    return response.data;
  }

  async deletePrompt(promptId: string) {
    let response = await this.axios.delete(
      `/api/v1/prompt/${this.pathId(promptId, 'Prompt ID')}`
    );
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
    let response = await this.axios.delete(
      `/api/v1/contact_custom_field/${this.pathId(fieldId, 'Custom field ID')}`
    );
    return response.data;
  }

  // ── User ──

  async getUser() {
    let response = await this.axios.get('/api/v1/user');
    return response.data;
  }

  // ── Voices ──

  async listVoices(params?: {
    me?: boolean;
    language?: string;
    provider?: string;
    owner_type?: string;
    search_term?: string;
    page?: number;
    size?: number;
  }) {
    let response = await this.axios.get('/api/v1/voice/voices', { params });
    return response.data;
  }

  // ── Tools ──

  async listTools() {
    let response = await this.axios.get('/api/v1/tool/list');
    return response.data;
  }

  async getTool(toolId: string) {
    let response = await this.axios.get(`/api/v1/tool/${this.pathId(toolId, 'Tool ID')}`);
    return response.data;
  }
}
