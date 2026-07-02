import { createAxios } from 'slates';

export interface PaginationParams {
  limit?: number;
  after?: string;
  before?: string;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  values: T[];
  pagination: {
    after?: string;
    before?: string;
  };
}

export interface HexProject {
  projectId: string;
  title: string;
  description: string | null;
  status: string | null;
  categories: string[];
  creator: { userId: string; email: string; name: string } | null;
  owner: { userId: string; email: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  sharing?: {
    workspace?: string;
    publicWeb?: string;
    users?: Array<{ userId: string; accessLevel: string }>;
    groups?: Array<{ groupId: string; accessLevel: string }>;
    collections?: Array<{ collectionId: string; accessLevel: string }>;
  };
}

export interface HexRun {
  projectId: string;
  runId: string;
  runUrl: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  elapsedTime: number | null;
  traceId: string | null;
  notifications: Array<{
    type: string;
    target: any;
  }>;
}

export interface RunProjectParams {
  inputParams?: Record<string, any>;
  dryRun?: boolean;
  updateCache?: boolean;
  updatePublishedResults?: boolean;
  useCachedSqlResults?: boolean;
  viewId?: string;
  notifications?: Array<{
    type: string;
    target: any;
  }>;
}

export interface HexUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface HexGroup {
  groupId: string;
  name: string;
  createdAt: string;
  members?: {
    users: Array<{ userId: string; email: string; name: string }>;
  };
}

export interface HexCollection {
  collectionId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  sharing?: {
    workspace?: string;
    users?: Array<{ userId: string; accessLevel: string }>;
    groups?: Array<{ groupId: string; accessLevel: string }>;
  };
}

export interface HexDataConnection {
  dataConnectionId: string;
  name: string;
  type: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmbeddingParams {
  hexUserAttributes?: Record<string, string>;
  scope?: string[];
  inputParameters?: Record<string, any>;
  expiresIn?: number;
  displayOptions?: {
    theme?: string;
    showPadding?: boolean;
    showHeader?: boolean;
  };
  testMode?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: `${config.baseUrl}/api/v1`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Projects ----

  async listProjects(
    params?: PaginationParams & {
      includeArchived?: boolean;
      includeComponents?: boolean;
      includeTrashed?: boolean;
      includeSharing?: boolean;
      statuses?: string[];
      categories?: string[];
      creatorEmail?: string;
      ownerEmail?: string;
      collectionId?: string;
    }
  ): Promise<PaginatedResponse<HexProject>> {
    let response = await this.axios.get('/projects', { params });
    return response.data;
  }

  async getProject(projectId: string, includeSharing?: boolean): Promise<HexProject> {
    let response = await this.axios.get(`/projects/${projectId}`, {
      params: includeSharing ? { includeSharing: true } : undefined
    });
    return response.data;
  }

  async createProject(title: string, description?: string): Promise<HexProject> {
    let response = await this.axios.post('/projects', { title, description });
    return response.data;
  }

  async updateProjectStatus(projectId: string, status: string | null): Promise<HexProject> {
    let response = await this.axios.patch(`/projects/${projectId}`, { status });
    return response.data;
  }

  // ---- Project Runs ----

  async runProject(projectId: string, params?: RunProjectParams): Promise<HexRun> {
    let response = await this.axios.post(`/projects/${projectId}/runs`, params ?? {});
    return response.data;
  }

  async getProjectRuns(
    projectId: string,
    params?: {
      limit?: number;
      offset?: number;
      statusFilter?: string;
    }
  ): Promise<HexRun[]> {
    let response = await this.axios.get(`/projects/${projectId}/runs`, { params });
    return response.data;
  }

  async getRunStatus(projectId: string, runId: string): Promise<HexRun> {
    let response = await this.axios.get(`/projects/${projectId}/runs/${runId}`);
    return response.data;
  }

  async cancelRun(projectId: string, runId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/runs/${runId}`);
  }

  // ---- Project Sharing ----

  async editProjectSharingUsers(
    projectId: string,
    sharing: {
      upsert?: { users: Array<{ userId: string; accessLevel: string }> };
    }
  ): Promise<HexProject> {
    let response = await this.axios.patch(`/projects/${projectId}/sharing/users`, { sharing });
    return response.data;
  }

  async editProjectSharingGroups(
    projectId: string,
    sharing: {
      upsert?: { groups: Array<{ groupId: string; accessLevel: string }> };
    }
  ): Promise<HexProject> {
    let response = await this.axios.patch(`/projects/${projectId}/sharing/groups`, {
      sharing
    });
    return response.data;
  }

  async editProjectSharingCollections(
    projectId: string,
    sharing: {
      upsert?: { collections: Array<{ collectionId: string; accessLevel: string }> };
    }
  ): Promise<HexProject> {
    let response = await this.axios.patch(`/projects/${projectId}/sharing/collections`, {
      sharing
    });
    return response.data;
  }

  async editProjectSharingWorkspaceAndPublic(
    projectId: string,
    sharing: {
      workspace?: string;
      publicWeb?: string;
    }
  ): Promise<HexProject> {
    let response = await this.axios.patch(
      `/projects/${projectId}/sharing/workspaceAndPublic`,
      { sharing }
    );
    return response.data;
  }

  // ---- Embedded Analytics ----

  async createPresignedUrl(
    projectId: string,
    params?: EmbeddingParams
  ): Promise<{ url: string }> {
    let response = await this.axios.post(
      `/embedding/createPresignedUrl/${projectId}`,
      params ?? {}
    );
    return response.data;
  }

  // ---- Users ----

  async listUsers(params?: PaginationParams): Promise<PaginatedResponse<HexUser>> {
    let response = await this.axios.get('/users', { params });
    return response.data;
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.axios.post(`/users/${userId}/deactivate`);
  }

  // ---- Groups ----

  async listGroups(params?: PaginationParams): Promise<PaginatedResponse<HexGroup>> {
    let response = await this.axios.get('/groups', { params });
    return response.data;
  }

  async getGroup(groupId: string): Promise<HexGroup> {
    let response = await this.axios.get(`/groups/${groupId}`);
    return response.data;
  }

  async createGroup(name: string, userIds?: string[]): Promise<HexGroup> {
    let body: any = { name };
    if (userIds && userIds.length > 0) {
      body.members = { users: userIds.map(id => ({ userId: id })) };
    }
    let response = await this.axios.post('/groups', body);
    return response.data;
  }

  async editGroup(
    groupId: string,
    params: {
      name?: string;
      addUserIds?: string[];
      removeUserIds?: string[];
    }
  ): Promise<HexGroup> {
    let body: any = {};
    if (params.name) body.name = params.name;
    if (params.addUserIds || params.removeUserIds) {
      body.members = {};
      if (params.addUserIds && params.addUserIds.length > 0) {
        body.members.add = { users: params.addUserIds.map(id => ({ userId: id })) };
      }
      if (params.removeUserIds && params.removeUserIds.length > 0) {
        body.members.remove = { users: params.removeUserIds.map(id => ({ userId: id })) };
      }
    }
    let response = await this.axios.patch(`/groups/${groupId}`, body);
    return response.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.axios.delete(`/groups/${groupId}`);
  }

  // ---- Collections ----

  async listCollections(params?: PaginationParams): Promise<PaginatedResponse<HexCollection>> {
    let response = await this.axios.get('/collections', { params });
    return response.data;
  }

  async getCollection(collectionId: string): Promise<HexCollection> {
    let response = await this.axios.get(`/collections/${collectionId}`);
    return response.data;
  }

  async createCollection(name: string, description?: string): Promise<HexCollection> {
    let response = await this.axios.post('/collections', { name, description });
    return response.data;
  }

  async editCollection(
    collectionId: string,
    params: {
      name?: string;
      description?: string;
    }
  ): Promise<HexCollection> {
    let response = await this.axios.patch(`/collections/${collectionId}`, params);
    return response.data;
  }

  // ---- Data Connections ----

  async listDataConnections(
    params?: PaginationParams
  ): Promise<PaginatedResponse<HexDataConnection>> {
    let response = await this.axios.get('/data-connections', { params });
    return response.data;
  }

  async getDataConnection(dataConnectionId: string): Promise<HexDataConnection> {
    let response = await this.axios.get(`/data-connections/${dataConnectionId}`);
    return response.data;
  }

  async createDataConnection(params: {
    name: string;
    type: string;
    connectionDetails: Record<string, any>;
    description?: string;
    connectViaSsh?: boolean;
    includeMagic?: boolean;
    allowWritebackCells?: boolean;
    schemaFilters?: Record<string, any>;
    schemaRefreshSchedule?: Record<string, any>;
    sharing?: Record<string, any>;
  }): Promise<HexDataConnection> {
    let response = await this.axios.post('/data-connections', params);
    return response.data;
  }

  async editDataConnection(
    dataConnectionId: string,
    params: Record<string, any>
  ): Promise<HexDataConnection> {
    let response = await this.axios.patch(`/data-connections/${dataConnectionId}`, params);
    return response.data;
  }

  // ---- Observability ----

  async getQueriedTables(
    projectId: string,
    params?: {
      limit?: number;
      after?: string;
      before?: string;
    }
  ): Promise<
    PaginatedResponse<{
      dataConnectionId: string;
      dataConnectionName: string;
      tableName: string;
    }>
  > {
    let response = await this.axios.get(`/projects/${projectId}/queriedTables`, { params });
    return response.data;
  }
}
