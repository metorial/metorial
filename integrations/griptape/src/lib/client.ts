import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  nextPage?: number;
  previousPage?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationResult;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: `${config.baseUrl.replace(/\/+$/, '')}/api`,
      timeout: 120_000,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Griptape Cloud',
          reason: 'griptape_api_error'
        })
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  private mapPagination(raw: Record<string, number | null>): PaginationResult {
    return {
      pageNumber: raw.page_number ?? 1,
      pageSize: raw.page_size ?? 0,
      totalCount: raw.total_count ?? 0,
      totalPages: raw.total_pages ?? 0,
      nextPage: raw.next_page ?? undefined,
      previousPage: raw.previous_page ?? undefined
    };
  }

  private paginationQuery(params?: PaginationParams): Record<string, any> {
    let query: Record<string, any> = {};
    if (params?.page !== undefined) {
      if (!Number.isInteger(params.page) || params.page < 1)
        throw createApiServiceError('page must be a positive integer.');
      query.page = params.page;
    }
    if (params?.pageSize !== undefined) {
      if (!Number.isInteger(params.pageSize) || params.pageSize < 1)
        throw createApiServiceError('pageSize must be a positive integer.');
      query.page_size = params.pageSize;
    }
    return query;
  }

  // ── Assistants ───────────────────────────────────────────

  async listAssistants(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/assistants', { params: this.paginationQuery(params) });
    return { items: res.data.assistants, pagination: this.mapPagination(res.data.pagination) };
  }

  async createAssistant(data: {
    name: string;
    description?: string;
    input?: string;
    model?: string;
    knowledgeBaseIds?: string[];
    retrieverIds?: string[];
    rulesetIds?: string[];
    structureIds?: string[];
    toolIds?: string[];
  }): Promise<any> {
    let res = await this.axios.post('/assistants', {
      name: data.name,
      description: data.description,
      input: data.input,
      model: data.model,
      knowledge_base_ids: data.knowledgeBaseIds,
      retriever_ids: data.retrieverIds,
      ruleset_ids: data.rulesetIds,
      structure_ids: data.structureIds,
      tool_ids: data.toolIds
    });
    return res.data;
  }

  async getAssistant(assistantId: string): Promise<any> {
    let res = await this.axios.get(`/assistants/${encodeURIComponent(assistantId)}`);
    return res.data;
  }

  async updateAssistant(
    assistantId: string,
    data: {
      name?: string;
      description?: string;
      input?: string;
      model?: string;
      knowledgeBaseIds?: string[];
      retrieverIds?: string[];
      rulesetIds?: string[];
      structureIds?: string[];
      toolIds?: string[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.input !== undefined) body.input = data.input;
    if (data.model !== undefined) body.model = data.model;
    if (data.knowledgeBaseIds !== undefined) body.knowledge_base_ids = data.knowledgeBaseIds;
    if (data.retrieverIds !== undefined) body.retriever_ids = data.retrieverIds;
    if (data.rulesetIds !== undefined) body.ruleset_ids = data.rulesetIds;
    if (data.structureIds !== undefined) body.structure_ids = data.structureIds;
    if (data.toolIds !== undefined) body.tool_ids = data.toolIds;
    let res = await this.axios.patch(`/assistants/${encodeURIComponent(assistantId)}`, body);
    return res.data;
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await this.axios.delete(`/assistants/${encodeURIComponent(assistantId)}`);
  }

  // ── Assistant Runs ───────────────────────────────────────

  async listAssistantRuns(
    assistantId: string,
    params?: PaginationParams & { status?: string[] }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.status?.length) query.status = params.status.join(',');
    let res = await this.axios.get(`/assistants/${encodeURIComponent(assistantId)}/runs`, {
      params: query
    });
    return {
      items: res.data.assistant_runs,
      pagination: this.mapPagination(res.data.pagination)
    };
  }

  async createAssistantRun(
    assistantId: string,
    data: {
      input?: string;
      args?: string[];
      threadId?: string;
      newThread?: boolean;
      model?: string;
      knowledgeBaseIds?: string[];
      retrieverIds?: string[];
      rulesetIds?: string[];
      structureIds?: string[];
      toolIds?: string[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.input !== undefined) body.input = data.input;
    if (data.args !== undefined) body.args = data.args;
    if (data.threadId !== undefined) body.thread_id = data.threadId;
    if (data.newThread !== undefined) body.new_thread = data.newThread;
    if (data.model !== undefined) body.model = data.model;
    if (data.knowledgeBaseIds !== undefined) body.knowledge_base_ids = data.knowledgeBaseIds;
    if (data.retrieverIds !== undefined) body.retriever_ids = data.retrieverIds;
    if (data.rulesetIds !== undefined) body.ruleset_ids = data.rulesetIds;
    if (data.structureIds !== undefined) body.structure_ids = data.structureIds;
    if (data.toolIds !== undefined) body.tool_ids = data.toolIds;
    let res = await this.axios.post(
      `/assistants/${encodeURIComponent(assistantId)}/runs`,
      body
    );
    return res.data;
  }

  async getAssistantRun(assistantRunId: string): Promise<any> {
    let res = await this.axios.get(`/assistant-runs/${encodeURIComponent(assistantRunId)}`);
    return res.data;
  }

  async cancelAssistantRun(assistantRunId: string): Promise<any> {
    let res = await this.axios.post(
      `/assistant-runs/${encodeURIComponent(assistantRunId)}/cancel`
    );
    return res.data;
  }

  // ── Structures ───────────────────────────────────────────

  async listStructures(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/structures', { params: this.paginationQuery(params) });
    return { items: res.data.structures, pagination: this.mapPagination(res.data.pagination) };
  }

  async getStructure(structureId: string): Promise<any> {
    let res = await this.axios.get(`/structures/${encodeURIComponent(structureId)}`);
    return res.data;
  }

  async deleteStructure(structureId: string): Promise<void> {
    await this.axios.delete(`/structures/${encodeURIComponent(structureId)}`);
  }

  // ── Structure Runs ───────────────────────────────────────

  async listStructureRuns(
    structureId: string,
    params?: PaginationParams & { status?: string[] }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.status?.length) query.status = params.status.join(',');
    let res = await this.axios.get(`/structures/${encodeURIComponent(structureId)}/runs`, {
      params: query
    });
    return {
      items: res.data.structure_runs,
      pagination: this.mapPagination(res.data.pagination)
    };
  }

  async createStructureRun(
    structureId: string,
    data: {
      args: string[];
      envVars?: Array<{ name: string; value: string; source?: string }>;
    }
  ): Promise<any> {
    let body: Record<string, any> = { args: data.args };
    if (data.envVars) {
      body.env_vars = data.envVars.map(v => ({
        name: v.name,
        value: v.value,
        source: v.source ?? 'manual'
      }));
    }
    let res = await this.axios.post(
      `/structures/${encodeURIComponent(structureId)}/runs`,
      body
    );
    return res.data;
  }

  async getStructureRun(structureRunId: string): Promise<any> {
    let res = await this.axios.get(`/structure-runs/${encodeURIComponent(structureRunId)}`);
    return res.data;
  }

  async cancelStructureRun(structureRunId: string): Promise<any> {
    let res = await this.axios.post(
      `/structure-runs/${encodeURIComponent(structureRunId)}/cancel`
    );
    return res.data;
  }

  async listStructureRunLogs(structureRunId: string): Promise<any> {
    let res = await this.axios.get(
      `/structure-runs/${encodeURIComponent(structureRunId)}/logs`
    );
    return res.data;
  }

  // ── Knowledge Bases ──────────────────────────────────────

  async listKnowledgeBases(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/knowledge-bases', {
      params: this.paginationQuery(params)
    });
    return {
      items: res.data.knowledge_bases,
      pagination: this.mapPagination(res.data.pagination)
    };
  }

  async getKnowledgeBase(knowledgeBaseId: string): Promise<any> {
    let res = await this.axios.get(`/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`);
    return res.data;
  }

  async deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    await this.axios.delete(`/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`);
  }

  async queryKnowledgeBase(
    knowledgeBaseId: string,
    query: string,
    queryArgs?: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.post(
      `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/query`,
      {
        query,
        query_args: queryArgs
      }
    );
    return res.data;
  }

  async searchKnowledgeBase(
    knowledgeBaseId: string,
    query: string,
    queryArgs?: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.post(
      `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/search`,
      { query, query_args: queryArgs }
    );
    return res.data;
  }

  async createKnowledgeBaseJob(knowledgeBaseId: string): Promise<any> {
    let res = await this.axios.post(
      `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/knowledge-base-jobs`
    );
    return res.data;
  }

  async listKnowledgeBaseJobs(
    knowledgeBaseId: string,
    params?: PaginationParams & { status?: string[] }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.status?.length) query.status = params.status.join(',');
    let res = await this.axios.get(
      `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/knowledge-base-jobs`,
      {
        params: query
      }
    );
    return {
      items: res.data.knowledge_base_jobs,
      pagination: this.mapPagination(res.data.pagination)
    };
  }

  async getKnowledgeBaseJob(jobId: string): Promise<any> {
    let res = await this.axios.get(`/knowledge-base-jobs/${encodeURIComponent(jobId)}`);
    return res.data;
  }

  // ── Data Connectors (Data Sources) ──────────────────────

  async listDataConnectors(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/data-connectors', {
      params: this.paginationQuery(params)
    });
    return {
      items: res.data.data_connectors,
      pagination: this.mapPagination(res.data.pagination)
    };
  }

  async getDataConnector(dataConnectorId: string): Promise<any> {
    let res = await this.axios.get(`/data-connectors/${encodeURIComponent(dataConnectorId)}`);
    return res.data;
  }

  async deleteDataConnector(dataConnectorId: string): Promise<void> {
    await this.axios.delete(`/data-connectors/${encodeURIComponent(dataConnectorId)}`);
  }

  async createDataJob(dataConnectorId: string): Promise<any> {
    let res = await this.axios.post(
      `/data-connectors/${encodeURIComponent(dataConnectorId)}/data-jobs`
    );
    return res.data;
  }

  async listDataJobs(
    dataConnectorId: string,
    params?: PaginationParams & { status?: string[] }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.status?.length) query.status = params.status.join(',');
    let res = await this.axios.get(
      `/data-connectors/${encodeURIComponent(dataConnectorId)}/data-jobs`,
      {
        params: query
      }
    );
    return { items: res.data.data_jobs, pagination: this.mapPagination(res.data.pagination) };
  }

  // ── Buckets (Data Lakes) ─────────────────────────────────

  async listBuckets(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/buckets', { params: this.paginationQuery(params) });
    return { items: res.data.buckets, pagination: this.mapPagination(res.data.pagination) };
  }

  async createBucket(data: { name: string; description?: string }): Promise<any> {
    if (data.description !== undefined)
      throw createApiServiceError(
        'Griptape Cloud buckets support a name only. Omit description.'
      );
    let res = await this.axios.post('/buckets', { name: data.name });
    return res.data;
  }

  async getBucket(bucketId: string): Promise<any> {
    let res = await this.axios.get(`/buckets/${encodeURIComponent(bucketId)}`);
    return res.data;
  }

  async deleteBucket(bucketId: string): Promise<void> {
    await this.axios.delete(`/buckets/${encodeURIComponent(bucketId)}`);
  }

  async listAssets(
    bucketId: string,
    params?: PaginationParams & { prefix?: string; postfix?: string }
  ): Promise<any> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.prefix) query.prefix = params.prefix;
    if (params?.postfix) query.postfix = params.postfix;
    let res = await this.axios.get(`/buckets/${encodeURIComponent(bucketId)}/assets`, {
      params: query
    });
    return res.data;
  }

  async deleteAsset(bucketId: string, assetName: string): Promise<void> {
    await this.axios.delete(
      `/buckets/${encodeURIComponent(bucketId)}/assets/${encodeURIComponent(assetName)}`
    );
  }

  // ── Retrievers ───────────────────────────────────────────

  async listRetrievers(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/retrievers', { params: this.paginationQuery(params) });
    return { items: res.data.retrievers, pagination: this.mapPagination(res.data.pagination) };
  }

  async getRetriever(retrieverId: string): Promise<any> {
    let res = await this.axios.get(`/retrievers/${encodeURIComponent(retrieverId)}`);
    return res.data;
  }

  async queryRetriever(
    retrieverId: string,
    query: string,
    queryArgs?: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.post(`/retrievers/${encodeURIComponent(retrieverId)}/query`, {
      query,
      retriever_components_query_args: queryArgs
    });
    return res.data;
  }

  async deleteRetriever(retrieverId: string): Promise<void> {
    await this.axios.delete(`/retrievers/${encodeURIComponent(retrieverId)}`);
  }

  // ── Tools ────────────────────────────────────────────────

  async listTools(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/tools', { params: this.paginationQuery(params) });
    return { items: res.data.tools, pagination: this.mapPagination(res.data.pagination) };
  }

  async getTool(toolId: string): Promise<any> {
    let res = await this.axios.get(`/tools/${encodeURIComponent(toolId)}`);
    return res.data;
  }

  async getToolOpenApi(toolId: string): Promise<unknown> {
    let res = await this.axios.get(`/tools/${encodeURIComponent(toolId)}/openapi`);
    return res.data;
  }

  async deleteTool(toolId: string): Promise<void> {
    await this.axios.delete(`/tools/${encodeURIComponent(toolId)}`);
  }

  async runToolActivity(
    toolId: string,
    activityPath: string,
    input?: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.post(
      `/tools/${encodeURIComponent(toolId)}/activities/${encodeURIComponent(activityPath)}`,
      input ?? {}
    );
    return res.data;
  }

  // ── Rules ────────────────────────────────────────────────

  async listRules(
    params?: PaginationParams & { rulesetId?: string }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.rulesetId) query.ruleset_id = params.rulesetId;
    let res = await this.axios.get('/rules', { params: query });
    return { items: res.data.rules, pagination: this.mapPagination(res.data.pagination) };
  }

  async createRule(data: {
    name: string;
    rule: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    let res = await this.axios.post('/rules', data);
    return res.data;
  }

  async getRule(ruleId: string): Promise<any> {
    let res = await this.axios.get(`/rules/${encodeURIComponent(ruleId)}`);
    return res.data;
  }

  async updateRule(
    ruleId: string,
    data: { name?: string; rule?: string; metadata?: Record<string, any> }
  ): Promise<any> {
    let res = await this.axios.patch(`/rules/${encodeURIComponent(ruleId)}`, data);
    return res.data;
  }

  async deleteRule(ruleId: string): Promise<void> {
    await this.axios.delete(`/rules/${encodeURIComponent(ruleId)}`);
  }

  // ── Rulesets ─────────────────────────────────────────────

  async listRulesets(
    params?: PaginationParams & { alias?: string }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.alias) query.alias = params.alias;
    let res = await this.axios.get('/rulesets', { params: query });
    return { items: res.data.rulesets, pagination: this.mapPagination(res.data.pagination) };
  }

  async createRuleset(data: {
    name: string;
    alias?: string;
    description?: string;
    metadata?: Record<string, any>;
    ruleIds?: string[];
  }): Promise<any> {
    let res = await this.axios.post('/rulesets', {
      name: data.name,
      alias: data.alias,
      description: data.description,
      metadata: data.metadata,
      rule_ids: data.ruleIds
    });
    return res.data;
  }

  async getRuleset(rulesetId: string): Promise<any> {
    let res = await this.axios.get(`/rulesets/${encodeURIComponent(rulesetId)}`);
    return res.data;
  }

  async updateRuleset(
    rulesetId: string,
    data: {
      name?: string;
      alias?: string;
      description?: string;
      metadata?: Record<string, any>;
      ruleIds?: string[];
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.alias !== undefined) body.alias = data.alias;
    if (data.description !== undefined) body.description = data.description;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.ruleIds !== undefined) body.rule_ids = data.ruleIds;
    let res = await this.axios.patch(`/rulesets/${encodeURIComponent(rulesetId)}`, body);
    return res.data;
  }

  async deleteRuleset(rulesetId: string): Promise<void> {
    await this.axios.delete(`/rulesets/${encodeURIComponent(rulesetId)}`);
  }

  // ── Threads ──────────────────────────────────────────────

  async listThreads(
    params?: PaginationParams & { alias?: string; startsWith?: string; createdBy?: string }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.alias) query.alias = params.alias;
    if (params?.startsWith) query.starts_with = params.startsWith;
    if (params?.createdBy) query.created_by = params.createdBy;
    let res = await this.axios.get('/threads', { params: query });
    return { items: res.data.threads, pagination: this.mapPagination(res.data.pagination) };
  }

  async createThread(data: {
    name: string;
    alias?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    let res = await this.axios.post('/threads', data);
    return res.data;
  }

  async getThread(threadId: string): Promise<any> {
    let res = await this.axios.get(`/threads/${encodeURIComponent(threadId)}`);
    return res.data;
  }

  async updateThread(
    threadId: string,
    data: {
      name?: string;
      alias?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    let res = await this.axios.patch(`/threads/${encodeURIComponent(threadId)}`, data);
    return res.data;
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.axios.delete(`/threads/${encodeURIComponent(threadId)}`);
  }

  // ── Messages ─────────────────────────────────────────────

  async listMessages(
    threadId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get(`/threads/${encodeURIComponent(threadId)}/messages`, {
      params: this.paginationQuery(params)
    });
    return { items: res.data.messages, pagination: this.mapPagination(res.data.pagination) };
  }

  async createMessage(
    threadId: string,
    data: {
      input: string;
      output: string;
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    let res = await this.axios.post(`/threads/${encodeURIComponent(threadId)}/messages`, data);
    return res.data;
  }

  async getMessage(messageId: string): Promise<any> {
    let res = await this.axios.get(`/messages/${encodeURIComponent(messageId)}`);
    return res.data;
  }

  async updateMessage(
    messageId: string,
    data: {
      input?: string;
      output?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    let res = await this.axios.patch(`/messages/${encodeURIComponent(messageId)}`, data);
    return res.data;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.axios.delete(`/messages/${encodeURIComponent(messageId)}`);
  }

  async createKnowledgeBase(data: {
    name: string;
    description?: string;
    assetPaths?: string[];
    embeddingModel?: 'text-embedding-ada-002' | 'text-embedding-3-small';
  }): Promise<any> {
    let res = await this.axios.post(
      '/knowledge-bases',
      pickDefined({
        name: data.name,
        description: data.description,
        type: 'gtc_pg_vector',
        config: {
          gtc_pg_vector: {
            use_default_embedding_model: data.embeddingModel === undefined,
            embedding_model: data.embeddingModel
          }
        },
        asset_paths: data.assetPaths,
        use_default_embedding_model: data.embeddingModel === undefined,
        embedding_model: data.embeddingModel
      })
    );
    return res.data;
  }

  async updateKnowledgeBase(
    knowledgeBaseId: string,
    data: {
      name?: string;
      description?: string;
      assetPaths?: string[];
      embeddingModel?: 'text-embedding-ada-002' | 'text-embedding-3-small';
    }
  ): Promise<any> {
    let current = await this.getKnowledgeBase(knowledgeBaseId);
    if (current.type !== 'gtc_pg_vector') {
      throw createApiServiceError(
        'This operation updates managed vector knowledge bases only. Choose a managed vector knowledge base from list_knowledge_bases.'
      );
    }
    let res = await this.axios.patch(
      `/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`,
      pickDefined({
        name: data.name,
        description: data.description,
        type: current.type,
        config: {
          gtc_pg_vector: pickDefined({
            use_default_embedding_model:
              data.embeddingModel === undefined
                ? current.config?.gtc_pg_vector?.use_default_embedding_model
                : false,
            embedding_model:
              data.embeddingModel ?? current.config?.gtc_pg_vector?.embedding_model
          })
        },
        asset_paths: data.assetPaths,
        embedding_model: data.embeddingModel,
        use_default_embedding_model: data.embeddingModel === undefined ? undefined : false
      })
    );
    return res.data;
  }

  async cancelKnowledgeBaseJob(jobId: string): Promise<any> {
    let res = await this.axios.post(
      `/knowledge-base-jobs/${encodeURIComponent(jobId)}/cancel`
    );
    return res.data;
  }

  async getDataJob(dataJobId: string): Promise<any> {
    let res = await this.axios.get(`/data-jobs/${encodeURIComponent(dataJobId)}`);
    return res.data;
  }

  async cancelDataJob(dataJobId: string): Promise<any> {
    let res = await this.axios.post(`/data-jobs/${encodeURIComponent(dataJobId)}/cancel`);
    return res.data;
  }

  async updateBucket(bucketId: string, name: string): Promise<any> {
    let res = await this.axios.patch(`/buckets/${encodeURIComponent(bucketId)}`, { name });
    return res.data;
  }

  async getAsset(bucketId: string, name: string): Promise<any> {
    let res = await this.axios.get(
      `/buckets/${encodeURIComponent(bucketId)}/assets/${encodeURIComponent(name)}`
    );
    return res.data;
  }

  async getAssetUrl(
    bucketId: string,
    name: string,
    operation: 'PUT' | 'GET',
    contentType?: string
  ): Promise<{ url: string; headers: Record<string, string> }> {
    let res = await this.axios.post(
      `/buckets/${encodeURIComponent(bucketId)}/asset-urls/${encodeURIComponent(name)}`,
      pickDefined({ operation, content_type: contentType })
    );
    let details = z
      .object({
        url: z.string().url(),
        headers: z.record(z.string(), z.string()).default({})
      })
      .safeParse(res.data);
    if (!details.success)
      throw createApiServiceError(
        'Griptape Cloud returned invalid file download details. Request the file again.'
      );
    return details.data;
  }

  async getAssetDownload(
    bucketId: string,
    name: string
  ): Promise<{ url: string; headers: Record<string, string>; expiresAt: string }> {
    let details = await this.getAssetUrl(bucketId, name, 'GET');
    let url = new URL(details.url);
    let date = url.searchParams.get('X-Amz-Date');
    let seconds = Number(url.searchParams.get('X-Amz-Expires'));
    let legacyExpiry = Number(url.searchParams.get('Expires'));
    let expiresAt = Date.now() + 60_000;
    if (date && /^\d{8}T\d{6}Z$/.test(date) && Number.isFinite(seconds) && seconds > 0) {
      let signedAt = Date.parse(
        `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(9, 11)}:${date.slice(11, 13)}:${date.slice(13, 15)}Z`
      );
      if (Number.isFinite(signedAt)) expiresAt = signedAt + seconds * 1000 - 10_000;
    } else if (Number.isFinite(legacyExpiry) && legacyExpiry > 0) {
      expiresAt = legacyExpiry * 1000 - 10_000;
    }
    if (!Number.isFinite(new Date(expiresAt).getTime())) expiresAt = Date.now() + 60_000;
    return { ...details, expiresAt: new Date(Math.max(Date.now(), expiresAt)).toISOString() };
  }

  async uploadAsset(
    bucketId: string,
    name: string,
    content: Uint8Array,
    contentType: string
  ): Promise<any> {
    await this.axios.put(`/buckets/${encodeURIComponent(bucketId)}/assets`, { name });
    let details = await this.getAssetUrl(bucketId, name, 'PUT', contentType);
    try {
      let response = await fetch(details.url, {
        method: 'PUT',
        headers: { ...details.headers, 'Content-Type': contentType },
        body: new Blob([Uint8Array.from(content)]),
        signal: AbortSignal.timeout(120_000)
      });
      if (!response.ok)
        throw createApiServiceError(
          `Griptape Cloud asset upload failed: HTTP ${response.status}.`,
          { upstreamStatus: response.status }
        );
    } catch (error) {
      throw buildApiServiceError(error, {
        parent: {},
        providerLabel: 'Griptape Cloud',
        operation: 'asset upload',
        reason: 'griptape_asset_upload_error'
      });
    }
    return this.getAsset(bucketId, name);
  }
}
