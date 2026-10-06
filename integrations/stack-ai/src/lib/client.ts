import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getBase64ByteLength
} from 'slates';
import { z } from 'zod';

const recordSchema = z.record(z.string(), z.unknown());
const recordsSchema = z.array(recordSchema);
const pathId = (value: string) => {
  if (!value.trim() || value === '.' || value === '..')
    throw createApiServiceError(
      'Provide a nonempty Stack AI identifier without dot path segments.'
    );
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('The Stack AI identifier contains invalid Unicode.');
  }
};
const pageSchema = z
  .object({
    data: recordsSchema,
    cursor: z
      .string()
      .nullish()
      .transform(value => value ?? undefined),
    has_more: z.boolean().optional()
  })
  .passthrough();
const conversationsSchema = z
  .object({
    data: recordsSchema,
    has_more: z.boolean(),
    first_id: z.string().optional(),
    last_id: z.string().optional()
  })
  .passthrough();
const storageSchema = z
  .object({
    total_storage_bytes: z.number().nonnegative().optional(),
    knowledge_bases: recordsSchema.optional()
  })
  .passthrough();

export interface ClientConfig {
  token: string;
  orgId?: string;
  inferenceBaseUrl?: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private inferenceAxios: ReturnType<typeof createAuthenticatedAxios>;
  private orgId?: string;

