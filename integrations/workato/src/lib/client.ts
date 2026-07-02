import { createAxios } from 'slates';
import { getApiBaseUrl, getDataTablesBaseUrl, getEventStreamsBaseUrl } from './urls';

export class WorkatoClient {
  private token: string;
  private dataCenter: string;

  constructor(config: { token: string; dataCenter: string }) {
    this.token = config.token;
    this.dataCenter = config.dataCenter;
  }

  private get api() {
    return createAxios({
      baseURL: getApiBaseUrl(this.dataCenter),
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private get dataTablesApi() {
    return createAxios({
      baseURL: getDataTablesBaseUrl(this.dataCenter),
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private get eventStreamsApi() {
    return createAxios({
      baseURL: getEventStreamsBaseUrl(this.dataCenter),
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
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
    let response = await this.api.get('/recipes', {
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
    return response.data;
  }

  async getRecipe(recipeId: string) {
    let response = await this.api.get(`/recipes/${recipeId}`);
    return response.data;
  }

  async createRecipe(recipe: {
    name: string;
    code?: string;
    config?: string;
    folderId?: string;
    description?: string;
  }) {
    let response = await this.api.post('/recipes', {
      recipe: {
        name: recipe.name,
        code: recipe.code,
        config: recipe.config,
        folder_id: recipe.folderId,
        description: recipe.description
      }
    });
    return response.data;
  }

  async updateRecipe(
    recipeId: string,
    recipe: {
      name?: string;
      code?: string;
      config?: string;
      description?: string;
    }
  ) {
    let response = await this.api.put(`/recipes/${recipeId}`, {
      recipe: {
        name: recipe.name,
        code: recipe.code,
        config: recipe.config,
        description: recipe.description
      }
    });
    return response.data;
  }

  async deleteRecipe(recipeId: string) {
    let response = await this.api.delete(`/recipes/${recipeId}`);
    return response.data;
  }

  async startRecipe(recipeId: string) {
    let response = await this.api.put(`/recipes/${recipeId}/start`);
    return response.data;
  }

  async stopRecipe(recipeId: string) {
    let response = await this.api.put(`/recipes/${recipeId}/stop`);
    return response.data;
  }

  async copyRecipe(recipeId: string, folderId: string) {
    let response = await this.api.post(`/recipes/${recipeId}/copy`, {
      folder_id: folderId
    });
    return response.data;
  }

  async resetRecipeTrigger(recipeId: string) {
    let response = await this.api.post(`/recipes/${recipeId}/reset_trigger`);
    return response.data;
  }

  async updateRecipeConnection(recipeId: string, adapterName: string, connectionId: number) {
    let response = await this.api.put(`/recipes/${recipeId}/connect`, {
      adapter_name: adapterName,
      connection_id: connectionId
    });
    return response.data;
  }

  async listRecipeVersions(recipeId: string, params?: { page?: number; perPage?: number }) {
    let response = await this.api.get(`/recipes/${recipeId}/versions`, {
      params: {
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 100
      }
    });
    return response.data;
  }

  // ──────────────── Connections ────────────────

  async listConnections(params?: {
    folderId?: string;
    projectId?: string;
    updatedAfter?: string;
  }) {
    let response = await this.api.get('/connections', {
      params: {
        folder_id: params?.folderId,
        project_id: params?.projectId,
        updated_after: params?.updatedAfter
      }
    });
    return response.data;
  }

  async createConnection(connection: {
    name: string;
    provider: string;
    folderId?: number;
    input?: Record<string, unknown>;
  }) {
    let response = await this.api.post('/connections', {
      name: connection.name,
      provider: connection.provider,
      folder_id: connection.folderId,
      input: connection.input
    });
    return response.data;
  }

  async updateConnection(
    connectionId: string,
    connection: {
      name?: string;
      input?: Record<string, unknown>;
    }
  ) {
    let response = await this.api.put(`/connections/${connectionId}`, connection);
    return response.data;
  }

  async disconnectConnection(connectionId: string, force?: boolean) {
    let response = await this.api.post(`/connections/${connectionId}/disconnect`, {
      force: force ?? false
    });
    return response.data;
  }

  async deleteConnection(connectionId: string) {
    let response = await this.api.delete(`/connections/${connectionId}`);
    return response.data;
  }

  // ──────────────── Jobs ────────────────

  async listJobs(
    recipeId: string,
    params?: {
      status?: string;
      rerunOnly?: boolean;
      offsetJobId?: string;
    }
  ) {
    let response = await this.api.get(`/recipes/${recipeId}/jobs`, {
      params: {
        status: params?.status,
        rerun_only: params?.rerunOnly,
        offset_job_id: params?.offsetJobId
      }
    });
    return response.data;
  }

  async getJob(recipeId: string, jobId: string) {
    let response = await this.api.get(`/recipes/${recipeId}/jobs/${jobId}`);
    return response.data;
  }

  // ──────────────── Projects ────────────────

  async listProjects(params?: { page?: number; perPage?: number }) {
    let response = await this.api.get('/projects', {
      params: {
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 100
      }
    });
    return response.data;
  }

  async updateProject(
    projectId: string,
    project: {
      name?: string;
      description?: string;
    }
  ) {
    let response = await this.api.put(`/projects/${projectId}`, project);
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await this.api.delete(`/projects/${projectId}`);
    return response.data;
  }

  // ──────────────── Folders ────────────────

  async listFolders(params?: { parentId?: string; page?: number; perPage?: number }) {
    let response = await this.api.get('/folders', {
      params: {
        parent_id: params?.parentId,
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 100
      }
    });
    return response.data;
  }

  async createFolder(name: string, parentId?: string) {
    let response = await this.api.post('/folders', {
      name,
      parent_id: parentId
    });
    return response.data;
  }

  async updateFolder(folderId: string, data: { name?: string; parentId?: string }) {
    let response = await this.api.put(`/folders/${folderId}`, {
      name: data.name,
      parent_id: data.parentId
    });
    return response.data;
  }

  async deleteFolder(folderId: string, force?: boolean) {
    let response = await this.api.delete(`/folders/${folderId}`, {
      params: { force }
    });
    return response.data;
  }

  // ──────────────── Deployments ────────────────

  async buildProject(projectId: string, description?: string) {
    let response = await this.api.post(`/projects/${projectId}/build`, {
      description,
      include_tags: true
    });
    return response.data;
  }

  async getProjectBuild(buildId: string) {
    let response = await this.api.get(`/project_builds/${buildId}`);
    return response.data;
  }

  async deployProjectBuild(
    buildId: string,
    params: {
      environmentType: string;
      title?: string;
      description?: string;
    }
  ) {
    let response = await this.api.post(`/project_builds/${buildId}/deploy`, {
      environment_type: params.environmentType,
      title: params.title,
      description: params.description,
      include_tags: true
    });
    return response.data;
  }

  async deployProject(
    projectId: string,
    params: {
      environmentType: string;
      title?: string;
      description?: string;
    }
  ) {
    let response = await this.api.post(`/projects/${projectId}/deploy`, {
      environment_type: params.environmentType,
      title: params.title,
      description: params.description,
      include_tags: true
    });
    return response.data;
  }

  async getDeployment(deploymentId: string) {
    let response = await this.api.get(`/deployments/${deploymentId}`);
    return response.data;
  }

  async listDeployments(params?: {
    projectId?: string;
    environmentType?: string;
    state?: string;
  }) {
    let response = await this.api.get('/deployments', {
      params: {
        project_id: params?.projectId,
        environment_type: params?.environmentType,
        state: params?.state
      }
    });
    return response.data;
  }

  // ──────────────── Export/Import ────────────────

  async createExportManifest(params: {
    name: string;
    folderId: number;
    autoGenerateAssets?: boolean;
    autoRun?: boolean;
  }) {
    let response = await this.api.post('/export_manifests', {
      export_manifest: {
        name: params.name,
        folder_id: params.folderId,
        auto_generate_assets: params.autoGenerateAssets ?? true,
        auto_run: params.autoRun ?? true,
        include_tags: true
      }
    });
    return response.data;
  }

  async getExportManifest(manifestId: string) {
    let response = await this.api.get(`/export_manifests/${manifestId}`);
    return response.data;
  }

  async exportPackage(manifestId: string) {
    let response = await this.api.post(`/packages/export/${manifestId}`);
    return response.data;
  }

  async getPackage(packageId: string) {
    let response = await this.api.get(`/packages/${packageId}`);
    return response.data;
  }

  // ──────────────── Lookup Tables ────────────────

  async listLookupTables(params?: { page?: number; perPage?: number }) {
    let response = await this.api.get('/lookup_tables', {
      params: {
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 100
      }
    });
    return response.data;
  }

  async createLookupTable(params: {
    name: string;
    projectId?: number;
    schema: Array<{ label: string }>;
  }) {
    let response = await this.api.post('/lookup_tables', {
      lookup_table: {
        name: params.name,
        project_id: params.projectId,
        schema: params.schema
      }
    });
    return response.data;
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
    let response = await this.api.get(`/lookup_tables/${tableId}/rows`, {
      params: queryParams
    });
    return response.data;
  }

  async lookupRow(tableId: string, filter: Record<string, string>) {
    let queryParams: Record<string, string> = {};
    for (let [key, value] of Object.entries(filter)) {
      queryParams[`by[${key}]`] = value;
    }
    let response = await this.api.get(`/lookup_tables/${tableId}/lookup`, {
      params: queryParams
    });
    return response.data;
  }

  async addLookupTableRow(tableId: string, data: Record<string, string>) {
    let response = await this.api.post(`/lookup_tables/${tableId}/rows`, { data });
    return response.data;
  }

  async updateLookupTableRow(tableId: string, rowId: string, data: Record<string, string>) {
    let response = await this.api.put(`/lookup_tables/${tableId}/rows/${rowId}`, { data });
    return response.data;
  }

  async deleteLookupTableRow(tableId: string, rowId: string) {
    let response = await this.api.delete(`/lookup_tables/${tableId}/rows/${rowId}`);
    return response.data;
  }

  // ──────────────── Event Streams ────────────────

  async listTopics(params?: { name?: string }) {
    let response = await this.api.get('/event_streams/topics', {
      params: { name: params?.name }
    });
    return response.data;
  }

  async createTopic(params: {
    name: string;
    description?: string;
    retention?: number;
    schema?: Record<string, unknown>[];
  }) {
    let response = await this.api.post('/event_streams/topics', params);
    return response.data;
  }

  async getTopic(topicId: string) {
    let response = await this.api.get(`/event_streams/topics/${topicId}`);
    return response.data;
  }

  async updateTopic(
    topicId: string,
    params: {
      name?: string;
      description?: string;
      retention?: number;
    }
  ) {
    let response = await this.api.put(`/event_streams/topics/${topicId}`, params);
    return response.data;
  }

  async deleteTopic(topicId: string) {
    let response = await this.api.delete(`/event_streams/topics/${topicId}`);
    return response.data;
  }

  async publishMessage(topicId: string, payload: Record<string, unknown>) {
    let response = await this.eventStreamsApi.post(
      `/api/v1/topics/${topicId}/publish`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
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
    let response = await this.eventStreamsApi.post(
      `/api/v1/topics/${topicId}/consume`,
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
    return response.data;
  }

  // ──────────────── Environment Properties ────────────────

  async listProperties(prefix?: string) {
    let response = await this.api.get('/properties', {
      params: { prefix }
    });
    return response.data;
  }

  async upsertProperties(properties: Record<string, string>) {
    let response = await this.api.post('/properties', { properties });
    return response.data;
  }

  // ──────────────── Workspace Info ────────────────

  async getWorkspaceInfo() {
    let response = await this.api.get('/users/me');
    return response.data;
  }

  // ──────────────── API Collections ────────────────

  async listApiCollections() {
    let response = await this.api.get('/api_collections');
    return response.data;
  }

  async listApiEndpoints(collectionId?: string) {
    let response = await this.api.get('/api_endpoints', {
      params: { api_collection_id: collectionId }
    });
    return response.data;
  }

  async enableApiEndpoint(endpointId: string) {
    let response = await this.api.put(`/api_endpoints/${endpointId}/enable`);
    return response.data;
  }

  async disableApiEndpoint(endpointId: string) {
    let response = await this.api.put(`/api_endpoints/${endpointId}/disable`);
    return response.data;
  }

  // ──────────────── Data Tables ────────────────

  async listDataTables(params?: { page?: number; perPage?: number }) {
    let response = await this.api.get('/data_tables', {
      params: {
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 100
      }
    });
    return response.data;
  }

  async getDataTable(tableId: string) {
    let response = await this.api.get(`/data_tables/${tableId}`);
    return response.data;
  }

  async createDataTable(params: {
    name: string;
    folderId?: number;
    schema: Array<{ type: string; name: string; optional?: boolean; hint?: string }>;
  }) {
    let response = await this.api.post('/data_tables', {
      name: params.name,
      folder_id: params.folderId,
      schema: params.schema
    });
    return response.data;
  }

  async deleteDataTable(tableId: string) {
    let response = await this.api.delete(`/data_tables/${tableId}`);
    return response.data;
  }

  async queryDataTableRecords(
    tableId: string,
    params?: {
      select?: string[];
      where?: Record<string, unknown>;
      order?: string;
      limit?: number;
      continuationToken?: string;
    }
  ) {
    let response = await this.dataTablesApi.post(
      `/api/v1/tables/${tableId}/query`,
      {
        select: params?.select,
        where: params?.where,
        order: params?.order,
        limit: params?.limit ?? 100,
        continuation_token: params?.continuationToken
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  async createDataTableRecord(tableId: string, document: Record<string, unknown>) {
    let response = await this.dataTablesApi.post(
      `/api/v1/tables/${tableId}/records`,
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
    return response.data;
  }

  async updateDataTableRecord(
    tableId: string,
    recordId: string,
    document: Record<string, unknown>
  ) {
    let response = await this.dataTablesApi.put(
      `/api/v1/tables/${tableId}/records/${recordId}`,
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
    return response.data;
  }

  async deleteDataTableRecord(tableId: string, recordId: string) {
    let response = await this.dataTablesApi.delete(
      `/api/v1/tables/${tableId}/records/${recordId}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      }
    );
    return response.data;
  }

  // ──────────────── Test Automation ────────────────

  async runTestCase(recipeId: string) {
    let response = await this.api.post(`/recipes/${recipeId}/test`);
    return response.data;
  }
}
