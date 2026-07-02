import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  orgId?: string;
  projectId?: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface AddMemoryParams {
  messages: ChatMessage[];
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  metadata?: Record<string, unknown>;
  infer?: boolean;
  enableGraph?: boolean;
  memoryType?: string;
}

export interface SearchMemoryParams {
  query: string;
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  topK?: number;
  threshold?: number;
  rerank?: boolean;
  filters?: Record<string, unknown>;
  fields?: string[];
}

export interface UpdateMemoryParams {
  memoryId: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

export interface ListMemoriesParams {
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  page?: number;
  pageSize?: number;
  outputFormat?: string;
}

export interface DeleteMemoriesParams {
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
}

export interface ListEntitiesParams {
  entityType?: string;
}

export interface CreateWebhookParams {
  url: string;
  name: string;
  projectId: string;
  eventTypes: string[];
}

export interface Memory {
  id: string;
  memory: string;
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
  hash?: string;
  metadata?: Record<string, unknown>;
  categories?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Entity {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  totalMemories?: number;
  owner?: string;
  organization?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryEvent {
  id: string;
  event: string;
  data: {
    memory: string;
    [key: string]: unknown;
  };
}

export class Client {
  private token: string;
  private orgId?: string;
  private projectId?: string;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.orgId = config.orgId;
    this.projectId = config.projectId;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://api.mem0.ai',
      headers: {
        Authorization: `Token ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private addScopeParams(params: Record<string, unknown>): Record<string, unknown> {
    if (this.orgId) params.org_id = this.orgId;
    if (this.projectId) params.project_id = this.projectId;
    return params;
  }

  async addMemory(params: AddMemoryParams): Promise<MemoryEvent[]> {
    let axios = this.getAxios();
    let body: Record<string, unknown> = {
      messages: params.messages.map(m => ({ role: m.role, content: m.content }))
    };

    if (params.userId) body.user_id = params.userId;
    if (params.agentId) body.agent_id = params.agentId;
    if (params.appId) body.app_id = params.appId;
    if (params.runId) body.run_id = params.runId;
    if (params.metadata) body.metadata = params.metadata;
    if (params.infer !== undefined) body.infer = params.infer;
    if (params.enableGraph !== undefined) body.enable_graph = params.enableGraph;
    if (params.memoryType) body.memory_type = params.memoryType;

    this.addScopeParams(body);

    let response = await axios.post('/v1/memories/', body);
    return response.data;
  }

  async searchMemories(params: SearchMemoryParams): Promise<Memory[]> {
    let axios = this.getAxios();
    let body: Record<string, unknown> = {
      query: params.query
    };

    if (params.userId) body.user_id = params.userId;
    if (params.agentId) body.agent_id = params.agentId;
    if (params.appId) body.app_id = params.appId;
    if (params.runId) body.run_id = params.runId;
    if (params.topK !== undefined) body.top_k = params.topK;
    if (params.threshold !== undefined) body.threshold = params.threshold;
    if (params.rerank !== undefined) body.rerank = params.rerank;
    if (params.filters) body.filters = params.filters;
    if (params.fields) body.fields = params.fields;

    this.addScopeParams(body);

    let response = await axios.post('/v2/memories/search/', body);
    return response.data;
  }

  async getMemory(memoryId: string): Promise<Memory> {
    let axios = this.getAxios();
    let response = await axios.get(`/v1/memories/${memoryId}/`);
    return response.data;
  }

  async listMemories(
    params: ListMemoriesParams
  ): Promise<{ memories: Memory[]; totalMemories: number }> {
    let axios = this.getAxios();
    let body: Record<string, unknown> = {
      filters: {} as Record<string, unknown>
    };

    let filters = body.filters as Record<string, unknown>;
    if (params.userId) filters.user_id = params.userId;
    if (params.agentId) filters.agent_id = params.agentId;
    if (params.appId) filters.app_id = params.appId;
    if (params.runId) filters.run_id = params.runId;

    if (params.page !== undefined) body.page = params.page;
    if (params.pageSize !== undefined) body.page_size = params.pageSize;
    if (params.outputFormat) body.output_format = params.outputFormat;

    this.addScopeParams(body);

    let response = await axios.post('/v2/memories/', body);
    let memories = Array.isArray(response.data)
      ? response.data
      : response.data.results || response.data.memories || [];
    let totalMemories = response.data.total_memories || memories.length;

    return { memories, totalMemories };
  }

  async updateMemory(params: UpdateMemoryParams): Promise<Memory> {
    let axios = this.getAxios();
    let body: Record<string, unknown> = {};

    if (params.text !== undefined) body.text = params.text;
    if (params.metadata !== undefined) body.metadata = params.metadata;

    let response = await axios.put(`/v1/memories/${params.memoryId}/`, body);
    return response.data;
  }

  async deleteMemory(memoryId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/v1/memories/${memoryId}/`);
  }

  async deleteMemories(params: DeleteMemoriesParams): Promise<void> {
    let axios = this.getAxios();
    let queryParams: Record<string, string> = {};

    if (params.userId) queryParams.user_id = params.userId;
    if (params.agentId) queryParams.agent_id = params.agentId;
    if (params.appId) queryParams.app_id = params.appId;
    if (params.runId) queryParams.run_id = params.runId;

    this.addScopeParams(queryParams);

    await axios.delete('/v1/memories/', { params: queryParams });
  }

  async getMemoryHistory(memoryId: string): Promise<unknown[]> {
    let axios = this.getAxios();
    let response = await axios.get(`/v1/memories/${memoryId}/history/`);
    return response.data;
  }

  async listEntities(params?: ListEntitiesParams): Promise<Entity[]> {
    let axios = this.getAxios();
    let queryParams: Record<string, string> = {};

    if (this.orgId) queryParams.org_id = this.orgId;
    if (this.projectId) queryParams.project_id = this.projectId;

    let response = await axios.get('/v1/entities/', { params: queryParams });
    let rawEntities: Record<string, unknown>[] = Array.isArray(response.data)
      ? response.data
      : response.data.results || [];

    if (params?.entityType) {
      rawEntities = rawEntities.filter(e => e.type === params.entityType);
    }

    return rawEntities.map(e => ({
      id: String(e.id || ''),
      name: String(e.name || ''),
      createdAt: e.created_at ? String(e.created_at) : undefined,
      updatedAt: e.updated_at ? String(e.updated_at) : undefined,
      totalMemories: typeof e.total_memories === 'number' ? e.total_memories : undefined,
      owner: e.owner ? String(e.owner) : undefined,
      organization: e.organization ? String(e.organization) : undefined,
      type: e.type ? String(e.type) : undefined,
      metadata: e.metadata as Record<string, unknown> | undefined
    }));
  }

  async deleteEntity(entityType: string, entityId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/v2/entities/${entityType}/${entityId}/`);
  }

  async createWebhook(params: CreateWebhookParams): Promise<Record<string, unknown>> {
    let axios = this.getAxios();
    let body = {
      url: params.url,
      name: params.name,
      project_id: params.projectId,
      event_types: params.eventTypes
    };

    let response = await axios.post('/v1/webhooks/', body);
    return response.data;
  }

  async listWebhooks(projectId: string): Promise<Record<string, unknown>[]> {
    let axios = this.getAxios();
    let response = await axios.get('/v1/webhooks/', {
      params: { project_id: projectId }
    });
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/v1/webhooks/${webhookId}/`);
  }
}
