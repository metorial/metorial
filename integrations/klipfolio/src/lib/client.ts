import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.klipfolio.com/api/1.0'
    });
  }

  private get headers() {
    return {
      'kf-api-key': this.config.token,
      'Content-Type': 'application/json'
    };
  }

  // ── Profile ──

  async getProfile(full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get('/profile', { headers: this.headers, params });
    return response.data?.data;
  }

  // ── Clients ──

  async listClients(opts?: {
    status?: string;
    externalId?: string;
    full?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.status) params.status = opts.status;
    if (opts?.externalId) params.external_id = opts.externalId;
    if (opts?.full) params.full = 'true';
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/clients', { headers: this.headers, params });
    return response.data;
  }

  async getClient(clientId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/clients/${clientId}`, {
      headers: this.headers,
      params
    });
    return response.data?.data;
  }

  async createClient(data: {
    name: string;
    description?: string;
    status?: string;
    seats?: number;
    externalId?: string;
  }) {
    let body: Record<string, any> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.status !== undefined) body.status = data.status;
    if (data.seats !== undefined) body.seats = data.seats;
    if (data.externalId !== undefined) body.external_id = data.externalId;
    let response = await this.axios.post('/clients', body, { headers: this.headers });
    return response.data;
  }

  async updateClient(
    clientId: string,
    data: {
      name?: string;
      description?: string;
      status?: string;
      seats?: number;
      externalId?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.status !== undefined) body.status = data.status;
    if (data.seats !== undefined) body.seats = data.seats;
    if (data.externalId !== undefined) body.external_id = data.externalId;
    let response = await this.axios.put(`/clients/${clientId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteClient(clientId: string) {
    let response = await this.axios.delete(`/clients/${clientId}`, { headers: this.headers });
    return response.data;
  }

  // ── Tabs (Dashboards) ──

  async listTabs(opts?: {
    clientId?: string;
    full?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.full) params.full = 'true';
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/tabs', { headers: this.headers, params });
    return response.data;
  }

  async getTab(tabId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/tabs/${tabId}`, { headers: this.headers, params });
    return response.data?.data;
  }

  async createTab(data: { name: string; description?: string; clientId?: string }) {
    let body: Record<string, any> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    let response = await this.axios.post('/tabs', body, { headers: this.headers });
    return response.data;
  }

  async updateTab(tabId: string, data: { name?: string; description?: string }) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    let response = await this.axios.put(`/tabs/${tabId}`, body, { headers: this.headers });
    return response.data;
  }

  async deleteTab(tabId: string) {
    let response = await this.axios.delete(`/tabs/${tabId}`, { headers: this.headers });
    return response.data;
  }

  // ── Tab Sub-Resources ──

  async getTabShareRights(tabId: string) {
    let response = await this.axios.get(`/tabs/${tabId}/share-rights`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async updateTabShareRights(
    tabId: string,
    groups: Array<{ groupId: string; canEdit: boolean }>
  ) {
    let body = { groups: groups.map(g => ({ group_id: g.groupId, can_edit: g.canEdit })) };
    let response = await this.axios.put(`/tabs/${tabId}/share-rights`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteTabShareRight(tabId: string, groupId: string) {
    let response = await this.axios.delete(`/tabs/${tabId}/share-rights/${groupId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getTabKlipInstances(tabId: string) {
    let response = await this.axios.get(`/tabs/${tabId}/klip-instances`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async addKlipsToTab(
    tabId: string,
    klips: Array<{ klipId: string; region?: number; position?: number }>
  ) {
    let body = {
      klips: klips.map(k => ({ klip_id: k.klipId, region: k.region, position: k.position }))
    };
    let response = await this.axios.put(`/tabs/${tabId}/klip-instances`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async removeKlipFromTab(tabId: string, instanceId: string) {
    let response = await this.axios.delete(`/tabs/${tabId}/klip-instances/${instanceId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getTabLayout(tabId: string) {
    let response = await this.axios.get(`/tabs/${tabId}/layout`, { headers: this.headers });
    return response.data?.data;
  }

  async updateTabLayout(tabId: string, layout: { type: string; state: Record<string, any> }) {
    let response = await this.axios.put(`/tabs/${tabId}/layout`, layout, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Klips ──

  async listKlips(opts?: {
    clientId?: string;
    datasourceId?: string;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.datasourceId) params.datasource_id = opts.datasourceId;
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/klips', { headers: this.headers, params });
    return response.data;
  }

  async getKlip(klipId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/klips/${klipId}`, { headers: this.headers, params });
    return response.data?.data;
  }

  async createKlip(data: {
    name: string;
    description?: string;
    clientId?: string;
    schema?: any;
  }) {
    let body: Record<string, any> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    if (data.schema !== undefined) body.schema = data.schema;
    let response = await this.axios.post('/klips', body, { headers: this.headers });
    return response.data;
  }

  async updateKlip(klipId: string, data: { name?: string; description?: string }) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    let response = await this.axios.put(`/klips/${klipId}`, body, { headers: this.headers });
    return response.data;
  }

  async deleteKlip(klipId: string) {
    let response = await this.axios.delete(`/klips/${klipId}`, { headers: this.headers });
    return response.data;
  }

  async getKlipSchema(klipId: string) {
    let response = await this.axios.get(`/klips/${klipId}/schema`, { headers: this.headers });
    return response.data?.data;
  }

  async updateKlipSchema(klipId: string, schema: any) {
    let response = await this.axios.put(`/klips/${klipId}/schema`, schema, {
      headers: this.headers
    });
    return response.data;
  }

  async getKlipShareRights(klipId: string) {
    let response = await this.axios.get(`/klips/${klipId}/share-rights`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  // ── Data Sources ──

  async listDatasources(opts?: {
    clientId?: string;
    full?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.full) params.full = 'true';
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/datasources', { headers: this.headers, params });
    return response.data;
  }

  async getDatasource(datasourceId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/datasources/${datasourceId}`, {
      headers: this.headers,
      params
    });
    return response.data?.data;
  }

  async createDatasource(data: {
    name: string;
    description?: string;
    connector: string;
    format?: string;
    refreshInterval?: number;
    properties?: Record<string, any>;
    clientId?: string;
  }) {
    let body: Record<string, any> = {
      name: data.name,
      connector: data.connector
    };
    if (data.description !== undefined) body.description = data.description;
    if (data.format !== undefined) body.format = data.format;
    if (data.refreshInterval !== undefined) body.refresh_interval = data.refreshInterval;
    if (data.properties !== undefined) body.properties = data.properties;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    let response = await this.axios.post('/datasources', body, { headers: this.headers });
    return response.data;
  }

  async updateDatasource(
    datasourceId: string,
    data: { name?: string; description?: string; refreshInterval?: number }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.refreshInterval !== undefined) body.refresh_interval = data.refreshInterval;
    let response = await this.axios.put(`/datasources/${datasourceId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteDatasource(datasourceId: string) {
    let response = await this.axios.delete(`/datasources/${datasourceId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async refreshDatasources(datasourceIds: string[]) {
    let body = { datasources: datasourceIds };
    let response = await this.axios.post('/datasources/@/refresh', body, {
      headers: this.headers
    });
    return response.data;
  }

  async enableDatasource(datasourceId: string) {
    let response = await this.axios.post(
      `/datasources/${datasourceId}/@/enable`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async disableDatasource(datasourceId: string) {
    let response = await this.axios.post(
      `/datasources/${datasourceId}/@/disable`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async getDatasourceProperties(datasourceId: string) {
    let response = await this.axios.get(`/datasources/${datasourceId}/properties`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async updateDatasourceProperties(datasourceId: string, properties: Record<string, any>) {
    let response = await this.axios.put(
      `/datasources/${datasourceId}/properties`,
      properties,
      { headers: this.headers }
    );
    return response.data;
  }

  async getDatasourceShareRights(datasourceId: string) {
    let response = await this.axios.get(`/datasources/${datasourceId}/share-rights`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async updateDatasourceShareRights(
    datasourceId: string,
    shareRights: {
      users?: Array<{ userId: string; canEdit: boolean }>;
      groups?: Array<{ groupId: string; canEdit: boolean }>;
    }
  ) {
    let body: Record<string, any> = {};
    if (shareRights.users) {
      body.users = shareRights.users.map(u => ({ user_id: u.userId, can_edit: u.canEdit }));
    }
    if (shareRights.groups) {
      body.groups = shareRights.groups.map(g => ({
        group_id: g.groupId,
        can_edit: g.canEdit
      }));
    }
    let response = await this.axios.put(`/datasources/${datasourceId}/share-rights`, body, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Data Source Instances ──

  async listDatasourceInstances(opts?: {
    clientId?: string;
    datasourceId?: string;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.datasourceId) params.datasource_id = opts.datasourceId;
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/datasource-instances', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getDatasourceInstance(instanceId: string) {
    let response = await this.axios.get(`/datasource-instances/${instanceId}`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async getDatasourceInstanceData(instanceId: string) {
    let response = await this.axios.get(`/datasource-instances/${instanceId}/data`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async refreshDatasourceInstance(instanceId: string) {
    let response = await this.axios.post(
      `/datasource-instances/${instanceId}/@/refresh`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  // ── Users ──

  async listUsers(opts?: {
    clientId?: string;
    email?: string;
    full?: boolean;
    includeRoles?: boolean;
    includeGroups?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.email) params.email = opts.email;
    if (opts?.full) params.full = 'true';
    if (opts?.includeRoles) params.include_roles = 'true';
    if (opts?.includeGroups) params.include_groups = 'true';
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/users', { headers: this.headers, params });
    return response.data;
  }

  async getUser(userId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/users/${userId}`, { headers: this.headers, params });
    return response.data?.data;
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    roles?: string[];
    password?: string;
    externalId?: string;
    clientId?: string;
    sendEmail?: boolean;
  }) {
    let params: Record<string, string> = {};
    if (data.sendEmail) params.send_email = 'true';
    let body: Record<string, any> = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email
    };
    if (data.roles !== undefined) body.roles = data.roles;
    if (data.password !== undefined) body.password = data.password;
    if (data.externalId !== undefined) body.external_id = data.externalId;
    if (data.clientId !== undefined) body.client_id = data.clientId;
    let response = await this.axios.post('/users', body, { headers: this.headers, params });
    return response.data;
  }

  async updateUser(
    userId: string,
    data: { firstName?: string; lastName?: string; email?: string; externalId?: string }
  ) {
    let body: Record<string, any> = {};
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.email !== undefined) body.email = data.email;
    if (data.externalId !== undefined) body.external_id = data.externalId;
    let response = await this.axios.put(`/users/${userId}`, body, { headers: this.headers });
    return response.data;
  }

  async deleteUser(userId: string) {
    let response = await this.axios.delete(`/users/${userId}`, { headers: this.headers });
    return response.data;
  }

  async getUserGroups(userId: string) {
    let response = await this.axios.get(`/users/${userId}/groups`, { headers: this.headers });
    return response.data?.data;
  }

  async addUserToGroup(userId: string, groupId: string) {
    let response = await this.axios.put(
      `/users/${userId}/groups/${groupId}`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async removeUserFromGroup(userId: string, groupId: string) {
    let response = await this.axios.delete(`/users/${userId}/groups/${groupId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getUserTabInstances(userId: string) {
    let response = await this.axios.get(`/users/${userId}/tab-instances`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async addTabsToUser(userId: string, tabIds: string[]) {
    let body = { tab_ids: tabIds };
    let response = await this.axios.put(`/users/${userId}/tab-instances`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async removeTabFromUser(userId: string, tabInstanceId: string) {
    let response = await this.axios.delete(`/users/${userId}/tab-instances/${tabInstanceId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Roles ──

  async listRoles(opts?: {
    clientId?: string;
    full?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.full) params.full = 'true';
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/roles', { headers: this.headers, params });
    return response.data;
  }

  async getRole(roleId: string, full?: boolean) {
    let params: Record<string, string> = {};
    if (full) params.full = 'true';
    let response = await this.axios.get(`/roles/${roleId}`, { headers: this.headers, params });
    return response.data?.data;
  }

  async createRole(data: { name: string; description?: string; permissions?: string[] }) {
    let body: Record<string, any> = { name: data.name };
    if (data.description !== undefined) body.description = data.description;
    if (data.permissions !== undefined) body.permissions = data.permissions;
    let response = await this.axios.post('/roles', body, { headers: this.headers });
    return response.data;
  }

  async updateRole(
    roleId: string,
    data: { name?: string; description?: string; permissions?: string[] }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.permissions !== undefined) body.permissions = data.permissions;
    let response = await this.axios.put(`/roles/${roleId}`, body, { headers: this.headers });
    return response.data;
  }

  async deleteRole(roleId: string) {
    let response = await this.axios.delete(`/roles/${roleId}`, { headers: this.headers });
    return response.data;
  }

  async getRolePermissions(roleId: string) {
    let response = await this.axios.get(`/roles/${roleId}/permissions`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async updateRolePermissions(roleId: string, permissions: Record<string, any>) {
    let response = await this.axios.put(`/roles/${roleId}/permissions`, permissions, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Groups ──

  async getGroupUsers(groupId: string) {
    let response = await this.axios.get(`/groups/${groupId}/users`, { headers: this.headers });
    return response.data?.data;
  }

  async addUserToGroupDirect(groupId: string, userId: string) {
    let response = await this.axios.put(
      `/groups/${groupId}/users/${userId}`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async removeUserFromGroupDirect(groupId: string, userId: string) {
    let response = await this.axios.delete(`/groups/${groupId}/users/${userId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getGroupDefaultTabs(groupId: string) {
    let response = await this.axios.get(`/groups/${groupId}/default-tabs`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async addGroupDefaultTab(
    groupId: string,
    data: { tabId: string; canEdit?: boolean; visibility?: string; index?: number }
  ) {
    let body: Record<string, any> = { tab_id: data.tabId };
    if (data.canEdit !== undefined) body.can_edit = data.canEdit;
    if (data.visibility !== undefined) body.visibility = data.visibility;
    if (data.index !== undefined) body.index = data.index;
    let response = await this.axios.post(`/groups/${groupId}/default-tabs`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateGroupDefaultTab(
    groupId: string,
    defaultTabId: string,
    data: { canEdit?: boolean; visibility?: string; index?: number }
  ) {
    let body: Record<string, any> = {};
    if (data.canEdit !== undefined) body.can_edit = data.canEdit;
    if (data.visibility !== undefined) body.visibility = data.visibility;
    if (data.index !== undefined) body.index = data.index;
    let response = await this.axios.put(
      `/groups/${groupId}/default-tabs/${defaultTabId}`,
      body,
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteGroupDefaultTab(groupId: string, defaultTabId: string) {
    let response = await this.axios.delete(`/groups/${groupId}/default-tabs/${defaultTabId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Published Links ──

  async listPublishedLinks(opts?: {
    clientId?: string;
    dashboardId?: string;
    limit?: number;
    offset?: number;
  }) {
    let params: Record<string, string> = {};
    if (opts?.clientId) params.client_id = opts.clientId;
    if (opts?.dashboardId) params.dashboard_id = opts.dashboardId;
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    if (opts?.offset !== undefined) params.offset = String(opts.offset);
    let response = await this.axios.get('/dashboard-published-links', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getPublishedLink(linkId: string) {
    let response = await this.axios.get(`/dashboard-published-links/${linkId}`, {
      headers: this.headers
    });
    return response.data?.data;
  }

  async createPublishedLink(
    dashboardId: string,
    data: {
      name?: string;
      password?: string;
      description?: string;
      isPublic?: boolean;
      theme?: string;
      logo?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.password !== undefined) body.password = data.password;
    if (data.description !== undefined) body.description = data.description;
    if (data.isPublic !== undefined) body.isPublic = data.isPublic;
    if (data.theme !== undefined) body.theme = data.theme;
    if (data.logo !== undefined) body.logo = data.logo;
    let response = await this.axios.post(`/dashboard-published-links/${dashboardId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async updatePublishedLink(
    linkId: string,
    data: {
      name?: string;
      password?: string;
      description?: string;
      isPublic?: boolean;
      theme?: string;
      logo?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.password !== undefined) body.password = data.password;
    if (data.description !== undefined) body.description = data.description;
    if (data.isPublic !== undefined) body.isPublic = data.isPublic;
    if (data.theme !== undefined) body.theme = data.theme;
    if (data.logo !== undefined) body.logo = data.logo;
    let response = await this.axios.put(`/dashboard-published-links/${linkId}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deletePublishedLink(linkId: string) {
    let response = await this.axios.delete(`/dashboard-published-links/${linkId}`, {
      headers: this.headers
    });
    return response.data;
  }
}
