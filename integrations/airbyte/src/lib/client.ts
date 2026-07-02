import { createAxios } from 'slates';
import type {
  Connection,
  Destination,
  Job,
  PaginatedResponse,
  Permission,
  Source,
  StreamProperties,
  Tag,
  Workspace
} from './types';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(params: { token: string; baseUrl: string }) {
    this.http = createAxios({
      baseURL: params.baseUrl,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Sources ---

  async listSources(options?: {
    workspaceIds?: string[];
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Source>> {
    let params: Record<string, any> = {};
    if (options?.workspaceIds?.length) params.workspaceIds = options.workspaceIds.join(',');
    if (options?.includeDeleted !== undefined) params.includeDeleted = options.includeDeleted;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;

    let response = await this.http.get('/sources', { params });
    return response.data;
  }

  async getSource(sourceId: string): Promise<Source> {
    let response = await this.http.get(`/sources/${sourceId}`);
    return response.data;
  }

  async createSource(data: {
    name: string;
    workspaceId: string;
    sourceType: string;
    configuration: Record<string, any>;
  }): Promise<Source> {
    let response = await this.http.post('/sources', {
      name: data.name,
      workspaceId: data.workspaceId,
      sourceType: data.sourceType,
      configuration: data.configuration
    });
    return response.data;
  }

  async updateSource(
    sourceId: string,
    data: {
      name?: string;
      configuration?: Record<string, any>;
    }
  ): Promise<Source> {
    let response = await this.http.patch(`/sources/${sourceId}`, data);
    return response.data;
  }

  async deleteSource(sourceId: string): Promise<void> {
    await this.http.delete(`/sources/${sourceId}`);
  }

  // --- Destinations ---

  async listDestinations(options?: {
    workspaceIds?: string[];
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Destination>> {
    let params: Record<string, any> = {};
    if (options?.workspaceIds?.length) params.workspaceIds = options.workspaceIds.join(',');
    if (options?.includeDeleted !== undefined) params.includeDeleted = options.includeDeleted;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;

    let response = await this.http.get('/destinations', { params });
    return response.data;
  }

  async getDestination(destinationId: string): Promise<Destination> {
    let response = await this.http.get(`/destinations/${destinationId}`);
    return response.data;
  }

  async createDestination(data: {
    name: string;
    workspaceId: string;
    destinationType: string;
    configuration: Record<string, any>;
  }): Promise<Destination> {
    let response = await this.http.post('/destinations', {
      name: data.name,
      workspaceId: data.workspaceId,
      destinationType: data.destinationType,
      configuration: data.configuration
    });
    return response.data;
  }

  async updateDestination(
    destinationId: string,
    data: {
      name?: string;
      configuration?: Record<string, any>;
    }
  ): Promise<Destination> {
    let response = await this.http.patch(`/destinations/${destinationId}`, data);
    return response.data;
  }

  async deleteDestination(destinationId: string): Promise<void> {
    await this.http.delete(`/destinations/${destinationId}`);
  }

  // --- Connections ---

  async listConnections(options?: {
    workspaceIds?: string[];
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Connection>> {
    let params: Record<string, any> = {};
    if (options?.workspaceIds?.length) params.workspaceIds = options.workspaceIds.join(',');
    if (options?.includeDeleted !== undefined) params.includeDeleted = options.includeDeleted;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;

    let response = await this.http.get('/connections', { params });
    return response.data;
  }

  async getConnection(connectionId: string): Promise<Connection> {
    let response = await this.http.get(`/connections/${connectionId}`);
    return response.data;
  }

  async createConnection(data: {
    sourceId: string;
    destinationId: string;
    name?: string;
    namespaceDefinition?: string;
    namespaceFormat?: string;
    prefix?: string;
    nonBreakingSchemaUpdatesBehavior?: string;
    status?: string;
    dataResidency?: string;
    schedule?: {
      scheduleType: string;
      cronExpression?: string;
    };
    configurations?: {
      streams?: Array<{
        name: string;
        syncMode?: string;
        cursorField?: string[];
        primaryKey?: string[][];
      }>;
    };
  }): Promise<Connection> {
    let response = await this.http.post('/connections', data);
    return response.data;
  }

  async updateConnection(
    connectionId: string,
    data: {
      name?: string;
      status?: string;
      schedule?: {
        scheduleType: string;
        cronExpression?: string;
      };
      dataResidency?: string;
      namespaceDefinition?: string;
      namespaceFormat?: string;
      prefix?: string;
      nonBreakingSchemaUpdatesBehavior?: string;
      configurations?: {
        streams?: Array<{
          name: string;
          syncMode?: string;
          cursorField?: string[];
          primaryKey?: string[][];
        }>;
      };
    }
  ): Promise<Connection> {
    let response = await this.http.patch(`/connections/${connectionId}`, data);
    return response.data;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.http.delete(`/connections/${connectionId}`);
  }

  // --- Jobs ---

  async listJobs(options?: {
    connectionId?: string;
    jobType?: 'sync' | 'reset';
    limit?: number;
    offset?: number;
    workspaceIds?: string[];
    status?: string;
    createdAtStart?: string;
    createdAtEnd?: string;
    updatedAtStart?: string;
    updatedAtEnd?: string;
    orderBy?: string;
  }): Promise<PaginatedResponse<Job>> {
    let params: Record<string, any> = {};
    if (options?.connectionId) params.connectionId = options.connectionId;
    if (options?.jobType) params.jobType = options.jobType;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;
    if (options?.workspaceIds?.length) params.workspaceIds = options.workspaceIds.join(',');
    if (options?.status) params.status = options.status;
    if (options?.createdAtStart) params.createdAtStart = options.createdAtStart;
    if (options?.createdAtEnd) params.createdAtEnd = options.createdAtEnd;
    if (options?.updatedAtStart) params.updatedAtStart = options.updatedAtStart;
    if (options?.updatedAtEnd) params.updatedAtEnd = options.updatedAtEnd;
    if (options?.orderBy) params.orderBy = options.orderBy;

    let response = await this.http.get('/jobs', { params });
    return response.data;
  }

  async getJob(jobId: number): Promise<Job> {
    let response = await this.http.get(`/jobs/${jobId}`);
    return response.data;
  }

  async createJob(data: { connectionId: string; jobType: 'sync' | 'reset' }): Promise<Job> {
    let response = await this.http.post('/jobs', data);
    return response.data;
  }

  async cancelJob(jobId: number): Promise<Job> {
    let response = await this.http.delete(`/jobs/${jobId}`);
    return response.data;
  }

  // --- Workspaces ---

  async listWorkspaces(options?: {
    workspaceIds?: string[];
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Workspace>> {
    let params: Record<string, any> = {};
    if (options?.workspaceIds?.length) params.workspaceIds = options.workspaceIds.join(',');
    if (options?.includeDeleted !== undefined) params.includeDeleted = options.includeDeleted;
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;

    let response = await this.http.get('/workspaces', { params });
    return response.data;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    let response = await this.http.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  async createWorkspace(data: {
    name: string;
    organizationId?: string;
    notifications?: Record<string, any>;
  }): Promise<Workspace> {
    let response = await this.http.post('/workspaces', data);
    return response.data;
  }

  async updateWorkspace(
    workspaceId: string,
    data: {
      name?: string;
      notifications?: Record<string, any>;
    }
  ): Promise<Workspace> {
    let response = await this.http.patch(`/workspaces/${workspaceId}`, data);
    return response.data;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.http.delete(`/workspaces/${workspaceId}`);
  }

  // --- Permissions ---

  async listPermissions(options?: {
    userId?: string;
    organizationId?: string;
  }): Promise<PaginatedResponse<Permission>> {
    let params: Record<string, any> = {};
    if (options?.userId) params.userId = options.userId;
    if (options?.organizationId) params.organizationId = options.organizationId;

    let response = await this.http.get('/permissions', { params });
    return response.data;
  }

  async getPermission(permissionId: string): Promise<Permission> {
    let response = await this.http.get(`/permissions/${permissionId}`);
    return response.data;
  }

  async createPermission(data: {
    permissionType: string;
    userId: string;
    workspaceId?: string;
    organizationId?: string;
  }): Promise<Permission> {
    let response = await this.http.post('/permissions', data);
    return response.data;
  }

  async updatePermission(
    permissionId: string,
    data: {
      permissionType: string;
    }
  ): Promise<Permission> {
    let response = await this.http.patch(`/permissions/${permissionId}`, data);
    return response.data;
  }

  async deletePermission(permissionId: string): Promise<void> {
    await this.http.delete(`/permissions/${permissionId}`);
  }

  // --- Stream Properties ---

  async getStreamProperties(
    sourceId: string,
    options?: {
      destinationId?: string;
      ignoreCache?: boolean;
    }
  ): Promise<StreamProperties[]> {
    let params: Record<string, any> = { sourceId };
    if (options?.destinationId) params.destinationId = options.destinationId;
    if (options?.ignoreCache !== undefined) params.ignoreCache = options.ignoreCache;

    let response = await this.http.get('/streams', { params });
    return response.data.data ?? response.data;
  }

  // --- Tags ---

  async listTags(options?: { workspaceIds?: string[] }): Promise<PaginatedResponse<Tag>> {
    let params: Record<string, any> = {};
    if (options?.workspaceIds?.length) params.workspaceIds = options.workspaceIds.join(',');

    let response = await this.http.get('/tags', { params });
    return response.data;
  }

  async createTag(data: { name: string; color: string; workspaceId: string }): Promise<Tag> {
    let response = await this.http.post('/tags', data);
    return response.data;
  }

  async updateTag(
    tagId: string,
    data: {
      name?: string;
      color?: string;
    }
  ): Promise<Tag> {
    let response = await this.http.patch(`/tags/${tagId}`, data);
    return response.data;
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.http.delete(`/tags/${tagId}`);
  }
}
