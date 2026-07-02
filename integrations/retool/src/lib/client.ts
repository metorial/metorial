import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total_count: number;
  has_more: boolean;
  next_token?: string;
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
}

export interface RetoolUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  metadata?: Record<string, any>;
  user_type?: string;
  groups?: RetoolGroup[];
  created_at?: string;
  last_active?: string;
  is_admin?: boolean;
  photo?: string;
}

export interface RetoolGroup {
  id: number;
  name: string;
  universal_app_access?: string;
  universal_resource_access?: string;
  universal_workflow_access?: string;
  universal_query_library_access?: string;
  user_list_access?: boolean;
  audit_log_access?: boolean;
  unpublished_release_access?: boolean;
  usage_analytics_access?: boolean;
  theme_access?: boolean;
  account_details_access?: boolean;
  landing_page_app_id?: string | null;
  members?: RetoolGroupMember[];
  user_invites?: any[];
}

export interface RetoolGroupMember {
  id: string;
  is_group_admin: boolean;
  email?: string;
}

export interface RetoolApp {
  id: string;
  name: string;
  folder_id?: string | null;
  is_mobile_app?: boolean;
  is_multipage_app?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RetoolFolder {
  id: string;
  name: string;
  parent_folder_id?: string | null;
  folder_type?: string;
  is_system_folder?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RetoolSpace {
  id: string;
  name: string;
  domain: string;
  created_at?: string;
  updated_at?: string;
}

export interface RetoolResource {
  id: string;
  name: string;
  type?: string;
  description?: string;
  folder_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RetoolEnvironment {
  id: string;
  name: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RetoolWorkflow {
  id: string;
  name: string;
  folder_id?: string | null;
  is_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RetoolPermission {
  subject: {
    id: string;
    type: string;
  };
  object: {
    id: string;
    type: string;
  };
  access_level: string;
}

export class Client {
  private axios;

  constructor(params: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: `${params.baseUrl}/api/v2`,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Users ----

  async listUsers(options?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    limit?: number;
    nextToken?: string;
  }): Promise<PaginatedResponse<RetoolUser>> {
    let params: Record<string, any> = {};
    if (options?.email) params.email = options.email;
    if (options?.firstName) params.first_name = options.firstName;
    if (options?.lastName) params.last_name = options.lastName;
    if (options?.limit) params.limit = options.limit;
    if (options?.nextToken) params.next_token = options.nextToken;

    let response = await this.axios.get('/users', { params });
    return response.data;
  }

  async getUser(userId: string, includeGroups?: boolean): Promise<SingleResponse<RetoolUser>> {
    let params: Record<string, any> = {};
    if (includeGroups) params.includeGroups = true;

    let response = await this.axios.get(`/users/${userId}`, { params });
    return response.data;
  }

  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    active?: boolean;
    metadata?: Record<string, any>;
    userType?: string;
  }): Promise<SingleResponse<RetoolUser>> {
    let body: Record<string, any> = {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName
    };
    if (data.active !== undefined) body.active = data.active;
    if (data.metadata) body.metadata = data.metadata;
    if (data.userType) body.user_type = data.userType;

    let response = await this.axios.post('/users', body);
    return response.data;
  }

  async updateUser(
    userId: string,
    operations: Array<{ op: string; path: string; value: any }>
  ): Promise<SingleResponse<RetoolUser>> {
    let response = await this.axios.patch(`/users/${userId}`, { operations });
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.axios.delete(`/users/${userId}`);
  }

  // ---- User Attributes ----

  async setUserAttribute(userId: string, name: string, value: any): Promise<any> {
    let response = await this.axios.post(`/users/${userId}/user_attributes`, { name, value });
    return response.data;
  }

  async deleteUserAttribute(userId: string, attributeName: string): Promise<void> {
    await this.axios.delete(`/users/${userId}/user_attributes/${attributeName}`);
  }

  // ---- Groups ----

  async listGroups(): Promise<PaginatedResponse<RetoolGroup>> {
    let response = await this.axios.get('/groups');
    return response.data;
  }

  async getGroup(
    groupId: number,
    excludeDisabledUsers?: boolean
  ): Promise<SingleResponse<RetoolGroup>> {
    let params: Record<string, any> = {};
    if (excludeDisabledUsers) params.excludeDisabledUsers = true;

    let response = await this.axios.get(`/groups/${groupId}`, { params });
    return response.data;
  }

  async createGroup(data: {
    name: string;
    universalAppAccess?: string;
    universalResourceAccess?: string;
    universalWorkflowAccess?: string;
    universalQueryLibraryAccess?: string;
    members?: Array<{ id: string; isGroupAdmin?: boolean }>;
  }): Promise<SingleResponse<RetoolGroup>> {
    let body: Record<string, any> = { name: data.name };
    if (data.universalAppAccess) body.universal_app_access = data.universalAppAccess;
    if (data.universalResourceAccess)
      body.universal_resource_access = data.universalResourceAccess;
    if (data.universalWorkflowAccess)
      body.universal_workflow_access = data.universalWorkflowAccess;
    if (data.universalQueryLibraryAccess)
      body.universal_query_library_access = data.universalQueryLibraryAccess;
    if (data.members)
      body.members = data.members.map(m => ({
        id: m.id,
        is_group_admin: m.isGroupAdmin ?? false
      }));

    let response = await this.axios.post('/groups', body);
    return response.data;
  }

  async updateGroup(
    groupId: number,
    data: {
      name?: string;
      universalAppAccess?: string;
      universalResourceAccess?: string;
      universalWorkflowAccess?: string;
      universalQueryLibraryAccess?: string;
      userListAccess?: boolean;
      auditLogAccess?: boolean;
      unpublishedReleaseAccess?: boolean;
      usageAnalyticsAccess?: boolean;
      themeAccess?: boolean;
      accountDetailsAccess?: boolean;
      landingPageAppId?: string | null;
    }
  ): Promise<SingleResponse<RetoolGroup>> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.universalAppAccess !== undefined)
      body.universal_app_access = data.universalAppAccess;
    if (data.universalResourceAccess !== undefined)
      body.universal_resource_access = data.universalResourceAccess;
    if (data.universalWorkflowAccess !== undefined)
      body.universal_workflow_access = data.universalWorkflowAccess;
    if (data.universalQueryLibraryAccess !== undefined)
      body.universal_query_library_access = data.universalQueryLibraryAccess;
    if (data.userListAccess !== undefined) body.user_list_access = data.userListAccess;
    if (data.auditLogAccess !== undefined) body.audit_log_access = data.auditLogAccess;
    if (data.unpublishedReleaseAccess !== undefined)
      body.unpublished_release_access = data.unpublishedReleaseAccess;
    if (data.usageAnalyticsAccess !== undefined)
      body.usage_analytics_access = data.usageAnalyticsAccess;
    if (data.themeAccess !== undefined) body.theme_access = data.themeAccess;
    if (data.accountDetailsAccess !== undefined)
      body.account_details_access = data.accountDetailsAccess;
    if (data.landingPageAppId !== undefined) body.landing_page_app_id = data.landingPageAppId;

    let response = await this.axios.put(`/groups/${groupId}`, body);
    return response.data;
  }

  async deleteGroup(groupId: number): Promise<void> {
    await this.axios.delete(`/groups/${groupId}`);
  }

  async addGroupMembers(
    groupId: number,
    members: Array<{ id: string; isGroupAdmin?: boolean }>
  ): Promise<void> {
    let body = members.map(m => ({ id: m.id, is_group_admin: m.isGroupAdmin ?? false }));
    await this.axios.post(`/groups/${groupId}/members`, body);
  }

  async removeGroupMember(groupId: number, userId: string): Promise<void> {
    await this.axios.delete(`/groups/${groupId}/members/${userId}`);
  }

  // ---- Apps ----

  async listApps(options?: {
    limit?: number;
    nextToken?: string;
  }): Promise<PaginatedResponse<RetoolApp>> {
    let params: Record<string, any> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.nextToken) params.next_token = options.nextToken;

    let response = await this.axios.get('/apps', { params });
    return response.data;
  }

