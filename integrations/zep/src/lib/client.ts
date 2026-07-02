import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; baseUrl?: string }) {
    let isCloud = config.token.startsWith('z_');
    let baseURL = config.baseUrl || 'https://api.getzep.com';

    this.axios = createAxios({
      baseURL: `${baseURL}/api/v2`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: isCloud ? `Api-Key ${config.token}` : `Bearer ${config.token}`
      }
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
    let res = await this.axios.post('/users', {
      user_id: params.userId,
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      metadata: params.metadata
    });
    return res.data;
  }

  async getUser(userId: string) {
    let res = await this.axios.get(`/users/${encodeURIComponent(userId)}`);
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
    let res = await this.axios.patch(`/users/${encodeURIComponent(userId)}`, {
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
    let res = await this.axios.get(`/users/${encodeURIComponent(userId)}/threads`);
    return res.data;
  }

  async getUserNode(userId: string) {
    let res = await this.axios.get(`/users/${encodeURIComponent(userId)}/node`);
    return res.data;
  }

  // ---- Threads ----

  async createThread(params: { threadId: string; userId: string }) {
    let res = await this.axios.post('/threads', {
      thread_id: params.threadId,
      user_id: params.userId
    });
    return res.data;
  }

  async getThread(threadId: string) {
    let res = await this.axios.get(`/threads/${encodeURIComponent(threadId)}`);
    return res.data;
  }

  async listThreads(params?: {
    pageNumber?: number;
    pageSize?: number;
    orderBy?: string;
    asc?: boolean;
  }) {
    let res = await this.axios.get('/threads', {
      params: {
        page_number: params?.pageNumber,
        page_size: params?.pageSize,
        order_by: params?.orderBy,
        asc: params?.asc
      }
    });
    return res.data;
  }

  async deleteThread(threadId: string) {
    let res = await this.axios.delete(`/threads/${encodeURIComponent(threadId)}`);
    return res.data;
  }

  async addMessages(
    threadId: string,
    params: {
      messages: Array<{ role: string; content: string; name?: string }>;
      ignoreRoles?: string[];
      returnContext?: boolean;
    }
  ) {
    let res = await this.axios.post(`/threads/${encodeURIComponent(threadId)}/messages`, {
      messages: params.messages,
      ignore_roles: params.ignoreRoles,
      return_context: params.returnContext
    });
    return res.data;
  }

  async addMessagesBatch(
    threadId: string,
    params: {
      messages: Array<{ role: string; content: string; name?: string }>;
      ignoreRoles?: string[];
      returnContext?: boolean;
    }
  ) {
    let res = await this.axios.post(
      `/threads/${encodeURIComponent(threadId)}/messages-batch`,
      {
        messages: params.messages,
        ignore_roles: params.ignoreRoles,
        return_context: params.returnContext
      }
    );
    return res.data;
  }

  async getThreadContext(threadId: string, templateId?: string) {
    let res = await this.axios.get(`/threads/${encodeURIComponent(threadId)}/context`, {
      params: templateId ? { template_id: templateId } : undefined
    });
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

    let res = await this.axios.post('/graph/search', body);
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
    let res = await this.axios.post('/graph/add-fact-triple', {
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
    let res = await this.axios.post(`/graph/node/user/${encodeURIComponent(userId)}`, {
      limit: params?.limit,
      uuid_cursor: params?.uuidCursor
    });
    return res.data;
  }

  async getNodeEpisodes(nodeUuid: string) {
    let res = await this.axios.get(`/graph/node/${encodeURIComponent(nodeUuid)}/episodes`);
    return res.data;
  }

  async getNodeEdges(nodeUuid: string) {
    let res = await this.axios.get(`/graph/node/${encodeURIComponent(nodeUuid)}/entity-edges`);
    return res.data;
  }

  async getEdge(edgeUuid: string) {
    let res = await this.axios.get(`/graph/edge/${encodeURIComponent(edgeUuid)}`);
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

  async getEntityTypes() {
    let res = await this.axios.get('/entity-types');
    return res.data;
  }

  async cloneGraph(params: {
    sourceGraphId?: string;
    sourceUserId?: string;
    targetGraphId: string;
  }) {
    let res = await this.axios.post('/graph/clone', {
      source_graph_id: params.sourceGraphId,
      source_user_id: params.sourceUserId,
      target_graph_id: params.targetGraphId
    });
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
    let res = await this.axios.post('/user-summary-instructions', {
      instructions: params.instructions,
      user_ids: params.userIds
    });
    return res.data;
  }
}
