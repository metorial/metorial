import { Buffer } from 'node:buffer';
import { createAxios } from 'slates';
import { anthropicApiError } from './errors';

let FILES_API_BETA = 'files-api-2025-04-14';

let betaHeaders = (headers?: string[]) =>
  headers && headers.length > 0 ? { 'anthropic-beta': headers.join(',') } : undefined;

let appendParam = (
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined
) => {
  if (value !== undefined) params.append(key, String(value));
};

let appendArrayParam = (
  params: URLSearchParams,
  key: string,
  values: string[] | undefined
) => {
  for (let value of values ?? []) {
    params.append(key, value);
  }
};

export interface BatchResult {
  batchId: string;
  type?: string;
  processingStatus?: string;
  requestCounts?: {
    processing: number;
    succeeded: number;
    errored: number;
    canceled: number;
    expired: number;
  };
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  resultsUrl?: string;
}

export interface AnthropicFileResult {
  fileId: string;
  type?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt?: string;
  downloadable?: boolean;
}

export interface AnthropicFileContent {
  fileId: string;
  contentBase64: string;
  contentType?: string;
  sizeBytes: number;
}

export interface AnthropicReportResult {
  data: Record<string, unknown>[];
  hasMore: boolean;
  nextPage?: string | null;
}

export class AnthropicClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; apiVersion: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.anthropic.com',
      headers: {
        'x-api-key': config.token,
        'anthropic-version': config.apiVersion,
        'content-type': 'application/json'
      }
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(anthropicApiError(error))
    );
  }

  // ---- Messages API ----

  async createMessage(params: {
    model: string;
    maxTokens: number;
    messages: Array<{
      role: 'user' | 'assistant';
      content: string | Record<string, unknown>[];
    }>;
    system?: string;
    temperature?: number;
    topK?: number;
    topP?: number;
    stopSequences?: string[];
    tools?: Record<string, unknown>[];
    toolChoice?: Record<string, unknown>;
    thinking?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    mcpServers?: Record<string, unknown>[];
    serviceTier?: string;
    betaHeaders?: string[];
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      model: params.model,
      max_tokens: params.maxTokens,
      messages: params.messages
    };

    if (params.system !== undefined) body.system = params.system;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topK !== undefined) body.top_k = params.topK;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.stopSequences !== undefined) body.stop_sequences = params.stopSequences;
    if (params.tools !== undefined) body.tools = params.tools;
    if (params.toolChoice !== undefined) body.tool_choice = params.toolChoice;
    if (params.thinking !== undefined) body.thinking = params.thinking;
    if (params.metadata !== undefined) body.metadata = params.metadata;
    if (params.mcpServers !== undefined) body.mcp_servers = params.mcpServers;
    if (params.serviceTier !== undefined) body.service_tier = params.serviceTier;

    let response = await this.axios.post('/v1/messages', body, {
      headers: betaHeaders(params.betaHeaders)
    });
    return response.data;
  }

  // ---- Token Counting ----

  async countTokens(params: {
    model: string;
    messages: Array<{
      role: 'user' | 'assistant';
      content: string | Record<string, unknown>[];
    }>;
    system?: string;
    tools?: Record<string, unknown>[];
    thinking?: Record<string, unknown>;
    betaHeaders?: string[];
  }): Promise<{ inputTokens: number }> {
    let body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages
    };

    if (params.system !== undefined) body.system = params.system;
    if (params.tools !== undefined) body.tools = params.tools;
    if (params.thinking !== undefined) body.thinking = params.thinking;

    let response = await this.axios.post('/v1/messages/count_tokens', body, {
      headers: betaHeaders(params.betaHeaders)
    });
    return { inputTokens: response.data.input_tokens };
  }

  // ---- Models API ----

  async listModels(params?: { limit?: number; afterId?: string; beforeId?: string }): Promise<{
    models: Record<string, unknown>[];
    hasMore: boolean;
    firstId?: string;
    lastId?: string;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.afterId !== undefined) queryParams.after_id = params.afterId;
    if (params?.beforeId !== undefined) queryParams.before_id = params.beforeId;

    let response = await this.axios.get('/v1/models', { params: queryParams });
    return {
      models: response.data.data,
      hasMore: response.data.has_more,
      firstId: response.data.first_id,
      lastId: response.data.last_id
    };
  }

  async getModel(modelId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/v1/models/${modelId}`);
    return response.data;
  }

  // ---- Files API ----

  async createFile(params: {
    filename: string;
    contentBase64: string;
    mimeType?: string;
  }): Promise<AnthropicFileResult> {
    let fileBytes = Buffer.from(params.contentBase64, 'base64');
    let formData = new FormData();
    let blob = new Blob([fileBytes], {
      type: params.mimeType ?? 'application/octet-stream'
    });
    formData.append('file', blob, params.filename);

    let response = await this.axios.post('/v1/files', formData, {
      headers: {
        'anthropic-beta': FILES_API_BETA,
        'Content-Type': 'multipart/form-data'
      }
    });
    return this.normalizeFile(response.data);
  }

  async listFiles(params?: { limit?: number; afterId?: string; beforeId?: string }): Promise<{
    files: AnthropicFileResult[];
    hasMore: boolean;
    firstId?: string;
    lastId?: string;
  }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.afterId !== undefined) queryParams.after_id = params.afterId;
    if (params?.beforeId !== undefined) queryParams.before_id = params.beforeId;

    let response = await this.axios.get('/v1/files', {
      params: queryParams,
      headers: { 'anthropic-beta': FILES_API_BETA }
    });
    return {
      files: (response.data.data as Record<string, unknown>[]).map(file =>
        this.normalizeFile(file)
      ),
      hasMore: response.data.has_more,
      firstId: response.data.first_id,
      lastId: response.data.last_id
    };
  }

  async getFile(fileId: string): Promise<AnthropicFileResult> {
    let response = await this.axios.get(`/v1/files/${fileId}`, {
      headers: { 'anthropic-beta': FILES_API_BETA }
    });
    return this.normalizeFile(response.data);
  }

  async downloadFile(fileId: string): Promise<AnthropicFileContent> {
    let response = await this.axios.get(`/v1/files/${fileId}/content`, {
      responseType: 'arraybuffer',
      headers: { 'anthropic-beta': FILES_API_BETA }
    });
    let content = Buffer.from(response.data as ArrayBuffer);
    let contentType = response.headers['content-type'];
    return {
      fileId,
      contentBase64: content.toString('base64'),
      contentType: typeof contentType === 'string' ? contentType : undefined,
      sizeBytes: content.byteLength
    };
  }

  async deleteFile(fileId: string): Promise<{ fileId: string; type?: string }> {
    let response = await this.axios.delete(`/v1/files/${fileId}`, {
      headers: { 'anthropic-beta': FILES_API_BETA }
    });
    return {
      fileId: response.data.id,
      type: response.data.type
    };
  }

  // ---- Message Batches API ----

  async createMessageBatch(
    requests: Array<{
      customId: string;
      params: Record<string, unknown>;
    }>,
    betaHeaderValues?: string[]
  ): Promise<BatchResult> {
    let body = {
      requests: requests.map(r => ({
        custom_id: r.customId,
        params: r.params
      }))
    };

    let response = await this.axios.post('/v1/messages/batches', body, {
      headers: betaHeaders(betaHeaderValues)
    });
    return this.normalizeBatch(response.data);
  }

  async getMessageBatch(batchId: string): Promise<BatchResult> {
    let response = await this.axios.get(`/v1/messages/batches/${batchId}`);
    return this.normalizeBatch(response.data);
  }

  async listMessageBatches(params?: {
    limit?: number;
    afterId?: string;
    beforeId?: string;
  }): Promise<{ batches: BatchResult[]; hasMore: boolean }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.afterId !== undefined) queryParams.after_id = params.afterId;
    if (params?.beforeId !== undefined) queryParams.before_id = params.beforeId;

    let response = await this.axios.get('/v1/messages/batches', { params: queryParams });
    return {
      batches: (response.data.data as Record<string, unknown>[]).map(
        (b: Record<string, unknown>) => this.normalizeBatch(b)
      ),
      hasMore: response.data.has_more
    };
  }

  async cancelMessageBatch(batchId: string): Promise<BatchResult> {
    let response = await this.axios.post(`/v1/messages/batches/${batchId}/cancel`);
    return this.normalizeBatch(response.data);
  }

  private normalizeBatch(data: Record<string, unknown>): BatchResult {
    let counts = data.request_counts as
      | {
          processing: number;
          succeeded: number;
          errored: number;
          canceled: number;
          expired: number;
        }
      | undefined;
    return {
      batchId: data.id as string,
      type: data.type as string | undefined,
      processingStatus: data.processing_status as string | undefined,
      requestCounts: counts,
      createdAt: data.created_at as string | undefined,
      updatedAt: data.updated_at as string | undefined,
      expiresAt: data.expires_at as string | undefined,
      resultsUrl: data.results_url as string | undefined
    };
  }

  private normalizeFile(data: Record<string, unknown>): AnthropicFileResult {
    return {
      fileId: data.id as string,
      type: data.type as string | undefined,
      filename: data.filename as string | undefined,
      mimeType: data.mime_type as string | undefined,
      sizeBytes: data.size_bytes as number | undefined,
      createdAt: data.created_at as string | undefined,
      downloadable: data.downloadable as boolean | undefined
    };
  }

  // ---- Admin API: Organization ----

  async getOrganization(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/v1/organizations/me');
    return response.data;
  }

  // ---- Admin API: Members ----

  async listMembers(params?: {
    limit?: number;
    afterId?: string;
  }): Promise<{ members: Record<string, unknown>[]; hasMore: boolean }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.afterId !== undefined) queryParams.after_id = params.afterId;

    let response = await this.axios.get('/v1/organizations/users', { params: queryParams });
    return {
      members: response.data.data,
      hasMore: response.data.has_more
    };
  }

  async updateMember(userId: string, role: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/v1/organizations/users/${userId}`, { role });
    return response.data;
  }

  async removeMember(userId: string): Promise<void> {
    await this.axios.delete(`/v1/organizations/users/${userId}`);
  }

  // ---- Admin API: Invites ----

  async createInvite(email: string, role: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/v1/organizations/invites', { email, role });
    return response.data;
  }

  async listInvites(params?: {
    limit?: number;
    afterId?: string;
  }): Promise<{ invites: Record<string, unknown>[]; hasMore: boolean }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.afterId !== undefined) queryParams.after_id = params.afterId;

    let response = await this.axios.get('/v1/organizations/invites', { params: queryParams });
    return {
      invites: response.data.data,
      hasMore: response.data.has_more
    };
  }

  async getInvite(inviteId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/v1/organizations/invites/${inviteId}`);
    return response.data;
  }

  async deleteInvite(inviteId: string): Promise<void> {
    await this.axios.delete(`/v1/organizations/invites/${inviteId}`);
  }

  // ---- Admin API: Workspaces ----

  async createWorkspace(
    name: string,
    params?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/v1/organizations/workspaces', { name, ...params });
    return response.data;
  }

  async listWorkspaces(params?: {
    limit?: number;
    afterId?: string;
    includeArchived?: boolean;
  }): Promise<{ workspaces: Record<string, unknown>[]; hasMore: boolean }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.afterId !== undefined) queryParams.after_id = params.afterId;
    if (params?.includeArchived !== undefined)
      queryParams.include_archived = String(params.includeArchived);

    let response = await this.axios.get('/v1/organizations/workspaces', {
      params: queryParams
    });
    return {
      workspaces: response.data.data,
      hasMore: response.data.has_more
    };
  }

  async getWorkspace(workspaceId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/v1/organizations/workspaces/${workspaceId}`);
    return response.data;
  }

  async updateWorkspace(
    workspaceId: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/v1/organizations/workspaces/${workspaceId}`,
      params
    );
    return response.data;
  }

  async archiveWorkspace(workspaceId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/v1/organizations/workspaces/${workspaceId}`, {
      is_archived: true
    });
    return response.data;
  }

  // ---- Admin API: Workspace Members ----

  async addWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/v1/organizations/workspaces/${workspaceId}/members`,
      {
        user_id: userId,
        workspace_role: role
      }
    );
    return response.data;
  }

  async listWorkspaceMembers(
    workspaceId: string,
    params?: {
      limit?: number;
      afterId?: string;
    }
  ): Promise<{ members: Record<string, unknown>[]; hasMore: boolean }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.afterId !== undefined) queryParams.after_id = params.afterId;

    let response = await this.axios.get(
      `/v1/organizations/workspaces/${workspaceId}/members`,
      { params: queryParams }
    );
    return {
      members: response.data.data,
      hasMore: response.data.has_more
    };
  }

  async getWorkspaceMember(
    workspaceId: string,
    userId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/v1/organizations/workspaces/${workspaceId}/members/${userId}`
    );
    return response.data;
  }

  async updateWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/v1/organizations/workspaces/${workspaceId}/members/${userId}`,
      {
        workspace_role: role
      }
    );
    return response.data;
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await this.axios.delete(`/v1/organizations/workspaces/${workspaceId}/members/${userId}`);
  }

  // ---- Admin API: API Keys ----

  async listApiKeys(params?: {
    limit?: number;
    afterId?: string;
    status?: string;
    workspaceId?: string;
  }): Promise<{ apiKeys: Record<string, unknown>[]; hasMore: boolean }> {
    let queryParams: Record<string, string> = {};
    if (params?.limit !== undefined) queryParams.limit = String(params.limit);
    if (params?.afterId !== undefined) queryParams.after_id = params.afterId;
    if (params?.status !== undefined) queryParams.status = params.status;
    if (params?.workspaceId !== undefined) queryParams.workspace_id = params.workspaceId;

    let response = await this.axios.get('/v1/organizations/api_keys', { params: queryParams });
    return {
      apiKeys: response.data.data,
      hasMore: response.data.has_more
    };
  }

  async getApiKey(apiKeyId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/v1/organizations/api_keys/${apiKeyId}`);
    return response.data;
  }

  async updateApiKey(
    apiKeyId: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/v1/organizations/api_keys/${apiKeyId}`, params);
    return response.data;
  }

  // ---- Admin API: Usage and Cost Reports ----

  async getMessagesUsageReport(params: {
    startingAt: string;
    endingAt?: string;
    bucketWidth?: '1m' | '1h' | '1d';
    limit?: number;
    page?: string;
    groupBy?: string[];
    apiKeyIds?: string[];
    workspaceIds?: string[];
    models?: string[];
    serviceTiers?: string[];
    contextWindows?: string[];
  }): Promise<AnthropicReportResult> {
    let queryParams = new URLSearchParams();
    appendParam(queryParams, 'starting_at', params.startingAt);
    appendParam(queryParams, 'ending_at', params.endingAt);
    appendParam(queryParams, 'bucket_width', params.bucketWidth);
    appendParam(queryParams, 'limit', params.limit);
    appendParam(queryParams, 'page', params.page);
    appendArrayParam(queryParams, 'group_by[]', params.groupBy);
    appendArrayParam(queryParams, 'api_key_ids[]', params.apiKeyIds);
    appendArrayParam(queryParams, 'workspace_ids[]', params.workspaceIds);
    appendArrayParam(queryParams, 'models[]', params.models);
    appendArrayParam(queryParams, 'service_tiers[]', params.serviceTiers);
    appendArrayParam(queryParams, 'context_window[]', params.contextWindows);

    let response = await this.axios.get('/v1/organizations/usage_report/messages', {
      params: queryParams
    });
    return {
      data: response.data.data,
      hasMore: response.data.has_more,
      nextPage: response.data.next_page
    };
  }

  async getCostReport(params: {
    startingAt: string;
    endingAt?: string;
    limit?: number;
    page?: string;
    groupBy?: string[];
  }): Promise<AnthropicReportResult> {
    let queryParams = new URLSearchParams();
    appendParam(queryParams, 'starting_at', params.startingAt);
    appendParam(queryParams, 'ending_at', params.endingAt);
    appendParam(queryParams, 'limit', params.limit);
    appendParam(queryParams, 'page', params.page);
    appendArrayParam(queryParams, 'group_by[]', params.groupBy);

    let response = await this.axios.get('/v1/organizations/cost_report', {
      params: queryParams
    });
    return {
      data: response.data.data,
      hasMore: response.data.has_more,
      nextPage: response.data.next_page
    };
  }
}
