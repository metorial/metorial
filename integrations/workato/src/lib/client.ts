import {
  buildApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { getApiBaseUrl, getDataTablesBaseUrl, getEventStreamsBaseUrl } from './urls';
import {
  credentialVariants,
  dataSuccess,
  invalid,
  jsonString,
  malformed,
  nonemptyObject,
  numericId,
  object,
  pageSize,
  pathId,
  records,
  required,
  safeJson,
  success,
  timestamp
} from './validation';

export class WorkatoClient {
  private token: string;
  private dataCenter: string;
  private secrets: string[];

  constructor(config: { token: string; dataCenter: string }) {
    this.secrets = credentialVariants(config.token);
    getApiBaseUrl(config.dataCenter);
    this.token = config.token;
    this.dataCenter = config.dataCenter;
  }

  private error(error: unknown) {
    let status: number | undefined;
    try {
      const suppliedStatus = getApiErrorStatus(error);
      const candidate =
        typeof suppliedStatus === 'number'
          ? suppliedStatus
          : typeof suppliedStatus === 'string' && /^[1-5][0-9]{2}$/.test(suppliedStatus)
            ? Number(suppliedStatus)
            : undefined;
      if (
        candidate !== undefined &&
        Number.isInteger(candidate) &&
        candidate >= 100 &&
        candidate <= 599
      )
        status = candidate;
    } catch {
      /* Poisoned transport metadata is never retained. */
    }
    const hint =
      status === 401
        ? 'Verify the API client token and its data center.'
        : status === 403
          ? 'Verify your plan, API client role, project scope, and environment access. Workspace details require Get details privilege and DEV access when environments are enabled.'
          : status === 404
            ? 'Verify the native resource ID and selected workspace.'
            : 'Verify the request and resource state. After an uncertain write, read back the resource before retrying.';
    return buildApiServiceError(
      { response: { status } },
      {
        providerLabel: 'Workato',
        reason: 'workato_api_error',
        extractMessage: () => hint,
        parent: {}
      }
    );
  }

  private transport(baseURL: string) {
    const instance = createAuthenticatedAxios({
      baseURL,
      authHeader: { value: `Bearer ${this.token}` },
      timeout: 70000,
      maxRedirects: 0,
      maxContentLength: 52 * 1024 * 1024,
      maxBodyLength: 10 * 1024 * 1024,
      errorAdapter: error => this.error(error)
    });
    instance.interceptors.response.use(response => {
      if (response.status !== 200) malformed();
      safeJson(response.data, this.secrets);
      const value = response.data;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const row = object(value);
        if (
          row.success === false ||
          row.success === 'false' ||
          (row.message !== undefined &&
            row.id === undefined &&
            row.items === undefined &&
            row.data === undefined &&
            row.messages === undefined)
        )
          malformed();
      }
      return response;
    });
    instance.interceptors.request.use(request => {
      safeJson(request.data, this.secrets);
      safeJson(request.params, this.secrets);
      return request;
    });
    return instance;
  }
  private get api() {
    return this.transport(getApiBaseUrl(this.dataCenter));
  }
  private get dataTablesApi() {
    return this.transport(getDataTablesBaseUrl(this.dataCenter));
  }
  private get eventStreamsApi() {
    return this.transport(getEventStreamsBaseUrl(this.dataCenter));
  }

  // ──────────────── Recipes ────────────────

  async listRecipes(params?: {
    folderId?: string;
    running?: boolean;
    page?: number;
    perPage?: number;
    updatedAfter?: string;
    adapterNamesAny?: string;
    order?: string;
  }) {
    pageSize(params?.page, Number.MAX_SAFE_INTEGER, 'page');
    pageSize(params?.perPage, 100, 'perPage');
    if (params?.folderId !== undefined) numericId(params.folderId, 'folderId');
    timestamp(params?.updatedAfter);
    let response = await this.api.get<unknown>('/recipes', {
      params: {
        folder_id: params?.folderId,
        running: params?.running,
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 100,
        updated_after: params?.updatedAfter,
        adapter_names_any: params?.adapterNamesAny,
        order: params?.order
      }
    });
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(object(response.data).items)
    };
  }

  async getRecipe(recipeId: string) {
    let response = await this.api.get<unknown>(`/recipes/${numericId(recipeId, 'recipeId')}`);
    return object(response.data);
  }

  async createRecipe(recipe: {
    name: string;
    code?: string;
    config?: string;
    folderId?: string;
    description?: string;
  }) {
    required(recipe.name, 'Name');
    required(recipe.code, 'Recipe code');
    numericId(recipe.folderId, 'Non-Home folder ID');
    jsonString(recipe.code, 'Recipe code');
    jsonString(recipe.config, 'Recipe config');
    let response = await this.api.post<unknown>('/recipes', {
      recipe: {
        name: recipe.name,
        code: recipe.code,
        config: recipe.config,
        folder_id: recipe.folderId,
        description: recipe.description
      }
    });
    return success(response.data);
  }

  async updateRecipe(
    recipeId: string,
    recipe: {
      name?: string;
      code?: string;
      config?: string;
      description?: string;
      folderId?: string;
    }
  ) {
    nonemptyObject(pickDefined(recipe), 'Recipe update');
    jsonString(recipe.code, 'Recipe code');
    jsonString(recipe.config, 'Recipe config');
    if (recipe.folderId !== undefined) numericId(recipe.folderId, 'folderId');
    let response = await this.api.put<unknown>(`/recipes/${numericId(recipeId, 'recipeId')}`, {
      recipe: {
        name: recipe.name,
        code: recipe.code,
        config: recipe.config,
        description: recipe.description,
        folder_id: recipe.folderId
      }
    });
    return success(response.data);
  }

  async deleteRecipe(recipeId: string) {
    let response = await this.api.delete<unknown>(
      `/recipes/${numericId(recipeId, 'recipeId')}`
    );
    return success(response.data);
  }

  async startRecipe(recipeId: string) {
    let response = await this.api.put<unknown>(
      `/recipes/${numericId(recipeId, 'recipeId')}/start`
    );
    return success(response.data);
  }

  async stopRecipe(recipeId: string) {
    let response = await this.api.put<unknown>(
      `/recipes/${numericId(recipeId, 'recipeId')}/stop`
    );
    return success(response.data);
  }

  async copyRecipe(recipeId: string, folderId: string) {
    let response = await this.api.post<unknown>(
      `/recipes/${numericId(recipeId, 'recipeId')}/copy`,
      {
        folder_id: folderId
      }
    );
    return success(response.data);
  }

  async resetRecipeTrigger(recipeId: string) {
    let response = await this.api.post<unknown>(
      `/recipes/${numericId(recipeId, 'recipeId')}/reset_trigger`
    );
    return success(response.data);
  }

  async updateRecipeConnection(recipeId: string, adapterName: string, connectionId: number) {
    let response = await this.api.put<unknown>(
      `/recipes/${numericId(recipeId, 'recipeId')}/connect`,
      {
        adapter_name: adapterName,
        connection_id: connectionId
      }
    );
    return success(response.data);
  }

  async listRecipeVersions(recipeId: string, params?: { page?: number; perPage?: number }) {
    pageSize(params?.page, Number.MAX_SAFE_INTEGER, 'page');
    pageSize(params?.perPage, 100, 'perPage');
    let response = await this.api.get<unknown>(
      `/recipes/${numericId(recipeId, 'recipeId')}/versions`,
      {
        params: {
          page: params?.page ?? 1,
          per_page: params?.perPage ?? 100
        }
      }
    );
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(object(response.data).data)
    };
  }

  // ──────────────── Connections ────────────────

  async listConnections(params?: {
    folderId?: string;
    projectId?: string;
    updatedAfter?: string;
  }) {
    if (params?.folderId !== undefined) numericId(params.folderId, 'folderId');
    if (params?.projectId !== undefined) numericId(params.projectId, 'projectId');
    timestamp(params?.updatedAfter);
    let response = await this.api.get<unknown>('/connections', {
      params: {
        folder_id: params?.folderId,
        project_id: params?.projectId,
        updated_after: params?.updatedAfter
      }
    });
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(response.data)
    };
  }

  async createConnection(connection: {
    name: string;
    provider: string;
    folderId?: number;
    shellConnection?: boolean;
    input?: Record<string, unknown>;
  }) {
    required(connection.name, 'Name');
    required(connection.provider, 'Provider');
    numericId(connection.folderId, 'Non-Home folder ID');
    let response = await this.api.post<unknown>('/connections', {
      name: connection.name,
      provider: connection.provider,
      folder_id: connection.folderId,
      shell_connection: connection.shellConnection,
      input: connection.input
    });
    return object(response.data);
  }

  async disconnectConnection(connectionId: string, force?: boolean) {
    let response = await this.api.post<unknown>(
      `/connections/${numericId(connectionId, 'connectionId')}/disconnect`,
      {
        force: force ?? false
      }
    );
    return success(response.data);
  }

  async deleteConnection(connectionId: string) {
    let response = await this.api.delete<unknown>(
      `/connections/${numericId(connectionId, 'connectionId')}`
    );
    return success(response.data);
  }

  // ──────────────── Jobs ────────────────

  async listJobs(
    recipeId: string,
    params?: {
      status?: string;
      rerunOnly?: boolean;
      offsetJobId?: string;
      prev?: boolean;
    }
  ) {
    let response = await this.api.get<unknown>(
      `/recipes/${numericId(recipeId, 'recipeId')}/jobs`,
      {
        params: {
          status: params?.status,
          rerun_only: params?.rerunOnly,
          offset_job_id: params?.offsetJobId,
          prev: params?.prev
        }
      }
    );
    return object(response.data);
  }

  async getJob(recipeId: string, jobId: string) {
    let response = await this.api.get<unknown>(
      `/recipes/${numericId(recipeId, 'recipeId')}/jobs/${pathId(jobId, 'jobId')}`
    );
    return object(response.data);
  }

  // ──────────────── Projects ────────────────

  async listProjects(params?: { page?: number; perPage?: number }) {
    pageSize(params?.page, Number.MAX_SAFE_INTEGER, 'page');
    pageSize(params?.perPage, 100, 'perPage');
    let response = await this.api.get<unknown>('/projects', {
      params: {
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 100
      }
    });
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(response.data)
    };
  }

  async listFolders(params?: { parentId?: string; page?: number; perPage?: number }) {
    pageSize(params?.page, Number.MAX_SAFE_INTEGER, 'page');
    pageSize(params?.perPage, 100, 'perPage');
    if (params?.parentId !== undefined) numericId(params.parentId, 'parentId');
    let response = await this.api.get<unknown>('/folders', {
      params: {
        parent_id: params?.parentId,
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 100
      }
    });
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(response.data)
    };
  }

  async createFolder(name: string, parentId?: string) {
    required(name, 'Folder name');
    if (/[\\/]/.test(name)) invalid('Folder name must not include path separators.');
    if (parentId !== undefined) numericId(parentId, 'parentId');
    let response = await this.api.post<unknown>('/folders', {
      name,
      parent_id: parentId
    });
    return object(response.data);
  }

  async updateFolder(folderId: string, data: { name?: string; parentId?: string }) {
    nonemptyObject(pickDefined(data), 'Folder update');
    if (data.name !== undefined && /[\\/]/.test(data.name))
      invalid('Folder name must not include path separators.');
    if (data.parentId !== undefined) numericId(data.parentId, 'parentId');
    let response = await this.api.put<unknown>(`/folders/${numericId(folderId, 'folderId')}`, {
      name: data.name,
      parent_id: data.parentId
    });
    return object(response.data);
  }

  async deleteFolder(folderId: string, force?: boolean) {
    let response = await this.api.delete<unknown>(
      `/folders/${numericId(folderId, 'folderId')}`,
      {
        params: { force }
      }
    );
    return success(response.data, true);
  }

  // ──────────────── Deployments ────────────────

  async deployProject(
    projectId: string,
    params: {
      environmentType: string;
      title?: string;
      description?: string;
    }
  ) {
    let response = await this.api.post<unknown>(
      `/projects/${/^f[1-9]\d*$/.test(projectId) ? `f${numericId(projectId.slice(1), 'project folder ID')}` : numericId(projectId, 'projectId')}/deploy`,
      {
        environment_type: params.environmentType,
        title: params.title,
        description: params.description,
        include_tags: true
      }
    );
    return object(response.data);
  }

  async getDeployment(deploymentId: string) {
    let response = await this.api.get<unknown>(
      `/deployments/${numericId(deploymentId, 'deploymentId')}`
    );
    return object(response.data);
  }

  async listDeployments(params?: {
    projectId?: string;
    environmentType?: string;
    state?: string;
  }) {
    let response = await this.api.get<unknown>('/deployments', {
      params: {
        project_id: params?.projectId,
        environment_type: params?.environmentType,
        state: params?.state
      }
    });
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(object(response.data).items)
    };
  }

  // ──────────────── Export/Import ────────────────

  async createExportManifest(params: {
    name: string;
    folderId: number;
    autoGenerateAssets?: boolean;
    autoRun?: boolean;
  }) {
    required(params.name, 'Manifest name');
    numericId(params.folderId, 'folderId');
    let response = await this.api.post<unknown>('/export_manifests', {
      export_manifest: {
        name: params.name,
        folder_id: params.folderId,
        auto_generate_assets: params.autoGenerateAssets ?? true,
        auto_run: params.autoRun ?? false,
        include_tags: true
      }
    });
    return object(object(response.data).result);
  }

  async getExportManifest(manifestId: string) {
    let response = await this.api.get<unknown>(
      `/export_manifests/${numericId(manifestId, 'manifestId')}`
    );
    return object(object(response.data).result);
  }

  async exportPackage(manifestId: string) {
    let response = await this.api.post<unknown>(
      `/packages/export/${numericId(manifestId, 'manifestId')}`
    );
    return object(response.data);
  }

  async getPackage(packageId: string) {
    let response = await this.api.get<unknown>(
      `/packages/${numericId(packageId, 'packageId')}`
    );
    return object(response.data);
  }

  // ──────────────── Lookup Tables ────────────────

  async listLookupTables(params?: { page?: number; perPage?: number }) {
    pageSize(params?.page, Number.MAX_SAFE_INTEGER, 'page');
    pageSize(params?.perPage, 100, 'perPage');
    let response = await this.api.get<unknown>('/lookup_tables', {
      params: {
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 100
      }
    });
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(response.data)
    };
  }

  async createLookupTable(params: {
    name: string;
    projectId?: number;
    schema: Array<{ label: string }>;
  }) {
    required(params.name, 'Table name');
    if (params.schema.length < 1 || params.schema.length > 10)
      invalid('Provide 1 to 10 lookup columns.');
    if (params.projectId !== undefined) numericId(params.projectId, 'projectId');
    let response = await this.api.post<unknown>('/lookup_tables', {
      lookup_table: {
        name: params.name,
        project_id: params.projectId,
        schema: params.schema
      }
    });
    return object(response.data);
  }

  async listLookupTableRows(
    tableId: string,
    params?: {
      page?: number;
      perPage?: number;
      filter?: Record<string, string>;
    }
  ) {
    let queryParams: Record<string, unknown> = {
      page: params?.page ?? 1,
      per_page: params?.perPage ?? 100
    };
    if (params?.filter) {
      for (let [key, value] of Object.entries(params.filter)) {
        queryParams[`by[${key}]`] = value;
      }
    }
    pageSize(params?.page, Number.MAX_SAFE_INTEGER, 'page');
    pageSize(params?.perPage, 1000, 'perPage');
    let response = await this.api.get<unknown>(
      `/lookup_tables/${pathId(tableId, 'tableId')}/rows`,
      {
        params: queryParams
      }
    );
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(response.data)
    };
  }

  async lookupRow(tableId: string, filter: Record<string, string>) {
    nonemptyObject(filter, 'Row fields');
    let queryParams: Record<string, string> = {};
    for (let [key, value] of Object.entries(filter)) {
      queryParams[`by[${key}]`] = value;
    }
    let response = await this.api.get<unknown>(
      `/lookup_tables/${pathId(tableId, 'tableId')}/lookup`,
      {
        params: queryParams
      }
    );
    return object(response.data);
  }

  async addLookupTableRow(tableId: string, data: Record<string, string>) {
    nonemptyObject(data, 'Row fields');
    let response = await this.api.post<unknown>(
      `/lookup_tables/${pathId(tableId, 'tableId')}/rows`,
      { data }
    );
    return object(response.data);
  }

  async updateLookupTableRow(tableId: string, rowId: string, data: Record<string, string>) {
    nonemptyObject(data, 'Row fields');
    let response = await this.api.put<unknown>(
      `/lookup_tables/${pathId(tableId, 'tableId')}/rows/${numericId(rowId, 'rowId')}`,
      { data }
    );
    return object(response.data);
  }

  async deleteLookupTableRow(tableId: string, rowId: string) {
    let response = await this.api.delete<unknown>(
      `/lookup_tables/${pathId(tableId, 'tableId')}/rows/${numericId(rowId, 'rowId')}`
    );
    return success(response.data);
  }

  // ──────────────── Event Streams ────────────────

  async listTopics(params?: { name?: string }) {
    let response = await this.api.get<unknown>('/event_streams/topics', {
      params: { name: params?.name }
    });
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(object(response.data).data)
    };
  }

  async createTopic(params: {
    name: string;
    description?: string;
    retention?: number;
    schema?: Record<string, unknown>[];
    folderId?: number;
  }) {
    required(params.name, 'Topic name');
    if (!params.schema?.length) invalid('A native topic schema is required.');
    for (const column of params.schema) {
      for (const key of ['control_type', 'label', 'name', 'type'])
        required(column[key], `Topic schema ${key}`);
      if (typeof column.optional !== 'boolean')
        invalid('Each topic schema field requires optional: true or false.');
    }
    if (params.folderId !== undefined) numericId(params.folderId, 'folderId');
    safeJson(params, [], 1024 * 1024);
    let response = await this.api.post<unknown>('/event_streams/topics', {
      ...pickDefined(params),
      folder_id: params.folderId,
      folderId: undefined
    });
    return object(object(response.data).data);
  }

  async getTopic(topicId: string) {
    let response = await this.api.get<unknown>(
      `/event_streams/topics/${numericId(topicId, 'topicId')}`
    );
    return object(object(response.data).data);
  }

  async updateTopic(
    topicId: string,
    params: {
      name?: string;
      description?: string;
      retention?: number;
    }
  ) {
    nonemptyObject(pickDefined(params), 'Topic update');
    safeJson(params, [], 1024 * 1024);
    let response = await this.api.put<unknown>(
      `/event_streams/topics/${numericId(topicId, 'topicId')}`,
      params
    );
    return object(object(response.data).data);
  }

  async deleteTopic(topicId: string) {
    let response = await this.api.delete<unknown>(
      `/event_streams/topics/${numericId(topicId, 'topicId')}`
    );
    return dataSuccess(response.data);
  }

  async publishMessage(topicId: string, payload: Record<string, unknown>) {
    let response = await this.eventStreamsApi.post<unknown>(
      `/api/v1/topics/${numericId(topicId, 'topicId')}/publish`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return object(response.data);
  }

  async consumeMessages(
    topicId: string,
    params?: {
      afterMessageId?: string;
      sinceTime?: string;
      batchSize?: number;
      timeoutSecs?: number;
    }
  ) {
    pageSize(params?.batchSize, 50, 'batchSize');
    timestamp(params?.sinceTime);
    if (params?.afterMessageId !== undefined)
      required(params.afterMessageId, 'afterMessageId');
    let response = await this.eventStreamsApi.post<unknown>(
      `/api/v1/topics/${numericId(topicId, 'topicId')}/consume`,
      {
        after_message_id: params?.afterMessageId,
        since_time: params?.sinceTime,
        batch_size: params?.batchSize ?? 50,
        timeout_secs: params?.timeoutSecs
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return object(response.data);
  }

  // ──────────────── Environment Properties ────────────────

  async listProperties(prefix?: string) {
    if (prefix === undefined)
      invalid('prefix is required by the properties API; provide an explicit string prefix.');
    let response = await this.api.get<unknown>('/properties', {
      params: { prefix }
    });
    return object(response.data);
  }

  async upsertProperties(properties: Record<string, string>) {
    nonemptyObject(properties, 'Properties');
    if (
      Object.keys(properties).length > 1000 ||
      Object.entries(properties).some(
        ([key, value]) => key.length > 100 || value.length > 1024
      )
    )
      invalid(
        'Properties support at most 1000 entries, 100-character keys, and 1024-character values.'
      );
    let response = await this.api.post<unknown>('/properties', { properties });
    return success(response.data);
  }

  // ──────────────── Workspace Info ────────────────

  async getWorkspaceInfo() {
    let response = await this.api.get<unknown>('/users/me');
    return object(response.data);
  }

  // ──────────────── API Collections ────────────────

  async listApiCollections(params?: { page?: number; perPage?: number }) {
    let response = await this.api.get<unknown>('/api_collections', {
      params: {
        page: pageSize(params?.page, Number.MAX_SAFE_INTEGER, 'page'),
        per_page: pageSize(params?.perPage, 100, 'perPage')
      }
    });
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(response.data)
    };
  }

  async listApiEndpoints(collectionId?: string, params?: { page?: number; perPage?: number }) {
    let response = await this.api.get<unknown>('/api_endpoints', {
      params: {
        api_collection_id:
          collectionId === undefined ? undefined : numericId(collectionId, 'collectionId'),
        page: pageSize(params?.page, Number.MAX_SAFE_INTEGER, 'page'),
        per_page: pageSize(params?.perPage, 100, 'perPage')
      }
    });
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(response.data)
    };
  }

  async enableApiEndpoint(endpointId: string) {
    let response = await this.api.put<unknown>(`/api_endpoints/${endpointId}/enable`);
    return success(response.data);
  }

  async disableApiEndpoint(endpointId: string) {
    let response = await this.api.put<unknown>(`/api_endpoints/${endpointId}/disable`);
    return success(response.data);
  }

  // ──────────────── Data Tables ────────────────

  async listDataTables(params?: { page?: number; perPage?: number }) {
    pageSize(params?.page, Number.MAX_SAFE_INTEGER, 'page');
    pageSize(params?.perPage, 100, 'perPage');
    let response = await this.dataTablesApi.get<unknown>('/api/data_tables', {
      params: {
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 100
      }
    });
    return {
      ...(!Array.isArray(response.data) ? object(response.data) : {}),
      items: records(object(response.data).data)
    };
  }

  async getDataTable(tableId: string) {
    let response = await this.dataTablesApi.get<unknown>(
      `/api/data_tables/${pathId(tableId, 'tableId')}`
    );
    return object(object(response.data).data);
  }

  async createDataTable(params: {
    name: string;
    folderId?: number;
    schema: Array<{ type: string; name: string; optional?: boolean; hint?: string }>;
  }) {
    required(params.name, 'Table name');
    numericId(params.folderId, 'folderId');
    if (!params.schema.length) invalid('Table schema requires at least one column.');
    for (const column of params.schema) {
      if (
        ![
          'boolean',
          'date',
          'date_time',
          'integer',
          'number',
          'string',
          'file',
          'relation'
        ].includes(column.type) ||
        typeof column.optional !== 'boolean'
      )
        invalid('Each table column requires a documented type and optional: true or false.');
      required(column.name, 'Column name');
    }
    let response = await this.dataTablesApi.post<unknown>('/api/data_tables', {
      name: params.name,
      folder_id: params.folderId,
      schema: params.schema
    });
    return object(object(response.data).data);
  }

  async deleteDataTable(tableId: string) {
    let response = await this.dataTablesApi.delete<unknown>(
      `/api/data_tables/${pathId(tableId, 'tableId')}`
    );
    return dataSuccess(response.data);
  }

  async queryDataTableRecords(
    tableId: string,
    params?: {
      select?: string[];
      where?: Record<string, unknown>;
      order?: string;
      limit?: number;
      continuationToken?: string;
      timezoneOffsetSecs?: number;
    }
  ) {
    pageSize(params?.limit, 200, 'limit');
    if (params?.select?.length === 0)
      invalid('Omit selectColumns for native defaults, or provide at least one column.');
    if (params?.continuationToken !== undefined)
      required(params.continuationToken, 'continuationToken');
    let response = await this.dataTablesApi.post<unknown>(
      `/api/v1/tables/${pathId(tableId, 'tableId')}/query`,
      {
        select: params?.select,
        where: params?.where,
        order: params?.order,
        limit: params?.limit ?? 100,
        continuation_token: params?.continuationToken,
        timezone_offset_secs: params?.timezoneOffsetSecs
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return object(response.data);
  }

  async createDataTableRecord(tableId: string, document: Record<string, unknown>) {
    let response = await this.dataTablesApi.post<unknown>(
      `/api/v1/tables/${pathId(tableId, 'tableId')}/records`,
      {
        document
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return object(object(response.data).data);
  }

  async updateDataTableRecord(
    tableId: string,
    recordId: string,
    document: Record<string, unknown>
  ) {
    let response = await this.dataTablesApi.put<unknown>(
      `/api/v1/tables/${pathId(tableId, 'tableId')}/records/${pathId(recordId, 'recordId')}`,
      {
        document
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return object(object(response.data).data);
  }

  async deleteDataTableRecord(tableId: string, recordId: string) {
    let response = await this.dataTablesApi.delete<unknown>(
      `/api/v1/tables/${pathId(tableId, 'tableId')}/records/${pathId(recordId, 'recordId')}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      }
    );
    return response.data === '' || response.data === undefined ? {} : malformed();
  }

  // ──────────────── Test Automation ────────────────

  async getFolder(folderId: string) {
    return object(
      (await this.api.get<unknown>(`/folders/${numericId(folderId, 'folderId')}`)).data
    );
  }
  async getLookupRow(tableId: string, rowId: string) {
    return object(
      (
        await this.api.get<unknown>(
          `/lookup_tables/${numericId(tableId, 'tableId')}/rows/${numericId(rowId, 'rowId')}`
        )
      ).data
    );
  }
  async deleteExportManifest(manifestId: string) {
    const result = object(
      object(
        (
          await this.api.delete<unknown>(
            `/export_manifests/${numericId(manifestId, 'manifestId')}`
          )
        ).data
      ).result
    );
    return success(result);
  }
  getPackageDownloadUrl(packageId: string) {
    return `${getApiBaseUrl(this.dataCenter)}/packages/${numericId(packageId, 'packageId')}/download`;
  }
}
