import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface PaginationInfo {
  nextCursor: string | null;
  totalCount: number;
}

export interface RagieDocument {
  id: string;
  name: string;
  status: string;
  metadata: Record<string, any>;
  partition: string | null;
  chunkCount: number | null;
  externalId: string | null;
  pageCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoredChunk {
  id: string;
  text: string;
  score: number;
  index: number;
  metadata: Record<string, any>;
  documentMetadata: Record<string, any>;
  documentId: string;
  documentName: string;
  links: Record<string, any>;
}

export interface Instruction {
  id: string;
  name: string;
  prompt: string;
  entitySchema: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Connection {
  id: string;
  name: string;
  status: string;
  sourceType: string;
  partition: string | null;
  metadata: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Partition {
  id: string;
  name: string;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  partitionPattern: string | null;
  createdAt: string;
  updatedAt: string;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private partition?: string;

  constructor(config: { token: string; partition?: string }) {
    this.partition = config.partition;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.ragie.ai',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Ragie',
          reason: 'ragie_api_error',
          operation: 'API request'
        })
    });
  }

  private getHeaders(partitionOverride?: string): Record<string, string> {
    let partition = partitionOverride ?? this.partition;
    if (partition) {
      return { partition };
    }
    return {};
  }

  private validatePageSize(pageSize?: number) {
    if (
      pageSize !== undefined &&
      (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
    ) {
      throw createApiServiceError('pageSize must be a whole number between 1 and 100.');
    }
  }

  // ===== Documents =====

  async createDocumentFromUrl(params: {
    url: string;
    name?: string;
    metadata?: Record<string, any>;
    mode?: string;
    externalId?: string;
    partition?: string;
  }): Promise<RagieDocument> {
    let res = await this.axios.post('/documents/url', {
      url: params.url,
      name: params.name,
      metadata: params.metadata,
      mode: params.mode,
      external_id: params.externalId,
      partition: params.partition ?? this.partition
    });
    return this.mapDocument(res.data);
  }

  async createDocumentRaw(params: {
    data: string | Record<string, any>;
    name?: string;
    metadata?: Record<string, any>;
    externalId?: string;
    partition?: string;
  }): Promise<RagieDocument> {
    let res = await this.axios.post('/documents/raw', {
      data: params.data,
      name: params.name,
      metadata: params.metadata,
      external_id: params.externalId,
      partition: params.partition ?? this.partition
    });
    return this.mapDocument(res.data);
  }

  async listDocuments(params?: {
    cursor?: string;
    pageSize?: number;
    filter?: Record<string, any>;
    partition?: string;
  }): Promise<{ documents: RagieDocument[]; pagination: PaginationInfo }> {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize !== undefined) {
      this.validatePageSize(params.pageSize);
      queryParams.page_size = params.pageSize;
    }
    if (params?.filter) queryParams.filter = JSON.stringify(params.filter);

    let res = await this.axios.get('/documents', {
      params: queryParams,
      headers: this.getHeaders(params?.partition)
    });
    return {
      documents: res.data.documents.map((d: any) => this.mapDocument(d)),
      pagination: {
        nextCursor: res.data.pagination.next_cursor ?? null,
        totalCount: res.data.pagination.total_count
      }
    };
  }

  async getDocument(documentId: string, partition?: string): Promise<RagieDocument> {
    let res = await this.axios.get(`/documents/${encodeURIComponent(documentId)}`, {
      headers: this.getHeaders(partition)
    });
    return this.mapDocument(res.data);
  }

  async deleteDocument(
    documentId: string,
    params?: { async?: boolean; partition?: string }
  ): Promise<{ status: string }> {
    let res = await this.axios.delete(`/documents/${encodeURIComponent(documentId)}`, {
      params: params?.async ? { async: true } : undefined,
      headers: this.getHeaders(params?.partition)
    });
    return { status: res.data.status };
  }

  async updateDocumentMetadata(
    documentId: string,
    params: {
      metadata: Record<string, any>;
      partition?: string;
    }
  ): Promise<any> {
    let res = await this.axios.patch(
      `/documents/${encodeURIComponent(documentId)}/metadata`,
      {
        metadata: params.metadata
      },
      {
        headers: this.getHeaders(params.partition)
      }
    );
    return res.data;
  }

  async updateDocumentRaw(
    documentId: string,
    params: {
      data: string | Record<string, any>;
      partition?: string;
    }
  ): Promise<{ status: string }> {
    let res = await this.axios.put(
      `/documents/${encodeURIComponent(documentId)}/raw`,
      {
        data: params.data
      },
      {
        headers: this.getHeaders(params.partition)
      }
    );
    return { status: res.data.status };
  }

  async updateDocumentFromUrl(
    documentId: string,
    params: {
      url: string;
      mode?: string;
      partition?: string;
    }
  ): Promise<{ status: string }> {
    let res = await this.axios.put(
      `/documents/${encodeURIComponent(documentId)}/url`,
      {
        url: params.url,
        mode: params.mode
      },
      {
        headers: this.getHeaders(params.partition)
      }
    );
    return { status: res.data.status };
  }

  async getDocumentContent(
    documentId: string,
    params?: {
      partition?: string;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/documents/${encodeURIComponent(documentId)}/content`, {
      params: { media_type: 'application/json' },
      headers: this.getHeaders(params?.partition)
    });
    return res.data;
  }

  async getDocumentSummary(
    documentId: string,
    params?: {
      partition?: string;
    }
  ): Promise<any> {
    let res = await this.axios.get(`/documents/${encodeURIComponent(documentId)}/summary`, {
      headers: this.getHeaders(params?.partition)
    });
    return res.data;
  }

  async getDocumentChunks(
    documentId: string,
    params?: {
      cursor?: string;
      pageSize?: number;
      startIndex?: number;
      endIndex?: number;
      partition?: string;
    }
  ): Promise<{ chunks: any[]; pagination: PaginationInfo }> {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize !== undefined) {
      this.validatePageSize(params.pageSize);
      queryParams.page_size = params.pageSize;
    }

    if (params?.startIndex !== undefined) queryParams.start_index = params.startIndex;
    if (params?.endIndex !== undefined) queryParams.end_index = params.endIndex;

    let res = await this.axios.get(`/documents/${encodeURIComponent(documentId)}/chunks`, {
      params: queryParams,
      headers: this.getHeaders(params?.partition)
    });
    return {
      chunks: res.data.chunks,
      pagination: {
        nextCursor: res.data.pagination.next_cursor ?? null,
        totalCount: res.data.pagination.total_count
      }
    };
  }

  // ===== Retrievals =====

  async retrieve(params: {
    query: string;
    topK?: number;
    rerank?: boolean;
    filter?: Record<string, any>;
    maxChunksPerDocument?: number;
    recencyBias?: boolean;
    partition?: string;
  }): Promise<{ scoredChunks: ScoredChunk[] }> {
    let res = await this.axios.post('/retrievals', {
      query: params.query,
      top_k: params.topK,
      rerank: params.rerank,
      filter: params.filter,
      max_chunks_per_document: params.maxChunksPerDocument,
      recency_bias: params.recencyBias,
      partition: params.partition ?? this.partition
    });
    return {
      scoredChunks: (res.data.scored_chunks || []).map((c: any) => ({
        id: c.id,
        text: c.text,
        score: c.score,
        index: c.index,
        metadata: c.metadata || {},
        documentMetadata: c.document_metadata || {},
        documentId: c.document_id,
        documentName: c.document_name,
        links: c.links || {}
      }))
    };
  }

  // ===== Responses (Deep-Search) =====

  async createResponse(params: {
    input: string;
    instructions?: string;
    partition?: string;
    reasoningEffort?: string;
  }): Promise<any> {
    let tools: any[] = [];
    let partition = params.partition ?? this.partition;
    if (partition) {
      tools.push({ type: 'retrieve', partitions: [partition] });
    } else {
      tools.push({ type: 'retrieve', partitions: ['default'] });
    }

    let body: Record<string, any> = {
      input: params.input,
      tools,
      model: 'deep-search',
      stream: false
    };
    if (params.instructions) body.instructions = params.instructions;
    if (params.reasoningEffort) body.reasoning = { effort: params.reasoningEffort };

    let res = await this.axios.post('/responses', body);
    return res.data;
  }

  // ===== Instructions (Entity Extraction) =====

  async listInstructions(): Promise<Instruction[]> {
    let res = await this.axios.get('/instructions');
    let instructions = res.data.instructions || res.data;
    if (Array.isArray(instructions)) {
      return instructions.map((i: any) => this.mapInstruction(i));
    }
    return [];
  }

  async createInstruction(params: {
    name?: string;
    prompt: string;
    entitySchema?: Record<string, any>;
    scope?: string;
    filter?: Record<string, any>;
    active?: boolean;
    contextTemplate?: string;
    partition?: string;
  }): Promise<Instruction> {
    let body: Record<string, any> = {
      prompt: params.prompt
    };
    if (params.name) body.name = params.name;
    if (params.entitySchema) body.entity_schema = params.entitySchema;
    if (params.scope) body.scope = params.scope;
    if (params.filter) body.filter = params.filter;
    if (params.active !== undefined) body.active = params.active;
    if (params.contextTemplate !== undefined) body.context_template = params.contextTemplate;
    if ((params.partition ?? this.partition) !== undefined) {
      body.partition = params.partition ?? this.partition;
    }

    let res = await this.axios.post('/instructions', body);
    return this.mapInstruction(res.data);
  }

  async updateInstruction(
    instructionId: string,
    params: {
      name?: string;
      prompt?: string;
      entitySchema?: Record<string, any>;
      scope?: string;
      filter?: Record<string, any>;
      active?: boolean;
      contextTemplate?: string;
    }
  ): Promise<Instruction> {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.prompt !== undefined) body.prompt = params.prompt;
    if (params.entitySchema !== undefined) body.entity_schema = params.entitySchema;
    if (params.scope !== undefined) body.scope = params.scope;
    if (params.filter !== undefined) body.filter = params.filter;
    if (params.active !== undefined) body.active = params.active;
    if (params.contextTemplate !== undefined) body.context_template = params.contextTemplate;

    let res = await this.axios.patch(
      `/instructions/${encodeURIComponent(instructionId)}`,
      body
    );
    return this.mapInstruction(res.data);
  }

  async deleteInstruction(instructionId: string): Promise<void> {
    await this.axios.delete(`/instructions/${encodeURIComponent(instructionId)}`);
  }

  async getInstructionEntities(
    instructionId: string,
    params?: {
      cursor?: string;
      pageSize?: number;
      partition?: string;
    }
  ): Promise<{ entities: any[]; pagination: PaginationInfo }> {
    let queryParams: Record<string, any> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize !== undefined) {
      this.validatePageSize(params.pageSize);
      queryParams.page_size = params.pageSize;
    }

    let res = await this.axios.get(
      `/instructions/${encodeURIComponent(instructionId)}/entities`,
      {
        params: queryParams,
        headers: this.getHeaders(params?.partition)
      }
    );
    return {
      entities: res.data.entities || res.data,
      pagination: res.data.pagination
        ? {
            nextCursor: res.data.pagination.next_cursor ?? null,
            totalCount: res.data.pagination.total_count
          }
        : { nextCursor: null, totalCount: 0 }
    };
  }

  async getDocumentEntities(
    documentId: string,
    params?: {
      cursor?: string;
      pageSize?: number;
      partition?: string;
    }
  ): Promise<{ entities: any[]; pagination: PaginationInfo }> {
    this.validatePageSize(params?.pageSize);
    let res = await this.axios.get(`/documents/${encodeURIComponent(documentId)}/entities`, {
      params: { cursor: params?.cursor, page_size: params?.pageSize },
      headers: this.getHeaders(params?.partition)
    });
    return {
      entities: res.data.entities,
      pagination: {
        nextCursor: res.data.pagination.next_cursor ?? null,
        totalCount: res.data.pagination.total_count
      }
    };
  }

  // ===== Connections =====

  async listConnections(params?: {
    cursor?: string;
    pageSize?: number;
    filter?: Record<string, any>;
    partition?: string;
  }): Promise<{ connections: Connection[]; pagination: PaginationInfo }> {
    this.validatePageSize(params?.pageSize);
    let res = await this.axios.get('/connections', {
      params: {
        cursor: params?.cursor,
        page_size: params?.pageSize,
        filter: params?.filter === undefined ? undefined : JSON.stringify(params.filter)
      },
      headers: this.getHeaders(params?.partition)
    });
    let connections = res.data.connections || res.data;
    if (Array.isArray(connections)) {
      return {
        connections: connections.map((c: any) => this.mapConnection(c)),
        pagination: {
          nextCursor: res.data.pagination?.next_cursor ?? null,
          totalCount: res.data.pagination?.total_count ?? connections.length
        }
      };
    }
    throw createApiServiceError('Ragie returned an invalid connection list.');
  }

  async getConnection(connectionId: string): Promise<Connection> {
    let res = await this.axios.get(`/connections/${encodeURIComponent(connectionId)}`);
    return this.mapConnection(res.data);
  }

  async updateConnection(
    connectionId: string,
    params: {
      partitionStrategy?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Connection> {
    let body: Record<string, any> = {};
    if (params.partitionStrategy) body.partition_strategy = params.partitionStrategy;
    if (params.metadata) body.metadata = params.metadata;

    let res = await this.axios.put(`/connections/${encodeURIComponent(connectionId)}`, body);
    return this.mapConnection(res.data);
  }

  async setConnectionEnabled(connectionId: string, enabled: boolean): Promise<any> {
    let res = await this.axios.put(
      `/connections/${encodeURIComponent(connectionId)}/enabled`,
      { enabled }
    );
    return res.data;
  }

  async getConnectionStats(connectionId: string): Promise<any> {
    let res = await this.axios.get(`/connections/${encodeURIComponent(connectionId)}/stats`);
    return res.data;
  }

  async deleteConnection(connectionId: string, keepFiles?: boolean): Promise<any> {
    let res = await this.axios.post(
      `/connections/${encodeURIComponent(connectionId)}/delete`,
      {
        keep_files: keepFiles ?? false
      }
    );
    return res.data;
  }

  async syncConnection(connectionId: string): Promise<any> {
    let res = await this.axios.post(`/connections/${encodeURIComponent(connectionId)}/sync`);
    return res.data;
  }

  async listConnectionSourceTypes(): Promise<any[]> {
    let res = await this.axios.get('/connections/source_types');
    return res.data;
  }

  // ===== Partitions =====

  async listPartitions(params?: { cursor?: string; pageSize?: number }): Promise<{
    partitions: Record<string, any>[];
    pagination: PaginationInfo;
  }> {
    this.validatePageSize(params?.pageSize);
    let res = await this.axios.get('/partitions', {
      params: { cursor: params?.cursor, page_size: params?.pageSize }
    });
    return {
      partitions: res.data.partitions,
      pagination: {
        nextCursor: res.data.pagination.next_cursor ?? null,
        totalCount: res.data.pagination.total_count
      }
    };
  }

  async listLegacyPartitions(params?: {
    cursor?: string;
    pageSize?: number;
  }): Promise<Partition[]> {
    let result = await this.listPartitions(params);
    for (let partition of result.partitions) {
      if (
        typeof partition.created_at !== 'string' ||
        typeof partition.updated_at !== 'string'
      ) {
        throw createApiServiceError(
          'Ragie did not return the timestamps required by this partition listing. Use list_partitions to browse partitions and manage_partitions with action "get" for usage metrics.'
        );
      }
    }
    let partitions = await Promise.all(
      result.partitions.map(async partition => {
        if (
          partition.document_count !== undefined ||
          partition.stats?.document_count !== undefined
        ) {
          return partition;
        }
        let detail = await this.getPartition(partition.id ?? partition.name);
        return { ...partition, ...detail };
      })
    );
    return partitions.map(partition => {
      if (typeof (partition.document_count ?? partition.stats?.document_count) !== 'number') {
        throw createApiServiceError(
          'Ragie did not return a document count for this partition. Use list_partitions to browse available partition details.'
        );
      }
      return this.mapPartition(partition);
    });
  }

  async createPartition(params: { name: string }): Promise<Record<string, any>> {
    let res = await this.axios.post('/partitions', { name: params.name });
    return {
      ...res.data,
      partitionId: res.data.id ?? res.data.name,
      ...(res.data.document_count !== undefined
        ? { documentCount: res.data.document_count }
        : {}),
      ...(res.data.stats?.document_count !== undefined
        ? { documentCount: res.data.stats.document_count }
        : {}),
      ...(res.data.created_at !== undefined ? { createdAt: res.data.created_at } : {}),
      ...(res.data.updated_at !== undefined ? { updatedAt: res.data.updated_at } : {})
    };
  }

  async getPartition(partitionId: string): Promise<any> {
    let res = await this.axios.get(`/partitions/${encodeURIComponent(partitionId)}`);
    return res.data;
  }

  async deletePartition(partitionId: string): Promise<{ status: string }> {
    let res = await this.axios.delete(`/partitions/${encodeURIComponent(partitionId)}`);
    return { status: res.data.status };
  }

  // ===== Webhooks =====

  async listWebhookEndpoints(): Promise<WebhookEndpoint[]> {
    let res = await this.axios.get('/webhook_endpoints');
    let endpoints = res.data.webhook_endpoints || res.data;
    if (Array.isArray(endpoints)) {
      return endpoints.map((e: any) => this.mapWebhookEndpoint(e));
    }
    return [];
  }

  async createWebhookEndpoint(params: {
    url: string;
    name?: string;
    partitionPattern?: string;
  }): Promise<WebhookEndpoint> {
    let body: Record<string, any> = { url: params.url };
    if (params.name) body.name = params.name;
    if (params.partitionPattern) body.partition_pattern = params.partitionPattern;

    let res = await this.axios.post('/webhook_endpoints', body);
    return this.mapWebhookEndpoint(res.data);
  }

  async deleteWebhookEndpoint(endpointId: string): Promise<void> {
    await this.axios.delete(`/webhook_endpoints/${endpointId}`);
  }

  // ===== Mapping Helpers =====

  private mapDocument(d: any): RagieDocument {
    return {
      id: d.id,
      name: d.name,
      status: d.status,
      metadata: d.metadata || {},
      partition: d.partition || null,
      chunkCount: d.chunk_count ?? null,
      externalId: d.external_id ?? null,
      pageCount: d.page_count ?? null,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    };
  }

  private mapInstruction(i: any): Instruction {
    return {
      id: i.id,
      name: i.name,
      prompt: i.prompt,
      entitySchema: i.entity_schema || null,
      createdAt: i.created_at,
      updatedAt: i.updated_at
    };
  }

  private mapConnection(c: any): Connection {
    return {
      id: c.id,
      name: c.name,
      status:
        c.status ??
        (c.disabled_by_system
          ? 'disabled_by_system'
          : c.syncing
            ? 'syncing'
            : c.enabled
              ? 'enabled'
              : 'disabled'),
      sourceType: c.source_type ?? c.type,
      partition: c.partition || null,
      metadata: c.metadata || {},
      enabled: c.enabled,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    };
  }

  private mapPartition(p: any): Partition {
    return {
      id: p.id ?? p.name,
      name: p.name,
      documentCount: p.document_count ?? p.stats?.document_count,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    };
  }

  private mapWebhookEndpoint(e: any): WebhookEndpoint {
    return {
      id: e.id,
      name: e.name,
      url: e.url,
      partitionPattern: e.partition_pattern || null,
      createdAt: e.created_at,
      updatedAt: e.updated_at
    };
  }
}
