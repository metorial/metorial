import { createAxios } from 'slates';

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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`
    };
    if (config.runAsUserId) {
      headers['X-RunAs-User-ID'] = config.runAsUserId;
    }
    this.axios = createAxios({
      baseURL: 'https://api.chatbotkit.com/v1',
      headers
    });
  }

  // ---- Bots ----

  async listBots(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/bot/list', { params });
    return response.data;
  }

  async fetchBot(botId: string): Promise<any> {
    let response = await this.axios.get(`/bot/${botId}/fetch`);
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
    let response = await this.axios.post(`/bot/${botId}/update`, data);
    return response.data;
  }

  async deleteBot(botId: string): Promise<any> {
    let response = await this.axios.post(`/bot/${botId}/delete`);
    return response.data;
  }

  // ---- Conversations ----

  async listConversations(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/conversation/list', { params });
    return response.data;
  }

  async fetchConversation(conversationId: string): Promise<any> {
    let response = await this.axios.get(`/conversation/${conversationId}/fetch`);
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
    let response = await this.axios.post(`/conversation/${conversationId}/update`, data);
    return response.data;
  }

  async deleteConversation(conversationId: string): Promise<any> {
    let response = await this.axios.post(`/conversation/${conversationId}/delete`);
    return response.data;
  }

  async sendMessage(
    conversationId: string,
    data: { text: string; meta?: Record<string, any> }
  ): Promise<any> {
    let response = await this.axios.post(`/conversation/${conversationId}/send`, data);
    return response.data;
  }

  async receiveMessage(conversationId: string): Promise<any> {
    let response = await this.axios.post(`/conversation/${conversationId}/receive`);
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
      let response = await this.axios.post(`/conversation/${conversationId}/complete`, rest);
      return response.data;
    }
    let response = await this.axios.post('/conversation/complete', data);
    return response.data;
  }

  async listMessages(conversationId: string, params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get(`/conversation/${conversationId}/message/list`, {
      params
    });
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
      `/conversation/${conversationId}/message/create`,
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
    let response = await this.axios.get(`/dataset/${datasetId}/fetch`);
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
    let response = await this.axios.post(`/dataset/${datasetId}/update`, data);
    return response.data;
  }

  async deleteDataset(datasetId: string): Promise<any> {
    let response = await this.axios.post(`/dataset/${datasetId}/delete`);
    return response.data;
  }

  // ---- Dataset Records ----

  async listRecords(datasetId: string, params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get(`/dataset/${datasetId}/record/list`, { params });
    return response.data;
  }

  async createRecord(
    datasetId: string,
    data: {
      text: string;
      meta?: Record<string, any>;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/dataset/${datasetId}/record/create`, data);
    return response.data;
  }

  async fetchRecord(datasetId: string, recordId: string): Promise<any> {
    let response = await this.axios.get(`/dataset/${datasetId}/record/${recordId}/fetch`);
    return response.data;
  }

  async updateRecord(
    datasetId: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(
      `/dataset/${datasetId}/record/${recordId}/update`,
      data
    );
    return response.data;
  }

  async deleteRecord(datasetId: string, recordId: string): Promise<any> {
    let response = await this.axios.post(`/dataset/${datasetId}/record/${recordId}/delete`);
    return response.data;
  }

  async searchRecords(datasetId: string, query: string): Promise<any> {
    let response = await this.axios.post(`/dataset/${datasetId}/record/search`, { query });
    return response.data;
  }

  // ---- Skillsets ----

  async listSkillsets(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/skillset/list', { params });
    return response.data;
  }

  async fetchSkillset(skillsetId: string): Promise<any> {
    let response = await this.axios.get(`/skillset/${skillsetId}/fetch`);
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
    let response = await this.axios.post(`/skillset/${skillsetId}/update`, data);
    return response.data;
  }

  async deleteSkillset(skillsetId: string): Promise<any> {
    let response = await this.axios.post(`/skillset/${skillsetId}/delete`);
    return response.data;
  }

  // ---- Abilities (sub-resource of Skillsets) ----

  async listAbilities(skillsetId: string, params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get(`/skillset/${skillsetId}/ability/list`, { params });
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
    let response = await this.axios.post(`/skillset/${skillsetId}/ability/create`, data);
    return response.data;
  }

  async updateAbility(
    skillsetId: string,
    abilityId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(
      `/skillset/${skillsetId}/ability/${abilityId}/update`,
      data
    );
    return response.data;
  }

  async deleteAbility(skillsetId: string, abilityId: string): Promise<any> {
    let response = await this.axios.post(
      `/skillset/${skillsetId}/ability/${abilityId}/delete`
    );
    return response.data;
  }

  // ---- Contacts ----

  async listContacts(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/contact/list', { params });
    return response.data;
  }

  async fetchContact(contactId: string): Promise<any> {
    let response = await this.axios.get(`/contact/${contactId}/fetch`);
    return response.data;
  }

  async createContact(data: {
    name?: string;
    email?: string;
    phone?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/contact/create', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/contact/${contactId}/update`, data);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<any> {
    let response = await this.axios.post(`/contact/${contactId}/delete`);
    return response.data;
  }

  async ensureContact(data: {
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
    let response = await this.axios.get(`/contact/${contactId}/conversation/list`, { params });
    return response.data;
  }

  // ---- Memories ----

  async listMemories(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/memory/list', { params });
    return response.data;
  }

  async fetchMemory(memoryId: string): Promise<any> {
    let response = await this.axios.get(`/memory/${memoryId}/fetch`);
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
    let response = await this.axios.post(`/memory/${memoryId}/update`, data);
    return response.data;
  }

  async deleteMemory(memoryId: string): Promise<any> {
    let response = await this.axios.post(`/memory/${memoryId}/delete`);
    return response.data;
  }

  async searchBotMemories(botId: string, query: string): Promise<any> {
    let response = await this.axios.post(`/bot/${botId}/memory/search`, { query });
    return response.data;
  }

  async searchContactMemories(contactId: string, query: string): Promise<any> {
    let response = await this.axios.post(`/contact/${contactId}/memory/search`, { query });
    return response.data;
  }

  // ---- Integrations ----

  async listIntegrations(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/integration/list', { params });
    return response.data;
  }

  async fetchIntegration(integrationId: string): Promise<any> {
    let response = await this.axios.get(`/integration/${integrationId}/fetch`);
    return response.data;
  }

  async createIntegration(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/integration/create', data);
    return response.data;
  }

  async updateIntegration(integrationId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/integration/${integrationId}/update`, data);
    return response.data;
  }

  async deleteIntegration(integrationId: string): Promise<any> {
    let response = await this.axios.post(`/integration/${integrationId}/delete`);
    return response.data;
  }

  // ---- Files ----

  async listFiles(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/file/list', { params });
    return response.data;
  }

  async fetchFile(fileId: string): Promise<any> {
    let response = await this.axios.get(`/file/${fileId}/fetch`);
    return response.data;
  }

  async updateFile(fileId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/file/${fileId}/update`, data);
    return response.data;
  }

  async deleteFile(fileId: string): Promise<any> {
    let response = await this.axios.post(`/file/${fileId}/delete`);
    return response.data;
  }

  // ---- Spaces ----

  async listSpaces(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/space/list', { params });
    return response.data;
  }

  async fetchSpace(spaceId: string): Promise<any> {
    let response = await this.axios.get(`/space/${spaceId}/fetch`);
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
    let response = await this.axios.post(`/space/${spaceId}/update`, data);
    return response.data;
  }

  async deleteSpace(spaceId: string): Promise<any> {
    let response = await this.axios.post(`/space/${spaceId}/delete`);
    return response.data;
  }

  // ---- Secrets ----

  async listSecrets(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/secret/list', { params });
    return response.data;
  }

  async fetchSecret(secretId: string): Promise<any> {
    let response = await this.axios.get(`/secret/${secretId}/fetch`);
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
    let response = await this.axios.post(`/secret/${secretId}/update`, data);
    return response.data;
  }

  async deleteSecret(secretId: string): Promise<any> {
    let response = await this.axios.post(`/secret/${secretId}/delete`);
    return response.data;
  }

  // ---- Tasks ----

  async listTasks(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/task/list', { params });
    return response.data;
  }

  async fetchTask(taskId: string): Promise<any> {
    let response = await this.axios.get(`/task/${taskId}/fetch`);
    return response.data;
  }

  async createTask(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/task/create', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/task/${taskId}/update`, data);
    return response.data;
  }

  async deleteTask(taskId: string): Promise<any> {
    let response = await this.axios.post(`/task/${taskId}/delete`);
    return response.data;
  }

  // ---- Blueprints ----

  async listBlueprints(params?: ListParams): Promise<ListResponse<any>> {
    let response = await this.axios.get('/blueprint/list', { params });
    return response.data;
  }

  async fetchBlueprint(blueprintId: string): Promise<any> {
    let response = await this.axios.get(`/blueprint/${blueprintId}/fetch`);
    return response.data;
  }

  async createBlueprint(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/blueprint/create', data);
    return response.data;
  }

  async updateBlueprint(blueprintId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/blueprint/${blueprintId}/update`, data);
    return response.data;
  }

  async deleteBlueprint(blueprintId: string): Promise<any> {
    let response = await this.axios.post(`/blueprint/${blueprintId}/delete`);
    return response.data;
  }

  async cloneBlueprint(blueprintId: string): Promise<any> {
    let response = await this.axios.post(`/blueprint/${blueprintId}/clone`);
    return response.data;
  }

  // ---- Conversation Voting ----

  async upvoteConversation(conversationId: string): Promise<any> {
    let response = await this.axios.post(`/conversation/${conversationId}/upvote`);
    return response.data;
  }

  async downvoteConversation(conversationId: string): Promise<any> {
    let response = await this.axios.post(`/conversation/${conversationId}/downvote`);
    return response.data;
  }

  // ---- Message Voting ----

  async upvoteMessage(conversationId: string, messageId: string): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${conversationId}/message/${messageId}/upvote`
    );
    return response.data;
  }

  async downvoteMessage(conversationId: string, messageId: string): Promise<any> {
    let response = await this.axios.post(
      `/conversation/${conversationId}/message/${messageId}/downvote`
    );
    return response.data;
  }
}
