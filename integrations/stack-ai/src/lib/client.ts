import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  orgId: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private orgId: string;

  constructor(config: ClientConfig) {
    this.orgId = config.orgId;
    this.axios = createAxios({
      baseURL: 'https://api.stack-ai.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Flow Execution ──

  async runFlow(
    flowId: string,
    inputs: Record<string, unknown>,
    options?: {
      userId?: string;
      version?: number;
      verbose?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { ...inputs };
    if (options?.userId) {
      body.user_id = options.userId;
    }

    let params: Record<string, unknown> = {};
    if (options?.version !== undefined) {
      params.version = options.version;
    }
    if (options?.verbose !== undefined) {
      params.verbose = options.verbose;
    }

    let response = await this.axios.post(`/inference/v0/run/${this.orgId}/${flowId}`, body, {
      params
    });
    return response.data;
  }

  async getRunMetadata(flowId: string, runId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/inference/v0/run/${this.orgId}/${flowId}/metadata`, {
      params: { run_id: runId }
    });
    return response.data;
  }

  async giveFeedback(
    flowId: string,
    runId: string,
    feedback: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/inference/v0/feedback/${this.orgId}/${flowId}`, {
      run_id: runId,
      feedback
    });
    return response.data;
  }

  // ── Documents ──

  async listDocuments(flowId: string, nodeId: string, userId: string): Promise<string[]> {
    let response = await this.axios.get(
      `/documents/${this.orgId}/${flowId}/${nodeId}/${userId}`
    );
    return response.data;
  }

  async deleteDocument(
    flowId: string,
    nodeId: string,
    userId: string,
    filename: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/documents/${this.orgId}/${flowId}/${nodeId}/${userId}`,
      { params: { filename } }
    );
    return response.data;
  }

  // ── Knowledge Bases ──

  async listKnowledgeBases(
    cursor?: string,
    pageSize?: number
  ): Promise<{
    data: Record<string, unknown>[];
    cursor?: string;
    has_more?: boolean;
  }> {
    let params: Record<string, unknown> = {};
    if (cursor) params.cursor = cursor;
    if (pageSize) params.page_size = pageSize;

    let response = await this.axios.get('/v1/knowledge-bases', { params });
    return response.data;
  }

  async getKnowledgeBase(knowledgeBaseId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/v1/knowledge-bases/${knowledgeBaseId}`);
    return response.data;
  }

  async createKnowledgeBase(data: {
    name: string;
    description?: string;
    connectionId?: string;
    connectionSourceIds?: string[];
    indexingParams?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { name: data.name };
    if (data.description) body.description = data.description;
    if (data.connectionId) body.connection_id = data.connectionId;
    if (data.connectionSourceIds) body.connection_source_ids = data.connectionSourceIds;
    if (data.indexingParams) body.indexing_params = data.indexingParams;

    let response = await this.axios.post('/v1/knowledge-bases', body);
    return response.data;
  }

  async updateKnowledgeBase(
    knowledgeBaseId: string,
    data: {
      name?: string;
      description?: string;
      indexingParams?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.indexingParams !== undefined) body.indexing_params = data.indexingParams;

    let response = await this.axios.patch(`/v1/knowledge-bases/${knowledgeBaseId}`, body);
    return response.data;
  }

  async deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    await this.axios.delete(`/v1/knowledge-bases/${knowledgeBaseId}`);
  }

  async syncKnowledgeBase(knowledgeBaseId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/v1/knowledge-bases/${knowledgeBaseId}/sync`);
    return response.data;
  }

  // ── Knowledge Base Resources ──

  async listKnowledgeBaseResources(
    knowledgeBaseId: string,
    cursor?: string,
    pageSize?: number
  ): Promise<{
    data: Record<string, unknown>[];
    cursor?: string;
    has_more?: boolean;
  }> {
    let params: Record<string, unknown> = {};
    if (cursor) params.cursor = cursor;
    if (pageSize) params.page_size = pageSize;

    let response = await this.axios.get(`/v1/knowledge-bases/${knowledgeBaseId}/resources`, {
      params
    });
    return response.data;
  }

  async getKnowledgeBaseResource(
    knowledgeBaseId: string,
    resourceId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/v1/knowledge-bases/${knowledgeBaseId}/resources/${resourceId}`
    );
    return response.data;
  }

  async deleteKnowledgeBaseResource(
    knowledgeBaseId: string,
    resourceId: string
  ): Promise<void> {
    await this.axios.delete(`/v1/knowledge-bases/${knowledgeBaseId}/resources/${resourceId}`);
  }

  // ── Connections ──

  async listConnections(limit?: number, offset?: number): Promise<Record<string, unknown>[]> {
    let params: Record<string, unknown> = {};
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;

    let response = await this.axios.get('/connections', { params });
    return response.data;
  }

  async getConnection(connectionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/connections/${connectionId}`);
    return response.data;
  }

  async checkConnectionHealth(connectionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/connections/${connectionId}/health`);
    return response.data;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.axios.delete(`/connections/${connectionId}`);
  }

  async getConnectionResources(connectionId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/connections/${connectionId}/resources`);
    return response.data;
  }

  async searchConnectionResources(
    connectionId: string,
    query: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/connections/${connectionId}/resources/search`, {
      params: { query }
    });
    return response.data;
  }

  // ── Analytics ──

  async getProjectAnalytics(
    flowId: string,
    options?: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Record<string, unknown>[]> {
    let params: Record<string, unknown> = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.pageSize !== undefined) params.page_size = options.pageSize;
    if (options?.startDate) params.start_date = options.startDate;
    if (options?.endDate) params.end_date = options.endDate;

    let response = await this.axios.get(`/analytics/org/${this.orgId}/flows/${flowId}`, {
      params
    });
    return response.data;
  }

  async getOrganizationAnalytics(options?: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Record<string, unknown>[]> {
    let params: Record<string, unknown> = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.pageSize !== undefined) params.page_size = options.pageSize;
    if (options?.startDate) params.start_date = options.startDate;
    if (options?.endDate) params.end_date = options.endDate;

    let response = await this.axios.get('/organizations/analytics/projects-run-summary', {
      params
    });
    return response.data;
  }

  async getStorageUsage(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/analytics/storage/total-usage');
    return response.data;
  }

  // ── Conversations ──

  async getConversations(
    projectId: string,
    userId: string
  ): Promise<{
    data: Record<string, unknown>[];
    has_more: boolean;
    first_id?: string;
    last_id?: string;
  }> {
    let response = await this.axios.get(`/projects/${projectId}/conversations`, {
      headers: { 'X-User-Id': userId }
    });
    return response.data;
  }

  async archiveConversation(
    projectId: string,
    conversationId: string,
    userId: string,
    isArchived: boolean = true
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/projects/${projectId}/conversations/${conversationId}/archive`,
      null,
      {
        params: { is_archived: isArchived },
        headers: { 'X-User-Id': userId }
      }
    );
    return response.data;
  }

  async deleteConversation(
    projectId: string,
    conversationId: string,
    userId: string
  ): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/conversations/${conversationId}`, {
      headers: { 'X-User-Id': userId }
    });
  }

  async renameConversation(
    projectId: string,
    conversationId: string,
    userId: string,
    title: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/projects/${projectId}/conversations/${conversationId}/rename`,
      { title },
      { headers: { 'X-User-Id': userId } }
    );
    return response.data;
  }

  // ── Manager ──

  async getUserConversations(projectId: string): Promise<{
    data: Record<string, unknown>[];
    has_more: boolean;
    first_id?: string;
    last_id?: string;
  }> {
    let response = await this.axios.get(`/projects/${projectId}/manager/user-conversations`);
    return response.data;
  }

  // ── Folders ──

  async listFolders(options?: {
    offset?: number;
    limit?: number;
    query?: string;
  }): Promise<Record<string, unknown>[]> {
    let body: Record<string, unknown> = {};
    if (options?.offset !== undefined) body.offset = options.offset;
    if (options?.limit !== undefined) body.limit = options.limit;
    if (options?.query) body.query = options.query;

    let response = await this.axios.post('/folders', body);
    return response.data;
  }

  async getFolder(folderId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/folders/${folderId}`);
    return response.data;
  }

  async createFolder(name: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put('/folders', { name });
    return response.data;
  }

  async updateFolder(
    folderId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/folders/${folderId}`, data);
    return response.data;
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.axios.delete(`/folders/${folderId}`);
  }

  // ── Triggers ──

  async listProjectTriggers(projectId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/projects/${projectId}/triggers`);
    return response.data;
  }

  async getTrigger(projectTriggerId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/triggers/${projectTriggerId}`);
    return response.data;
  }

  async enableTrigger(projectTriggerId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/triggers/${projectTriggerId}/enable`);
    return response.data;
  }

  async disableTrigger(projectTriggerId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/triggers/${projectTriggerId}/disable`);
    return response.data;
  }

  // ── Tools ──

  async listToolProviders(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/tools/stackai/providers');
    return response.data;
  }

  async listActions(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/tools/stackai/actions');
    return response.data;
  }

  async getActionInputSchema(
    providerId: string,
    actionId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/tools/stackai/providers/${providerId}/actions/${actionId}/inputs`
    );
    return response.data;
  }

  async getActionOutputSchema(
    providerId: string,
    actionId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/tools/stackai/providers/${providerId}/actions/${actionId}/outputs`
    );
    return response.data;
  }

  async runAction(
    providerId: string,
    actionId: string,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/tools/stackai/providers/${providerId}/actions/${actionId}/run`,
      inputs
    );
    return response.data;
  }
}
