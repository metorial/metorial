import { createAxios } from 'slates';

export class LookerClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { instanceUrl: string; token: string }) {
    let baseUrl = config.instanceUrl.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL: `${baseUrl}/api/4.0`,
      headers: {
        Authorization: `token ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Queries ───────────────────────────────────────────

  async createQuery(body: {
    model: string;
    view: string;
    fields?: string[];
    pivots?: string[];
    fill_fields?: string[];
    filters?: Record<string, string>;
    sorts?: string[];
    limit?: string;
    column_limit?: string;
    total?: boolean;
    row_total?: string;
    subtotals?: string[];
    dynamic_fields?: string;
    query_timezone?: string;
  }) {
    let response = await this.axios.post('/queries', body);
    return response.data;
  }

  async runQuery(queryId: string, resultFormat: string) {
    let response = await this.axios.get(`/queries/${queryId}/run/${resultFormat}`);
    return response.data;
  }

  async runInlineQuery(
    body: {
      model: string;
      view: string;
      fields?: string[];
      pivots?: string[];
      fill_fields?: string[];
      filters?: Record<string, string>;
      sorts?: string[];
      limit?: string;
      column_limit?: string;
      total?: boolean;
      row_total?: string;
      subtotals?: string[];
      dynamic_fields?: string;
      query_timezone?: string;
    },
    resultFormat: string
  ) {
    let response = await this.axios.post(`/queries/run/${resultFormat}`, body);
    return response.data;
  }

  async getQuery(queryId: string) {
    let response = await this.axios.get(`/queries/${queryId}`);
    return response.data;
  }

  // ─── SQL Runner ────────────────────────────────────────

  async createSqlQuery(body: { connection_name: string; sql: string; model_name?: string }) {
    let response = await this.axios.post('/sql_queries', body);
    return response.data;
  }

  async runSqlQuery(slug: string, resultFormat: string) {
    let response = await this.axios.get(`/sql_queries/${slug}/run/${resultFormat}`);
    return response.data;
  }

  // ─── Looks ─────────────────────────────────────────────

  async searchLooks(params: {
    title?: string;
    description?: string;
    fields?: string;
    page?: number;
    per_page?: number;
    sorts?: string;
    folder_id?: string;
    filter_or?: boolean;
  }) {
    let response = await this.axios.get('/looks/search', { params });
    return response.data;
  }

  async getLook(lookId: string) {
    let response = await this.axios.get(`/looks/${lookId}`);
    return response.data;
  }

  async createLook(body: {
    title: string;
    description?: string;
    folder_id: string;
    query_id?: string;
    is_run_on_load?: boolean;
  }) {
    let response = await this.axios.post('/looks', body);
    return response.data;
  }

  async updateLook(lookId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/looks/${lookId}`, body);
    return response.data;
  }

  async deleteLook(lookId: string) {
    let response = await this.axios.delete(`/looks/${lookId}`);
    return response.data;
  }

  async runLook(
    lookId: string,
    resultFormat: string,
    params?: {
      limit?: number;
      apply_formatting?: boolean;
      apply_vis?: boolean;
    }
  ) {
    let response = await this.axios.get(`/looks/${lookId}/run/${resultFormat}`, { params });
    return response.data;
  }

  // ─── Dashboards ────────────────────────────────────────

  async searchDashboards(params: {
    title?: string;
    description?: string;
    fields?: string;
    page?: number;
    per_page?: number;
    sorts?: string;
    folder_id?: string;
    filter_or?: boolean;
    deleted?: string;
  }) {
    let response = await this.axios.get('/dashboards/search', { params });
    return response.data;
  }

  async getDashboard(dashboardId: string) {
    let response = await this.axios.get(`/dashboards/${dashboardId}`);
    return response.data;
  }

  async createDashboard(body: {
    title: string;
    description?: string;
    folder_id: string;
    hidden?: boolean;
  }) {
    let response = await this.axios.post('/dashboards', body);
    return response.data;
  }

  async updateDashboard(dashboardId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/dashboards/${dashboardId}`, body);
    return response.data;
  }

  async deleteDashboard(dashboardId: string) {
    let response = await this.axios.delete(`/dashboards/${dashboardId}`);
    return response.data;
  }

  async getDashboardElements(dashboardId: string) {
    let response = await this.axios.get(`/dashboards/${dashboardId}/dashboard_elements`);
    return response.data;
  }

  async getDashboardFilters(dashboardId: string) {
    let response = await this.axios.get(`/dashboards/${dashboardId}/dashboard_filters`);
    return response.data;
  }

  // ─── Folders ───────────────────────────────────────────

  async searchFolders(params: {
    name?: string;
    fields?: string;
    page?: number;
    per_page?: number;
    sorts?: string;
    parent_id?: string;
    filter_or?: boolean;
  }) {
    let response = await this.axios.get('/folders/search', { params });
    return response.data;
  }

  async getFolder(folderId: string) {
    let response = await this.axios.get(`/folders/${folderId}`);
    return response.data;
  }

  async getFolderChildren(
    folderId: string,
    params?: {
      fields?: string;
      page?: number;
      per_page?: number;
      sorts?: string;
    }
  ) {
    let response = await this.axios.get(`/folders/${folderId}/children`, { params });
    return response.data;
  }

  async createFolder(body: { name: string; parent_id: string }) {
    let response = await this.axios.post('/folders', body);
    return response.data;
  }

  async updateFolder(folderId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/folders/${folderId}`, body);
    return response.data;
  }

  async deleteFolder(folderId: string) {
    let response = await this.axios.delete(`/folders/${folderId}`);
    return response.data;
  }

  // ─── Users ─────────────────────────────────────────────

  async searchUsers(params: {
    first_name?: string;
    last_name?: string;
    email?: string;
    fields?: string;
    page?: number;
    per_page?: number;
    sorts?: string;
    filter_or?: boolean;
    is_disabled?: boolean;
  }) {
    let response = await this.axios.get('/users/search', { params });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  async getCurrentUser() {
    let response = await this.axios.get('/user');
    return response.data;
  }

  async createUser(body: {
    first_name?: string;
    last_name?: string;
    is_disabled?: boolean;
    locale?: string;
  }) {
    let response = await this.axios.post('/users', body);
    return response.data;
  }

  async updateUser(userId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/users/${userId}`, body);
    return response.data;
  }

  async deleteUser(userId: string) {
    let response = await this.axios.delete(`/users/${userId}`);
    return response.data;
  }

  async getUserRoles(userId: string) {
    let response = await this.axios.get(`/users/${userId}/roles`);
    return response.data;
  }

  async setUserRoles(userId: string, roleIds: string[]) {
    let response = await this.axios.put(`/users/${userId}/roles`, roleIds);
    return response.data;
  }

  // ─── Groups ────────────────────────────────────────────

  async searchGroups(params: {
    name?: string;
    fields?: string;
    page?: number;
    per_page?: number;
    sorts?: string;
    filter_or?: boolean;
  }) {
    let response = await this.axios.get('/groups/search', { params });
    return response.data;
  }

  async getGroup(groupId: string) {
    let response = await this.axios.get(`/groups/${groupId}`);
    return response.data;
  }

  async createGroup(body: { name: string }) {
    let response = await this.axios.post('/groups', body);
    return response.data;
  }

  async updateGroup(groupId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/groups/${groupId}`, body);
    return response.data;
  }

  async deleteGroup(groupId: string) {
    let response = await this.axios.delete(`/groups/${groupId}`);
    return response.data;
  }

  async addGroupUser(groupId: string, userId: string) {
    let response = await this.axios.post(`/groups/${groupId}/users`, { user_id: userId });
    return response.data;
  }

  async removeGroupUser(groupId: string, userId: string) {
    let response = await this.axios.delete(`/groups/${groupId}/users/${userId}`);
    return response.data;
  }

  // ─── Roles ─────────────────────────────────────────────

  async listRoles(params?: { fields?: string }) {
    let response = await this.axios.get('/roles', { params });
    return response.data;
  }

  async getRole(roleId: string) {
    let response = await this.axios.get(`/roles/${roleId}`);
    return response.data;
  }

  // ─── Scheduled Plans ──────────────────────────────────

  async listScheduledPlans(params?: {
    user_id?: string;
    fields?: string;
    all_users?: boolean;
  }) {
    let response = await this.axios.get('/scheduled_plans', { params });
    return response.data;
  }

  async getScheduledPlan(scheduledPlanId: string) {
    let response = await this.axios.get(`/scheduled_plans/${scheduledPlanId}`);
    return response.data;
  }

  async createScheduledPlan(body: {
    name: string;
    look_id?: string;
    dashboard_id?: string;
    lookml_dashboard_id?: string;
    crontab?: string;
    run_once?: boolean;
    scheduled_plan_destination: Array<{
      format: string;
      type: string;
      address?: string;
      apply_formatting?: boolean;
      apply_vis?: boolean;
      message?: string;
    }>;
    filters_string?: string;
    require_results?: boolean;
    require_no_results?: boolean;
    require_change?: boolean;
    send_all_results?: boolean;
    include_links?: boolean;
    timezone?: string;
    enabled?: boolean;
  }) {
    let response = await this.axios.post('/scheduled_plans', body);
    return response.data;
  }

  async updateScheduledPlan(scheduledPlanId: string, body: Record<string, any>) {
    let response = await this.axios.patch(`/scheduled_plans/${scheduledPlanId}`, body);
    return response.data;
  }

  async deleteScheduledPlan(scheduledPlanId: string) {
    let response = await this.axios.delete(`/scheduled_plans/${scheduledPlanId}`);
    return response.data;
  }

  async runScheduledPlanOnce(body: Record<string, any>) {
    let response = await this.axios.post('/scheduled_plans/run_once', body);
    return response.data;
  }

  async getScheduledPlansForLook(
    lookId: string,
    params?: { fields?: string; all_users?: boolean }
  ) {
    let response = await this.axios.get(`/scheduled_plans/look/${lookId}`, { params });
    return response.data;
  }

  async getScheduledPlansForDashboard(
    dashboardId: string,
    params?: { fields?: string; all_users?: boolean }
  ) {
    let response = await this.axios.get(`/scheduled_plans/dashboard/${dashboardId}`, {
      params
    });
    return response.data;
  }

  // ─── Alerts ────────────────────────────────────────────

  async listAlerts(params?: {
    fields?: string;
    disabled?: boolean;
    frequency?: string;
    condition_met?: boolean;
    last_run_start?: string;
    last_run_end?: string;
    all_owners?: boolean;
  }) {
    let response = await this.axios.get('/alerts/search', { params });
    return response.data;
  }

  async getAlert(alertId: string) {
    let response = await this.axios.get(`/alerts/${alertId}`);
    return response.data;
  }

  async createAlert(body: {
    comparison_type: string;
    applied_dashboard_filters?: Array<{
      filter_title: string;
      field_name: string;
      filter_value: string;
      filter_description?: string;
    }>;
    field: {
      title: string;
      name: string;
      filter?: Array<{
        field_name: string;
        field_value: string;
        filter_value?: string;
      }>;
    };
    cron: string;
    custom_title?: string;
    dashboard_element_id: string;
    destinations: Array<{
      destination_type: string;
      email_address?: string;
      action_hub_integration_id?: string;
      action_hub_form_params_json?: string;
    }>;
    threshold: number;
    description?: string;
    owner_id?: string;
    is_disabled?: boolean;
    is_public?: boolean;
  }) {
    let response = await this.axios.post('/alerts', body);
    return response.data;
  }

  async updateAlert(alertId: string, body: Record<string, any>) {
    let response = await this.axios.put(`/alerts/${alertId}`, body);
    return response.data;
  }

  async deleteAlert(alertId: string) {
    let response = await this.axios.delete(`/alerts/${alertId}`);
    return response.data;
  }

  // ─── LookML Models ────────────────────────────────────

  async listLookmlModels(params?: { fields?: string; limit?: number; offset?: number }) {
    let response = await this.axios.get('/lookml_models', { params });
    return response.data;
  }

  async getLookmlModel(modelName: string) {
    let response = await this.axios.get(`/lookml_models/${modelName}`);
    return response.data;
  }

  async getLookmlModelExplore(
    modelName: string,
    exploreName: string,
    params?: {
      fields?: string;
    }
  ) {
    let response = await this.axios.get(
      `/lookml_models/${modelName}/explores/${exploreName}`,
      { params }
    );
    return response.data;
  }

  // ─── Connections ───────────────────────────────────────

  async listConnections(params?: { fields?: string }) {
    let response = await this.axios.get('/connections', { params });
    return response.data;
  }

  async getConnection(connectionName: string, params?: { fields?: string }) {
    let response = await this.axios.get(`/connections/${connectionName}`, { params });
    return response.data;
  }

  async testConnection(connectionName: string) {
    let response = await this.axios.put(`/connections/${connectionName}/test`);
    return response.data;
  }

  // ─── Content ───────────────────────────────────────────

  async searchContent(params: {
    terms?: string;
    fields?: string;
    types?: string;
    page?: number;
    per_page?: number;
  }) {
    let response = await this.axios.get('/content_metadata_access/search', { params });
    return response.data;
  }

  async contentFavorites(params?: {
    fields?: string;
    page?: number;
    per_page?: number;
    user_id?: string;
  }) {
    let response = await this.axios.get('/content_favorite/search', { params });
    return response.data;
  }

  async contentValidation() {
    let response = await this.axios.get('/content_validation');
    return response.data;
  }

  // ─── Embedding ─────────────────────────────────────────

  async createSsoEmbedUrl(body: {
    target_url: string;
    session_length: number;
    force_logout_login?: boolean;
    external_user_id: string;
    first_name?: string;
    last_name?: string;
    permissions: string[];
    models: string[];
    group_ids?: string[];
    external_group_id?: string;
    user_attributes?: Record<string, any>;
    secret_id?: string;
  }) {
    let response = await this.axios.post('/embed/sso_url', body);
    return response.data;
  }

  async createEmbedUrlAsMe(body: {
    target_url: string;
    session_length?: number;
    force_logout_login?: boolean;
  }) {
    let response = await this.axios.post('/embed/token_url/me', body);
    return response.data;
  }

  // ─── Projects ──────────────────────────────────────────

  async listProjects(params?: { fields?: string }) {
    let response = await this.axios.get('/projects', { params });
    return response.data;
  }

  async getProject(projectId: string, params?: { fields?: string }) {
    let response = await this.axios.get(`/projects/${projectId}`, { params });
    return response.data;
  }

  async lookmlValidation(projectId: string) {
    let response = await this.axios.post(`/projects/${projectId}/lookml_validation`);
    return response.data;
  }

  // ─── Render Tasks ──────────────────────────────────────

  async createRenderTaskForLook(
    lookId: string,
    resultFormat: string,
    width: number,
    height: number
  ) {
    let response = await this.axios.post(
      `/render_tasks/looks/${lookId}/${resultFormat}`,
      null,
      {
        params: { width, height }
      }
    );
    return response.data;
  }

  async createRenderTaskForDashboard(
    dashboardId: string,
    resultFormat: string,
    width: number,
    height: number,
    body?: {
      dashboard_filters?: string;
      dashboard_style?: string;
    }
  ) {
    let response = await this.axios.post(
      `/render_tasks/dashboards/${dashboardId}/${resultFormat}`,
      body || {},
      {
        params: { width, height }
      }
    );
    return response.data;
  }

  async getRenderTask(renderTaskId: string) {
    let response = await this.axios.get(`/render_tasks/${renderTaskId}`);
    return response.data;
  }

  async getRenderTaskResults(renderTaskId: string) {
    let response = await this.axios.get(`/render_tasks/${renderTaskId}/results`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  // ─── Themes ────────────────────────────────────────────

  async listThemes(params?: { fields?: string }) {
    let response = await this.axios.get('/themes', { params });
    return response.data;
  }

  async getActiveThemes(params?: { name?: string; ts?: string; fields?: string }) {
    let response = await this.axios.get('/themes/active', { params });
    return response.data;
  }

  // ─── Color Collections ─────────────────────────────────

  async listColorCollections(params?: { fields?: string }) {
    let response = await this.axios.get('/color_collections', { params });
    return response.data;
  }

  // ─── Integrations ─────────────────────────────────────

  async listIntegrationHubs(params?: { fields?: string }) {
    let response = await this.axios.get('/integration_hubs', { params });
    return response.data;
  }

  async listIntegrations(params?: { fields?: string; integration_hub_id?: string }) {
    let response = await this.axios.get('/integrations', { params });
    return response.data;
  }

  // ─── Derived Tables ────────────────────────────────────

  async graphDerivedTablesForModel(
    modelName: string,
    params?: {
      format?: string;
      color?: string;
    }
  ) {
    let response = await this.axios.get(`/derived_table/graph/model/${modelName}`, { params });
    return response.data;
  }

  // ─── Metadata / Explore ────────────────────────────────

  async connectionSchemas(
    connectionName: string,
    params?: {
      database?: string;
      cache?: boolean;
      fields?: string;
    }
  ) {
    let response = await this.axios.get(`/connections/${connectionName}/schemas`, { params });
    return response.data;
  }

  async connectionTables(
    connectionName: string,
    params?: {
      database?: string;
      schema_name?: string;
      cache?: boolean;
      fields?: string;
    }
  ) {
    let response = await this.axios.get(`/connections/${connectionName}/tables`, { params });
    return response.data;
  }

  async connectionColumns(
    connectionName: string,
    params?: {
      database?: string;
      schema_name?: string;
      table_name?: string;
      cache?: boolean;
      fields?: string;
    }
  ) {
    let response = await this.axios.get(`/connections/${connectionName}/columns`, { params });
    return response.data;
  }
}
