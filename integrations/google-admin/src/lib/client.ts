import { createAxios } from 'slates';

let directoryApi = createAxios({
  baseURL: 'https://admin.googleapis.com/admin/directory/v1'
});

let reportsApi = createAxios({
  baseURL: 'https://admin.googleapis.com/admin/reports/v1'
});

let alertCenterApi = createAxios({
  baseURL: 'https://alertcenter.googleapis.com/v1beta1'
});

let groupsSettingsApi = createAxios({
  baseURL: 'https://www.googleapis.com/groups/v1/groups'
});

let licensingApi = createAxios({
  baseURL: 'https://licensing.googleapis.com/apps/licensing/v1/product'
});

let dataTransferApi = createAxios({
  baseURL: 'https://admin.googleapis.com/admin/datatransfer/v1'
});

let mapUserOrderBy = (orderBy?: string) => {
  switch (orderBy) {
    case 'email':
      return 'EMAIL';
    case 'familyName':
      return 'FAMILY_NAME';
    case 'givenName':
      return 'GIVEN_NAME';
    default:
      return orderBy;
  }
};

let mapGroupOrderBy = (orderBy?: string) => {
  switch (orderBy) {
    case 'email':
      return 'EMAIL';
    default:
      return orderBy;
  }
};

export class Client {
  private headers: Record<string, string>;
  private customerId: string;

