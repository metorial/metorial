import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import type {
  ZepEdge,
  ZepEpisode,
  ZepMessage,
  ZepMessageList,
  ZepNode,
  ZepThread,
  ZepUser
} from './types';
import {
  validateGraphTarget,
  validateScalarAttributes,
  validateWholeNumber
} from './validation';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; baseUrl?: string }) {
    let baseURL = (config.baseUrl || 'https://api.getzep.com').replace(/\/+$/, '');
    let url: URL;
    try {
      url = new URL(baseURL);
    } catch {
      throw createApiServiceError('baseUrl must be an absolute HTTP or HTTPS URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash) {
      throw createApiServiceError(
        'baseUrl must be an HTTP or HTTPS URL without a query or fragment.'
      );
    }
    let isLegacySelfHosted =
      config.baseUrl && url.hostname !== 'api.getzep.com' && !config.token.startsWith('z_');

    this.axios = createAuthenticatedAxios({
      baseURL: baseURL.endsWith('/api/v2') ? baseURL : `${baseURL}/api/v2`,
      timeout: 60000,
      authHeader: { value: `${isLegacySelfHosted ? 'Bearer' : 'Api-Key'} ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Zep', reason: 'zep_api_error' })
    });
  }

  // ---- Users ----

  async createUser(params: {
    userId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    metadata?: Record<string, unknown>;
  }) {
    let res = await this.axios.post<ZepUser>('/users', {
      user_id: params.userId,
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      metadata: params.metadata
    });
    return res.data;
  }

  async getUser(userId: string) {
    let res = await this.axios.get<ZepUser>(`/users/${encodeURIComponent(userId)}`);
    return res.data;
  }

  async updateUser(
    userId: string,
    params: {
      email?: string;
      firstName?: string;
      lastName?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    let res = await this.axios.patch<ZepUser>(`/users/${encodeURIComponent(userId)}`, {
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      metadata: params.metadata
    });
    return res.data;
  }

  async deleteUser(userId: string) {
    let res = await this.axios.delete(`/users/${encodeURIComponent(userId)}`);
    return res.data;
  }

  async getUserThreads(userId: string) {
    let res = await this.axios.get<ZepThread[] | { threads?: ZepThread[] }>(
      `/users/${encodeURIComponent(userId)}/threads`
    );
    return res.data;
  }

  async getUserNode(userId: string) {
    let res = await this.axios.get<ZepNode | null>(
      `/users/${encodeURIComponent(userId)}/node`
    );
    return res.data;
  }

  // ---- Threads ----

  async createThread(params: { threadId: string; userId: string }) {
    let res = await this.axios.post<ZepThread>('/threads', {
      thread_id: params.threadId,
      user_id: params.userId
    });
    return res.data;
  }

  async getThread(
    threadId: string,
    params?: { limit?: number; cursor?: number; lastn?: number }
  ): Promise<ZepThread & ZepMessageList> {
    validateWholeNumber(params?.limit, 'messageLimit');
    validateWholeNumber(params?.cursor, 'messageCursor', 0);
    validateWholeNumber(params?.lastn, 'lastMessages');
    let res = await this.axios.get<ZepMessageList>(
      `/threads/${encodeURIComponent(threadId)}/messages`,
      { params }
    );
    let thread: ZepThread | undefined;
    if (res.data.user_id) {
      let result = await this.getUserThreads(res.data.user_id);
      let threads = Array.isArray(result) ? result : (result.threads ?? []);
      thread = threads.find(item => item.thread_id === threadId);
    }
    return {
      ...res.data,
      thread_id: threadId,
      uuid: thread?.uuid,
      created_at: res.data.thread_created_at ?? thread?.created_at
    };
  }

  async listThreads(params?: {
    pageNumber?: number;
    pageSize?: number;
    orderBy?: string;
    asc?: boolean;
  }) {
    validateWholeNumber(params?.pageNumber, 'pageNumber');
    validateWholeNumber(params?.pageSize, 'pageSize');
    let res = await this.axios.get<{ threads?: ZepThread[]; total_count?: number }>(
      '/threads',
      {
        params: {
          page_number: params?.pageNumber,
          page_size: params?.pageSize,
          order_by: params?.orderBy,
          asc: params?.asc
        }
      }
    );
    return res.data;
  }

  async deleteThread(threadId: string) {
    let res = await this.axios.delete(`/threads/${encodeURIComponent(threadId)}`);
    return res.data;
  }

  async addMessages(
    threadId: string,
    params: {
      messages: ZepMessage[];
      ignoreRoles?: string[];
      returnContext?: boolean;
      strictOntology?: boolean;
    }
  ) {
    let res = await this.axios.post<{
      context?: string;
      message_uuids?: string[];
      task_id?: string;
    }>(`/threads/${encodeURIComponent(threadId)}/messages`, {
      messages: params.messages,
      ignore_roles: params.ignoreRoles,
      return_context: params.returnContext,
      strict_ontology: params.strictOntology
    });
    return res.data;
  }

  async addMessagesBatch(
    threadId: string,
    params: {
      messages: ZepMessage[];
      ignoreRoles?: string[];
      returnContext?: boolean;
      strictOntology?: boolean;
    }
  ) {
    let res = await this.axios.post<{
      context?: string;
      message_uuids?: string[];
      task_id?: string;
    }>(`/threads/${encodeURIComponent(threadId)}/messages-batch`, {
      messages: params.messages,
      ignore_roles: params.ignoreRoles,
      return_context: params.returnContext,
      strict_ontology: params.strictOntology
    });
    return res.data;
  }

  async getThreadContext(threadId: string, templateId?: string) {
    let res = await this.axios.get<{ context?: string }>(
      `/threads/${encodeURIComponent(threadId)}/context`,
      {
        params: templateId ? { template_id: templateId } : undefined
      }
    );
    return res.data;
  }

  async updateMessage(
    messageUuid: string,
    params: {
      content?: string;
      role?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    let res = await this.axios.patch(`/messages/${encodeURIComponent(messageUuid)}`, {
      content: params.content,
      role: params.role,
      metadata: params.metadata
    });
    return res.data;
  }

  // ---- Graph ----

  async graphSearch(params: {
    query: string;
    userId?: string;
    graphId?: string;
    limit?: number;
    scope?: string;
    reranker?: string;
    mmrLambda?: number;
    centerNodeUuid?: string;
    bfsOriginNodeUuids?: string[];
    searchFilters?: {
      edgeTypes?: string[];
      nodeLabels?: string[];
    };
  }) {
    validateGraphTarget(params.userId, params.graphId);
    validateWholeNumber(params.limit, 'limit');
    if (params.limit !== undefined && params.limit > 50) {
      throw createApiServiceError('limit must not exceed 50.');
    }
    if (params.mmrLambda !== undefined && (params.mmrLambda < 0 || params.mmrLambda > 1)) {
      throw createApiServiceError('mmrLambda must be between 0 and 1.');
    }
    if (params.reranker === 'node_distance' && !params.centerNodeUuid) {
      throw createApiServiceError('centerNodeUuid is required for node_distance reranking.');
    }
    let body: Record<string, unknown> = {
      query: params.query,
      user_id: params.userId,
      graph_id: params.graphId,
      limit: params.limit,
      scope: params.scope,
      reranker: params.reranker,
      mmr_lambda: params.mmrLambda,
      center_node_uuid: params.centerNodeUuid,
      bfs_origin_node_uuids: params.bfsOriginNodeUuids
    };

    if (params.searchFilters) {
      body.search_filters = {
        edge_types: params.searchFilters.edgeTypes,
        node_labels: params.searchFilters.nodeLabels
      };
    }

    let res = await this.axios.post<{
      nodes?: ZepNode[];
      edges?: ZepEdge[];
      episodes?: ZepEpisode[];
    }>('/graph/search', body);
    return res.data;
  }

  async addFactTriple(params: {
    fact: string;
    factName: string;
    sourceNodeName?: string;
    targetNodeName?: string;
    sourceNodeUuid?: string;
    targetNodeUuid?: string;
    sourceNodeLabels?: string[];
    targetNodeLabels?: string[];
    sourceNodeAttributes?: Record<string, unknown>;
    targetNodeAttributes?: Record<string, unknown>;
    edgeAttributes?: Record<string, unknown>;
    userId?: string;
    graphId?: string;
    createdAt?: string;
    validAt?: string;
    invalidAt?: string;
    expiredAt?: string;
  }) {
    validateGraphTarget(params.userId, params.graphId);
    validateScalarAttributes(params.sourceNodeAttributes, 'sourceNodeAttributes');
    validateScalarAttributes(params.targetNodeAttributes, 'targetNodeAttributes');
    validateScalarAttributes(params.edgeAttributes, 'edgeAttributes');
    let res = await this.axios.post<{
      source_node?: ZepNode;
      target_node?: ZepNode;
      edge?: ZepEdge;
      task_id?: string;
    }>('/graph/add-fact-triple', {
      fact: params.fact,
      fact_name: params.factName,
      source_node_name: params.sourceNodeName,
      target_node_name: params.targetNodeName,
      source_node_uuid: params.sourceNodeUuid,
      target_node_uuid: params.targetNodeUuid,
      source_node_labels: params.sourceNodeLabels,
      target_node_labels: params.targetNodeLabels,
      source_node_attributes: params.sourceNodeAttributes,
      target_node_attributes: params.targetNodeAttributes,
      edge_attributes: params.edgeAttributes,
      user_id: params.userId,
      graph_id: params.graphId,
      created_at: params.createdAt,
      valid_at: params.validAt,
      invalid_at: params.invalidAt,
      expired_at: params.expiredAt
    });
    return res.data;
  }

  async getUserNodes(userId: string, params?: { limit?: number; uuidCursor?: string }) {
    validateWholeNumber(params?.limit, 'limit');
    let res = await this.axios.post<ZepNode[] | { nodes?: ZepNode[] }>(
      `/graph/node/user/${encodeURIComponent(userId)}`,
      {
        limit: params?.limit,
        uuid_cursor: params?.uuidCursor
      }
    );
    return res.data;
  }

  async getNodeEpisodes(nodeUuid: string) {
    let res = await this.axios.get<ZepEpisode[] | { episodes?: ZepEpisode[] }>(
      `/graph/node/${encodeURIComponent(nodeUuid)}/episodes`
    );
    return res.data;
  }

  async getNodeEdges(nodeUuid: string) {
    let res = await this.axios.get<ZepEdge[] | { edges?: ZepEdge[] }>(
      `/graph/node/${encodeURIComponent(nodeUuid)}/entity-edges`
    );
    return res.data;
  }

  async getEdge(edgeUuid: string) {
    let res = await this.axios.get<ZepEdge>(`/graph/edge/${encodeURIComponent(edgeUuid)}`);
    return res.data;
  }

  async deleteEpisode(episodeUuid: string) {
    let res = await this.axios.delete(`/graph/episodes/${encodeURIComponent(episodeUuid)}`);
    return res.data;
  }

  async setOntology(params: {
    entities?: Record<string, unknown>;
    edges?: Record<string, unknown>;
    userIds?: string[];
    graphIds?: string[];
  }) {
    let res = await this.axios.put('/graph/set-ontology', {
      entities: params.entities,
      edges: params.edges,
      user_ids: params.userIds,
      graph_ids: params.graphIds
    });
    return res.data;
  }

  async getEntityTypes(params?: { userId?: string; graphId?: string }) {
    if (params?.userId && params.graphId) {
      throw createApiServiceError(
        'Provide userId or graphId, not both, when listing an ontology.'
      );
    }
    let res = await this.axios.get<{ entity_types?: unknown[]; edge_types?: unknown[] }>(
      '/entity-types',
      {
        params: { user_id: params?.userId, graph_id: params?.graphId }
      }
    );
    return res.data;
  }

  async cloneGraph(params: {
    sourceGraphId?: string;
    sourceUserId?: string;
    targetGraphId: string;
  }) {
    if (Boolean(params.sourceGraphId) === Boolean(params.sourceUserId)) {
      throw createApiServiceError('Provide exactly one of sourceUserId or sourceGraphId.');
    }
    let res = await this.axios.post<{ graph_id?: string; user_id?: string; task_id?: string }>(
      '/graph/clone',
      {
        source_graph_id: params.sourceGraphId,
        source_user_id: params.sourceUserId,
        target_graph_id: params.targetGraphId
      }
    );
    return res.data;
  }

  // ---- Groups / Standalone Graphs ----

  async deleteGroup(groupId: string) {
    let res = await this.axios.delete(`/groups/${encodeURIComponent(groupId)}`);
    return res.data;
  }

  // ---- Context Templates ----

  async listContextTemplates() {
    let res = await this.axios.get('/context-templates');
    return res.data;
  }

  async getContextTemplate(templateId: string) {
    let res = await this.axios.get(`/context-templates/${encodeURIComponent(templateId)}`);
    return res.data;
  }

  // ---- User Summary Instructions ----

  async setUserSummaryInstructions(params: {
    instructions: Array<{ name: string; text: string }>;
    userIds?: string[];
  }) {
    if (params.instructions.length > 5) {
      throw createApiServiceError('Provide no more than five summary instructions.');
    }
    let res = await this.axios.post('/user-summary-instructions', {
      instructions: params.instructions,
      user_ids: params.userIds
    });
    return res.data;
  }

  async listUsers(params: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
    orderBy?: string;
    ascending?: boolean;
  }) {
    validateWholeNumber(params.pageNumber, 'pageNumber');
    validateWholeNumber(params.pageSize, 'pageSize');
    let res = await this.axios.get<{
      users?: ZepUser[];
      total_count?: number;
      row_count?: number;
    }>('/users-ordered', {
      params: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        search: params.search,
        order_by: params.orderBy,
        asc: params.ascending
      }
    });
    return res.data;
  }

  async getProject() {
    let res = await this.axios.get<{
      project?: {
        uuid?: string;
        name?: string;
        description?: string;
        created_at?: string;
        default_time_zone?: string;
      };
    }>('/projects/info');
    return res.data;
  }

  async addGraphData(params: {
    data: string;
    type: 'text' | 'json' | 'message';
    userId?: string;
    graphId?: string;
    createdAt?: string;
    sourceDescription?: string;
    documentId?: string;
    metadata?: Record<string, unknown>;
    strictOntology?: boolean;
  }) {
    validateGraphTarget(params.userId, params.graphId);
    let res = await this.axios.post<ZepEpisode>('/graph', {
      data: params.data,
      type: params.type,
      user_id: params.userId,
      graph_id: params.graphId,
      created_at: params.createdAt,
      source_description: params.sourceDescription,
      document_id: params.documentId,
      metadata: params.metadata,
      strict_ontology: params.strictOntology
    });
    return res.data;
  }
}
