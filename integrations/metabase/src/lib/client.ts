import { createAxios } from 'slates';

export class MetabaseClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; instanceUrl: string }) {
    this.http = createAxios({
      baseURL: `${config.instanceUrl}/api`,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.token
      }
    });
  }

  // ── Cards / Questions ──

  async listCards(params?: { filter?: string }) {
    let response = await this.http.get('/card', {
      params: { f: params?.filter }
    });
    return response.data;
  }

  async getCard(cardId: number) {
    let response = await this.http.get(`/card/${cardId}`);
    return response.data;
  }

  async createCard(data: {
    name: string;
    datasetQuery: any;
    display?: string;
    description?: string;
    collectionId?: number | null;
    visualizationSettings?: any;
  }) {
    let response = await this.http.post('/card', {
      name: data.name,
      dataset_query: data.datasetQuery,
      display: data.display || 'table',
      description: data.description,
      collection_id: data.collectionId,
      visualization_settings: data.visualizationSettings || {}
    });
    return response.data;
  }

  async updateCard(
    cardId: number,
    data: {
      name?: string;
      description?: string;
      display?: string;
      datasetQuery?: any;
      collectionId?: number | null;
      archived?: boolean;
      visualizationSettings?: any;
      enableEmbedding?: boolean;
    }
  ) {
    let body: any = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.display !== undefined) body.display = data.display;
    if (data.datasetQuery !== undefined) body.dataset_query = data.datasetQuery;
    if (data.collectionId !== undefined) body.collection_id = data.collectionId;
    if (data.archived !== undefined) body.archived = data.archived;
    if (data.visualizationSettings !== undefined)
      body.visualization_settings = data.visualizationSettings;
    if (data.enableEmbedding !== undefined) body.enable_embedding = data.enableEmbedding;

    let response = await this.http.put(`/card/${cardId}`, body);
    return response.data;
  }

  async executeCardQuery(cardId: number, params?: { parameters?: any[] }) {
    let response = await this.http.post(`/card/${cardId}/query`, {
      parameters: params?.parameters
    });
    return response.data;
  }

  // ── Dashboards ──

  async listDashboards(params?: { filter?: string }) {
    let response = await this.http.get('/dashboard', {
      params: { f: params?.filter }
    });
    return response.data;
  }

  async getDashboard(dashboardId: number) {
    let response = await this.http.get(`/dashboard/${dashboardId}`);
    return response.data;
  }

  async createDashboard(data: {
    name: string;
    description?: string;
    collectionId?: number | null;
    parameters?: any[];
  }) {
    let response = await this.http.post('/dashboard', {
      name: data.name,
      description: data.description,
      collection_id: data.collectionId,
      parameters: data.parameters
    });
    return response.data;
  }

  async updateDashboard(
    dashboardId: number,
    data: {
      name?: string;
      description?: string;
      archived?: boolean;
      collectionId?: number | null;
      parameters?: any[];
      enableEmbedding?: boolean;
      embeddingParams?: any;
    }
  ) {
    let body: any = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.archived !== undefined) body.archived = data.archived;
    if (data.collectionId !== undefined) body.collection_id = data.collectionId;
    if (data.parameters !== undefined) body.parameters = data.parameters;
    if (data.enableEmbedding !== undefined) body.enable_embedding = data.enableEmbedding;
    if (data.embeddingParams !== undefined) body.embedding_params = data.embeddingParams;

    let response = await this.http.put(`/dashboard/${dashboardId}`, body);
    return response.data;
  }

  async addCardToDashboard(
    dashboardId: number,
    data: {
      cardId: number;
      row?: number;
      col?: number;
      sizeX?: number;
      sizeY?: number;
      parameterMappings?: any[];
    }
  ) {
    let response = await this.http.post(`/dashboard/${dashboardId}/cards`, {
      cardId: data.cardId,
      row: data.row || 0,
      col: data.col || 0,
      size_x: data.sizeX || 6,
      size_y: data.sizeY || 4,
      parameter_mappings: data.parameterMappings || []
    });
    return response.data;
  }

  async removeCardFromDashboard(dashboardId: number, dashcardId: number) {
    let response = await this.http.delete(`/dashboard/${dashboardId}/cards`, {
      params: { dashcardId }
    });
    return response.data;
  }

  async copyDashboard(
    dashboardId: number,
    data?: {
      name?: string;
      description?: string;
      collectionId?: number | null;
    }
  ) {
    let response = await this.http.post(`/dashboard/${dashboardId}/copy`, {
      name: data?.name,
      description: data?.description,
      collection_id: data?.collectionId
    });
    return response.data;
  }

  // ── Collections ──

  async listCollections() {
    let response = await this.http.get('/collection');
    return response.data;
  }

  async getCollectionTree() {
    let response = await this.http.get('/collection/tree');
    return response.data;
  }

  async getCollection(collectionId: number | string) {
    let response = await this.http.get(`/collection/${collectionId}`);
    return response.data;
  }

  async getCollectionItems(
    collectionId: number | string,
    params?: {
      models?: string[];
      archived?: boolean;
      sortColumn?: string;
      sortDirection?: string;
    }
  ) {
    let response = await this.http.get(`/collection/${collectionId}/items`, {
      params: {
        models: params?.models,
        archived: params?.archived?.toString(),
        sort_column: params?.sortColumn,
        sort_direction: params?.sortDirection
      }
    });
    return response.data;
  }

  async createCollection(data: {
    name: string;
    description?: string;
    parentId?: number | null;
    color?: string;
  }) {
    let response = await this.http.post('/collection', {
      name: data.name,
      description: data.description,
      parent_id: data.parentId,
      color: data.color
    });
    return response.data;
  }

  async updateCollection(
    collectionId: number,
    data: {
      name?: string;
      description?: string;
      archived?: boolean;
      parentId?: number | null;
      color?: string;
    }
  ) {
    let body: any = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.archived !== undefined) body.archived = data.archived;
    if (data.parentId !== undefined) body.parent_id = data.parentId;
    if (data.color !== undefined) body.color = data.color;

    let response = await this.http.put(`/collection/${collectionId}`, body);
    return response.data;
  }

  // ── Databases ──

  async listDatabases(params?: { includesTables?: boolean }) {
    let response = await this.http.get('/database', {
      params: { include: params?.includesTables ? 'tables' : undefined }
    });
    return response.data;
  }

  async getDatabase(databaseId: number) {
    let response = await this.http.get(`/database/${databaseId}`);
    return response.data;
  }

  async getDatabaseMetadata(databaseId: number) {
    let response = await this.http.get(`/database/${databaseId}/metadata`);
    return response.data;
  }

  async syncDatabase(databaseId: number) {
    let response = await this.http.post(`/database/${databaseId}/sync_schema`);
    return response.data;
  }

  async rescanDatabase(databaseId: number) {
    let response = await this.http.post(`/database/${databaseId}/rescan_values`);
    return response.data;
  }

  // ── Query Execution ──

  async executeQuery(data: {
    databaseId: number;
    type: 'native' | 'query';
    nativeQuery?: string;
    mbqlQuery?: any;
    parameters?: any[];
    templateTags?: any;
  }) {
    let body: any = { database: data.databaseId, type: data.type };

    if (data.type === 'native') {
      body.native = {
        query: data.nativeQuery,
        'template-tags': data.templateTags || {}
      };
    } else {
      body.query = data.mbqlQuery;
    }

    if (data.parameters) {
      body.parameters = data.parameters;
    }

    let response = await this.http.post('/dataset', body);
    return response.data;
  }

  // ── Users ──

  async listUsers(params?: { includeDeactivated?: boolean }) {
    let response = await this.http.get('/user', {
      params: { include_deactivated: params?.includeDeactivated?.toString() }
    });
    return response.data;
  }

  async getUser(userId: number) {
    let response = await this.http.get(`/user/${userId}`);
    return response.data;
  }

  async getCurrentUser() {
    let response = await this.http.get('/user/current');
    return response.data;
  }

  async createUser(data: {
    firstName?: string;
    lastName?: string;
    email: string;
    password?: string;
    groupIds?: number[];
  }) {
    let response = await this.http.post('/user', {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      password: data.password,
      group_ids: data.groupIds
    });
    return response.data;
  }

  async updateUser(
    userId: number,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      groupIds?: number[];
      isSuperuser?: boolean;
    }
  ) {
    let body: any = {};
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.email !== undefined) body.email = data.email;
    if (data.groupIds !== undefined) body.group_ids = data.groupIds;
    if (data.isSuperuser !== undefined) body.is_superuser = data.isSuperuser;

    let response = await this.http.put(`/user/${userId}`, body);
    return response.data;
  }

  async deactivateUser(userId: number) {
    let response = await this.http.delete(`/user/${userId}`);
    return response.data;
  }

  async reactivateUser(userId: number) {
    let response = await this.http.put(`/user/${userId}/reactivate`);
    return response.data;
  }

  // ── Permissions ──

  async listPermissionGroups() {
    let response = await this.http.get('/permissions/group');
    return response.data;
  }

  async getPermissionGroup(groupId: number) {
    let response = await this.http.get(`/permissions/group/${groupId}`);
    return response.data;
  }

  async createPermissionGroup(name: string) {
    let response = await this.http.post('/permissions/group', { name });
    return response.data;
  }

  async deletePermissionGroup(groupId: number) {
    let response = await this.http.delete(`/permissions/group/${groupId}`);
    return response.data;
  }

  async getPermissionsGraph() {
    let response = await this.http.get('/permissions/graph');
    return response.data;
  }

  async addUserToGroup(userId: number, groupId: number) {
    let response = await this.http.post('/permissions/membership', {
      user_id: userId,
      group_id: groupId
    });
    return response.data;
  }

  async removeUserFromGroup(membershipId: number) {
    let response = await this.http.delete(`/permissions/membership/${membershipId}`);
    return response.data;
  }

  // ── Search ──

  async search(params: {
    query?: string;
    models?: string[];
    archived?: boolean;
    collectionId?: number;
    tableDatabaseId?: number;
  }) {
    let response = await this.http.get('/search', {
      params: {
        q: params.query,
        models: params.models,
        archived: params.archived?.toString(),
        collection_id: params.collectionId,
        table_db_id: params.tableDatabaseId
      }
    });
    return response.data;
  }

  // ── Alerts ──

  async listAlerts() {
    let response = await this.http.get('/alert');
    return response.data;
  }

  async getAlert(alertId: number) {
    let response = await this.http.get(`/alert/${alertId}`);
    return response.data;
  }

  async getAlertsForQuestion(cardId: number) {
    let response = await this.http.get(`/alert/question/${cardId}`);
    return response.data;
  }

  async createAlert(data: {
    cardId: number;
    alertCondition: 'rows' | 'goal';
    alertFirstOnly?: boolean;
    alertAboveGoal?: boolean;
    channels: any[];
    schedule?: any;
  }) {
    let response = await this.http.post('/alert', {
      card: { id: data.cardId },
      alert_condition: data.alertCondition,
      alert_first_only: data.alertFirstOnly ?? false,
      alert_above_goal: data.alertAboveGoal,
      channels: data.channels,
      ...data.schedule
    });
    return response.data;
  }

  async updateAlert(
    alertId: number,
    data: {
      alertCondition?: string;
      alertFirstOnly?: boolean;
      alertAboveGoal?: boolean;
      channels?: any[];
      archived?: boolean;
    }
  ) {
    let body: any = {};
    if (data.alertCondition !== undefined) body.alert_condition = data.alertCondition;
    if (data.alertFirstOnly !== undefined) body.alert_first_only = data.alertFirstOnly;
    if (data.alertAboveGoal !== undefined) body.alert_above_goal = data.alertAboveGoal;
    if (data.channels !== undefined) body.channels = data.channels;
    if (data.archived !== undefined) body.archived = data.archived;

    let response = await this.http.put(`/alert/${alertId}`, body);
    return response.data;
  }

  async deleteAlert(alertId: number) {
    let response = await this.http.delete(`/alert/${alertId}`);
    return response.data;
  }

  // ── Public Links ──

  async createCardPublicLink(cardId: number) {
    let response = await this.http.post(`/card/${cardId}/public_link`);
    return response.data;
  }

  async deleteCardPublicLink(cardId: number) {
    let response = await this.http.delete(`/card/${cardId}/public_link`);
    return response.data;
  }

  async createDashboardPublicLink(dashboardId: number) {
    let response = await this.http.post(`/dashboard/${dashboardId}/public_link`);
    return response.data;
  }

  async deleteDashboardPublicLink(dashboardId: number) {
    let response = await this.http.delete(`/dashboard/${dashboardId}/public_link`);
    return response.data;
  }

  // ── Tables ──

  async getTable(tableId: number) {
    let response = await this.http.get(`/table/${tableId}`);
    return response.data;
  }

  async getTableMetadata(tableId: number) {
    let response = await this.http.get(`/table/${tableId}/query_metadata`);
    return response.data;
  }
}
