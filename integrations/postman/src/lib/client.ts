import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.postman.com',
      authHeader: { name: 'X-API-Key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Postman',
          reason: 'postman_api_error'
        })
    });
  }

  // ── Workspaces ──────────────────────────────────────────────

  async listWorkspaces(params?: { type?: string }) {
    let response = await this.axios.get('/workspaces', { params });
    return response.data.workspaces ?? [];
  }

  async getWorkspace(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${encodeURIComponent(workspaceId)}`);
    return response.data.workspace;
  }

  async createWorkspace(workspace: { name: string; type: string; description?: string }) {
    let response = await this.axios.post('/workspaces', { workspace });
    return response.data.workspace;
  }

  async updateWorkspace(
    workspaceId: string,
    workspace: {
      name?: string;
      type?: string;
      description?: string;
    }
  ) {
    let response = await this.axios.put(`/workspaces/${encodeURIComponent(workspaceId)}`, {
      workspace
    });
    return response.data.workspace;
  }

  async deleteWorkspace(workspaceId: string) {
    let response = await this.axios.delete(`/workspaces/${encodeURIComponent(workspaceId)}`);
    return response.data.workspace;
  }

  // ── Collections ─────────────────────────────────────────────

  async listCollections(params?: { workspace?: string }) {
    let response = await this.axios.get('/collections', { params });
    return response.data.collections ?? [];
  }

  async getCollection(collectionId: string) {
    let response = await this.axios.get(`/collections/${encodeURIComponent(collectionId)}`);
    return response.data.collection;
  }

  async createCollection(collection: Record<string, any>, workspaceId?: string) {
    let response = await this.axios.post(
      '/collections',
      { collection },
      {
        params: workspaceId ? { workspace: workspaceId } : undefined
      }
    );
    return response.data.collection;
  }

  async updateCollection(collectionId: string, collection: Record<string, any>) {
    let response = await this.axios.put(`/collections/${encodeURIComponent(collectionId)}`, {
      collection
    });
    return response.data.collection;
  }

  async deleteCollection(collectionId: string) {
    let response = await this.axios.delete(`/collections/${encodeURIComponent(collectionId)}`);
    return response.data.collection;
  }

  async importOpenApi(input: Record<string, unknown>, workspaceId: string) {
    let response = await this.axios.post(
      '/import/openapi',
      { type: 'json', input },
      {
        params: { workspace: workspaceId }
      }
    );
    return response.data.collections ?? [];
  }

  // ── Collection Items ────────────────────────────────────────

  async createCollectionRequest(
    collectionId: string,
    request: Record<string, any>,
    folderId?: string
  ) {
    let response = await this.axios.post(
      `/collections/${encodeURIComponent(collectionId)}/requests`,
      request,
      {
        params: folderId ? { folder: folderId } : undefined
      }
    );
    return response.data.data;
  }

  async updateCollectionRequest(
    collectionId: string,
    requestId: string,
    request: Record<string, any>
  ) {
    let response = await this.axios.put(
      `/collections/${encodeURIComponent(collectionId)}/requests/${encodeURIComponent(requestId)}`,
      request
    );
    return response.data.data;
  }

  async deleteCollectionRequest(collectionId: string, requestId: string) {
    let response = await this.axios.delete(
      `/collections/${encodeURIComponent(collectionId)}/requests/${encodeURIComponent(requestId)}`
    );
    return response.data.data;
  }

  async createCollectionFolder(collectionId: string, folder: Record<string, any>) {
    let response = await this.axios.post(
      `/collections/${encodeURIComponent(collectionId)}/folders`,
      folder
    );
    return response.data.data;
  }

  async updateCollectionFolder(
    collectionId: string,
    folderId: string,
    folder: Record<string, any>
  ) {
    let response = await this.axios.put(
      `/collections/${encodeURIComponent(collectionId)}/folders/${encodeURIComponent(folderId)}`,
      folder
    );
    return response.data.data;
  }

  async deleteCollectionFolder(collectionId: string, folderId: string) {
    let response = await this.axios.delete(
      `/collections/${encodeURIComponent(collectionId)}/folders/${encodeURIComponent(folderId)}`
    );
    return response.data.data;
  }

  // ── Forks ───────────────────────────────────────────────────

  async forkCollection(collectionId: string, label: string, workspaceId: string) {
    let response = await this.axios.post(
      `/collections/fork/${encodeURIComponent(collectionId)}`,
      { label },
      {
        params: { workspace: workspaceId }
      }
    );
    return response.data.collection;
  }

  async listCollectionForks(
    collectionId: string,
    params?: { cursor?: string; limit?: number; sort?: string; direction?: string }
  ) {
    let response = await this.axios.get(
      `/collections/${encodeURIComponent(collectionId)}/forks`,
      { params }
    );
    return response.data;
  }

  async mergeCollectionFork(source: string, destination: string, strategy?: string) {
    let body: Record<string, any> = { source, destination };
    if (strategy) body.strategy = strategy;
    let response = await this.axios.post('/collections/merge', body);
    return response.data;
  }

  // ── Pull Requests ───────────────────────────────────────────

  async listPullRequests(collectionId: string) {
    let response = await this.axios.get(
      `/collections/${encodeURIComponent(collectionId)}/pull-requests`
    );
    return response.data.data ?? [];
  }

  async createPullRequest(
    collectionId: string,
    pullRequest: {
      title: string;
      description?: string;
      destinationId: string;
      reviewers?: string[];
    }
  ) {
    let response = await this.axios.post(
      `/collections/${encodeURIComponent(collectionId)}/pull-requests`,
      pullRequest
    );
    return response.data;
  }

  async getPullRequest(pullRequestId: string) {
    let response = await this.axios.get(`/pull-requests/${encodeURIComponent(pullRequestId)}`);
    return response.data;
  }

  async updatePullRequest(
    pullRequestId: string,
    pullRequest: {
      title?: string;
      description?: string;
      reviewers?: string[];
    }
  ) {
    let response = await this.axios.put(
      `/pull-requests/${encodeURIComponent(pullRequestId)}`,
      pullRequest
    );
    return response.data;
  }

  // ── Environments ────────────────────────────────────────────

  async listEnvironments(params?: { workspace?: string }) {
    let response = await this.axios.get('/environments', { params });
    return response.data.environments ?? [];
  }

  async getEnvironment(environmentId: string) {
    let response = await this.axios.get(`/environments/${encodeURIComponent(environmentId)}`);
    return response.data.environment;
  }

  async createEnvironment(
    environment: {
      name: string;
      values?: Array<{ key: string; value: string; enabled?: boolean; type?: string }>;
    },
    workspaceId?: string
  ) {
    let response = await this.axios.post(
      '/environments',
      { environment },
      {
        params: workspaceId ? { workspace: workspaceId } : undefined
      }
    );
    return response.data.environment;
  }

  async updateEnvironment(
    environmentId: string,
    environment: {
      name?: string;
      values?: Array<{ key: string; value: string; enabled?: boolean; type?: string }>;
    }
  ) {
    let response = await this.axios.put(`/environments/${encodeURIComponent(environmentId)}`, {
      environment
    });
    return response.data.environment;
  }

  async deleteEnvironment(environmentId: string) {
    let response = await this.axios.delete(
      `/environments/${encodeURIComponent(environmentId)}`
    );
    return response.data.environment;
  }

  // ── Mock Servers ────────────────────────────────────────────

  async listMocks(params?: { workspace?: string }) {
    let response = await this.axios.get('/mocks', { params });
    return response.data.mocks ?? [];
  }

  async getMock(mockId: string) {
    let response = await this.axios.get(`/mocks/${encodeURIComponent(mockId)}`);
    return response.data.mock;
  }

  async createMock(
    mock: {
      name?: string;
      collection: string;
      environment?: string;
      private?: boolean;
    },
    workspaceId?: string
  ) {
    let response = await this.axios.post(
      '/mocks',
      { mock },
      {
        params: workspaceId ? { workspace: workspaceId } : undefined
      }
    );
    return response.data.mock;
  }

  async updateMock(
    mockId: string,
    mock: {
      name?: string;
      environment?: string;
      private?: boolean;
      description?: string;
    }
  ) {
    let response = await this.axios.put(`/mocks/${encodeURIComponent(mockId)}`, { mock });
    return response.data.mock;
  }

  async deleteMock(mockId: string) {
    let response = await this.axios.delete(`/mocks/${encodeURIComponent(mockId)}`);
    return response.data.mock;
  }

  // ── Monitors ────────────────────────────────────────────────

  async listMonitors(params?: { workspace?: string }) {
    let response = await this.axios.get('/monitors', { params });
    return response.data.monitors ?? [];
  }

  async getMonitor(monitorId: string) {
    let response = await this.axios.get(`/monitors/${encodeURIComponent(monitorId)}`);
    return response.data.monitor;
  }

  async createMonitor(
    monitor: {
      name: string;
      collection: string;
      environment?: string;
      schedule: { cron: string; timezone: string };
    },
    workspaceId?: string
  ) {
    let response = await this.axios.post(
      '/monitors',
      { monitor },
      {
        params: workspaceId ? { workspace: workspaceId } : undefined
      }
    );
    return response.data.monitor;
  }

  async updateMonitor(
    monitorId: string,
    monitor: {
      name?: string;
      schedule?: { cron?: string; timezone?: string };
    }
  ) {
    let response = await this.axios.put(`/monitors/${encodeURIComponent(monitorId)}`, {
      monitor
    });
    return response.data.monitor;
  }

  async deleteMonitor(monitorId: string) {
    let response = await this.axios.delete(`/monitors/${encodeURIComponent(monitorId)}`);
    return response.data.monitor;
  }

  async runMonitor(monitorId: string, asyncRun?: boolean) {
    let response = await this.axios.post(
      `/monitors/${encodeURIComponent(monitorId)}/run`,
      undefined,
      {
        params: { async: asyncRun ?? false }
      }
    );
    return response.data.run;
  }

  // ── APIs ────────────────────────────────────────────────────

  async listApis(params?: { workspace?: string; cursor?: string; limit?: number }) {
    let response = await this.axios.get('/apis', {
      params: { workspaceId: params?.workspace, cursor: params?.cursor, limit: params?.limit },
      headers: { Accept: 'application/vnd.api.v10+json' }
    });
    return response.data;
  }

  async getApi(apiId: string) {
    let response = await this.axios.get(`/apis/${encodeURIComponent(apiId)}`, {
      headers: { Accept: 'application/vnd.api.v10+json' }
    });
    return response.data;
  }

  async createApi(
    api: {
      name: string;
      summary?: string;
      description?: string;
    },
    workspaceId?: string
  ) {
    let response = await this.axios.post('/apis', api, {
      params: workspaceId ? { workspaceId } : undefined,
      headers: { Accept: 'application/vnd.api.v10+json' }
    });
    return response.data;
  }

  async updateApi(
    apiId: string,
    api: {
      name?: string;
      summary?: string;
      description?: string;
    }
  ) {
    let response = await this.axios.put(`/apis/${encodeURIComponent(apiId)}`, api, {
      headers: { Accept: 'application/vnd.api.v10+json' }
    });
    return response.data;
  }

  async deleteApi(apiId: string) {
    let response = await this.axios.delete(`/apis/${encodeURIComponent(apiId)}`, {
      headers: { Accept: 'application/vnd.api.v10+json' }
    });
    return response.data;
  }

  // ── Comments ────────────────────────────────────────────────

  async listComments(entityType: string, entityId: string, parentEntityId?: string) {
    let path = this.buildCommentPath(entityType, entityId, parentEntityId);
    let response = await this.axios.get(path);
    return response.data.data ?? response.data.comments ?? [];
  }

  async createComment(
    entityType: string,
    entityId: string,
    body: string,
    parentEntityId?: string
  ) {
    let path = this.buildCommentPath(entityType, entityId, parentEntityId);
    let response = await this.axios.post(path, { body });
    return response.data;
  }

  async updateComment(
    entityType: string,
    entityId: string,
    commentId: number,
    body: string,
    parentEntityId?: string
  ) {
    let path = this.buildCommentPath(entityType, entityId, parentEntityId);
    let response = await this.axios.put(`${path}/${commentId}`, { body });
    return response.data;
  }

  async deleteComment(
    entityType: string,
    entityId: string,
    commentId: number,
    parentEntityId?: string
  ) {
    let path = this.buildCommentPath(entityType, entityId, parentEntityId);
    let response = await this.axios.delete(`${path}/${commentId}`);
    return response.data;
  }

  private buildCommentPath(
    entityType: string,
    entityId: string,
    parentEntityId?: string
  ): string {
    if (['folder', 'request', 'response'].includes(entityType) && !parentEntityId) {
      throw createApiServiceError(
        'collectionId is required for folder, request, and response comments.'
      );
    }
    switch (entityType) {
      case 'collection':
        return `/collections/${encodeURIComponent(entityId)}/comments`;
      case 'folder':
        return `/collections/${encodeURIComponent(parentEntityId ?? '')}/folders/${encodeURIComponent(entityId)}/comments`;
      case 'request':
        return `/collections/${encodeURIComponent(parentEntityId ?? '')}/requests/${encodeURIComponent(entityId)}/comments`;
      case 'response':
        return `/collections/${encodeURIComponent(parentEntityId ?? '')}/responses/${encodeURIComponent(entityId)}/comments`;
      case 'api':
        return `/apis/${encodeURIComponent(entityId)}/comments`;
      default:
        throw createApiServiceError(`Unsupported comment entity type: ${entityType}`);
    }
  }

  // ── User / Team ─────────────────────────────────────────────

  async getAuthenticatedUser() {
    let response = await this.axios.get('/me');
    return response.data;
  }

  // ── Tags ────────────────────────────────────────────────────

  async getTags(entityType: string, entityId: string) {
    let path = `/${entityType}s/${encodeURIComponent(entityId)}/tags`;
    let response = await this.axios.get(path);
    return response.data.tags ?? [];
  }

  async updateTags(entityType: string, entityId: string, tags: Array<{ slug: string }>) {
    let path = `/${entityType}s/${encodeURIComponent(entityId)}/tags`;
    let response = await this.axios.put(path, { tags });
    return response.data;
  }

  async getEntitiesByTag(
    tagSlug: string,
    params?: { entityType?: string; limit?: number; cursor?: string; direction?: string }
  ) {
    let response = await this.axios.get(`/tags/${encodeURIComponent(tagSlug)}/entities`, {
      params
    });
    return response.data;
  }

  // ── Webhooks ────────────────────────────────────────────────

  async createWebhook(
    webhook: {
      name: string;
      collection: string;
    },
    workspaceId?: string
  ) {
    let response = await this.axios.post(
      '/webhooks',
      { webhook },
      {
        params: workspaceId ? { workspace: workspaceId } : undefined
      }
    );
    return response.data.webhook;
  }
}
