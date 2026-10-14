import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ClientConfig {
  token: string;
  runAsUserId?: string;
}

export interface ListParams {
  cursor?: string;
  take?: number;
  order?: 'desc' | 'asc';
  filter?: Record<string, any>;
}

export interface ListResponse<T> {
  items: T[];
  cursor?: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: ClientConfig) {
    if (!config.token.trim()) {
      throw createApiServiceError('A ChatBotKit API secret key is required.');
    }
    let headers: Record<string, string> = { Accept: 'application/json' };
    if (config.runAsUserId) {
      headers['X-RunAs-UserId'] = config.runAsUserId;
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.chatbotkit.com/v1',
      authHeader: { value: `Bearer ${config.token.trim()}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ChatBotKit',
          reason: 'chatbotkit_api_error'
        }),
      headers
    });
  }

  async listModels(params?: ListParams & { type?: string }): Promise<ListResponse<any>> {
    let response = await this.axios.get('/platform/model/list', { params });
    return response.data;
  }

  // ---- Bots ----

  async listBots(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/bot/list', { params });
    return response.data;
  }

  async fetchBot(botId: string): Promise<any> {
    let response = await this.axios.get(`/bot/${encodeURIComponent(botId)}/fetch`);
    return response.data;
  }

  async createBot(data: {
    name?: string;
    description?: string;
    backstory?: string;
    model?: string;
    datasetId?: string;
    skillsetId?: string;
    privacy?: boolean;
    moderation?: boolean;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/bot/create', data);
    return response.data;
  }

  async updateBot(botId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/bot/${encodeURIComponent(botId)}/update`, data);
    return response.data;
  }

  async deleteBot(botId: string): Promise<any> {
    let response = await this.axios.post(`/bot/${encodeURIComponent(botId)}/delete`);
    return response.data;
  }

  // ---- Conversations ----

  async listConversations(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/conversation/list', { params });
    return response.data;
  }

  async fetchConversation(conversationId: string): Promise<any> {
    let response = await this.axios.get(
      `/conversation/${encodeURIComponent(conversationId)}/fetch`
    );
    return response.data;
  }

  async createConversation(data: {
    botId?: string;
    backstory?: string;
    model?: string;
    datasetId?: string;
    skillsetId?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/conversation/create', data);
    return response.data;
  }

  async updateConversation(conversationId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${encodeURIComponent(conversationId)}/update`,
      data
    );
    return response.data;
  }

  async deleteConversation(conversationId: string): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${encodeURIComponent(conversationId)}/delete`
    );
    return response.data;
  }

  async sendMessage(
    conversationId: string,
    data: { text: string; meta?: Record<string, any> }
  ): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${encodeURIComponent(conversationId)}/send`,
      data
    );
    return response.data;
  }

  async receiveMessage(conversationId: string): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${encodeURIComponent(conversationId)}/receive`
    );
    return response.data;
  }

  async completeConversation(data: {
    conversationId?: string;
    botId?: string;
    text?: string;
    backstory?: string;
    model?: string;
    datasetId?: string;
    skillsetId?: string;
    messages?: Array<{ type: string; text: string }>;
    meta?: Record<string, any>;
  }): Promise<any> {
    if (data.conversationId) {
      let { conversationId, ...rest } = data;
      let response = await this.axios.post(
        `/conversation/${encodeURIComponent(conversationId)}/complete`,
        rest
      );
      return response.data;
    }
    let { text, meta, ...rest } = data;
    let response = await this.axios.post('/conversation/complete', {
      ...rest,
      messages: data.messages ?? [{ type: 'user', text: text ?? '', meta }]
    });
    return response.data;
  }

  async listMessages(conversationId: string, params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get(
      `/conversation/${encodeURIComponent(conversationId)}/message/list`,
      {
        params
      }
    );
    return response.data;
  }

  async createMessage(
    conversationId: string,
    data: {
      type: string;
      text: string;
      meta?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${encodeURIComponent(conversationId)}/message/create`,
      data
    );
    return response.data;
  }

  // ---- Datasets ----

  async listDatasets(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/dataset/list', { params });
    return response.data;
  }

  async fetchDataset(datasetId: string): Promise<any> {
    let response = await this.axios.get(`/dataset/${encodeURIComponent(datasetId)}/fetch`);
    return response.data;
  }

  async createDataset(data: {
    name?: string;
    description?: string;
    store?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/dataset/create', data);
    return response.data;
  }

  async updateDataset(datasetId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/dataset/${encodeURIComponent(datasetId)}/update`,
      data
    );
    return response.data;
  }

  async deleteDataset(datasetId: string): Promise<any> {
    let response = await this.axios.post(`/dataset/${encodeURIComponent(datasetId)}/delete`);
    return response.data;
  }

  // ---- Dataset Records ----

  async listRecords(datasetId: string, params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get(
      `/dataset/${encodeURIComponent(datasetId)}/record/list`,
      { params }
    );
    return response.data;
  }

  async createRecord(
    datasetId: string,
    data: {
      text: string;
      meta?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/dataset/${encodeURIComponent(datasetId)}/record/create`,
      data
    );
    return response.data;
  }

  async fetchRecord(datasetId: string, recordId: string): Promise<any> {
    let response = await this.axios.get(
      `/dataset/${encodeURIComponent(datasetId)}/record/${encodeURIComponent(recordId)}/fetch`
    );
    return response.data;
  }

  async updateRecord(
    datasetId: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(
      `/dataset/${encodeURIComponent(datasetId)}/record/${encodeURIComponent(recordId)}/update`,
      data
    );
    return response.data;
  }

  async deleteRecord(datasetId: string, recordId: string): Promise<any> {
    let response = await this.axios.post(
      `/dataset/${encodeURIComponent(datasetId)}/record/${encodeURIComponent(recordId)}/delete`
    );
    return response.data;
  }

  async searchRecords(datasetId: string, query: string): Promise<any> {
    let response = await this.axios.post(`/dataset/${encodeURIComponent(datasetId)}/search`, {
      search: query
    });
    return response.data;
  }

  // ---- Skillsets ----

  async listSkillsets(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/skillset/list', { params });
    return response.data;
  }

  async fetchSkillset(skillsetId: string): Promise<any> {
    let response = await this.axios.get(`/skillset/${encodeURIComponent(skillsetId)}/fetch`);
    return response.data;
  }

  async createSkillset(data: {
    name?: string;
    description?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/skillset/create', data);
    return response.data;
  }

  async updateSkillset(skillsetId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/skillset/${encodeURIComponent(skillsetId)}/update`,
      data
    );
    return response.data;
  }

  async deleteSkillset(skillsetId: string): Promise<any> {
    let response = await this.axios.post(`/skillset/${encodeURIComponent(skillsetId)}/delete`);
    return response.data;
  }

  // ---- Abilities (sub-resource of Skillsets) ----

  async listAbilities(skillsetId: string, params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get(
      `/skillset/${encodeURIComponent(skillsetId)}/ability/list`,
      { params }
    );
    return response.data;
  }

  async createAbility(
    skillsetId: string,
    data: {
      name?: string;
      description?: string;
      instruction?: string;
      meta?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/skillset/${encodeURIComponent(skillsetId)}/ability/create`,
      data
    );
    return response.data;
  }

  async updateAbility(
    skillsetId: string,
    abilityId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(
      `/skillset/${encodeURIComponent(skillsetId)}/ability/${encodeURIComponent(abilityId)}/update`,
      data
    );
    return response.data;
  }

  async deleteAbility(skillsetId: string, abilityId: string): Promise<any> {
    let response = await this.axios.post(
      `/skillset/${encodeURIComponent(skillsetId)}/ability/${encodeURIComponent(abilityId)}/delete`
    );
    return response.data;
  }

  // ---- Contacts ----

  async listContacts(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/contact/list', { params });
    return response.data;
  }

  async fetchContact(contactId: string): Promise<any> {
    let response = await this.axios.get(`/contact/${encodeURIComponent(contactId)}/fetch`);
    return response.data;
  }

  async createContact(data: {
    fingerprint?: string;
    name?: string;
    email?: string;
    phone?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/contact/create', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/contact/${encodeURIComponent(contactId)}/update`,
      data
    );
    return response.data;
  }

  async deleteContact(contactId: string): Promise<any> {
    let response = await this.axios.post(`/contact/${encodeURIComponent(contactId)}/delete`);
    return response.data;
  }

  async ensureContact(data: {
    fingerprint: string;
    name?: string;
    email?: string;
    phone?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/contact/ensure', data);
    return response.data;
  }

  async listContactConversations(
    contactId: string,
    params?: ListParams
  ): Promise<ListResponse<any>> {
    let response = await this.axios.get(
      `/contact/${encodeURIComponent(contactId)}/conversation/list`,
      { params }
    );
    return response.data;
  }

  // ---- Memories ----

  async listMemories(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/memory/list', { params });
    return response.data;
  }

  async fetchMemory(memoryId: string): Promise<any> {
    let response = await this.axios.get(`/memory/${encodeURIComponent(memoryId)}/fetch`);
    return response.data;
  }

  async createMemory(data: {
    text: string;
    botId?: string;
    contactId?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/memory/create', data);
    return response.data;
  }

  async updateMemory(memoryId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/memory/${encodeURIComponent(memoryId)}/update`,
      data
    );
    return response.data;
  }

  async deleteMemory(memoryId: string): Promise<any> {
    let response = await this.axios.post(`/memory/${encodeURIComponent(memoryId)}/delete`);
    return response.data;
  }

  async searchBotMemories(botId: string, query: string): Promise<any> {
    let response = await this.axios.post(`/bot/${encodeURIComponent(botId)}/memory/search`, {
      search: query
    });
    return response.data;
  }

  async searchContactMemories(contactId: string, query: string): Promise<any> {
    let response = await this.axios.post(
      `/contact/${encodeURIComponent(contactId)}/memory/search`,
      { search: query }
    );
    return response.data;
  }

  // ---- Integrations ----

  async listIntegrations(params?: ListParams, type?: string): Promise<ListResponse<any>> {
    let path = type ? `/integration/${encodeURIComponent(type)}/list` : '/integration/list';
    let response = await this.axios.get(path, { params });
    return response.data;
  }

  async fetchIntegration(integrationId: string, type?: string): Promise<any> {
    let path = type
      ? `/integration/${encodeURIComponent(type)}/${encodeURIComponent(integrationId)}/fetch`
      : `/integration/${encodeURIComponent(integrationId)}/fetch`;
    let response = await this.axios.get(path);
    return response.data;
  }

  async createIntegration(data: Record<string, any>): Promise<any> {
    let { type, ...body } = data;
    let path = type
      ? `/integration/${encodeURIComponent(type)}/create`
      : '/integration/create';
    let response = await this.axios.post(path, body);
    return response.data;
  }

  async updateIntegration(integrationId: string, data: Record<string, any>): Promise<any> {
    let { type, ...body } = data;
    let path = type
      ? `/integration/${encodeURIComponent(type)}/${encodeURIComponent(integrationId)}/update`
      : `/integration/${encodeURIComponent(integrationId)}/update`;
    let response = await this.axios.post(path, body);
    return response.data;
  }

  async deleteIntegration(integrationId: string, type?: string): Promise<any> {
    let path = type
      ? `/integration/${encodeURIComponent(type)}/${encodeURIComponent(integrationId)}/delete`
      : `/integration/${encodeURIComponent(integrationId)}/delete`;
    let response = await this.axios.post(path);
    return response.data;
  }

  // ---- Files ----

  async listFiles(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/file/list', { params });
    return response.data;
  }

  async fetchFile(fileId: string): Promise<any> {
    let response = await this.axios.get(`/file/${encodeURIComponent(fileId)}/fetch`);
    return response.data;
  }

  async updateFile(fileId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/file/${encodeURIComponent(fileId)}/update`, data);
    return response.data;
  }

  async deleteFile(fileId: string): Promise<any> {
    let response = await this.axios.post(`/file/${encodeURIComponent(fileId)}/delete`);
    return response.data;
  }

  // ---- Spaces ----

  async listSpaces(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/space/list', { params });
    return response.data;
  }

  async fetchSpace(spaceId: string): Promise<any> {
    let response = await this.axios.get(`/space/${encodeURIComponent(spaceId)}/fetch`);
    return response.data;
  }

  async createSpace(data: {
    name?: string;
    description?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/space/create', data);
    return response.data;
  }

  async updateSpace(spaceId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/space/${encodeURIComponent(spaceId)}/update`, data);
    return response.data;
  }

  async deleteSpace(spaceId: string): Promise<any> {
    let response = await this.axios.post(`/space/${encodeURIComponent(spaceId)}/delete`);
    return response.data;
  }

  // ---- Secrets ----

  async listSecrets(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/secret/list', { params });
    return response.data;
  }

  async fetchSecret(secretId: string): Promise<any> {
    let response = await this.axios.get(`/secret/${encodeURIComponent(secretId)}/fetch`);
    return response.data;
  }

  async createSecret(data: {
    name: string;
    description?: string;
    value: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/secret/create', data);
    return response.data;
  }

  async updateSecret(secretId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/secret/${encodeURIComponent(secretId)}/update`,
      data
    );
    return response.data;
  }

  async deleteSecret(secretId: string): Promise<any> {
    let response = await this.axios.post(`/secret/${encodeURIComponent(secretId)}/delete`);
    return response.data;
  }

  // ---- Tasks ----

  async listTasks(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/task/list', { params });
    return response.data;
  }

  async fetchTask(taskId: string): Promise<any> {
    let response = await this.axios.get(`/task/${encodeURIComponent(taskId)}/fetch`);
    return response.data;
  }

  async createTask(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/task/create', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/task/${encodeURIComponent(taskId)}/update`, data);
    return response.data;
  }

  async deleteTask(taskId: string): Promise<any> {
    let response = await this.axios.post(`/task/${encodeURIComponent(taskId)}/delete`);
    return response.data;
  }

  // ---- Blueprints ----

  async listBlueprints(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/blueprint/list', { params });
    return response.data;
  }

  async fetchBlueprint(blueprintId: string): Promise<any> {
    let response = await this.axios.get(`/blueprint/${encodeURIComponent(blueprintId)}/fetch`);
    return response.data;
  }

  async createBlueprint(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/blueprint/create', data);
    return response.data;
  }

  async updateBlueprint(blueprintId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/blueprint/${encodeURIComponent(blueprintId)}/update`,
      data
    );
    return response.data;
  }

  async deleteBlueprint(blueprintId: string): Promise<any> {
    let response = await this.axios.post(
      `/blueprint/${encodeURIComponent(blueprintId)}/delete`
    );
    return response.data;
  }

  async cloneBlueprint(blueprintId: string): Promise<any> {
    let response = await this.axios.post(
      `/blueprint/${encodeURIComponent(blueprintId)}/clone`
    );
    return response.data;
  }

  // ---- Conversation Voting ----

  async upvoteConversation(conversationId: string): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${encodeURIComponent(conversationId)}/upvote`
    );
    return response.data;
  }

  async downvoteConversation(conversationId: string): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${encodeURIComponent(conversationId)}/downvote`
    );
    return response.data;
  }

  // ---- Message Voting ----

  async upvoteMessage(conversationId: string, messageId: string): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${encodeURIComponent(conversationId)}/message/${encodeURIComponent(messageId)}/upvote`
    );
    return response.data;
  }

  async downvoteMessage(conversationId: string, messageId: string): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${encodeURIComponent(conversationId)}/message/${encodeURIComponent(messageId)}/downvote`
    );
    return response.data;
  }
}