  constructor(
    private config: {
      token: string;
      customerId?: string;
      domain?: string;
    }
  ) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
    this.customerId = config.customerId || 'my_customer';
  }

  // ==================== USERS ====================

  async listUsers(
    params: {
      domain?: string;
      query?: string;
      maxResults?: number;
      pageToken?: string;
      orderBy?: string;
      sortOrder?: string;
      showDeleted?: boolean;
      projection?: string;
    } = {}
  ) {
    let response = await directoryApi.get('/users', {
      headers: this.headers,
      params: {
        customer: !params.domain ? this.customerId : undefined,
        domain: params.domain || this.config.domain,
        query: params.query,
        maxResults: params.maxResults || 100,
        pageToken: params.pageToken,
        orderBy: mapUserOrderBy(params.orderBy),
        sortOrder: params.sortOrder,
        showDeleted: params.showDeleted ? 'true' : undefined,
        projection: params.projection || 'full'
      }
    });
    return response.data;
  }

  async getUser(userKey: string) {
    let response = await directoryApi.get(`/users/${encodeURIComponent(userKey)}`, {
      headers: this.headers,
      params: { projection: 'full' }
    });
    return response.data;
  }

  async createUser(userData: {
    primaryEmail: string;
    name: { givenName: string; familyName: string };
    password?: string;
    orgUnitPath?: string;
    suspended?: boolean;
    changePasswordAtNextLogin?: boolean;
    phones?: Array<{ value: string; type: string; primary?: boolean }>;
    addresses?: Array<{
      type: string;
      formatted?: string;
      streetAddress?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      primary?: boolean;
    }>;
    organizations?: Array<{
      name?: string;
      title?: string;
      department?: string;
      primary?: boolean;
    }>;
    recoveryEmail?: string;
    recoveryPhone?: string;
  }) {
    let response = await directoryApi.post('/users', userData, {
      headers: this.headers
    });
    return response.data;
  }

  async updateUser(userKey: string, userData: Record<string, any>) {
    let response = await directoryApi.patch(
      `/users/${encodeURIComponent(userKey)}`,
      userData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteUser(userKey: string) {
    await directoryApi.delete(`/users/${encodeURIComponent(userKey)}`, {
      headers: this.headers
    });
  }

  async undeleteUser(userKey: string, orgUnitPath?: string) {
    await directoryApi.post(
      `/users/${encodeURIComponent(userKey)}/undelete`,
      {
        orgUnitPath: orgUnitPath || '/'
      },
      {
        headers: this.headers
      }
    );
  }

  async makeUserAdmin(userKey: string, isAdmin: boolean) {
    await directoryApi.post(
      `/users/${encodeURIComponent(userKey)}/makeAdmin`,
      {
        status: isAdmin
      },
      {
        headers: this.headers
      }
    );
  }

  // ==================== USER ALIASES ====================

  async listUserAliases(userKey: string) {
    let response = await directoryApi.get(`/users/${encodeURIComponent(userKey)}/aliases`, {
      headers: this.headers
    });
    return response.data;
  }

  async createUserAlias(userKey: string, alias: string) {
    let response = await directoryApi.post(
      `/users/${encodeURIComponent(userKey)}/aliases`,
      {
        alias
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteUserAlias(userKey: string, alias: string) {
    await directoryApi.delete(
      `/users/${encodeURIComponent(userKey)}/aliases/${encodeURIComponent(alias)}`,
      {
        headers: this.headers
      }
    );
  }

  // ==================== GROUPS ====================

  async listGroups(
    params: {
      domain?: string;
      userKey?: string;
      query?: string;
      maxResults?: number;
      pageToken?: string;
      orderBy?: string;
      sortOrder?: string;
    } = {}
  ) {
    let response = await directoryApi.get('/groups', {
      headers: this.headers,
      params: {
        customer: !params.domain && !params.userKey ? this.customerId : undefined,
        domain: params.domain || this.config.domain,
        userKey: params.userKey,
        query: params.query,
        maxResults: params.maxResults || 200,
        pageToken: params.pageToken,
        orderBy: mapGroupOrderBy(params.orderBy),
        sortOrder: params.sortOrder
      }
    });
    return response.data;
  }

  async getGroup(groupKey: string) {
    let response = await directoryApi.get(`/groups/${encodeURIComponent(groupKey)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createGroup(groupData: { email: string; name?: string; description?: string }) {
    let response = await directoryApi.post('/groups', groupData, {
      headers: this.headers
    });
    return response.data;
  }

  async updateGroup(groupKey: string, groupData: Record<string, any>) {
    let response = await directoryApi.put(
      `/groups/${encodeURIComponent(groupKey)}`,
      groupData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteGroup(groupKey: string) {
    await directoryApi.delete(`/groups/${encodeURIComponent(groupKey)}`, {
      headers: this.headers
    });
  }

  // ==================== GROUP MEMBERS ====================

  async listGroupMembers(
    groupKey: string,
    params: {
      maxResults?: number;
      pageToken?: string;
      roles?: string;
    } = {}
  ) {
    let response = await directoryApi.get(`/groups/${encodeURIComponent(groupKey)}/members`, {
      headers: this.headers,
      params: {
        maxResults: params.maxResults || 200,
        pageToken: params.pageToken,
        roles: params.roles
      }
    });
    return response.data;
  }

  async addGroupMember(
    groupKey: string,
    memberData: {
      email: string;
      role?: string;
      type?: string;
    }
  ) {
    let response = await directoryApi.post(
      `/groups/${encodeURIComponent(groupKey)}/members`,
      memberData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateGroupMember(groupKey: string, memberKey: string, memberData: { role: string }) {
    let response = await directoryApi.put(
      `/groups/${encodeURIComponent(groupKey)}/members/${encodeURIComponent(memberKey)}`,
      memberData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async removeGroupMember(groupKey: string, memberKey: string) {
    await directoryApi.delete(
      `/groups/${encodeURIComponent(groupKey)}/members/${encodeURIComponent(memberKey)}`,
      {
        headers: this.headers
      }
    );
  }

  // ==================== GROUP SETTINGS ====================

  async getGroupSettings(groupEmail: string) {
    let response = await groupsSettingsApi.get(`/${encodeURIComponent(groupEmail)}`, {
      headers: this.headers,
      params: { alt: 'json' }
    });
    return response.data;
  }

  async updateGroupSettings(groupEmail: string, settings: Record<string, any>) {
    let response = await groupsSettingsApi.put(
      `/${encodeURIComponent(groupEmail)}`,
      settings,
      {
        headers: this.headers,
        params: { alt: 'json' }
      }
    );
    return response.data;
  }

  // ==================== ORG UNITS ====================

  async listOrgUnits(params: { orgUnitPath?: string; type?: string } = {}) {
    let response = await directoryApi.get(`/customer/${this.customerId}/orgunits`, {
      headers: this.headers,
      params: {
        orgUnitPath: params.orgUnitPath,
        type: params.type || 'all'
      }
    });
    return response.data;
  }

  async getOrgUnit(orgUnitPath: string) {
    let encodedPath = orgUnitPath.startsWith('/') ? orgUnitPath.substring(1) : orgUnitPath;
    let response = await directoryApi.get(
      `/customer/${this.customerId}/orgunits/${encodeURIComponent(encodedPath)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async createOrgUnit(orgUnitData: {
    name: string;
    parentOrgUnitPath?: string;
    description?: string;
    blockInheritance?: boolean;
  }) {
    let response = await directoryApi.post(
      `/customer/${this.customerId}/orgunits`,
      orgUnitData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateOrgUnit(orgUnitPath: string, orgUnitData: Record<string, any>) {
    let encodedPath = orgUnitPath.startsWith('/') ? orgUnitPath.substring(1) : orgUnitPath;
    let response = await directoryApi.put(
      `/customer/${this.customerId}/orgunits/${encodeURIComponent(encodedPath)}`,
      orgUnitData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteOrgUnit(orgUnitPath: string) {
    let encodedPath = orgUnitPath.startsWith('/') ? orgUnitPath.substring(1) : orgUnitPath;
    await directoryApi.delete(
      `/customer/${this.customerId}/orgunits/${encodeURIComponent(encodedPath)}`,
      {
        headers: this.headers
      }
    );
  }

  // ==================== ROLES ====================

  async listRoles(params: { maxResults?: number; pageToken?: string } = {}) {
    let response = await directoryApi.get(`/customer/${this.customerId}/roles`, {
      headers: this.headers,
      params: {
        maxResults: params.maxResults || 100,
        pageToken: params.pageToken
      }
    });
    return response.data;
  }

  async getRole(roleId: string) {
    let response = await directoryApi.get(`/customer/${this.customerId}/roles/${roleId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createRole(roleData: {
    roleName: string;
    roleDescription?: string;
    rolePrivileges: Array<{ privilegeName: string; serviceId: string }>;
  }) {
    let response = await directoryApi.post(`/customer/${this.customerId}/roles`, roleData, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteRole(roleId: string) {
    await directoryApi.delete(`/customer/${this.customerId}/roles/${roleId}`, {
      headers: this.headers
    });
  }

  async listRoleAssignments(
    params: { userKey?: string; roleId?: string; maxResults?: number; pageToken?: string } = {}
  ) {
    let response = await directoryApi.get(`/customer/${this.customerId}/roleassignments`, {
      headers: this.headers,
      params: {
        userKey: params.userKey,
        roleId: params.roleId,
        maxResults: params.maxResults || 100,
        pageToken: params.pageToken
      }
    });
    return response.data;
  }

  async createRoleAssignment(assignmentData: {
    roleId: string;
    assignedTo: string;
    scopeType?: string;
    orgUnitId?: string;
  }) {
    let response = await directoryApi.post(
      `/customer/${this.customerId}/roleassignments`,
      assignmentData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteRoleAssignment(roleAssignmentId: string) {
    await directoryApi.delete(
      `/customer/${this.customerId}/roleassignments/${roleAssignmentId}`,
      {
        headers: this.headers
      }
    );
  }

  // ==================== CHROMEOS DEVICES ====================

  async listChromeOsDevices(
    params: {
      query?: string;
      maxResults?: number;
      pageToken?: string;
      orderBy?: string;
      sortOrder?: string;
      orgUnitPath?: string;
      projection?: string;
    } = {}
  ) {
    let response = await directoryApi.get(`/customer/${this.customerId}/devices/chromeos`, {
      headers: this.headers,
      params: {
        query: params.query,
        maxResults: params.maxResults || 100,
        pageToken: params.pageToken,
        orderBy: params.orderBy,
        sortOrder: params.sortOrder,
        orgUnitPath: params.orgUnitPath,
        projection: params.projection || 'FULL'
      }
    });
    return response.data;
  }

  async getChromeOsDevice(deviceId: string) {
    let response = await directoryApi.get(
      `/customer/${this.customerId}/devices/chromeos/${deviceId}`,
      {
        headers: this.headers,
        params: { projection: 'FULL' }
      }
    );
    return response.data;
  }

  async updateChromeOsDevice(deviceId: string, deviceData: Record<string, any>) {
    let response = await directoryApi.put(
      `/customer/${this.customerId}/devices/chromeos/${deviceId}`,
      deviceData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async performChromeOsDeviceAction(deviceId: string, action: string) {
    await directoryApi.post(
      `/customer/${this.customerId}/devices/chromeos/${deviceId}/action`,
      {
        action
      },
      {
        headers: this.headers
      }
    );
  }

  // ==================== MOBILE DEVICES ====================

  async listMobileDevices(
    params: {
      query?: string;
      maxResults?: number;
      pageToken?: string;
      orderBy?: string;
      sortOrder?: string;
      projection?: string;
    } = {}
  ) {
    let response = await directoryApi.get(`/customer/${this.customerId}/devices/mobile`, {
      headers: this.headers,
      params: {
        query: params.query,
        maxResults: params.maxResults || 100,
        pageToken: params.pageToken,
        orderBy: params.orderBy,
        sortOrder: params.sortOrder,
        projection: params.projection || 'FULL'
      }
    });
    return response.data;
  }

  async getMobileDevice(resourceId: string) {
    let response = await directoryApi.get(
      `/customer/${this.customerId}/devices/mobile/${resourceId}`,
      {
        headers: this.headers,
        params: { projection: 'FULL' }
      }
    );
    return response.data;
  }

  async performMobileDeviceAction(resourceId: string, action: string) {
    await directoryApi.post(
      `/customer/${this.customerId}/devices/mobile/${resourceId}/action`,
      {
        action
      },
      {
        headers: this.headers
      }
    );
  }

  async deleteMobileDevice(resourceId: string) {
    await directoryApi.delete(`/customer/${this.customerId}/devices/mobile/${resourceId}`, {
      headers: this.headers
    });
  }

  // ==================== DOMAINS ====================

  async listDomains() {
    let response = await directoryApi.get(`/customer/${this.customerId}/domains`, {
      headers: this.headers
    });
    return response.data;
  }

  async getDomain(domainName: string) {
    let response = await directoryApi.get(
      `/customer/${this.customerId}/domains/${domainName}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async addDomain(domainName: string) {
    let response = await directoryApi.post(
      `/customer/${this.customerId}/domains`,
      {
        domainName
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteDomain(domainName: string) {
    await directoryApi.delete(`/customer/${this.customerId}/domains/${domainName}`, {
      headers: this.headers
    });
  }

  // ==================== CUSTOMER ====================

  async getCustomer() {
    let response = await directoryApi.get(`/customers/${this.customerId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateCustomer(customerData: Record<string, any>) {
    let response = await directoryApi.put(`/customers/${this.customerId}`, customerData, {
      headers: this.headers
    });
    return response.data;
  }

  // ==================== CALENDAR RESOURCES ====================

  async listCalendarResources(
    params: { maxResults?: number; pageToken?: string; query?: string; orderBy?: string } = {}
  ) {
    let response = await directoryApi.get(`/customer/${this.customerId}/resources/calendars`, {
      headers: this.headers,
      params: {
        maxResults: params.maxResults || 100,
        pageToken: params.pageToken,
        query: params.query,
        orderBy: params.orderBy
      }
    });
    return response.data;
  }

  async getCalendarResource(resourceId: string) {
    let response = await directoryApi.get(
      `/customer/${this.customerId}/resources/calendars/${resourceId}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async createCalendarResource(resourceData: {
    resourceId: string;
    resourceName: string;
    resourceType?: string;
    resourceDescription?: string;
    buildingId?: string;
    floorName?: string;
    capacity?: number;
  }) {
    let response = await directoryApi.post(
      `/customer/${this.customerId}/resources/calendars`,
      resourceData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateCalendarResource(resourceId: string, resourceData: Record<string, any>) {
    let response = await directoryApi.put(
      `/customer/${this.customerId}/resources/calendars/${resourceId}`,
      resourceData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteCalendarResource(resourceId: string) {
    await directoryApi.delete(
      `/customer/${this.customerId}/resources/calendars/${resourceId}`,
      {
        headers: this.headers
      }
    );
  }

  // ==================== BUILDINGS ====================

  async listBuildings(params: { maxResults?: number; pageToken?: string } = {}) {
    let response = await directoryApi.get(`/customer/${this.customerId}/resources/buildings`, {
      headers: this.headers,
      params: {
        maxResults: params.maxResults || 100,
        pageToken: params.pageToken
      }
    });
    return response.data;
  }

  // ==================== REPORTS - ACTIVITIES ====================

  async listActivities(params: {
    userKey: string;
    applicationName: string;
    eventName?: string;
    startTime?: string;
    endTime?: string;
    maxResults?: number;
    pageToken?: string;
    filters?: string;
    actorIpAddress?: string;
    orgUnitId?: string;
  }) {
    let response = await reportsApi.get(
      `/activity/users/${encodeURIComponent(params.userKey)}/applications/${params.applicationName}`,
      {
        headers: this.headers,
        params: {
          eventName: params.eventName,
          startTime: params.startTime,
          endTime: params.endTime,
          maxResults: params.maxResults || 100,
          pageToken: params.pageToken,
          filters: params.filters,
          actorIpAddress: params.actorIpAddress,
          orgUnitID: params.orgUnitId
        }
      }
    );
    return response.data;
  }

  // ==================== REPORTS - USAGE ====================

  async getCustomerUsageReport(params: {
    date: string;
    parameters?: string;
    pageToken?: string;
  }) {
    let response = await reportsApi.get(`/usage/dates/${params.date}`, {
      headers: this.headers,
      params: {
        parameters: params.parameters,
        pageToken: params.pageToken
      }
    });
    return response.data;
  }

  async getUserUsageReport(params: {
    userKey: string;
    date: string;
    parameters?: string;
    pageToken?: string;
    filters?: string;
    maxResults?: number;
  }) {
    let response = await reportsApi.get(
      `/usage/users/${encodeURIComponent(params.userKey)}/dates/${params.date}`,
      {
        headers: this.headers,
        params: {
          parameters: params.parameters,
          pageToken: params.pageToken,
          filters: params.filters,
          maxResults: params.maxResults || 100
        }
      }
    );
    return response.data;
  }

  // ==================== ALERT CENTER ====================

  async listAlerts(
    params: { filter?: string; orderBy?: string; pageSize?: number; pageToken?: string } = {}
  ) {
    let response = await alertCenterApi.get('/alerts', {
      headers: this.headers,
      params: {
        filter: params.filter,
        orderBy: params.orderBy,
        pageSize: params.pageSize || 20,
        pageToken: params.pageToken
      }
    });
    return response.data;
  }

  async getAlert(alertId: string) {
    let response = await alertCenterApi.get(`/alerts/${alertId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteAlert(alertId: string) {
    await alertCenterApi.delete(`/alerts/${alertId}`, {
      headers: this.headers
    });
  }

  async undeleteAlert(alertId: string) {
    let response = await alertCenterApi.post(
      `/alerts/${alertId}:undelete`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async createAlertFeedback(alertId: string, feedbackType: string) {
    let response = await alertCenterApi.post(
      `/alerts/${alertId}/feedback`,
      {
        type: feedbackType
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async listAlertFeedback(alertId: string) {
    let response = await alertCenterApi.get(`/alerts/${alertId}/feedback`, {
      headers: this.headers
    });
    return response.data;
  }

  async getAlertMetadata(alertId: string) {
    let response = await alertCenterApi.get(`/alerts/${alertId}/metadata`, {
      headers: this.headers
    });
    return response.data;
  }

  async batchDeleteAlerts(alertIds: string[]) {
    let response = await alertCenterApi.post(
      '/alerts:batchDelete',
      {
        alertId: alertIds
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async batchUndeleteAlerts(alertIds: string[]) {
    let response = await alertCenterApi.post(
      '/alerts:batchUndelete',
      {
        alertId: alertIds
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ==================== LICENSING ====================

  async listLicenseAssignments(
    productId: string,
    customerId: string,
    skuId?: string,
    params: {
      maxResults?: number;
      pageToken?: string;
    } = {}
  ) {
    let path = skuId
      ? `/${productId}/sku/${encodeURIComponent(skuId)}/users`
      : `/${productId}/users`;

    let response = await licensingApi.get(path, {
      headers: this.headers,
      params: {
        customerId,
        maxResults: params.maxResults || 100,
        pageToken: params.pageToken
      }
    });
    return response.data;
  }

  async getLicenseAssignment(productId: string, skuId: string, userId: string) {
    let response = await licensingApi.get(
      `/${productId}/sku/${skuId}/user/${encodeURIComponent(userId)}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async assignLicense(productId: string, skuId: string, userId: string) {
    let response = await licensingApi.post(
      `/${productId}/sku/${skuId}/user`,
      {
        userId
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async revokeLicense(productId: string, skuId: string, userId: string) {
    await licensingApi.delete(
      `/${productId}/sku/${skuId}/user/${encodeURIComponent(userId)}`,
      {
        headers: this.headers
      }
    );
  }

  // ==================== CUSTOM SCHEMAS ====================

  async listSchemas() {
    let response = await directoryApi.get(`/customer/${this.customerId}/schemas`, {
      headers: this.headers
    });
    return response.data;
  }

  async getSchema(schemaKey: string) {
    let response = await directoryApi.get(
      `/customer/${this.customerId}/schemas/${schemaKey}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ==================== PRIVILEGES ====================

  async listPrivileges() {
    let response = await directoryApi.get(
      `/customer/${this.customerId}/roles/ALL/privileges`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ==================== PUSH NOTIFICATIONS (WATCH) ====================

  async watchUsers(params: {
    domain?: string;
    customer?: string;
    event?: string;
    channelId: string;
    channelAddress: string;
    channelToken?: string;
    ttl?: number;
  }) {
    let response = await directoryApi.post(
      '/users/watch',
      {
        id: params.channelId,
        type: 'web_hook',
        address: params.channelAddress,
        token: params.channelToken,
        params: params.ttl ? { ttl: String(params.ttl) } : undefined
      },
      {
        headers: this.headers,
        params: {
          domain: params.domain || this.config.domain,
          customer: !params.domain ? params.customer || this.customerId : undefined,
          event: params.event
        }
      }
    );
    return response.data;
  }

  async watchActivities(params: {
    userKey: string;
    applicationName: string;
    channelId: string;
    channelAddress: string;
    channelToken?: string;
    ttl?: number;
  }) {
    let response = await reportsApi.post(
      `/activity/users/${encodeURIComponent(params.userKey)}/applications/${params.applicationName}/watch`,
      {
        id: params.channelId,
        type: 'web_hook',
        address: params.channelAddress,
        token: params.channelToken,
        params: params.ttl ? { ttl: String(params.ttl) } : undefined
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async stopChannel(channelId: string, resourceId: string) {
    await directoryApi.post(
      '/channels/stop',
      {
        id: channelId,
        resourceId
      },
      {
        headers: this.headers
      }
    );
  }

  // ==================== DATA TRANSFER ====================

  async listDataTransfers(
    params: {
      oldOwnerUserId?: string;
      newOwnerUserId?: string;
      status?: string;
      maxResults?: number;
      pageToken?: string;
    } = {}
  ) {
    let response = await dataTransferApi.get('/transfers', {
      headers: this.headers,
      params: {
        oldOwnerUserId: params.oldOwnerUserId,
        newOwnerUserId: params.newOwnerUserId,
        status: params.status,
        maxResults: params.maxResults || 100,
        pageToken: params.pageToken
      }
    });
    return response.data;
  }

  async createDataTransfer(transferData: {
    oldOwnerUserId: string;
    newOwnerUserId: string;
    applicationDataTransfers: Array<{
      applicationId: string;
      applicationTransferParams?: Array<{
        key: string;
        value: string[];
      }>;
    }>;
  }) {
    let response = await dataTransferApi.post('/transfers', transferData, {
      headers: this.headers
    });
    return response.data;
  }

  async getDataTransfer(transferId: string) {
    let response = await dataTransferApi.get(`/transfers/${transferId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listDataTransferApplications() {
    let response = await dataTransferApi.get('/applications', {
      headers: this.headers
    });
    return response.data;
  }
}
