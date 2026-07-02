import { createAxios } from 'slates';
import type {
  Association,
  AssociationRequest,
  JumpCloudApplication,
  JumpCloudCommand,
  JumpCloudCommandResult,
  JumpCloudEvent,
  JumpCloudGroup,
  JumpCloudSystem,
  JumpCloudUser,
  PaginatedResponse
} from './types';

export class Client {
  private token: string;
  private orgId?: string;

  constructor(config: { token: string; orgId?: string }) {
    this.token = config.token;
    this.orgId = config.orgId;
  }

  private getHeaders(): Record<string, string> {
    let headers: Record<string, string> = {
      'x-api-key': this.token,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (this.orgId) {
      headers['x-org-id'] = this.orgId;
    }
    return headers;
  }

  private v1Axios() {
    return createAxios({
      baseURL: 'https://console.jumpcloud.com/api',
      headers: this.getHeaders()
    });
  }

  private v2Axios() {
    return createAxios({
      baseURL: 'https://console.jumpcloud.com/api/v2',
      headers: this.getHeaders()
    });
  }

  private insightsAxios() {
    return createAxios({
      baseURL: 'https://api.jumpcloud.com/insights/directory/v1',
      headers: this.getHeaders()
    });
  }

  // ==================== Users ====================

  async listUsers(params?: {
    limit?: number;
    skip?: number;
    sort?: string;
    filter?: string;
    fields?: string;
  }): Promise<PaginatedResponse<JumpCloudUser>> {
    let axios = this.v1Axios();
    let response = await axios.get('/systemusers', {
      params: {
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0,
        sort: params?.sort ?? '_id',
        filter: params?.filter,
        fields: params?.fields
      }
    });
    return {
      results: response.data.results ?? response.data,
      totalCount: response.data.totalCount ?? 0
    };
  }

  async getUser(userId: string): Promise<JumpCloudUser> {
    let axios = this.v1Axios();
    let response = await axios.get(`/systemusers/${userId}`);
    return response.data;
  }

  async createUser(userData: {
    username: string;
    email: string;
    firstname?: string;
    lastname?: string;
    displayname?: string;
    password?: string;
    state?: string;
    company?: string;
    department?: string;
    jobTitle?: string;
    employeeIdentifier?: string;
    employeeType?: string;
    location?: string;
    alternateEmail?: string;
    description?: string;
    ldap_binding_user?: boolean;
    enable_user_portal_multifactor?: boolean;
    password_never_expires?: boolean;
    passwordless_sudo?: boolean;
    attributes?: Array<{ name: string; value: string }>;
    addresses?: Record<string, string>[];
    phoneNumbers?: Array<{ number: string; type?: string }>;
    [key: string]: any;
  }): Promise<JumpCloudUser> {
    let axios = this.v1Axios();
    let response = await axios.post('/systemusers', userData);
    return response.data;
  }

  async updateUser(userId: string, userData: Record<string, any>): Promise<JumpCloudUser> {
    let axios = this.v1Axios();
    let response = await axios.put(`/systemusers/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<JumpCloudUser> {
    let axios = this.v1Axios();
    let response = await axios.delete(`/systemusers/${userId}`);
    return response.data;
  }

  async resetUserMfa(userId: string): Promise<void> {
    let axios = this.v1Axios();
    await axios.post(`/systemusers/${userId}/resetmfa`);
  }

  async unlockUser(userId: string): Promise<void> {
    let axios = this.v1Axios();
    await axios.post(`/systemusers/${userId}/unlock`);
  }

  // ==================== Systems ====================

  async listSystems(params?: {
    limit?: number;
    skip?: number;
    sort?: string;
    filter?: string;
    fields?: string;
  }): Promise<PaginatedResponse<JumpCloudSystem>> {
    let axios = this.v1Axios();
    let response = await axios.get('/systems', {
      params: {
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0,
        sort: params?.sort ?? '_id',
        filter: params?.filter,
        fields: params?.fields
      }
    });
    return {
      results: response.data.results ?? response.data,
      totalCount: response.data.totalCount ?? 0
    };
  }

  async getSystem(systemId: string): Promise<JumpCloudSystem> {
    let axios = this.v1Axios();
    let response = await axios.get(`/systems/${systemId}`);
    return response.data;
  }

  async updateSystem(systemId: string, data: Record<string, any>): Promise<JumpCloudSystem> {
    let axios = this.v1Axios();
    let response = await axios.put(`/systems/${systemId}`, data);
    return response.data;
  }

  async deleteSystem(systemId: string): Promise<JumpCloudSystem> {
    let axios = this.v1Axios();
    let response = await axios.delete(`/systems/${systemId}`);
    return response.data;
  }

  // ==================== User Groups ====================

  async listUserGroups(params?: {
    limit?: number;
    skip?: number;
    sort?: string;
    filter?: string;
  }): Promise<JumpCloudGroup[]> {
    let axios = this.v2Axios();
    let response = await axios.get('/usergroups', {
      params: {
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0,
        sort: params?.sort ?? 'name',
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getUserGroup(groupId: string): Promise<JumpCloudGroup> {
    let axios = this.v2Axios();
    let response = await axios.get(`/usergroups/${groupId}`);
    return response.data;
  }

  async createUserGroup(data: {
    name: string;
    description?: string;
    attributes?: Record<string, any>;
    email?: string;
  }): Promise<JumpCloudGroup> {
    let axios = this.v2Axios();
    let response = await axios.post('/usergroups', data);
    return response.data;
  }

  async updateUserGroup(groupId: string, data: Record<string, any>): Promise<JumpCloudGroup> {
    let axios = this.v2Axios();
    let response = await axios.put(`/usergroups/${groupId}`, data);
    return response.data;
  }

  async deleteUserGroup(groupId: string): Promise<void> {
    let axios = this.v2Axios();
    await axios.delete(`/usergroups/${groupId}`);
  }

  async listUserGroupMembers(
    groupId: string,
    params?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<Array<{ to: { id: string; type: string } }>> {
    let axios = this.v2Axios();
    let response = await axios.get(`/usergroups/${groupId}/members`, {
      params: {
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0
      }
    });
    return response.data;
  }

  async manageUserGroupMembers(
    groupId: string,
    body: {
      op: 'add' | 'remove';
      type: 'user';
      id: string;
    }
  ): Promise<void> {
    let axios = this.v2Axios();
    await axios.post(`/usergroups/${groupId}/members`, body);
  }

  async listUserGroupAssociations(
    groupId: string,
    targets: string,
    params?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<Association[]> {
    let axios = this.v2Axios();
    let response = await axios.get(`/usergroups/${groupId}/associations`, {
      params: {
        targets,
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0
      }
    });
    return response.data;
  }

  async manageUserGroupAssociations(groupId: string, body: AssociationRequest): Promise<void> {
    let axios = this.v2Axios();
    await axios.post(`/usergroups/${groupId}/associations`, body);
  }

  // ==================== System Groups ====================

  async listSystemGroups(params?: {
    limit?: number;
    skip?: number;
    sort?: string;
    filter?: string;
  }): Promise<JumpCloudGroup[]> {
    let axios = this.v2Axios();
    let response = await axios.get('/systemgroups', {
      params: {
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0,
        sort: params?.sort ?? 'name',
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getSystemGroup(groupId: string): Promise<JumpCloudGroup> {
    let axios = this.v2Axios();
    let response = await axios.get(`/systemgroups/${groupId}`);
    return response.data;
  }

  async createSystemGroup(data: {
    name: string;
    description?: string;
    attributes?: Record<string, any>;
  }): Promise<JumpCloudGroup> {
    let axios = this.v2Axios();
    let response = await axios.post('/systemgroups', data);
    return response.data;
  }

  async updateSystemGroup(
    groupId: string,
    data: Record<string, any>
  ): Promise<JumpCloudGroup> {
    let axios = this.v2Axios();
    let response = await axios.put(`/systemgroups/${groupId}`, data);
    return response.data;
  }

  async deleteSystemGroup(groupId: string): Promise<void> {
    let axios = this.v2Axios();
    await axios.delete(`/systemgroups/${groupId}`);
  }

  async listSystemGroupMembers(
    groupId: string,
    params?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<Array<{ to: { id: string; type: string } }>> {
    let axios = this.v2Axios();
    let response = await axios.get(`/systemgroups/${groupId}/members`, {
      params: {
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0
      }
    });
    return response.data;
  }

  async manageSystemGroupMembers(
    groupId: string,
    body: {
      op: 'add' | 'remove';
      type: 'system';
      id: string;
    }
  ): Promise<void> {
    let axios = this.v2Axios();
    await axios.post(`/systemgroups/${groupId}/members`, body);
  }

  async manageSystemGroupAssociations(
    groupId: string,
    body: AssociationRequest
  ): Promise<void> {
    let axios = this.v2Axios();
    await axios.post(`/systemgroups/${groupId}/associations`, body);
  }

  // ==================== Commands ====================

  async listCommands(params?: {
    limit?: number;
    skip?: number;
    sort?: string;
    filter?: string;
    fields?: string;
  }): Promise<PaginatedResponse<JumpCloudCommand>> {
    let axios = this.v1Axios();
    let response = await axios.get('/commands', {
      params: {
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0,
        sort: params?.sort ?? '_id',
        filter: params?.filter,
        fields: params?.fields
      }
    });
    return {
      results: response.data.results ?? response.data,
      totalCount: response.data.totalCount ?? 0
    };
  }

  async getCommand(commandId: string): Promise<JumpCloudCommand> {
    let axios = this.v1Axios();
    let response = await axios.get(`/commands/${commandId}`);
    return response.data;
  }

  async createCommand(data: {
    name: string;
    command: string;
    commandType: string;
    user?: string;
    sudo?: boolean;
    schedule?: string;
    scheduleRepeatType?: string;
    launchType?: string;
    trigger?: string;
    timeout?: string;
    shell?: string;
    systems?: string[];
    [key: string]: any;
  }): Promise<JumpCloudCommand> {
    let axios = this.v1Axios();
    let response = await axios.post('/commands', data);
    return response.data;
  }

  async updateCommand(
    commandId: string,
    data: Record<string, any>
  ): Promise<JumpCloudCommand> {
    let axios = this.v1Axios();
    let response = await axios.put(`/commands/${commandId}`, data);
    return response.data;
  }

  async deleteCommand(commandId: string): Promise<void> {
    let axios = this.v1Axios();
    await axios.delete(`/commands/${commandId}`);
  }

  async runCommandByTrigger(triggerName: string, data?: Record<string, any>): Promise<any> {
    let axios = this.v1Axios();
    let response = await axios.post(`/command/trigger/${triggerName}`, data ?? {});
    return response.data;
  }

  async listCommandResults(params?: {
    limit?: number;
    skip?: number;
    sort?: string;
    filter?: string;
  }): Promise<PaginatedResponse<JumpCloudCommandResult>> {
    let axios = this.v1Axios();
    let response = await axios.get('/commandresults', {
      params: {
        limit: params?.limit ?? 50,
        skip: params?.skip ?? 0,
        sort: params?.sort ?? '-requestTime',
        filter: params?.filter
      }
    });
    return {
      results: response.data.results ?? response.data,
      totalCount: response.data.totalCount ?? 0
    };
  }

  async getCommandResult(resultId: string): Promise<JumpCloudCommandResult> {
    let axios = this.v1Axios();
    let response = await axios.get(`/commandresults/${resultId}`);
    return response.data;
  }

  // ==================== Applications ====================

  async listApplications(params?: {
    limit?: number;
    skip?: number;
    sort?: string;
    filter?: string;
  }): Promise<PaginatedResponse<JumpCloudApplication>> {
    let axios = this.v1Axios();
    let response = await axios.get('/applications', {
      params: {
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0,
        sort: params?.sort ?? '_id',
        filter: params?.filter
      }
    });
    return {
      results: response.data.results ?? response.data,
      totalCount: response.data.totalCount ?? 0
    };
  }

  async getApplication(appId: string): Promise<JumpCloudApplication> {
    let axios = this.v1Axios();
    let response = await axios.get(`/applications/${appId}`);
    return response.data;
  }

  // ==================== Graph Associations ====================

  async getUserAssociations(
    userId: string,
    targets: string,
    params?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<Association[]> {
    let axios = this.v2Axios();
    let response = await axios.get(`/users/${userId}/associations`, {
      params: {
        targets,
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0
      }
    });
    return response.data;
  }

  async manageUserAssociations(userId: string, body: AssociationRequest): Promise<void> {
    let axios = this.v2Axios();
    await axios.post(`/users/${userId}/associations`, body);
  }

  async getSystemAssociations(
    systemId: string,
    targets: string,
    params?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<Association[]> {
    let axios = this.v2Axios();
    let response = await axios.get(`/systems/${systemId}/associations`, {
      params: {
        targets,
        limit: params?.limit ?? 100,
        skip: params?.skip ?? 0
      }
    });
    return response.data;
  }

  async manageSystemAssociations(systemId: string, body: AssociationRequest): Promise<void> {
    let axios = this.v2Axios();
    await axios.post(`/systems/${systemId}/associations`, body);
  }

  // ==================== Directory Insights (Events) ====================

  async queryEvents(params: {
    service: string[];
    startTime: string;
    endTime?: string;
    limit?: number;
    searchAfter?: any;
    sort?: string;
    searchTermAnd?: Record<string, any>;
    searchTermOr?: Record<string, any>;
    q?: string;
  }): Promise<{ events: JumpCloudEvent[]; searchAfter?: any }> {
    let axios = this.insightsAxios();
    let body: Record<string, any> = {
      service: params.service,
      start_time: params.startTime,
      limit: params.limit ?? 100
    };
    if (params.endTime) body.end_time = params.endTime;
    if (params.searchAfter) body.search_after = params.searchAfter;
    if (params.sort) body.sort = params.sort;
    if (params.searchTermAnd) body.search_term_and = params.searchTermAnd;
    if (params.searchTermOr) body.search_term_or = params.searchTermOr;
    if (params.q) body.q = params.q;

    let response = await axios.post('/events', body);
    let searchAfterHeader = response.headers?.['x-search_after'];
    let searchAfterValue: any;
    if (searchAfterHeader) {
      try {
        searchAfterValue = JSON.parse(searchAfterHeader);
      } catch {
        searchAfterValue = searchAfterHeader;
      }
    }

    return {
      events: response.data ?? [],
      searchAfter: searchAfterValue
    };
  }

  // ==================== Organizations ====================

  async getOrganization(orgId: string): Promise<any> {
    let axios = this.v1Axios();
    let response = await axios.get(`/organizations/${orgId}`);
    return response.data;
  }

  async listOrganizations(): Promise<any[]> {
    let axios = this.v1Axios();
    let response = await axios.get('/organizations');
    return response.data.results ?? response.data;
  }
}
