import { createAxios } from 'slates';

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
}

export interface WorkflowListParams extends PaginationParams {
  active?: boolean;
  tags?: string;
  name?: string;
  projectId?: string;
  excludePinnedData?: boolean;
}

export interface ExecutionListParams extends PaginationParams {
  includeData?: boolean;
  status?: 'canceled' | 'error' | 'running' | 'success' | 'waiting';
  workflowId?: string;
  projectId?: string;
}

export interface CredentialListParams extends PaginationParams {
  // name and type filters if supported
}

export interface UserListParams extends PaginationParams {
  includeRole?: boolean;
  projectId?: string;
}

export interface VariableListParams extends PaginationParams {
  projectId?: string;
  state?: string;
}

export interface AuditOptions {
  additionalOptions?: {
    daysAbandonedWorkflow?: number;
    categories?: string[];
  };
}

export interface SourceControlPullOptions {
  force?: boolean;
  autoPublish?: 'none' | 'all' | 'published';
  variables?: Record<string, string>;
}

export class Client {
  private axios;

  constructor(params: { baseUrl: string; token: string }) {
    this.axios = createAxios({
      baseURL: params.baseUrl.replace(/\/+$/, ''),
      headers: {
        'X-N8N-API-KEY': params.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Workflows ----

  async listWorkflows(params?: WorkflowListParams): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;
    if (params?.active !== undefined) query.active = params.active;
    if (params?.tags) query.tags = params.tags;
    if (params?.name) query.name = params.name;
    if (params?.projectId) query.projectId = params.projectId;
    if (params?.excludePinnedData !== undefined)
      query.excludePinnedData = params.excludePinnedData;

    let response = await this.axios.get('/workflows', { params: query });
    return response.data;
  }

  async getWorkflow(workflowId: string, excludePinnedData?: boolean): Promise<any> {
    let query: Record<string, any> = {};
    if (excludePinnedData !== undefined) query.excludePinnedData = excludePinnedData;

    let response = await this.axios.get(`/workflows/${workflowId}`, { params: query });
    return response.data;
  }

  async createWorkflow(workflow: any): Promise<any> {
    let response = await this.axios.post('/workflows', workflow);
    return response.data;
  }

  async updateWorkflow(workflowId: string, workflow: any): Promise<any> {
    let response = await this.axios.put(`/workflows/${workflowId}`, workflow);
    return response.data;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.axios.delete(`/workflows/${workflowId}`);
  }

  async activateWorkflow(
    workflowId: string,
    options?: { versionId?: string; name?: string; description?: string }
  ): Promise<any> {
    let response = await this.axios.post(`/workflows/${workflowId}/activate`, options || {});
    return response.data;
  }

  async deactivateWorkflow(workflowId: string): Promise<any> {
    let response = await this.axios.post(`/workflows/${workflowId}/deactivate`);
    return response.data;
  }

  async getWorkflowVersion(workflowId: string, versionId: string): Promise<any> {
    let response = await this.axios.get(`/workflows/${workflowId}/${versionId}`);
    return response.data;
  }

  async transferWorkflow(workflowId: string, destinationProjectId: string): Promise<void> {
    await this.axios.put(`/workflows/${workflowId}/transfer`, { destinationProjectId });
  }

  async getWorkflowTags(workflowId: string): Promise<any[]> {
    let response = await this.axios.get(`/workflows/${workflowId}/tags`);
    return response.data;
  }

  async updateWorkflowTags(workflowId: string, tagIds: string[]): Promise<any[]> {
    let response = await this.axios.put(`/workflows/${workflowId}/tags`, tagIds);
    return response.data;
  }

  // ---- Executions ----

  async listExecutions(params?: ExecutionListParams): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;
    if (params?.includeData !== undefined) query.includeData = params.includeData;
    if (params?.status) query.status = params.status;
    if (params?.workflowId) query.workflowId = params.workflowId;
    if (params?.projectId) query.projectId = params.projectId;

    let response = await this.axios.get('/executions', { params: query });
    return response.data;
  }

  async getExecution(executionId: string, includeData?: boolean): Promise<any> {
    let query: Record<string, any> = {};
    if (includeData !== undefined) query.includeData = includeData;

    let response = await this.axios.get(`/executions/${executionId}`, { params: query });
    return response.data;
  }

  async deleteExecution(executionId: string): Promise<void> {
    await this.axios.delete(`/executions/${executionId}`);
  }

  async retryExecution(executionId: string, loadWorkflow?: boolean): Promise<any> {
    let body: Record<string, any> = {};
    if (loadWorkflow !== undefined) body.loadWorkflow = loadWorkflow;

    let response = await this.axios.post(`/executions/${executionId}/retry`, body);
    return response.data;
  }

  async stopExecution(executionId: string): Promise<any> {
    let response = await this.axios.post(`/executions/${executionId}/stop`);
    return response.data;
  }

  async getExecutionTags(executionId: string): Promise<any[]> {
    let response = await this.axios.get(`/executions/${executionId}/tags`);
    return response.data;
  }

  async updateExecutionTags(executionId: string, tagIds: string[]): Promise<any[]> {
    let response = await this.axios.put(`/executions/${executionId}/tags`, tagIds);
    return response.data;
  }

  // ---- Credentials ----

  async listCredentials(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;

    let response = await this.axios.get('/credentials', { params: query });
    return response.data;
  }

  async createCredential(credential: {
    name: string;
    type: string;
    data: Record<string, any>;
  }): Promise<any> {
    let response = await this.axios.post('/credentials', credential);
    return response.data;
  }

  async updateCredential(
    credentialId: string,
    update: { name?: string; type?: string; data?: Record<string, any> }
  ): Promise<any> {
    let response = await this.axios.patch(`/credentials/${credentialId}`, update);
    return response.data;
  }

  async deleteCredential(credentialId: string): Promise<void> {
    await this.axios.delete(`/credentials/${credentialId}`);
  }

  async getCredentialSchema(credentialTypeName: string): Promise<any> {
    let response = await this.axios.get(`/credentials/schema/${credentialTypeName}`);
    return response.data;
  }

  async transferCredential(credentialId: string, destinationProjectId: string): Promise<void> {
    await this.axios.put(`/credentials/${credentialId}/transfer`, { destinationProjectId });
  }

  // ---- Users ----

  async listUsers(params?: UserListParams): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;
    if (params?.includeRole !== undefined) query.includeRole = params.includeRole;
    if (params?.projectId) query.projectId = params.projectId;

    let response = await this.axios.get('/users', { params: query });
    return response.data;
  }

  async getUser(userIdOrEmail: string, includeRole?: boolean): Promise<any> {
    let query: Record<string, any> = {};
    if (includeRole !== undefined) query.includeRole = includeRole;

    let response = await this.axios.get(`/users/${userIdOrEmail}`, { params: query });
    return response.data;
  }

  // ---- Tags ----

  async listTags(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;

    let response = await this.axios.get('/tags', { params: query });
    return response.data;
  }

  async getTag(tagId: string): Promise<any> {
    let response = await this.axios.get(`/tags/${tagId}`);
    return response.data;
  }

  async createTag(name: string): Promise<any> {
    let response = await this.axios.post('/tags', { name });
    return response.data;
  }

  async updateTag(tagId: string, name: string): Promise<any> {
    let response = await this.axios.put(`/tags/${tagId}`, { name });
    return response.data;
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.axios.delete(`/tags/${tagId}`);
  }

  // ---- Variables ----

  async listVariables(params?: VariableListParams): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;
    if (params?.projectId) query.projectId = params.projectId;
    if (params?.state) query.state = params.state;

    let response = await this.axios.get('/variables', { params: query });
    return response.data;
  }

