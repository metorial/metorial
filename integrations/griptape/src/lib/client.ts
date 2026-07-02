import { createAxios } from 'slates';

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
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: `${config.baseUrl}/api`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  private mapPagination(raw: any): PaginationResult {
    return {
      pageNumber: raw.page_number,
      pageSize: raw.page_size,
      totalCount: raw.total_count,
      totalPages: raw.total_pages,
      nextPage: raw.next_page ?? undefined,
      previousPage: raw.previous_page ?? undefined
    };
  }

  private paginationQuery(params?: PaginationParams): Record<string, any> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
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
    let res = await this.axios.get(`/assistants/${assistantId}`);
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
    let res = await this.axios.patch(`/assistants/${assistantId}`, body);
    return res.data;
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await this.axios.delete(`/assistants/${assistantId}`);
  }

  // ── Assistant Runs ───────────────────────────────────────

  async listAssistantRuns(
    assistantId: string,
    params?: PaginationParams & { status?: string[] }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.status?.length) query.status = params.status.join(',');
    let res = await this.axios.get(`/assistants/${assistantId}/runs`, { params: query });
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
    if (data.knowledgeBaseIds !== undefined) body.knowledge_base_ids = data.knowledgeBaseIds;
    if (data.retrieverIds !== undefined) body.retriever_ids = data.retrieverIds;
    if (data.rulesetIds !== undefined) body.ruleset_ids = data.rulesetIds;
    if (data.structureIds !== undefined) body.structure_ids = data.structureIds;
    if (data.toolIds !== undefined) body.tool_ids = data.toolIds;
    let res = await this.axios.post(`/assistants/${assistantId}/runs`, body);
    return res.data;
  }

  async getAssistantRun(assistantRunId: string): Promise<any> {
    let res = await this.axios.get(`/assistant-runs/${assistantRunId}`);
    return res.data;
  }

  async cancelAssistantRun(assistantRunId: string): Promise<any> {
    let res = await this.axios.post(`/assistant-runs/${assistantRunId}/cancel`);
    return res.data;
  }

  // ── Structures ───────────────────────────────────────────

  async listStructures(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/structures', { params: this.paginationQuery(params) });
    return { items: res.data.structures, pagination: this.mapPagination(res.data.pagination) };
  }

  async getStructure(structureId: string): Promise<any> {
    let res = await this.axios.get(`/structures/${structureId}`);
    return res.data;
  }

  async deleteStructure(structureId: string): Promise<void> {
    await this.axios.delete(`/structures/${structureId}`);
  }

  // ── Structure Runs ───────────────────────────────────────

  async listStructureRuns(
    structureId: string,
    params?: PaginationParams & { status?: string[] }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.status?.length) query.status = params.status.join(',');
    let res = await this.axios.get(`/structures/${structureId}/runs`, { params: query });
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
    let res = await this.axios.post(`/structures/${structureId}/runs`, body);
    return res.data;
  }

  async getStructureRun(structureRunId: string): Promise<any> {
    let res = await this.axios.get(`/structure-runs/${structureRunId}`);
    return res.data;
  }

  async cancelStructureRun(structureRunId: string): Promise<any> {
    let res = await this.axios.post(`/structure-runs/${structureRunId}/cancel`);
    return res.data;
  }

  async listStructureRunLogs(structureRunId: string): Promise<any> {
    let res = await this.axios.get(`/structure-runs/${structureRunId}/logs`);
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
    let res = await this.axios.get(`/knowledge-bases/${knowledgeBaseId}`);
    return res.data;
  }

  async deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    await this.axios.delete(`/knowledge-bases/${knowledgeBaseId}`);
  }

  async queryKnowledgeBase(
    knowledgeBaseId: string,
    query: string,
    queryArgs?: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.post(`/knowledge-bases/${knowledgeBaseId}/query`, {
      query,
      query_args: queryArgs
    });
    return res.data;
  }

  async searchKnowledgeBase(knowledgeBaseId: string, query: string): Promise<any> {
    let res = await this.axios.post(`/knowledge-bases/${knowledgeBaseId}/search`, { query });
    return res.data;
  }

  async createKnowledgeBaseJob(knowledgeBaseId: string): Promise<any> {
    let res = await this.axios.post(`/knowledge-bases/${knowledgeBaseId}/knowledge-base-jobs`);
    return res.data;
  }

  async listKnowledgeBaseJobs(
    knowledgeBaseId: string,
    params?: PaginationParams & { status?: string[] }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.status?.length) query.status = params.status.join(',');
    let res = await this.axios.get(`/knowledge-bases/${knowledgeBaseId}/knowledge-base-jobs`, {
      params: query
    });
    return {
      items: res.data.knowledge_base_jobs,
      pagination: this.mapPagination(res.data.pagination)
    };
  }

  async getKnowledgeBaseJob(jobId: string): Promise<any> {
    let res = await this.axios.get(`/knowledge-base-jobs/${jobId}`);
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
    let res = await this.axios.get(`/data-connectors/${dataConnectorId}`);
    return res.data;
  }

  async deleteDataConnector(dataConnectorId: string): Promise<void> {
    await this.axios.delete(`/data-connectors/${dataConnectorId}`);
  }

  async createDataJob(dataConnectorId: string): Promise<any> {
    let res = await this.axios.post(`/data-connectors/${dataConnectorId}/data-jobs`);
    return res.data;
  }

  async listDataJobs(
    dataConnectorId: string,
    params?: PaginationParams & { status?: string[] }
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = this.paginationQuery(params);
    if (params?.status?.length) query.status = params.status.join(',');
    let res = await this.axios.get(`/data-connectors/${dataConnectorId}/data-jobs`, {
      params: query
    });
    return { items: res.data.data_jobs, pagination: this.mapPagination(res.data.pagination) };
  }

  // ── Buckets (Data Lakes) ─────────────────────────────────

  async listBuckets(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/buckets', { params: this.paginationQuery(params) });
    return { items: res.data.buckets, pagination: this.mapPagination(res.data.pagination) };
  }

  async createBucket(data: { name: string; description?: string }): Promise<any> {
    let res = await this.axios.post('/buckets', data);
    return res.data;
  }

  async getBucket(bucketId: string): Promise<any> {
    let res = await this.axios.get(`/buckets/${bucketId}`);
    return res.data;
  }

  async deleteBucket(bucketId: string): Promise<void> {
    await this.axios.delete(`/buckets/${bucketId}`);
  }

  async listAssets(
    bucketId: string,
    params?: { prefix?: string; postfix?: string }
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.prefix) query.prefix = params.prefix;
    if (params?.postfix) query.postfix = params.postfix;
    let res = await this.axios.get(`/buckets/${bucketId}/assets`, { params: query });
    return res.data;
  }

  async deleteAsset(bucketId: string, assetName: string): Promise<void> {
    await this.axios.delete(`/buckets/${bucketId}/assets/${encodeURIComponent(assetName)}`);
  }

  // ── Retrievers ───────────────────────────────────────────

  async listRetrievers(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/retrievers', { params: this.paginationQuery(params) });
    return { items: res.data.retrievers, pagination: this.mapPagination(res.data.pagination) };
  }

  async getRetriever(retrieverId: string): Promise<any> {
    let res = await this.axios.get(`/retrievers/${retrieverId}`);
    return res.data;
  }

  async queryRetriever(
    retrieverId: string,
    query: string,
    queryArgs?: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.post(`/retrievers/${retrieverId}/query`, {
      query,
      query_args: queryArgs
    });
    return res.data;
  }

  async deleteRetriever(retrieverId: string): Promise<void> {
    await this.axios.delete(`/retrievers/${retrieverId}`);
  }

  // ── Tools ────────────────────────────────────────────────

  async listTools(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get('/tools', { params: this.paginationQuery(params) });
    return { items: res.data.tools, pagination: this.mapPagination(res.data.pagination) };
  }

  async getTool(toolId: string): Promise<any> {
    let res = await this.axios.get(`/tools/${toolId}`);
    return res.data;
  }

  async deleteTool(toolId: string): Promise<void> {
    await this.axios.delete(`/tools/${toolId}`);
  }

  async runToolActivity(
    toolId: string,
    activityPath: string,
    input?: Record<string, any>
  ): Promise<any> {
    let res = await this.axios.post(
      `/tools/${toolId}/activities/${activityPath}`,
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
    let res = await this.axios.get(`/rules/${ruleId}`);
    return res.data;
  }

  async updateRule(
    ruleId: string,
    data: { name?: string; rule?: string; metadata?: Record<string, any> }
  ): Promise<any> {
    let res = await this.axios.patch(`/rules/${ruleId}`, data);
    return res.data;
  }

  async deleteRule(ruleId: string): Promise<void> {
    await this.axios.delete(`/rules/${ruleId}`);
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
    let res = await this.axios.get(`/rulesets/${rulesetId}`);
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
    let res = await this.axios.patch(`/rulesets/${rulesetId}`, body);
    return res.data;
  }

  async deleteRuleset(rulesetId: string): Promise<void> {
    await this.axios.delete(`/rulesets/${rulesetId}`);
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
    let res = await this.axios.get(`/threads/${threadId}`);
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
    let res = await this.axios.patch(`/threads/${threadId}`, data);
    return res.data;
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.axios.delete(`/threads/${threadId}`);
  }

  // ── Messages ─────────────────────────────────────────────

  async listMessages(
    threadId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let res = await this.axios.get(`/threads/${threadId}/messages`, {
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
    let res = await this.axios.post(`/threads/${threadId}/messages`, data);
    return res.data;
  }

  async getMessage(messageId: string): Promise<any> {
    let res = await this.axios.get(`/messages/${messageId}`);
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
    let res = await this.axios.patch(`/messages/${messageId}`, data);
    return res.data;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.axios.delete(`/messages/${messageId}`);
  }
}
