import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface ClientConfig {
  token: string;
  legacyScope?: Record<string, unknown>;
}

export interface ScopeParams {
  userId?: string;
  agentId?: string;
  appId?: string;
  runId?: string;
}

export interface AddMemoryParams extends ScopeParams {
  messages: { role: string; content: string }[];
  metadata?: Record<string, unknown>;
  infer?: boolean;
  enableGraph?: boolean;
  memoryType?: string;
  expirationDate?: string;
  customInstructions?: string;
}

export interface SearchMemoryParams extends ScopeParams {
  query: string;
  topK?: number;
  threshold?: number;
  rerank?: boolean;
  filters?: Record<string, unknown>;
  fields?: string[];
  showExpired?: boolean;
}

export interface ListMemoriesParams extends ScopeParams {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
  showExpired?: boolean;
}

export interface UpdateMemoryParams {
  memoryId: string;
  text?: string;
  metadata?: Record<string, unknown>;
  expirationDate?: string | null;
}

export interface MemoryEvent {
  memoryId: string;
  event: string;
  memory: string;
}

export interface OperationResult {
  eventId?: string;
  status: string;
  events: MemoryEvent[];
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

const scopeKeys = ['user_id', 'agent_id', 'app_id', 'run_id'];
const scopeBody = (params: ScopeParams) =>
  pickDefined({
    user_id: params.userId,
    agent_id: params.agentId,
    app_id: params.appId,
    run_id: params.runId
  });

// Negative conditions alone do not positively scope the provider's V3 APIs.
const hasEntityScope = (filter: Record<string, unknown>): boolean => {
  if (scopeKeys.some(key => typeof filter[key] === 'string' && filter[key].trim()))
    return true;
  if (
    scopeKeys.some(key => {
      const value = filter[key];
      return (
        isApiErrorRecord(value) &&
        ((typeof value.eq === 'string' && value.eq.trim().length > 0) ||
          (Array.isArray(value.in) &&
            value.in.length > 0 &&
            value.in.every(id => typeof id === 'string' && id.trim().length > 0)))
      );
    })
  )
    return true;
  if (
    Array.isArray(filter.AND) &&
    filter.AND.some(item => isApiErrorRecord(item) && hasEntityScope(item))
  )
    return true;
  return (
    Array.isArray(filter.OR) &&
    filter.OR.length > 0 &&
    filter.OR.every(item => isApiErrorRecord(item) && hasEntityScope(item))
  );
};

const validateLogicalFilters = (filter: Record<string, unknown>): void => {
  // The hosted API silently drops a sibling OR when AND is present.
  if (Object.hasOwn(filter, 'AND') && Object.hasOwn(filter, 'OR')) {
    throw createApiServiceError(
      'Combine logical filters by nesting OR inside AND, rather than using sibling AND and OR keys.',
      { reason: 'mem0_ambiguous_filters' }
    );
  }
  for (const key of ['AND', 'OR', 'NOT']) {
    const children = filter[key];
    if (Array.isArray(children)) {
      for (const child of children) {
        if (isApiErrorRecord(child)) validateLogicalFilters(child);
      }
    } else if (isApiErrorRecord(children)) {
      validateLogicalFilters(children);
    }
  }
};

const memoryFilters = (params: ScopeParams & { filters?: Record<string, unknown> }) => {
  const scope = scopeBody(params);
  const filters = params.filters ?? {};
  validateLogicalFilters(filters);
  const combined = Object.keys(scope).length
    ? Object.keys(filters).length
      ? { AND: [filters, scope] }
      : scope
    : filters;
  if (!hasEntityScope(combined)) {
    throw createApiServiceError(
      'Provide userId, agentId, appId, runId, or positively scoped entity filters.',
      {
        reason: 'mem0_entity_scope_required'
      }
    );
  }
  return combined;
};

const records = (value: unknown, operation: string): Record<string, unknown>[] => {
  const items = Array.isArray(value)
    ? value
    : isApiErrorRecord(value)
      ? value.results
      : undefined;
  if (!Array.isArray(items) || !items.every(isApiErrorRecord)) {
    throw createApiServiceError(`Mem0 returned an invalid ${operation} response.`, {
      reason: 'mem0_invalid_response'
    });
  }
  return items;
};

export const mapMemory = (memory: Record<string, unknown>) => {
  if (
    !isApiErrorRecord(memory) ||
    typeof memory.id !== 'string' ||
    !memory.id ||
    typeof memory.memory !== 'string'
  ) {
    throw createApiServiceError('Mem0 returned a memory without its ID or content.', {
      reason: 'mem0_invalid_response'
    });
  }
  return {
    memoryId: String(memory.id ?? ''),
    memory: String(memory.memory ?? ''),
    userId: typeof memory.user_id === 'string' ? memory.user_id : undefined,
    agentId: typeof memory.agent_id === 'string' ? memory.agent_id : undefined,
    appId: typeof memory.app_id === 'string' ? memory.app_id : undefined,
    runId:
      typeof memory.run_id === 'string'
        ? memory.run_id
        : typeof memory.session_id === 'string'
          ? memory.session_id
          : undefined,
    hash: typeof memory.hash === 'string' ? memory.hash : undefined,
    score: typeof memory.score === 'number' ? memory.score : undefined,
    metadata: isApiErrorRecord(memory.metadata) ? memory.metadata : undefined,
    categories: Array.isArray(memory.categories) ? memory.categories.map(String) : undefined,
    createdAt: typeof memory.created_at === 'string' ? memory.created_at : undefined,
    updatedAt: typeof memory.updated_at === 'string' ? memory.updated_at : undefined,
    expirationDate:
      typeof memory.expiration_date === 'string' ? memory.expiration_date : undefined
  };
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: ClientConfig) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.mem0.ai',
      authHeader: { value: `Token ${config.token}` },
      headers: { Accept: 'application/json' },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Mem0',
          reason: 'mem0_api_error',
          nestedKeys: ['errors', 'details']
        })
    });
    // Older connections may retain configured IDs. Never silently switch their project.
    const legacy = config.legacyScope;
    if (legacy?.orgId || legacy?.projectId) {
      let checked = false;
      this.axios.interceptors.request.use(async request => {
        if (!checked) {
          const identity = await new Client({ token: config.token }).getCurrentUser();
          if (
            (legacy.orgId && legacy.orgId !== identity.orgId) ||
            (legacy.projectId && legacy.projectId !== identity.projectId)
          ) {
            throw createApiServiceError(
              'This saved connection targets a different Mem0 organization or project. Reconnect with an API key for the intended project.',
              {
                reason: 'mem0_legacy_scope_mismatch'
              }
            );
          }
          checked = true;
        }
        return request;
      });
    }
  }

  async getCurrentUser() {
    const { data } = await this.axios.get<Record<string, unknown>>('/v1/ping/');
    if (!isApiErrorRecord(data) || data.status !== 'ok') {
      throw createApiServiceError('Mem0 did not validate this API key.', {
        reason: 'mem0_invalid_api_key'
      });
    }
    return {
      status: String(data.status),
      orgId: typeof data.org_id === 'string' ? data.org_id : undefined,
      projectId: typeof data.project_id === 'string' ? data.project_id : undefined,
      userEmail: typeof data.user_email === 'string' ? data.user_email : undefined
    };
  }

  async addMemory(params: AddMemoryParams): Promise<OperationResult> {
    if (
      !params.messages.length ||
      params.messages.some(
        message =>
          !['user', 'assistant', 'system'].includes(message.role) || !message.content.trim()
      )
    ) {
      throw createApiServiceError(
        'Provide nonempty messages with user, assistant, or system roles.',
        {
          reason: 'mem0_invalid_messages'
        }
      );
    }
    if (!Object.keys(scopeBody(params)).length) {
      throw createApiServiceError('Provide at least one userId, agentId, appId, or runId.', {
        reason: 'mem0_entity_scope_required'
      });
    }
    if (params.memoryType !== undefined) {
      throw createApiServiceError(
        'The hosted Mem0 V3 API does not support memoryType. Omit it and provide the memory as message content.',
        {
          reason: 'mem0_unsupported_memory_type'
        }
      );
    }
    const { data } = await this.axios.post<Record<string, unknown>>(
      '/v3/memories/add/',
      pickDefined({
        messages: params.messages,
        ...scopeBody(params),
        metadata: params.metadata,
        infer: params.infer,
        enable_graph: params.enableGraph,
        expiration_date: params.expirationDate,
        custom_instructions: params.customInstructions
      })
    );
    return this.operationResult(data);
  }

  private operationResult(data: Record<string, unknown>): OperationResult {
    if (isApiErrorRecord(data) && data.status === 'FAILED') {
      const detail =
        typeof data.error === 'string' && data.error.trim() ? `: ${data.error}` : '.';
      throw createApiServiceError(`Mem0 could not complete the memory operation${detail}`, {
        reason: 'mem0_operation_failed'
      });
    }
    const eventId =
      isApiErrorRecord(data) && typeof data.event_id === 'string' && data.event_id.trim()
        ? data.event_id
        : undefined;
    if (
      !isApiErrorRecord(data) ||
      (data.status !== undefined &&
        !['PENDING', 'RUNNING', 'SUCCEEDED'].includes(String(data.status))) ||
      ((data.status === 'PENDING' || data.status === 'RUNNING') && !eventId) ||
      (!eventId && data.status !== 'SUCCEEDED' && !Array.isArray(data.results))
    ) {
      throw createApiServiceError(
        'Mem0 returned no processing event ID or completed results for this operation.',
        {
          reason: 'mem0_invalid_response'
        }
      );
    }
    const events = data.results === undefined ? [] : records(data.results, 'operation');
    return {
      eventId,
      status:
        typeof data.status === 'string' ? data.status : eventId ? 'PENDING' : 'SUCCEEDED',
      events: this.memoryEvents(events)
    };
  }

  private memoryEvents(events: Record<string, unknown>[]): MemoryEvent[] {
    return events
      .filter(event => typeof event.id === 'string' && event.id.trim())
      .map(event => ({
        memoryId: String(event.id),
        event: String(event.event ?? ''),
        memory: isApiErrorRecord(event.data)
          ? String(event.data.memory ?? '')
          : String(event.memory ?? '')
      }));
  }

  async getEvent(eventId: string) {
    const { data } = await this.axios.get<Record<string, unknown>>(
      `/v1/event/${encodeURIComponent(eventId)}/`
    );
    if (
      !isApiErrorRecord(data) ||
      !['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'].includes(String(data.status))
    ) {
      throw createApiServiceError('Mem0 returned an invalid processing event status.', {
        reason: 'mem0_invalid_response'
      });
    }
    return {
      eventId: String(data.id ?? eventId),
      eventType: String(data.event_type ?? ''),
      status: String(data.status ?? ''),
      events: this.memoryEvents(
        Array.isArray(data.results) ? data.results.filter(isApiErrorRecord) : []
      ),
      results: Array.isArray(data.results) ? data.results : [],
      error: typeof data.error === 'string' ? data.error : undefined,
      createdAt: typeof data.created_at === 'string' ? data.created_at : undefined,
      completedAt: typeof data.completed_at === 'string' ? data.completed_at : undefined
    };
  }

  async searchMemories(params: SearchMemoryParams) {
    const { data } = await this.axios.post(
      '/v3/memories/search/',
      pickDefined({
        query: params.query,
        filters: memoryFilters(params),
        top_k: params.topK,
        threshold: params.threshold,
        rerank: params.rerank,
        fields: params.fields ? [...new Set(['id', 'memory', ...params.fields])] : undefined,
        show_expired: params.showExpired
      })
    );
    return records(data, 'search');
  }

  async getMemory(memoryId: string) {
    const { data } = await this.axios.get<Record<string, unknown>>(
      `/v1/memories/${encodeURIComponent(memoryId)}/`
    );
    return data;
  }

  async listMemories(params: ListMemoriesParams) {
    const { data } = await this.axios.post(
      '/v3/memories/',
      pickDefined({
        filters: memoryFilters(params),
        show_expired: params.showExpired
      }),
      { params: { page: params.page ?? 1, page_size: params.pageSize ?? 100 } }
    );
    const memories = records(data, 'list memories');
    return {
      memories,
      totalMemories: typeof data.count === 'number' ? data.count : memories.length,
      next: typeof data.next === 'string' ? data.next : undefined,
      previous: typeof data.previous === 'string' ? data.previous : undefined
    };
  }

  async updateMemory(params: UpdateMemoryParams) {
    if (
      params.text === undefined &&
      params.metadata === undefined &&
      params.expirationDate === undefined
    ) {
      throw createApiServiceError(
        'Provide text, metadata, or expirationDate to update the memory.',
        { reason: 'mem0_empty_update' }
      );
    }
    const { data } = await this.axios.put<Record<string, unknown>>(
      `/v1/memories/${encodeURIComponent(params.memoryId)}/`,
      pickDefined({
        text: params.text,
        metadata: params.metadata,
        expiration_date: params.expirationDate
      })
    );
    return data;
  }

  async deleteMemory(memoryId: string) {
    await this.axios.delete(`/v1/memories/${encodeURIComponent(memoryId)}/`);
  }

  async deleteMemories(params: ScopeParams): Promise<OperationResult> {
    const scope = scopeBody(params);
    if (!Object.keys(scope).length || Object.values(scope).some(value => value === '*')) {
      throw createApiServiceError(
        'Bulk deletion requires an explicit entity ID; empty scopes and wildcards are not allowed.',
        {
          reason: 'mem0_unsafe_delete_scope'
        }
      );
    }
    const { data } = await this.axios.delete<Record<string, unknown>>('/v1/memories/', {
      params: scope
    });
    return this.operationResult(data);
  }

  async getMemoryHistory(memoryId: string) {
    const { data } = await this.axios.get(
      `/v1/memories/${encodeURIComponent(memoryId)}/history/`
    );
    return records(data, 'memory history');
  }

  async listEntities(params: { entityType?: string; page?: number; pageSize?: number } = {}) {
    const { data } = await this.axios.get('/v1/entities/', {
      params: { page: params.page ?? 1, page_size: params.pageSize ?? 100 }
    });
    const items = records(data, 'entities');
    const entities: Entity[] = items
      .filter(entity => !params.entityType || entity.type === params.entityType)
      .map(entity => ({
        id: String(entity.id ?? ''),
        name: String(entity.name ?? ''),
        createdAt: typeof entity.created_at === 'string' ? entity.created_at : undefined,
        updatedAt: typeof entity.updated_at === 'string' ? entity.updated_at : undefined,
        totalMemories:
          typeof entity.total_memories === 'number' ? entity.total_memories : undefined,
        owner: typeof entity.owner === 'string' ? entity.owner : undefined,
        type: typeof entity.type === 'string' ? entity.type : undefined,
        metadata: isApiErrorRecord(entity.metadata) ? entity.metadata : undefined
      }));
    return {
      entities,
      totalEntities: typeof data.count === 'number' ? data.count : items.length,
      next: typeof data.next === 'string' ? data.next : undefined,
      previous: typeof data.previous === 'string' ? data.previous : undefined
    };
  }

  async deleteEntity(entityType: string, entityId: string): Promise<OperationResult> {
    if (entityId === '*') {
      throw createApiServiceError('Provide an explicit entity name instead of a wildcard.', {
        reason: 'mem0_unsafe_delete_scope'
      });
    }
    const { data } = await this.axios.delete<Record<string, unknown>>(
      `/v2/entities/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/`
    );
    return this.operationResult(data);
  }
}