  constructor(config: ClientConfig) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'A Stack AI API key is required. Reconnect with a valid key.'
      );
    }
    this.orgId = config.orgId?.trim();
    if (
      config.inferenceBaseUrl !== undefined &&
      !['https://stack-inference.com', 'https://api.stack-ai.com'].includes(
        config.inferenceBaseUrl
      )
    ) {
      throw createApiServiceError(
        'The workflow API origin must be https://stack-inference.com or https://api.stack-ai.com. Reconnect using the exported deployment URL.'
      );
    }
    const options = {
      authHeader: { value: `Bearer ${config.token.trim()}` },
      timeout: 180_000,
      maxRedirects: 0,
      errorAdapter: (error: unknown) =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Stack AI',
          operation: 'call the API',
          reason: 'stack_ai_api_error',
          nestedKeys: ['detail', 'error', 'errors']
        })
    };
    this.axios = createAuthenticatedAxios({ baseURL: 'https://api.stack-ai.com', ...options });
    this.inferenceAxios = createAuthenticatedAxios({
      baseURL: config.inferenceBaseUrl ?? 'https://stack-inference.com',
      ...options
    });
  }

  private organizationId(encode = true) {
    if (!this.orgId) {
      throw createApiServiceError(
        'An organization ID is required for this operation. Supply orgId from your workflow API URL, or reconnect with the deployed workflow API URL from Export View > API.'
      );
    }
    return encode ? pathId(this.orgId) : this.orgId;
  }

  private parse<T>(schema: z.ZodType<T>, data: unknown, operation: string): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError(`Stack AI returned an invalid ${operation} response.`, {
        reason: 'stack_ai_invalid_response'
      });
    }
    return result.data;
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

    let response = await this.inferenceAxios.post(
      `/inference/v0/run/${this.organizationId()}/${pathId(flowId)}`,
      body,
      {
        params
      }
    );
    return this.parse(z.record(z.string(), z.unknown()), response.data, 'workflow execution');
  }

  async getRunMetadata(flowId: string, runId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/inference/v0/run/${this.organizationId()}/${pathId(flowId)}/metadata`,
      {
        params: { run_id: runId }
      }
    );
    return response.data;
  }

  async giveFeedback(
    flowId: string,
    runId: string,
    feedback: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/inference/v0/feedback/${this.organizationId()}/${pathId(flowId)}`,
      {
        run_id: runId,
        feedback
      }
    );
    return response.data;
  }

  // ── Documents ──

  async listDocuments(flowId: string, nodeId: string, userId: string): Promise<string[]> {
    let response = await this.axios.get(
      `/documents/${this.organizationId()}/${pathId(flowId)}/${pathId(nodeId)}/${pathId(userId)}`
    );
    return this.parse(z.array(z.string()), response.data, 'document listing');
  }

  async deleteDocument(
    flowId: string,
    nodeId: string,
    userId: string,
    filename: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(
      `/documents/${this.organizationId()}/${pathId(flowId)}/${pathId(nodeId)}/${pathId(userId)}`,
      { params: { filename } }
    );
    return response.data;
  }

  private uploadForm(
    fileName: string,
    content: string,
    encoding: 'text' | 'base64',
    mimeType?: string
  ) {
    if (
      encoding === 'base64' &&
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)
    ) {
      throw createApiServiceError(
        'Provide valid base64 file content without a data URL prefix.'
      );
    }
    const size =
      encoding === 'base64'
        ? getBase64ByteLength(content)
        : Buffer.byteLength(content, 'utf8');
    if (size === 0) throw createApiServiceError('Provide a nonempty file to upload.');
    const bytes = Buffer.from(content, encoding === 'base64' ? 'base64' : 'utf8');
    const form = new FormData();
    form.append(
      'file',
      new Blob([bytes], { type: mimeType ?? 'application/octet-stream' }),
      fileName
    );
    return form;
  }

  async uploadDocument(
    flowId: string,
    nodeId: string,
    userId: string,
    fileName: string,
    content: string,
    encoding: 'text' | 'base64',
    mimeType?: string
  ) {
    const response = await this.axios.post(
      '/upload_to_supabase_user',
      this.uploadForm(fileName, content, encoding, mimeType),
      {
        params: {
          org: this.organizationId(false),
          flow_id: flowId,
          node_id: nodeId,
          user_id: userId
        },
        headers: { 'Content-Type': undefined }
      }
    );
    return response.data;
  }

  async uploadKnowledgeBaseResource(
    knowledgeBaseId: string,
    fileName: string,
    content: string,
    encoding: 'text' | 'base64',
    mimeType?: string
  ) {
    const response = await this.axios.post(
      `/v1/knowledge-bases/${pathId(knowledgeBaseId)}/resources`,
      this.uploadForm(fileName, content, encoding, mimeType),
      {
        headers: { 'Content-Type': undefined }
      }
    );
    return this.parse(
      z.object({ message: z.string(), resource_id: z.string().min(1) }),
      response.data,
      'knowledge base file upload'
    );
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
    if (pageSize !== undefined) params.page_size = pageSize;

    let response = await this.axios.get('/v1/knowledge-bases', { params });
    return this.parse(pageSchema, response.data, 'knowledge base listing');
  }

  async getKnowledgeBase(knowledgeBaseId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/v1/knowledge-bases/${pathId(knowledgeBaseId)}`);
    return this.parse(recordSchema, response.data, 'knowledge base details');
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
    return this.parse(recordSchema, response.data, 'knowledge base creation');
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

    let response = await this.axios.patch(
      `/v1/knowledge-bases/${pathId(knowledgeBaseId)}`,
      body
    );
    return this.parse(recordSchema, response.data, 'knowledge base update');
  }

  async deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    await this.axios.delete(`/v1/knowledge-bases/${pathId(knowledgeBaseId)}`);
  }

  async syncKnowledgeBase(knowledgeBaseId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/v1/knowledge-bases/${pathId(knowledgeBaseId)}/sync`
    );
    return this.parse(recordSchema, response.data, 'knowledge base synchronization');
  }

  // ── Knowledge Base Resources ──

  async listKnowledgeBaseResources(
    knowledgeBaseId: string,
    cursor?: string,
    pageSize?: number,
    direction?: 'next' | 'prev'
  ): Promise<{
    data: Record<string, unknown>[];
    cursor?: string;
    has_more?: boolean;
  }> {
    let params: Record<string, unknown> = {};
    if (cursor) params.cursor = cursor;
    if (pageSize !== undefined) params.page_size = pageSize;

    if (direction !== undefined) params.direction = direction;

    let response = await this.axios.get(
      `/v1/knowledge-bases/${pathId(knowledgeBaseId)}/resources`,
      {
        params
      }
    );
    return this.parse(pageSchema, response.data, 'knowledge base resource listing');
  }

  async getKnowledgeBaseResource(
    knowledgeBaseId: string,
    resourceId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/v1/knowledge-bases/${pathId(knowledgeBaseId)}/resources/${pathId(resourceId)}`
    );
    return this.parse(recordSchema, response.data, 'knowledge base resource details');
  }

  async deleteKnowledgeBaseResource(
    knowledgeBaseId: string,
    resourceId: string
  ): Promise<void> {
    await this.axios.delete(
      `/v1/knowledge-bases/${pathId(knowledgeBaseId)}/resources/${pathId(resourceId)}`
    );
  }

  // ── Connections ──

  async listConnections(limit?: number, offset?: number): Promise<Record<string, unknown>[]> {
    let params: Record<string, unknown> = {};
    if (limit !== undefined) params.limit = limit;
    if (offset !== undefined) params.offset = offset;

    let response = await this.axios.get('/connections', { params });
    return this.parse(recordsSchema, response.data, 'connection listing');
  }

  async getConnection(connectionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/connections/${pathId(connectionId)}`);
    return this.parse(recordSchema, response.data, 'connection details');
  }

  async checkConnectionHealth(connectionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/connections/${pathId(connectionId)}/health`);
    return this.parse(recordSchema, response.data, 'connection health');
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.axios.delete(`/connections/${pathId(connectionId)}`);
  }

  async getConnectionResources(connectionId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/connections/${pathId(connectionId)}/resources`);
    return this.parse(recordsSchema, response.data, 'connection resources');
  }

  async searchConnectionResources(
    connectionId: string,
    query: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(
      `/connections/${pathId(connectionId)}/resources/search`,
      {
        params: { query }
      }
    );
    return this.parse(recordsSchema, response.data, 'connection resource search');
  }

  // ── Analytics ──

  async getProjectAnalytics(
    flowId: string,
    options?: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
      userId?: string;
      states?: string[];
    }
  ): Promise<Record<string, unknown>[]> {
    let params: Record<string, unknown> = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.pageSize !== undefined) params.page_size = options.pageSize;
    if (options?.startDate) params.start_date = options.startDate;
    if (options?.endDate) params.end_date = options.endDate;

    if (options?.userId !== undefined) params.user_id = options.userId;
    if (options?.states !== undefined) params.state = options.states.join(',');

    let response = await this.axios.get(
      `/analytics/org/${this.organizationId()}/flows/${pathId(flowId)}`,
      {
        params
      }
    );
    return this.parse(
      z.array(z.record(z.string(), z.unknown())),
      response.data,
      'flow analytics'
    );
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
    return this.parse(
      z.array(z.record(z.string(), z.unknown())),
      response.data,
      'organization analytics'
    );
  }

  async getStorageUsage() {
    let response = await this.axios.get('/analytics/storage/total-usage');
    return this.parse(storageSchema, response.data, 'storage analytics');
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
    let response = await this.axios.get(`/projects/${pathId(projectId)}/conversations`, {
      headers: { 'X-User-Id': userId }
    });
    return this.parse(conversationsSchema, response.data, 'conversation listing');
  }

  async archiveConversation(
    projectId: string,
    conversationId: string,
    userId: string,
    isArchived: boolean = true
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/projects/${pathId(projectId)}/conversations/${pathId(conversationId)}/archive`,
      null,
      {
        params: { is_archived: isArchived },
        headers: { 'X-User-Id': userId }
      }
    );
    return this.parse(recordSchema, response.data, 'conversation archival');
  }

  async deleteConversation(
    projectId: string,
    conversationId: string,
    userId: string
  ): Promise<void> {
    await this.axios.delete(
      `/projects/${pathId(projectId)}/conversations/${pathId(conversationId)}`,
      {
        headers: { 'X-User-Id': userId }
      }
    );
  }

  async renameConversation(
    projectId: string,
    conversationId: string,
    userId: string,
    title: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/projects/${pathId(projectId)}/conversations/${pathId(conversationId)}/rename`,
      { title },
      { headers: { 'X-User-Id': userId } }
    );
    return this.parse(recordSchema, response.data, 'conversation rename');
  }

  // ── Manager ──

  async getUserConversations(projectId: string): Promise<{
    data: Record<string, unknown>[];
    has_more: boolean;
    first_id?: string;
    last_id?: string;
  }> {
    let response = await this.axios.get(
      `/projects/${pathId(projectId)}/manager/user-conversations`
    );
    return this.parse(conversationsSchema, response.data, 'user conversation listing');
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
    return this.parse(recordsSchema, response.data, 'folder listing');
  }

  async getFolder(folderId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/folders/${pathId(folderId)}`);
    return this.parse(recordSchema, response.data, 'folder details');
  }

  async createFolder(name: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put('/folders', { name });
    return this.parse(recordSchema, response.data, 'folder creation');
  }

  async updateFolder(
    folderId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.patch(`/folders/${pathId(folderId)}`, data);
    return this.parse(recordSchema, response.data, 'folder update');
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.axios.delete(`/folders/${pathId(folderId)}`);
  }

  // ── Tools ──

  async listToolProviders(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/tools/stackai/providers');
    return this.parse(recordsSchema, response.data, 'tool provider listing');
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
      `/tools/stackai/providers/${pathId(providerId)}/actions/${pathId(actionId)}/inputs`
    );
    return response.data;
  }

  async getActionOutputSchema(
    providerId: string,
    actionId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/tools/stackai/providers/${pathId(providerId)}/actions/${pathId(actionId)}/outputs`
    );
    return response.data;
  }

  async runAction(
    providerId: string,
    actionId: string,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(
      `/tools/stackai/providers/${pathId(providerId)}/actions/${pathId(actionId)}/run`,
      inputs
    );
    return this.parse(recordSchema, response.data, 'action execution');
  }
}

export const createClient = (
  ctx: {
    auth: { token: string; orgId?: string; inferenceBaseUrl?: string };
    config: Record<string, unknown>;
  },
  orgId?: string,
  inferenceBaseUrl?: string
) =>
  new Client({
    token: ctx.auth.token,
    orgId:
      orgId ??
      ctx.auth.orgId ??
      (typeof ctx.config.orgId === 'string' ? ctx.config.orgId : undefined),
    inferenceBaseUrl: inferenceBaseUrl ?? ctx.auth.inferenceBaseUrl
  });