  async getApp(appId: string): Promise<SingleResponse<RetoolApp>> {
    let response = await this.axios.get(`/apps/${appId}`);
    return response.data;
  }

  async createApp(data: {
    name: string;
    folderId?: string;
    description?: string;
  }): Promise<SingleResponse<RetoolApp>> {
    let body: Record<string, any> = { name: data.name };
    if (data.folderId) body.folder_id = data.folderId;
    if (data.description) body.description = data.description;

    let response = await this.axios.post('/apps', body);
    return response.data;
  }

  async updateApp(
    appId: string,
    data: { name?: string; folderId?: string | null }
  ): Promise<SingleResponse<RetoolApp>> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.folderId !== undefined) body.folder_id = data.folderId;

    let response = await this.axios.put(`/apps/${appId}`, body);
    return response.data;
  }

  async deleteApp(appId: string): Promise<void> {
    await this.axios.delete(`/apps/${appId}`);
  }

  // ---- Folders ----

  async listFolders(options?: {
    limit?: number;
    nextToken?: string;
  }): Promise<PaginatedResponse<RetoolFolder>> {
    let params: Record<string, any> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.nextToken) params.next_token = options.nextToken;

    let response = await this.axios.get('/folders', { params });
    return response.data;
  }

  async getFolder(folderId: string): Promise<SingleResponse<RetoolFolder>> {
    let response = await this.axios.get(`/folders/${folderId}`);
    return response.data;
  }

  async createFolder(data: {
    name: string;
    parentFolderId?: string | null;
    folderType?: string;
  }): Promise<SingleResponse<RetoolFolder>> {
    let body: Record<string, any> = { name: data.name };
    if (data.parentFolderId !== undefined) body.parent_folder_id = data.parentFolderId;
    if (data.folderType) body.folder_type = data.folderType;

    let response = await this.axios.post('/folders', body);
    return response.data;
  }

  async updateFolder(
    folderId: string,
    data: { name?: string; parentFolderId?: string | null }
  ): Promise<SingleResponse<RetoolFolder>> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.parentFolderId !== undefined) body.parent_folder_id = data.parentFolderId;

    let response = await this.axios.put(`/folders/${folderId}`, body);
    return response.data;
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.axios.delete(`/folders/${folderId}`);
  }

  // ---- Spaces ----

  async listSpaces(): Promise<PaginatedResponse<RetoolSpace>> {
    let response = await this.axios.get('/spaces');
    return response.data;
  }

  async getSpace(spaceId: string): Promise<SingleResponse<RetoolSpace>> {
    let response = await this.axios.get(`/spaces/${spaceId}`);
    return response.data;
  }

  async createSpace(data: {
    name: string;
    domain: string;
    options?: {
      copySsoSettings?: boolean;
      copyBrandingAndThemesSettings?: boolean;
      createAdminUser?: boolean;
    };
  }): Promise<SingleResponse<RetoolSpace>> {
    let body: Record<string, any> = {
      name: data.name,
      domain: data.domain
    };
    if (data.options) {
      body.options = {};
      if (data.options.copySsoSettings !== undefined)
        body.options.copy_sso_settings = data.options.copySsoSettings;
      if (data.options.copyBrandingAndThemesSettings !== undefined)
        body.options.copy_branding_and_themes_settings =
          data.options.copyBrandingAndThemesSettings;
      if (data.options.createAdminUser !== undefined)
        body.options.create_admin_user = data.options.createAdminUser;
    }

    let response = await this.axios.post('/spaces', body);
    return response.data;
  }

  async updateSpace(
    spaceId: string,
    data: { name?: string; domain?: string }
  ): Promise<SingleResponse<RetoolSpace>> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.domain !== undefined) body.domain = data.domain;

    let response = await this.axios.put(`/spaces/${spaceId}`, body);
    return response.data;
  }

  async deleteSpace(spaceId: string): Promise<void> {
    await this.axios.delete(`/spaces/${spaceId}`);
  }

  // ---- Permissions ----

  async listPermissionObjects(subjectType: string, subjectId: string): Promise<any> {
    let response = await this.axios.get('/permissions/listObjects', {
      params: { subject_type: subjectType, subject_id: subjectId }
    });
    return response.data;
  }

  async listPermissionSubjects(objectType: string, objectId: string): Promise<any> {
    let response = await this.axios.get('/permissions/listSubjects', {
      params: { object_type: objectType, object_id: objectId }
    });
    return response.data;
  }

  async grantPermission(data: {
    subjectType: string;
    subjectId: string;
    objectType: string;
    objectId: string;
    accessLevel: string;
  }): Promise<any> {
    let response = await this.axios.post('/permissions/grant', {
      subject: { id: data.subjectId, type: data.subjectType },
      object: { id: data.objectId, type: data.objectType },
      access_level: data.accessLevel
    });
    return response.data;
  }

  async revokePermission(data: {
    subjectType: string;
    subjectId: string;
    objectType: string;
    objectId: string;
    accessLevel: string;
  }): Promise<any> {
    let response = await this.axios.post('/permissions/revoke', {
      subject: { id: data.subjectId, type: data.subjectType },
      object: { id: data.objectId, type: data.objectType },
      access_level: data.accessLevel
    });
    return response.data;
  }

  // ---- Resources ----

  async listResources(options?: {
    limit?: number;
    nextToken?: string;
  }): Promise<PaginatedResponse<RetoolResource>> {
    let params: Record<string, any> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.nextToken) params.next_token = options.nextToken;

    let response = await this.axios.get('/resources', { params });
    return response.data;
  }

  async getResource(resourceId: string): Promise<SingleResponse<RetoolResource>> {
    let response = await this.axios.get(`/resources/${resourceId}`);
    return response.data;
  }

  async createResource(data: Record<string, any>): Promise<SingleResponse<RetoolResource>> {
    let response = await this.axios.post('/resources', data);
    return response.data;
  }

  async updateResource(
    resourceId: string,
    data: Record<string, any>
  ): Promise<SingleResponse<RetoolResource>> {
    let response = await this.axios.put(`/resources/${resourceId}`, data);
    return response.data;
  }

  async deleteResource(resourceId: string): Promise<void> {
    await this.axios.delete(`/resources/${resourceId}`);
  }

  // ---- Environments ----

  async listEnvironments(): Promise<PaginatedResponse<RetoolEnvironment>> {
    let response = await this.axios.get('/environments');
    return response.data;
  }

  async getEnvironment(environmentId: string): Promise<SingleResponse<RetoolEnvironment>> {
    let response = await this.axios.get(`/environments/${environmentId}`);
    return response.data;
  }

  async createEnvironment(data: { name: string }): Promise<SingleResponse<RetoolEnvironment>> {
    let response = await this.axios.post('/environments', data);
    return response.data;
  }

  async updateEnvironment(
    environmentId: string,
    data: { name?: string }
  ): Promise<SingleResponse<RetoolEnvironment>> {
    let response = await this.axios.put(`/environments/${environmentId}`, data);
    return response.data;
  }

  async deleteEnvironment(environmentId: string): Promise<void> {
    await this.axios.delete(`/environments/${environmentId}`);
  }

  // ---- Workflows ----

  async listWorkflows(options?: {
    limit?: number;
    nextToken?: string;
  }): Promise<PaginatedResponse<RetoolWorkflow>> {
    let params: Record<string, any> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.nextToken) params.next_token = options.nextToken;

    let response = await this.axios.get('/workflows', { params });
    return response.data;
  }

  async getWorkflow(workflowId: string): Promise<SingleResponse<RetoolWorkflow>> {
    let response = await this.axios.get(`/workflows/${workflowId}`);
    return response.data;
  }

  async getWorkflowRun(runId: string): Promise<SingleResponse<any>> {
    let response = await this.axios.get(`/workflow_run/${runId}`);
    return response.data;
  }

  // ---- Source Control ----

  async getSourceControlConfig(): Promise<any> {
    let response = await this.axios.get('/source_control/config');
    return response.data;
  }

  async updateSourceControlConfig(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/source_control/config', data);
    return response.data;
  }

  async deleteSourceControlConfig(): Promise<void> {
    await this.axios.delete('/source_control/config');
  }

  async testSourceControlConnection(): Promise<any> {
    let response = await this.axios.post('/source_control/test_connection');
    return response.data;
  }

  // ---- SSO ----

  async getSsoConfig(): Promise<any> {
    let response = await this.axios.get('/sso/config');
    return response.data;
  }

  async updateSsoConfig(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/sso/config', data);
    return response.data;
  }

  // ---- Access Tokens ----

  async listAccessTokens(): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/access_tokens');
    return response.data;
  }

  // ---- Custom Component Libraries ----

  async listCustomComponentLibraries(): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/custom_component_libraries');
    return response.data;
  }

  // ---- Usage / Organization ----

  async getUsage(): Promise<any> {
    let response = await this.axios.get('/usage');
    return response.data;
  }

  async getOrganization(): Promise<any> {
    let response = await this.axios.get('/organization');
    return response.data;
  }

  // ---- Configuration Variables ----

  async listConfigurationVariables(options?: {
    limit?: number;
    nextToken?: string;
  }): Promise<PaginatedResponse<any>> {
    let params: Record<string, any> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.nextToken) params.next_token = options.nextToken;

    let response = await this.axios.get('/configuration_variables', { params });
    return response.data;
  }

  async createConfigurationVariable(data: Record<string, any>): Promise<SingleResponse<any>> {
    let response = await this.axios.post('/configuration_variables', data);
    return response.data;
  }

  async updateConfigurationVariable(
    variableId: string,
    data: Record<string, any>
  ): Promise<SingleResponse<any>> {
    let response = await this.axios.put(`/configuration_variables/${variableId}`, data);
    return response.data;
  }

  async deleteConfigurationVariable(variableId: string): Promise<void> {
    await this.axios.delete(`/configuration_variables/${variableId}`);
  }
}
