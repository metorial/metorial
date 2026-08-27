import { buildApiServiceError, createAxios, getBase64ByteLength } from 'slates';

export type MetabaseAuthMethod = 'api_key' | 'session';

type MetabaseClientConfig = {
  token: string;
  instanceUrl: string;
  authMethod?: MetabaseAuthMethod;
};

type MetabaseResponse = { data: unknown };

let normalizeAlertSubscriptions = (subscriptions: unknown[] | undefined) =>
  subscriptions?.map(subscription =>
    typeof subscription === 'object' && subscription !== null && !Array.isArray(subscription)
      ? { type: 'notification-subscription/cron', ...subscription }
      : subscription
  );

export class MetabaseClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: MetabaseClientConfig) {
    // Legacy connections predate authMethod. Metabase API keys have a documented
    // mb_ prefix, while session IDs do not, so this also repairs stored session
    // connections without requiring reauthentication.
    let usesSession =
      config.authMethod === 'session' ||
      (config.authMethod === undefined && !config.token.startsWith('mb_'));
    let authHeader = usesSession
      ? { 'X-Metabase-Session': config.token }
      : { 'X-API-KEY': config.token };

    this.http = createAxios({
      baseURL: `${config.instanceUrl.replace(/\/+$/, '')}/api`,
      headers: { 'Content-Type': 'application/json', ...authHeader }
    });
  }

  private async requestData<T = unknown>(
    request: () => Promise<MetabaseResponse>,
    operation: string
  ): Promise<T> {
    try {
      let response = await request();
      return response.data as T;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Metabase',
        operation,
        reason: 'metabase_api_request_failed'
      });
    }
  }

  async listCards(params?: { filter?: string; modelId?: number }) {
    let filter = params?.filter === 'fav' ? 'bookmarked' : params?.filter;
    return await this.requestData<any>(
      () => this.http.get('/card', { params: { f: filter, model_id: params?.modelId } }),
      'list questions'
    );
  }

  async getCard(cardId: number) {
    return await this.requestData<any>(() => this.http.get(`/card/${cardId}`), 'get question');
  }

  async createCard(data: {
    name: string;
    datasetQuery: unknown;
    display?: string;
    description?: string;
    collectionId?: number | null;
    visualizationSettings?: unknown;
  }) {
    return await this.requestData<any>(
      () =>
        this.http.post('/card', {
          name: data.name,
          dataset_query: data.datasetQuery,
          display: data.display ?? 'table',
          description: data.description,
          collection_id: data.collectionId,
          visualization_settings: data.visualizationSettings ?? {}
        }),
      'create question'
    );
  }

  async updateCard(
    cardId: number,
    data: {
      name?: string;
      description?: string;
      display?: string;
      datasetQuery?: unknown;
      collectionId?: number | null;
      archived?: boolean;
      visualizationSettings?: unknown;
      enableEmbedding?: boolean;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.display !== undefined) body.display = data.display;
    if (data.datasetQuery !== undefined) body.dataset_query = data.datasetQuery;
    if (data.collectionId !== undefined) body.collection_id = data.collectionId;
    if (data.archived !== undefined) body.archived = data.archived;
    if (data.visualizationSettings !== undefined) {
      body.visualization_settings = data.visualizationSettings;
    }
    if (data.enableEmbedding !== undefined) body.enable_embedding = data.enableEmbedding;
    return await this.requestData<any>(
      () => this.http.put(`/card/${cardId}`, body),
      'update question'
    );
  }

  async executeCardQuery(cardId: number, params?: { parameters?: unknown[] }) {
    return await this.requestData<any>(
      () => this.http.post(`/card/${cardId}/query`, { parameters: params?.parameters ?? [] }),
      'execute question'
    );
  }

  async exportCardQuery(
    cardId: number,
    format: 'csv' | 'json' | 'xlsx',
    params?: { parameters?: unknown[]; formatRows?: boolean; pivotResults?: boolean }
  ) {
    try {
      let response = await this.http.post(
        `/card/${cardId}/query/${format}`,
        {
          parameters: params?.parameters ?? [],
          format_rows: params?.formatRows,
          pivot_results: params?.pivotResults
        },
        { responseType: 'arraybuffer' }
      );
      let contentBase64 = Buffer.from(response.data).toString('base64');
      return { contentBase64, byteLength: getBase64ByteLength(contentBase64) };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Metabase',
        operation: 'export question results',
        reason: 'metabase_export_failed'
      });
    }
  }

  async listDashboards(params?: { filter?: string }) {
    return await this.requestData<any>(
      () => this.http.get('/dashboard', { params: { f: params?.filter } }),
      'list dashboards'
    );
  }

  async getDashboard(dashboardId: number) {
    return await this.requestData<any>(
      () => this.http.get(`/dashboard/${dashboardId}`),
      'get dashboard'
    );
  }

  async createDashboard(data: {
    name: string;
    description?: string;
    collectionId?: number | null;
    parameters?: unknown[];
  }) {
    return await this.requestData<any>(
      () =>
        this.http.post('/dashboard', {
          name: data.name,
          description: data.description,
          collection_id: data.collectionId,
          parameters: data.parameters
        }),
      'create dashboard'
    );
  }

  async updateDashboard(
    dashboardId: number,
    data: {
      name?: string;
      description?: string;
      archived?: boolean;
      collectionId?: number | null;
      parameters?: unknown[];
      enableEmbedding?: boolean;
      embeddingParams?: unknown;
      dashcards?: unknown[];
      tabs?: unknown[];
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.archived !== undefined) body.archived = data.archived;
    if (data.collectionId !== undefined) body.collection_id = data.collectionId;
    if (data.parameters !== undefined) body.parameters = data.parameters;
    if (data.enableEmbedding !== undefined) body.enable_embedding = data.enableEmbedding;
    if (data.embeddingParams !== undefined) body.embedding_params = data.embeddingParams;
    if (data.dashcards !== undefined) body.dashcards = data.dashcards;
    if (data.tabs !== undefined) body.tabs = data.tabs;
    return await this.requestData<any>(
      () => this.http.put(`/dashboard/${dashboardId}`, body),
      'update dashboard'
    );
  }

  async addCardToDashboard(
    dashboardId: number,
    data: {
      cardId: number;
      row?: number;
      col?: number;
      sizeX?: number;
      sizeY?: number;
      dashboardTabId?: number;
      parameterMappings?: unknown[];
    }
  ) {
    let dashboard = await this.getDashboard(dashboardId);
    let existing = Array.isArray(dashboard.dashcards)
      ? dashboard.dashcards
      : Array.isArray(dashboard.ordered_cards)
        ? dashboard.ordered_cards
        : [];
    let previousIds = new Set(existing.map((item: any) => item.id));
    let tabs = Array.isArray(dashboard.tabs) ? dashboard.tabs : [];
    let dashboardTabId = data.dashboardTabId ?? tabs[0]?.id;
    let updated = await this.updateDashboard(dashboardId, {
      dashcards: [
        ...existing,
        {
          id: -1,
          card_id: data.cardId,
          row: data.row ?? 0,
          col: data.col ?? 0,
          size_x: data.sizeX ?? 6,
          size_y: data.sizeY ?? 4,
          ...(dashboardTabId !== undefined ? { dashboard_tab_id: dashboardTabId } : {}),
          parameter_mappings: data.parameterMappings ?? []
        }
      ],
      tabs
    });
    let dashcards = Array.isArray(updated.dashcards)
      ? updated.dashcards
      : Array.isArray(updated.ordered_cards)
        ? updated.ordered_cards
        : [];
    return dashcards.find((item: any) => !previousIds.has(item.id)) ?? dashcards.at(-1);
  }

  async removeCardFromDashboard(dashboardId: number, dashcardId: number) {
    let dashboard = await this.getDashboard(dashboardId);
    let existing = Array.isArray(dashboard.dashcards)
      ? dashboard.dashcards
      : Array.isArray(dashboard.ordered_cards)
        ? dashboard.ordered_cards
        : [];
    let tabs = Array.isArray(dashboard.tabs) ? dashboard.tabs : [];
    return await this.updateDashboard(dashboardId, {
      dashcards: existing.filter((item: any) => item.id !== dashcardId),
      tabs
    });
  }

  async copyDashboard(
    dashboardId: number,
    data?: { name?: string; description?: string; collectionId?: number | null }
  ) {
    return await this.requestData<any>(
      () =>
        this.http.post(`/dashboard/${dashboardId}/copy`, {
          name: data?.name,
          description: data?.description,
          collection_id: data?.collectionId
        }),
      'copy dashboard'
    );
  }

  async listCollections(params?: { filter?: 'all' | 'archived' | 'personal' }) {
    return await this.requestData<any>(
      () => this.http.get('/collection', { params: { f: params?.filter } }),
      'list collections'
    );
  }

  async getCollectionTree() {
    return await this.requestData<any>(
      () => this.http.get('/collection/tree'),
      'get collection tree'
    );
  }

  async getCollection(collectionId: number | string) {
    return await this.requestData<any>(
      () => this.http.get(`/collection/${collectionId}`),
      'get collection'
    );
  }

  async getCollectionItems(
    collectionId: number | string,
    params?: {
      models?: string[];
      archived?: boolean;
      sortColumn?: string;
      sortDirection?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    return await this.requestData<any>(
      () =>
        this.http.get(`/collection/${collectionId}/items`, {
          params: {
            models: params?.models,
            archived: params?.archived,
            sort_column: params?.sortColumn,
            sort_direction: params?.sortDirection,
            limit: params?.limit,
            offset: params?.offset
          }
        }),
      'list collection items'
    );
  }

  async createCollection(data: {
    name: string;
    description?: string;
    parentId?: number | null;
    color?: string;
  }) {
    return await this.requestData<any>(
      () =>
        this.http.post('/collection', {
          name: data.name,
          description: data.description,
          parent_id: data.parentId,
          color: data.color
        }),
      'create collection'
    );
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
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.archived !== undefined) body.archived = data.archived;
    if (data.parentId !== undefined) body.parent_id = data.parentId;
    if (data.color !== undefined) body.color = data.color;
    return await this.requestData<any>(
      () => this.http.put(`/collection/${collectionId}`, body),
      'update collection'
    );
  }

  async listDatabases(params?: { includesTables?: boolean }) {
    return await this.requestData<any>(
      () =>
        this.http.get('/database', {
          params: { include: params?.includesTables ? 'tables' : undefined }
        }),
      'list databases'
    );
  }

  async getDatabase(databaseId: number) {
    return await this.requestData<any>(
      () => this.http.get(`/database/${databaseId}`),
      'get database'
    );
  }

  async getDatabaseMetadata(databaseId: number) {
    return await this.requestData<any>(
      () => this.http.get(`/database/${databaseId}/metadata`),
      'get database metadata'
    );
  }

  async syncDatabase(databaseId: number) {
    return await this.requestData<any>(
      () => this.http.post(`/database/${databaseId}/sync_schema`),
      'sync database schema'
    );
  }

  async rescanDatabase(databaseId: number) {
    return await this.requestData<any>(
      () => this.http.post(`/database/${databaseId}/rescan_values`),
      'rescan database field values'
    );
  }

  async executeQuery(data: {
    databaseId: number;
    type: 'native' | 'query';
    nativeQuery?: string;
    mbqlQuery?: unknown;
    parameters?: unknown[];
    templateTags?: unknown;
  }) {
    let body: Record<string, unknown> = { database: data.databaseId, type: data.type };
    if (data.type === 'native') {
      body.native = { query: data.nativeQuery, 'template-tags': data.templateTags ?? {} };
    } else {
      body.query = data.mbqlQuery;
    }
    if (data.parameters !== undefined) body.parameters = data.parameters;
    return await this.requestData<any>(
      () => this.http.post('/dataset', body),
      'execute query'
    );
  }

  async listUsers(params?: { includeDeactivated?: boolean }) {
    return await this.requestData<any>(
      () =>
        this.http.get('/user', {
          params: { include_deactivated: params?.includeDeactivated }
        }),
      'list users'
    );
  }

  async getUser(userId: number) {
    return await this.requestData<any>(() => this.http.get(`/user/${userId}`), 'get user');
  }

  async getCurrentUser() {
    return await this.requestData<any>(
      () => this.http.get('/user/current'),
      'get current user'
    );
  }

  async createUser(data: {
    firstName?: string;
    lastName?: string;
    email: string;
    password?: string;
    groupIds?: number[];
  }) {
    return await this.requestData<any>(
      () =>
        this.http.post('/user', {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          password: data.password,
          group_ids: data.groupIds
        }),
      'create user'
    );
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
    let body: Record<string, unknown> = {};
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.email !== undefined) body.email = data.email;
    if (data.groupIds !== undefined) body.group_ids = data.groupIds;
    if (data.isSuperuser !== undefined) body.is_superuser = data.isSuperuser;
    return await this.requestData<any>(
      () => this.http.put(`/user/${userId}`, body),
      'update user'
    );
  }

  async deactivateUser(userId: number) {
    return await this.requestData<any>(
      () => this.http.delete(`/user/${userId}`),
      'deactivate user'
    );
  }

  async reactivateUser(userId: number) {
    return await this.requestData<any>(
      () => this.http.put(`/user/${userId}/reactivate`),
      'reactivate user'
    );
  }

  async listPermissionGroups() {
    return await this.requestData<any>(
      () => this.http.get('/permissions/group'),
      'list permission groups'
    );
  }

  async getPermissionGroup(groupId: number) {
    return await this.requestData<any>(
      () => this.http.get(`/permissions/group/${groupId}`),
      'get permission group'
    );
  }

  async createPermissionGroup(name: string) {
    return await this.requestData<any>(
      () => this.http.post('/permissions/group', { name }),
      'create permission group'
    );
  }

  async deletePermissionGroup(groupId: number) {
    return await this.requestData<any>(
      () => this.http.delete(`/permissions/group/${groupId}`),
      'delete permission group'
    );
  }

  async getPermissionsGraph() {
    return await this.requestData<any>(
      () => this.http.get('/permissions/graph'),
      'get data permissions graph'
    );
  }

  async updatePermissionsGraph(graph: unknown) {
    return await this.requestData<any>(
      () => this.http.put('/permissions/graph', graph),
      'update data permissions graph'
    );
  }

  async addUserToGroup(userId: number, groupId: number) {
    await this.requestData<any>(
      () => this.http.post('/permissions/membership', { user_id: userId, group_id: groupId }),
      'add user to permission group'
    );
    let memberships = await this.requestData<any>(
      () => this.http.get('/permissions/membership'),
      'resolve permission group membership'
    );
    let userMemberships = memberships?.[String(userId)] ?? memberships?.[userId] ?? [];
    let membership = (Array.isArray(userMemberships) ? userMemberships : []).find(
      (item: any) => item.group_id === groupId
    );
    return { membership_id: membership?.membership_id };
  }

  async removeUserFromGroup(membershipId: number) {
    return await this.requestData<any>(
      () => this.http.delete(`/permissions/membership/${membershipId}`),
      'remove user from permission group'
    );
  }

  async search(params: {
    query?: string;
    models?: string[];
    archived?: boolean;
    collectionId?: number;
    tableDatabaseId?: number;
    limit?: number;
    offset?: number;
  }) {
    return await this.requestData<any>(
      () =>
        this.http.get('/search', {
          params: {
            q: params.query,
            models: params.models,
            archived: params.archived,
            collection: params.collectionId,
            table_db_id: params.tableDatabaseId,
            limit: params.limit,
            offset: params.offset
          }
        }),
      'search content'
    );
  }

  async listAlerts(params?: { cardId?: number; includeInactive?: boolean }) {
    let result = await this.requestData<any>(
      () =>
        this.http.get('/notification', {
          params: {
            card_id: params?.cardId,
            include_inactive: params?.includeInactive
          }
        }),
      'list question alerts'
    );
    let items = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : [];
    return items.filter(
      (item: any) =>
        item.payload?.card_id !== undefined &&
        (params?.cardId === undefined || item.payload.card_id === params.cardId)
    );
  }

  async getAlert(alertId: number) {
    return await this.requestData<any>(
      () => this.http.get(`/notification/${alertId}`),
      'get question alert'
    );
  }

  async createAlert(data: {
    cardId: number;
    sendCondition: 'has_result' | 'goal_above' | 'goal_below';
    sendOnce?: boolean;
    handlers: unknown[];
    subscriptions: unknown[];
  }) {
    return await this.requestData<any>(
      () =>
        this.http.post('/notification', {
          payload_type: 'notification/card',
          payload: {
            card_id: data.cardId,
            send_condition: data.sendCondition,
            send_once: data.sendOnce ?? false
          },
          handlers: data.handlers,
          subscriptions: normalizeAlertSubscriptions(data.subscriptions)
        }),
      'create question alert'
    );
  }

  async updateAlert(
    alertId: number,
    patch: {
      payload?: Record<string, unknown>;
      handlers?: unknown[];
      subscriptions?: unknown[];
      active?: boolean;
    }
  ) {
    let current = await this.getAlert(alertId);
    let body = {
      ...current,
      ...patch,
      id: current.id,
      payload: patch.payload ? { ...current.payload, ...patch.payload } : current.payload,
      subscriptions:
        patch.subscriptions === undefined
          ? current.subscriptions
          : normalizeAlertSubscriptions(patch.subscriptions)
    };
    return await this.requestData<any>(
      () => this.http.put(`/notification/${alertId}`, body),
      'update question alert'
    );
  }

  async deleteAlert(alertId: number) {
    return await this.updateAlert(alertId, { active: false, subscriptions: [] });
  }

  async createCardPublicLink(cardId: number) {
    return await this.requestData<any>(
      () => this.http.post(`/card/${cardId}/public_link`),
      'create question public link'
    );
  }

  async deleteCardPublicLink(cardId: number) {
    return await this.requestData<any>(
      () => this.http.delete(`/card/${cardId}/public_link`),
      'revoke question public link'
    );
  }

  async createDashboardPublicLink(dashboardId: number) {
    return await this.requestData<any>(
      () => this.http.post(`/dashboard/${dashboardId}/public_link`),
      'create dashboard public link'
    );
  }

  async deleteDashboardPublicLink(dashboardId: number) {
    return await this.requestData<any>(
      () => this.http.delete(`/dashboard/${dashboardId}/public_link`),
      'revoke dashboard public link'
    );
  }

  async getTableMetadata(tableId: number) {
    return await this.requestData<any>(
      () => this.http.get(`/table/${tableId}/query_metadata`),
      'get table query metadata'
    );
  }
}
