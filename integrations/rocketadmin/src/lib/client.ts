import { createAxios } from 'slates';

export class RocketadminClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; baseUrl: string; masterPassword?: string }) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
        ...(config.masterPassword ? { masterpwd: config.masterPassword } : {})
      }
    });
  }

  // ---- Connections ----

  async listConnections(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/connections');
    return response.data;
  }

  async getConnection(connectionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/connection/one/${connectionId}`);
    return response.data;
  }

  async createConnection(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/connection', params);
    return response.data;
  }

  async updateConnection(
    connectionId: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/connection/${connectionId}`, params);
    return response.data;
  }

  async deleteConnection(connectionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/connection/${connectionId}`);
    return response.data;
  }

  async testConnection(connectionId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/connection/test/${connectionId}`);
    return response.data;
  }

  // ---- Tables ----

  async listTables(connectionId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/connection/tables/${connectionId}`);
    return response.data;
  }

  async getTableStructure(
    connectionId: string,
    tableName: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/table/structure/${connectionId}`, {
      params: { tableName }
    });
    return response.data;
  }

  // ---- Table Rows (CRUD) ----

  async getRows(
    connectionId: string,
    tableName: string,
    params?: {
      page?: number;
      perPage?: number;
      search?: string;
      sortField?: string;
      sortOrder?: string;
      filters?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { tableName };
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.perPage = String(params.perPage);
    if (params?.search !== undefined) queryParams.search = params.search;
    if (params?.sortField !== undefined) queryParams.sort_by = params.sortField;
    if (params?.sortOrder !== undefined) queryParams.sort_order = params.sortOrder;

    let response = await this.axios.get(`/table/rows/${connectionId}`, {
      params: queryParams
    });
    return response.data;
  }

  async findRows(
    connectionId: string,
    tableName: string,
    filters: Record<string, unknown>,
    params?: {
      page?: number;
      perPage?: number;
      sortField?: string;
      sortOrder?: string;
    }
  ): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { tableName };
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.perPage = String(params.perPage);
    if (params?.sortField !== undefined) queryParams.sort_by = params.sortField;
    if (params?.sortOrder !== undefined) queryParams.sort_order = params.sortOrder;

    let response = await this.axios.post(`/table/rows/find/${connectionId}`, filters, {
      params: queryParams
    });
    return response.data;
  }

  async getRowByPrimaryKey(
    connectionId: string,
    tableName: string,
    primaryKey: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { tableName };
    for (let [key, value] of Object.entries(primaryKey)) {
      queryParams[key] = String(value);
    }

    let response = await this.axios.get(`/table/row/${connectionId}`, {
      params: queryParams
    });
    return response.data;
  }

  async addRow(
    connectionId: string,
    tableName: string,
    row: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/table/row/${connectionId}`, row, {
      params: { tableName }
    });
    return response.data;
  }

  async updateRow(
    connectionId: string,
    tableName: string,
    primaryKey: Record<string, unknown>,
    row: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { tableName };
    for (let [key, value] of Object.entries(primaryKey)) {
      queryParams[key] = String(value);
    }

    let response = await this.axios.put(`/table/row/${connectionId}`, row, {
      params: queryParams
    });
    return response.data;
  }

  async deleteRow(
    connectionId: string,
    tableName: string,
    primaryKey: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = { tableName };
    for (let [key, value] of Object.entries(primaryKey)) {
      queryParams[key] = String(value);
    }

    let response = await this.axios.delete(`/table/row/${connectionId}`, {
      params: queryParams
    });
    return response.data;
  }

  async bulkUpdateRows(
    connectionId: string,
    tableName: string,
    primaryKeys: Record<string, unknown>[],
    row: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/table/rows/update/${connectionId}`,
      {
        primaryKeys,
        newValues: row
      },
      {
        params: { tableName }
      }
    );
    return response.data;
  }

  async bulkDeleteRows(
    connectionId: string,
    tableName: string,
    primaryKeys: Record<string, unknown>[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(
      `/table/rows/delete/${connectionId}`,
      {
        primaryKeys
      },
      {
        params: { tableName }
      }
    );
    return response.data;
  }

  // ---- CSV ----

  async exportCsv(connectionId: string, tableName: string): Promise<string> {
    let response = await this.axios.post(
      `/table/csv/export/${connectionId}`,
      {},
      {
        params: { tableName }
      }
    );
    return response.data;
  }

  // ---- Groups & Permissions ----

  async listGroups(connectionId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/connection/groups/${connectionId}`);
    return response.data;
  }

  async getGroupPermissions(
    connectionId: string,
    groupId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/connection/permissions/${connectionId}`, {
      params: { groupId }
    });
    return response.data;
  }

  async createGroup(connectionId: string, title: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/connection/group/${connectionId}`, { title });
    return response.data;
  }

  async deleteGroup(connectionId: string, groupId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/group/${groupId}`, {
      params: { connectionId }
    });
    return response.data;
  }

  async addUserToGroup(groupId: string, email: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/group/user/${groupId}`, { email });
    return response.data;
  }

  async removeUserFromGroup(groupId: string, email: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/group/user/${groupId}`, {
      data: { email }
    });
    return response.data;
  }

  async getUsersInGroup(groupId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/group/users/${groupId}`);
    return response.data;
  }

  async updateGroupPermissions(
    groupId: string,
    permissions: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/permissions/${groupId}`, permissions);
    return response.data;
  }

  // ---- Users / Company ----

  async getUserInfo(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/user/my/');
    return response.data;
  }

  async getCompanyInfo(companyId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/company/my/full/${companyId}`);
    return response.data;
  }

  async getUsersInCompany(companyId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/company/users/${companyId}`);
    return response.data;
  }

  async inviteUserToCompany(
    companyId: string,
    email: string,
    groupId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/company/user/${companyId}`, {
      email,
      groupId
    });
    return response.data;
  }

  async removeUserFromCompany(
    companyId: string,
    userId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/company/user/${companyId}`, {
      data: { userId }
    });
    return response.data;
  }

  async suspendUser(companyId: string, userId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/company/user/suspend/${companyId}`, { userId });
    return response.data;
  }

  async unsuspendUser(companyId: string, userId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/company/user/unsuspend/${companyId}`, { userId });
    return response.data;
  }

  // ---- Action Rules ----

  async listActionRules(
    connectionId: string,
    tableName: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/table/rules/${connectionId}`, {
      params: { tableName }
    });
    return response.data;
  }

  async createActionRule(
    connectionId: string,
    tableName: string,
    rule: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/table/rules/${connectionId}`, rule, {
      params: { tableName }
    });
    return response.data;
  }

  async updateActionRule(
    ruleId: string,
    rule: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/table/rule/${ruleId}`, rule);
    return response.data;
  }

  async deleteActionRule(
    connectionId: string,
    ruleId: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/table/rule/${connectionId}/${ruleId}`);
    return response.data;
  }

  // ---- Dashboards ----

  async listDashboards(connectionId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/dashboards/${connectionId}`);
    return response.data;
  }

  async getDashboard(dashboardId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/dashboard/${dashboardId}`);
    return response.data;
  }

  async createDashboard(
    connectionId: string,
    title: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/dashboard/${connectionId}`, { title });
    return response.data;
  }

  async updateDashboard(dashboardId: string, title: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/dashboard/${dashboardId}`, { title });
    return response.data;
  }

  async deleteDashboard(dashboardId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/dashboard/${dashboardId}`);
    return response.data;
  }

  // ---- Saved Queries ----

  async listSavedQueries(connectionId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/saved-queries/${connectionId}`);
    return response.data;
  }

  async getSavedQuery(queryId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/saved-query/${queryId}`);
    return response.data;
  }

  async createSavedQuery(
    connectionId: string,
    query: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/saved-query/${connectionId}`, query);
    return response.data;
  }

  async updateSavedQuery(
    queryId: string,
    query: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/saved-query/${queryId}`, query);
    return response.data;
  }

  async deleteSavedQuery(queryId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/saved-query/${queryId}`);
    return response.data;
  }

  async executeSavedQuery(queryId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/saved-query/execute/${queryId}`);
    return response.data;
  }

  // ---- Audit Logs ----

  async getConnectionLogs(
    connectionId: string,
    params?: {
      page?: number;
      perPage?: number;
      tableName?: string;
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<Record<string, unknown>> {
    let queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.perPage !== undefined) queryParams.perPage = String(params.perPage);
    if (params?.tableName !== undefined) queryParams.tableName = params.tableName;
    if (params?.userId !== undefined) queryParams.userId = params.userId;
    if (params?.dateFrom !== undefined) queryParams.dateFrom = params.dateFrom;
    if (params?.dateTo !== undefined) queryParams.dateTo = params.dateTo;

    let response = await this.axios.get(`/logs/${connectionId}`, {
      params: queryParams
    });
    return response.data;
  }

  async getSignInAuditLogs(): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/logs/audit/signin');
    return response.data;
  }

  // ---- Table Settings ----

  async getTableSettings(
    connectionId: string,
    tableName: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/settings/${connectionId}`, {
      params: { tableName }
    });
    return response.data;
  }

  async createTableSettings(
    connectionId: string,
    tableName: string,
    settings: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/settings/${connectionId}`, settings, {
      params: { tableName }
    });
    return response.data;
  }

  async updateTableSettings(
    connectionId: string,
    tableName: string,
    settings: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/settings/${connectionId}`, settings, {
      params: { tableName }
    });
    return response.data;
  }

  async deleteTableSettings(
    connectionId: string,
    tableName: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/settings/${connectionId}`, {
      params: { tableName }
    });
    return response.data;
  }

  // ---- Custom Fields ----

  async getCustomFields(
    connectionId: string,
    tableName: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/custom-fields/${connectionId}`, {
      params: { tableName }
    });
    return response.data;
  }

  async createCustomField(
    connectionId: string,
    tableName: string,
    field: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/custom-field/${connectionId}`, field, {
      params: { tableName }
    });
    return response.data;
  }

  async updateCustomField(
    fieldId: string,
    field: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/custom-field/${fieldId}`, field);
    return response.data;
  }

  async deleteCustomField(fieldId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/custom-field/${fieldId}`);
    return response.data;
  }

  // ---- Secrets ----

  async listSecrets(companyId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/secrets/${companyId}`);
    return response.data;
  }

  async getSecret(slug: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/secret/${slug}`);
    return response.data;
  }

  async createSecret(
    companyId: string,
    secret: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/secret/${companyId}`, secret);
    return response.data;
  }

  async updateSecret(
    secretId: string,
    secret: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/secret/${secretId}`, secret);
    return response.data;
  }

  async deleteSecret(secretId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/secret/${secretId}`);
    return response.data;
  }

  // ---- Table Filters ----

  async listTableFilters(
    connectionId: string,
    tableName: string
  ): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/table/filters/${connectionId}`, {
      params: { tableName }
    });
    return response.data;
  }

  async createTableFilter(
    connectionId: string,
    tableName: string,
    filter: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/table/filter/${connectionId}`, filter, {
      params: { tableName }
    });
    return response.data;
  }

  async updateTableFilter(
    filterId: string,
    filter: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/table/filter/${filterId}`, filter);
    return response.data;
  }

  async deleteTableFilter(filterId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/table/filter/${filterId}`);
    return response.data;
  }

  // ---- Widgets ----

  async createWidget(
    connectionId: string,
    tableName: string,
    widget: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/widget/${connectionId}`, widget, {
      params: { tableName }
    });
    return response.data;
  }

  async updateWidget(
    widgetId: string,
    widget: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/widget/${widgetId}`, widget);
    return response.data;
  }

  async deleteWidget(widgetId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/widget/${widgetId}`);
    return response.data;
  }

  // ---- Connection Users ----

  async getUsersInConnection(connectionId: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get(`/connection/users/${connectionId}`);
    return response.data;
  }
}
