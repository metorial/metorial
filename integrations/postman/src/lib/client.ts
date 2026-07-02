import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.getpostman.com',
      headers: {
        'X-API-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Workspaces ──────────────────────────────────────────────

  async listWorkspaces(params?: { type?: string }) {
    let response = await this.axios.get('/workspaces', { params });
    return response.data.workspaces ?? [];
  }

  async getWorkspace(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${workspaceId}`);
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
    let response = await this.axios.put(`/workspaces/${workspaceId}`, { workspace });
    return response.data.workspace;
  }

  async deleteWorkspace(workspaceId: string) {
    let response = await this.axios.delete(`/workspaces/${workspaceId}`);
    return response.data.workspace;
  }

  // ── Collections ─────────────────────────────────────────────

  async listCollections(params?: { workspace?: string }) {
    let response = await this.axios.get('/collections', { params });
    return response.data.collections ?? [];
  }

  async getCollection(collectionId: string) {
    let response = await this.axios.get(`/collections/${collectionId}`);
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
    let response = await this.axios.put(`/collections/${collectionId}`, { collection });
    return response.data.collection;
  }

  async deleteCollection(collectionId: string) {
    let response = await this.axios.delete(`/collections/${collectionId}`);
    return response.data.collection;
  }

  // ── Collection Items ────────────────────────────────────────

  async createCollectionRequest(
    collectionId: string,
    request: Record<string, any>,
    folderId?: string
  ) {
    let response = await this.axios.post(`/collections/${collectionId}/requests`, request, {
      params: folderId ? { folder: folderId } : undefined
    });
    return response.data.data;
  }

  async updateCollectionRequest(
    collectionId: string,
    requestId: string,
    request: Record<string, any>
  ) {
    let response = await this.axios.put(
      `/collections/${collectionId}/requests/${requestId}`,
      request
    );
    return response.data.data;
  }

  async deleteCollectionRequest(collectionId: string, requestId: string) {
    let response = await this.axios.delete(
      `/collections/${collectionId}/requests/${requestId}`
    );
    return response.data.data;
  }

  async createCollectionFolder(collectionId: string, folder: Record<string, any>) {
    let response = await this.axios.post(`/collections/${collectionId}/folders`, folder);
    return response.data.data;
  }

  async updateCollectionFolder(
    collectionId: string,
    folderId: string,
    folder: Record<string, any>
  ) {
    let response = await this.axios.put(
      `/collections/${collectionId}/folders/${folderId}`,
      folder
    );
    return response.data.data;
  }

  async deleteCollectionFolder(collectionId: string, folderId: string) {
    let response = await this.axios.delete(`/collections/${collectionId}/folders/${folderId}`);
    return response.data.data;
  }

  // ── Forks ───────────────────────────────────────────────────

  async forkCollection(collectionId: string, label: string, workspaceId: string) {
    let response = await this.axios.post(
      `/collections/fork/${collectionId}`,
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
    let response = await this.axios.get(`/collections/${collectionId}/forks`, { params });
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
    let response = await this.axios.get(`/collections/${collectionId}/pull-requests`);
    return response.data.data ?? [];
  }

  async createPullRequest(
    collectionId: string,
    pullRequest: {
      title: string;
      description?: string;
      source: string;
      destination: string;
      reviewers?: string[];
    }
  ) {
    let response = await this.axios.post(
      `/collections/${collectionId}/pull-requests`,
      pullRequest
    );
    return response.data.data;
  }

  async getPullRequest(pullRequestId: string) {
    let response = await this.axios.get(`/pull-requests/${pullRequestId}`);
    return response.data.data;
  }

  async updatePullRequest(
    pullRequestId: string,
    pullRequest: {
      title?: string;
      description?: string;
    }
  ) {
    let response = await this.axios.put(`/pull-requests/${pullRequestId}`, pullRequest);
    return response.data.data;
  }

  // ── Environments ────────────────────────────────────────────

  async listEnvironments(params?: { workspace?: string }) {
    let response = await this.axios.get('/environments', { params });
    return response.data.environments ?? [];
  }

  async getEnvironment(environmentId: string) {
    let response = await this.axios.get(`/environments/${environmentId}`);
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
    let response = await this.axios.put(`/environments/${environmentId}`, { environment });
    return response.data.environment;
  }

  async deleteEnvironment(environmentId: string) {
    let response = await this.axios.delete(`/environments/${environmentId}`);
    return response.data.environment;
  }

  // ── Mock Servers ────────────────────────────────────────────

  async listMocks(params?: { workspace?: string }) {
    let response = await this.axios.get('/mocks', { params });
    return response.data.mocks ?? [];
  }

  async getMock(mockId: string) {
    let response = await this.axios.get(`/mocks/${mockId}`);
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
    let response = await this.axios.put(`/mocks/${mockId}`, { mock });
    return response.data.mock;
  }

  async deleteMock(mockId: string) {
    let response = await this.axios.delete(`/mocks/${mockId}`);
    return response.data.mock;
  }

  // ── Monitors ────────────────────────────────────────────────

  async listMonitors(params?: { workspace?: string }) {
    let response = await this.axios.get('/monitors', { params });
    return response.data.monitors ?? [];
  }

  async getMonitor(monitorId: string) {
    let response = await this.axios.get(`/monitors/${monitorId}`);
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
    let response = await this.axios.put(`/monitors/${monitorId}`, { monitor });
    return response.data.monitor;
  }

  async deleteMonitor(monitorId: string) {
    let response = await this.axios.delete(`/monitors/${monitorId}`);
    return response.data.monitor;
  }

  async runMonitor(monitorId: string) {
    let response = await this.axios.post(`/monitors/${monitorId}/run`);
    return response.data.run;
  }

  // ── APIs ────────────────────────────────────────────────────

  async listApis(params?: { workspace?: string; cursor?: string; limit?: number }) {
    let response = await this.axios.get('/apis', { params });
    return response.data.apis ?? [];
  }

  async getApi(apiId: string) {
    let response = await this.axios.get(`/apis/${apiId}`);
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
      params: workspaceId ? { workspace: workspaceId } : undefined
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
    let response = await this.axios.put(`/apis/${apiId}`, api);
    return response.data;
  }

  async deleteApi(apiId: string) {
    let response = await this.axios.delete(`/apis/${apiId}`);
    return response.data;
  }

  // ── Comments ────────────────────────────────────────────────

  async listComments(entityType: string, entityId: string, parentEntityId?: string) {
    let path = this.buildCommentPath(entityType, entityId, parentEntityId);
    let response = await this.axios.get(path);
    return response.data.comments ?? [];
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
    switch (entityType) {
      case 'collection':
        return `/collections/${entityId}/comments`;
      case 'folder':
        return `/collections/${parentEntityId}/folders/${entityId}/comments`;
      case 'request':
        return `/collections/${parentEntityId}/requests/${entityId}/comments`;
      case 'response':
        return `/collections/${parentEntityId}/responses/${entityId}/comments`;
      case 'api':
        return `/apis/${entityId}/comments`;
      default:
        throw new Error(`Unsupported comment entity type: ${entityType}`);
    }
  }

  // ── User / Team ─────────────────────────────────────────────

  async getAuthenticatedUser() {
    let response = await this.axios.get('/me');
    return response.data;
  }

  // ── Tags ────────────────────────────────────────────────────

  async getTags(entityType: string, entityId: string) {
    let path = `/${entityType}s/${entityId}/tags`;
    let response = await this.axios.get(path);
    return response.data.tags ?? [];
  }

  async updateTags(entityType: string, entityId: string, tags: Array<{ slug: string }>) {
    let path = `/${entityType}s/${entityId}/tags`;
    let response = await this.axios.put(path, { tags });
    return response.data;
  }

  async getEntitiesByTag(
    tagSlug: string,
    params?: { entityType?: string; limit?: number; cursor?: string; direction?: string }
  ) {
    let response = await this.axios.get(`/tags/${tagSlug}/entities`, { params });
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