  async createVariable(variable: {
    key: string;
    value: string;
    projectId?: string;
  }): Promise<any> {
    let response = await this.axios.post('/variables', variable);
    return response.data;
  }

  async updateVariable(
    variableId: string,
    variable: { key: string; value: string }
  ): Promise<any> {
    let response = await this.axios.put(`/variables/${variableId}`, variable);
    return response.data;
  }

  async deleteVariable(variableId: string): Promise<void> {
    await this.axios.delete(`/variables/${variableId}`);
  }

  // ---- Projects ----

  async listProjects(params?: PaginationParams): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;

    let response = await this.axios.get('/projects', { params: query });
    return response.data;
  }

  async createProject(name: string): Promise<any> {
    let response = await this.axios.post('/projects', { name });
    return response.data;
  }

  async updateProject(projectId: string, project: any): Promise<any> {
    let response = await this.axios.put(`/projects/${projectId}`, project);
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}`);
  }

  async listProjectMembers(
    projectId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<any>> {
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;

    let response = await this.axios.get(`/projects/${projectId}/users`, { params: query });
    return response.data;
  }

  async addProjectMembers(
    projectId: string,
    relations: { userId: string; role: string }[]
  ): Promise<void> {
    await this.axios.post(`/projects/${projectId}/users`, { relations });
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/users/${userId}`);
  }

  async changeProjectMemberRole(
    projectId: string,
    userId: string,
    role: string
  ): Promise<void> {
    await this.axios.patch(`/projects/${projectId}/users/${userId}`, { role });
  }

  // ---- Source Control ----

  async sourceControlPull(options?: SourceControlPullOptions): Promise<any> {
    let response = await this.axios.post('/source-control/pull', options || {});
    return response.data;
  }

  // ---- Audit ----

  async generateAudit(options?: AuditOptions): Promise<any> {
    let response = await this.axios.post('/audit', options || {});
    return response.data;
  }
}
