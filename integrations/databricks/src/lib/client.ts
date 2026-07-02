import { createAxios } from 'slates';

export class DatabricksClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { workspaceUrl: string; token: string }) {
    let baseURL = config.workspaceUrl.replace(/\/+$/, '');
    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Clusters ────────────────────────────────────────────────────────

  async listClusters() {
    let response = await this.http.get('/api/2.0/clusters/list');
    return (response.data as any).clusters ?? [];
  }

  async getCluster(clusterId: string) {
    let response = await this.http.get('/api/2.0/clusters/get', {
      params: { cluster_id: clusterId }
    });
    return response.data as any;
  }

  async createCluster(params: {
    clusterName: string;
    sparkVersion: string;
    nodeTypeId: string;
    numWorkers?: number;
    autoterminationMinutes?: number;
    autoscale?: { minWorkers: number; maxWorkers: number };
    sparkConf?: Record<string, string>;
    customTags?: Record<string, string>;
  }) {
    let body: Record<string, any> = {
      cluster_name: params.clusterName,
      spark_version: params.sparkVersion,
      node_type_id: params.nodeTypeId
    };
    if (params.autoscale) {
      body.autoscale = {
        min_workers: params.autoscale.minWorkers,
        max_workers: params.autoscale.maxWorkers
      };
    } else if (params.numWorkers !== undefined) {
      body.num_workers = params.numWorkers;
    }
    if (params.autoterminationMinutes !== undefined)
      body.autotermination_minutes = params.autoterminationMinutes;
    if (params.sparkConf) body.spark_conf = params.sparkConf;
    if (params.customTags) body.custom_tags = params.customTags;

    let response = await this.http.post('/api/2.0/clusters/create', body);
    return response.data as any;
  }

  async editCluster(
    clusterId: string,
    params: {
      clusterName?: string;
      sparkVersion?: string;
      nodeTypeId?: string;
      numWorkers?: number;
      autoterminationMinutes?: number;
      autoscale?: { minWorkers: number; maxWorkers: number };
    }
  ) {
    let current = await this.getCluster(clusterId);
    let body: Record<string, any> = {
      cluster_id: clusterId,
      cluster_name: params.clusterName ?? current.cluster_name,
      spark_version: params.sparkVersion ?? current.spark_version,
      node_type_id: params.nodeTypeId ?? current.node_type_id
    };
    if (params.autoscale) {
      body.autoscale = {
        min_workers: params.autoscale.minWorkers,
        max_workers: params.autoscale.maxWorkers
      };
    } else if (params.numWorkers !== undefined) {
      body.num_workers = params.numWorkers;
    } else if (current.autoscale) {
      body.autoscale = current.autoscale;
    } else {
      body.num_workers = current.num_workers ?? 0;
    }
    if (params.autoterminationMinutes !== undefined)
      body.autotermination_minutes = params.autoterminationMinutes;

    let response = await this.http.post('/api/2.0/clusters/edit', body);
    return response.data as any;
  }

  async startCluster(clusterId: string) {
    await this.http.post('/api/2.0/clusters/start', { cluster_id: clusterId });
  }

  async restartCluster(clusterId: string) {
    await this.http.post('/api/2.0/clusters/restart', { cluster_id: clusterId });
  }

  async terminateCluster(clusterId: string) {
    await this.http.post('/api/2.0/clusters/delete', { cluster_id: clusterId });
  }

  async permanentDeleteCluster(clusterId: string) {
    await this.http.post('/api/2.0/clusters/permanent-delete', { cluster_id: clusterId });
  }

  // ─── Jobs ────────────────────────────────────────────────────────────

  async listJobs(
    params: { limit?: number; offset?: number; name?: string; expandTasks?: boolean } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;
    if (params.name) query.name = params.name;
    if (params.expandTasks) query.expand_tasks = true;

    let response = await this.http.get('/api/2.1/jobs/list', { params: query });
    return response.data as any;
  }

  async getJob(jobId: string) {
    let response = await this.http.get('/api/2.1/jobs/get', {
      params: { job_id: jobId }
    });
    return response.data as any;
  }

  async createJob(params: {
    name: string;
    tasks: any[];
    schedule?: { quartzCronExpression: string; timezoneId: string; pauseStatus?: string };
    maxConcurrentRuns?: number;
    timeoutSeconds?: number;
    emailNotifications?: any;
    webhookNotifications?: any;
    tags?: Record<string, string>;
  }) {
    let body: Record<string, any> = {
      name: params.name,
      tasks: params.tasks.map((t: any) => this.mapTaskToApi(t))
    };
    if (params.schedule) {
      body.schedule = {
        quartz_cron_expression: params.schedule.quartzCronExpression,
        timezone_id: params.schedule.timezoneId,
        pause_status: params.schedule.pauseStatus ?? 'UNPAUSED'
      };
    }
    if (params.maxConcurrentRuns !== undefined)
      body.max_concurrent_runs = params.maxConcurrentRuns;
    if (params.timeoutSeconds !== undefined) body.timeout_seconds = params.timeoutSeconds;
    if (params.emailNotifications) body.email_notifications = params.emailNotifications;
    if (params.webhookNotifications) body.webhook_notifications = params.webhookNotifications;
    if (params.tags) body.tags = params.tags;

    let response = await this.http.post('/api/2.1/jobs/create', body);
    return response.data as any;
  }

  async deleteJob(jobId: string) {
    await this.http.post('/api/2.1/jobs/delete', { job_id: jobId });
  }

  async runJobNow(
    jobId: string,
    params: {
      notebookParams?: Record<string, string>;
      pythonParams?: string[];
      jarParams?: string[];
      sparkSubmitParams?: string[];
    } = {}
  ) {
    let body: Record<string, any> = { job_id: jobId };
    if (params.notebookParams) body.notebook_params = params.notebookParams;
    if (params.pythonParams) body.python_params = params.pythonParams;
    if (params.jarParams) body.jar_params = params.jarParams;
    if (params.sparkSubmitParams) body.spark_submit_params = params.sparkSubmitParams;

    let response = await this.http.post('/api/2.1/jobs/run-now', body);
    return response.data as any;
  }

  async cancelJobRun(runId: string) {
    await this.http.post('/api/2.1/jobs/runs/cancel', { run_id: runId });
  }

  async getJobRun(runId: string) {
    let response = await this.http.get('/api/2.1/jobs/runs/get', {
      params: { run_id: runId }
    });
    return response.data as any;
  }

  async listJobRuns(
    params: {
      jobId?: string;
      activeOnly?: boolean;
      completedOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.jobId) query.job_id = params.jobId;
    if (params.activeOnly) query.active_only = true;
    if (params.completedOnly) query.completed_only = true;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.offset !== undefined) query.offset = params.offset;

    let response = await this.http.get('/api/2.1/jobs/runs/list', { params: query });
    return response.data as any;
  }

  async getJobRunOutput(runId: string) {
    let response = await this.http.get('/api/2.1/jobs/runs/get-output', {
      params: { run_id: runId }
    });
    return response.data as any;
  }

  private mapTaskToApi(task: any): any {
    let mapped: Record<string, any> = {
      task_key: task.taskKey
    };
    if (task.description) mapped.description = task.description;
    if (task.dependsOn)
      mapped.depends_on = task.dependsOn.map((d: string) => ({ task_key: d }));
    if (task.existingClusterId) mapped.existing_cluster_id = task.existingClusterId;
    if (task.newCluster) mapped.new_cluster = task.newCluster;
    if (task.notebookTask) {
      mapped.notebook_task = {
        notebook_path: task.notebookTask.notebookPath,
        base_parameters: task.notebookTask.baseParameters
      };
    }
    if (task.sparkPythonTask) {
      mapped.spark_python_task = {
        python_file: task.sparkPythonTask.pythonFile,
        parameters: task.sparkPythonTask.parameters
      };
    }
    if (task.sqlTask) {
      mapped.sql_task = task.sqlTask;
    }
    if (task.timeoutSeconds !== undefined) mapped.timeout_seconds = task.timeoutSeconds;
    return mapped;
  }

  // ─── SQL Warehouses ──────────────────────────────────────────────────

  async listWarehouses() {
    let response = await this.http.get('/api/2.0/sql/warehouses');
    return (response.data as any).warehouses ?? [];
  }

  async getWarehouse(warehouseId: string) {
    let response = await this.http.get(`/api/2.0/sql/warehouses/${warehouseId}`);
    return response.data as any;
  }

  async createWarehouse(params: {
    name: string;
    clusterSize: string;
    minNumClusters?: number;
    maxNumClusters?: number;
    autoStopMins?: number;
    warehouseType?: string;
    enableServerlessCompute?: boolean;
    tags?: Record<string, string>;
  }) {
    let body: Record<string, any> = {
      name: params.name,
      cluster_size: params.clusterSize
    };
    if (params.minNumClusters !== undefined) body.min_num_clusters = params.minNumClusters;
    if (params.maxNumClusters !== undefined) body.max_num_clusters = params.maxNumClusters;
    if (params.autoStopMins !== undefined) body.auto_stop_mins = params.autoStopMins;
    if (params.warehouseType) body.warehouse_type = params.warehouseType;
    if (params.enableServerlessCompute !== undefined)
      body.enable_serverless_compute = params.enableServerlessCompute;
    if (params.tags) {
      body.tags = {
        custom_tags: Object.entries(params.tags).map(([k, v]) => ({ key: k, value: v }))
      };
    }

    let response = await this.http.post('/api/2.0/sql/warehouses', body);
    return response.data as any;
  }

  async startWarehouse(warehouseId: string) {
    await this.http.post(`/api/2.0/sql/warehouses/${warehouseId}/start`);
  }

  async stopWarehouse(warehouseId: string) {
    await this.http.post(`/api/2.0/sql/warehouses/${warehouseId}/stop`);
  }

  async deleteWarehouse(warehouseId: string) {
    await this.http.delete(`/api/2.0/sql/warehouses/${warehouseId}`);
  }

  // ─── SQL Statement Execution ─────────────────────────────────────────

  async executeStatement(params: {
    warehouseId: string;
    statement: string;
    catalog?: string;
    schema?: string;
    waitTimeout?: string;
    disposition?: string;
    format?: string;
  }) {
    let body: Record<string, any> = {
      warehouse_id: params.warehouseId,
      statement: params.statement
    };
    if (params.catalog) body.catalog = params.catalog;
    if (params.schema) body.schema = params.schema;
    if (params.waitTimeout) body.wait_timeout = params.waitTimeout;
    if (params.disposition) body.disposition = params.disposition;
    if (params.format) body.format = params.format;

    let response = await this.http.post('/api/2.0/sql/statements', body);
    return response.data as any;
  }

  async getStatementStatus(statementId: string) {
    let response = await this.http.get(`/api/2.0/sql/statements/${statementId}`);
    return response.data as any;
  }

  async cancelStatement(statementId: string) {
    await this.http.post(`/api/2.0/sql/statements/${statementId}/cancel`);
  }

  // ─── Workspace / Notebooks ───────────────────────────────────────────

  async listWorkspace(path: string) {
    let response = await this.http.get('/api/2.0/workspace/list', {
      params: { path }
    });
    return (response.data as any).objects ?? [];
  }

  async getWorkspaceStatus(path: string) {
    let response = await this.http.get('/api/2.0/workspace/get-status', {
      params: { path }
    });
    return response.data as any;
  }

  async importNotebook(params: {
    path: string;
    content: string;
    language?: string;
    format?: string;
    overwrite?: boolean;
  }) {
    let body: Record<string, any> = {
      path: params.path,
      content: params.content,
      format: params.format ?? 'SOURCE',
      overwrite: params.overwrite ?? false
    };
    if (params.language) body.language = params.language;

    await this.http.post('/api/2.0/workspace/import', body);
  }

  async exportNotebook(path: string, format?: string) {
    let response = await this.http.get('/api/2.0/workspace/export', {
      params: { path, format: format ?? 'SOURCE' }
    });
    return response.data as any;
  }

  async deleteWorkspaceItem(path: string, recursive?: boolean) {
    await this.http.post('/api/2.0/workspace/delete', {
      path,
      recursive: recursive ?? false
    });
  }

  async mkdirsWorkspace(path: string) {
    await this.http.post('/api/2.0/workspace/mkdirs', { path });
  }

  // ─── Unity Catalog ───────────────────────────────────────────────────

  async listCatalogs() {
    let response = await this.http.get('/api/2.1/unity-catalog/catalogs');
    return (response.data as any).catalogs ?? [];
  }

  async getCatalog(name: string) {
    let response = await this.http.get(`/api/2.1/unity-catalog/catalogs/${name}`);
    return response.data as any;
  }

  async listSchemas(catalogName: string) {
    let response = await this.http.get('/api/2.1/unity-catalog/schemas', {
      params: { catalog_name: catalogName }
    });
    return (response.data as any).schemas ?? [];
  }

  async getSchema(fullName: string) {
    let response = await this.http.get(`/api/2.1/unity-catalog/schemas/${fullName}`);
    return response.data as any;
  }

  async listTables(catalogName: string, schemaName: string) {
    let response = await this.http.get('/api/2.1/unity-catalog/tables', {
      params: { catalog_name: catalogName, schema_name: schemaName }
    });
    return (response.data as any).tables ?? [];
  }

  async getTable(fullName: string) {
    let response = await this.http.get(`/api/2.1/unity-catalog/tables/${fullName}`);
    return response.data as any;
  }

  async listVolumes(catalogName: string, schemaName: string) {
    let response = await this.http.get('/api/2.1/unity-catalog/volumes', {
      params: { catalog_name: catalogName, schema_name: schemaName }
    });
    return (response.data as any).volumes ?? [];
  }

  // ─── MLflow ──────────────────────────────────────────────────────────

  async listExperiments(params: { maxResults?: number; pageToken?: string } = {}) {
    let query: Record<string, any> = {};
    if (params.maxResults) query.max_results = params.maxResults;
    if (params.pageToken) query.page_token = params.pageToken;

    let response = await this.http.get('/api/2.0/mlflow/experiments/list', { params: query });
    return response.data as any;
  }

  async getExperiment(experimentId: string) {
    let response = await this.http.get('/api/2.0/mlflow/experiments/get', {
      params: { experiment_id: experimentId }
    });
    return response.data as any;
  }

  async createExperiment(name: string, artifactLocation?: string) {
    let body: Record<string, any> = { name };
    if (artifactLocation) body.artifact_location = artifactLocation;

    let response = await this.http.post('/api/2.0/mlflow/experiments/create', body);
    return response.data as any;
  }

  async deleteExperiment(experimentId: string) {
    await this.http.post('/api/2.0/mlflow/experiments/delete', {
      experiment_id: experimentId
    });
  }

  async listRuns(
    experimentIds: string[],
    params: {
      filter?: string;
      maxResults?: number;
      orderBy?: string[];
      pageToken?: string;
    } = {}
  ) {
    let body: Record<string, any> = { experiment_ids: experimentIds };
    if (params.filter) body.filter = params.filter;
    if (params.maxResults) body.max_results = params.maxResults;
    if (params.orderBy) body.order_by = params.orderBy;
    if (params.pageToken) body.page_token = params.pageToken;

    let response = await this.http.post('/api/2.0/mlflow/runs/search', body);
    return response.data as any;
  }

  async getRun(runId: string) {
    let response = await this.http.get('/api/2.0/mlflow/runs/get', {
      params: { run_id: runId }
    });
    return response.data as any;
  }

  // ─── Model Registry ──────────────────────────────────────────────────

  async listRegisteredModels(params: { maxResults?: number; pageToken?: string } = {}) {
    let query: Record<string, any> = {};
    if (params.maxResults) query.max_results = params.maxResults;
    if (params.pageToken) query.page_token = params.pageToken;

    let response = await this.http.get('/api/2.0/mlflow/registered-models/list', {
      params: query
    });
    return response.data as any;
  }

  async getRegisteredModel(name: string) {
    let response = await this.http.get('/api/2.0/mlflow/registered-models/get', {
      params: { name }
    });
    return response.data as any;
  }

  async createRegisteredModel(
    name: string,
    description?: string,
    tags?: Array<{ key: string; value: string }>
  ) {
    let body: Record<string, any> = { name };
    if (description) body.description = description;
    if (tags) body.tags = tags;

    let response = await this.http.post('/api/2.0/mlflow/registered-models/create', body);
    return response.data as any;
  }

  async listModelVersions(name: string) {
    let response = await this.http.get('/api/2.0/mlflow/model-versions/list', {
      params: { name }
    });
    return response.data as any;
  }

  // ─── Model Serving ───────────────────────────────────────────────────

  async listServingEndpoints() {
    let response = await this.http.get('/api/2.0/serving-endpoints');
    return (response.data as any).endpoints ?? [];
  }

  async getServingEndpoint(name: string) {
    let response = await this.http.get(`/api/2.0/serving-endpoints/${name}`);
    return response.data as any;
  }

  async createServingEndpoint(params: {
    name: string;
    config: {
      servedEntities?: any[];
      servedModels?: any[];
      trafficConfig?: any;
      autoCapture?: any;
    };
    tags?: Array<{ key: string; value: string }>;
  }) {
    let response = await this.http.post('/api/2.0/serving-endpoints', params);
    return response.data as any;
  }

  async deleteServingEndpoint(name: string) {
    await this.http.delete(`/api/2.0/serving-endpoints/${name}`);
  }

  async queryServingEndpoint(name: string, payload: any) {
    let response = await this.http.post(`/serving-endpoints/${name}/invocations`, payload);
    return response.data as any;
  }

  // ─── Secrets ─────────────────────────────────────────────────────────

  async listSecretScopes() {
    let response = await this.http.get('/api/2.0/secrets/scopes/list');
    return (response.data as any).scopes ?? [];
  }

  async createSecretScope(scope: string, initialManagePrincipal?: string) {
    let body: Record<string, any> = { scope };
    if (initialManagePrincipal) body.initial_manage_principal = initialManagePrincipal;

    await this.http.post('/api/2.0/secrets/scopes/create', body);
  }

  async deleteSecretScope(scope: string) {
    await this.http.post('/api/2.0/secrets/scopes/delete', { scope });
  }

  async listSecrets(scope: string) {
    let response = await this.http.get('/api/2.0/secrets/list', {
      params: { scope }
    });
    return (response.data as any).secrets ?? [];
  }

  async putSecret(scope: string, key: string, stringValue: string) {
    await this.http.post('/api/2.0/secrets/put', {
      scope,
      key,
      string_value: stringValue
    });
  }

  async deleteSecret(scope: string, key: string) {
    await this.http.post('/api/2.0/secrets/delete', { scope, key });
  }

  // ─── Pipelines (Delta Live Tables) ───────────────────────────────────

  async listPipelines(
    params: { maxResults?: number; pageToken?: string; filter?: string } = {}
  ) {
    let query: Record<string, any> = {};
    if (params.maxResults) query.max_results = params.maxResults;
    if (params.pageToken) query.page_token = params.pageToken;
    if (params.filter) query.filter = params.filter;

    let response = await this.http.get('/api/2.0/pipelines', { params: query });
    return response.data as any;
  }

  async getPipeline(pipelineId: string) {
    let response = await this.http.get(`/api/2.0/pipelines/${pipelineId}`);
    return response.data as any;
  }

  async createPipeline(params: {
    name: string;
    libraries: any[];
    target?: string;
    continuous?: boolean;
    clusters?: any[];
    catalog?: string;
    configuration?: Record<string, string>;
  }) {
    let body: Record<string, any> = {
      name: params.name,
      libraries: params.libraries
    };
    if (params.target) body.target = params.target;
    if (params.continuous !== undefined) body.continuous = params.continuous;
    if (params.clusters) body.clusters = params.clusters;
    if (params.catalog) body.catalog = params.catalog;
    if (params.configuration) body.configuration = params.configuration;

    let response = await this.http.post('/api/2.0/pipelines', body);
    return response.data as any;
  }

  async startPipelineUpdate(pipelineId: string, fullRefresh?: boolean) {
    let body: Record<string, any> = {};
    if (fullRefresh !== undefined) body.full_refresh = fullRefresh;

    let response = await this.http.post(`/api/2.0/pipelines/${pipelineId}/updates`, body);
    return response.data as any;
  }

  async stopPipeline(pipelineId: string) {
    await this.http.post(`/api/2.0/pipelines/${pipelineId}/stop`);
  }

  async deletePipeline(pipelineId: string) {
    await this.http.delete(`/api/2.0/pipelines/${pipelineId}`);
  }

  // ─── Vector Search ───────────────────────────────────────────────────

  async listVectorSearchEndpoints() {
    let response = await this.http.get('/api/2.0/vector-search/endpoints');
    return (response.data as any).endpoints ?? [];
  }

  async getVectorSearchEndpoint(endpointName: string) {
    let response = await this.http.get(`/api/2.0/vector-search/endpoints/${endpointName}`);
    return response.data as any;
  }

  async createVectorSearchEndpoint(name: string, endpointType: string) {
    let response = await this.http.post('/api/2.0/vector-search/endpoints', {
      name,
      endpoint_type: endpointType
    });
    return response.data as any;
  }

  async deleteVectorSearchEndpoint(endpointName: string) {
    await this.http.delete(`/api/2.0/vector-search/endpoints/${endpointName}`);
  }

  async listVectorSearchIndexes(endpointName: string) {
    let response = await this.http.get(`/api/2.0/vector-search/indexes`, {
      params: { endpoint_name: endpointName }
    });
    return (response.data as any).vector_indexes ?? [];
  }

  async queryVectorSearchIndex(
    indexName: string,
    params: {
      queryVector?: number[];
      queryText?: string;
      columns: string[];
      numResults?: number;
      filtersJson?: string;
    }
  ) {
    let body: Record<string, any> = {
      columns: params.columns
    };
    if (params.queryVector) body.query_vector = params.queryVector;
    if (params.queryText) body.query_text = params.queryText;
    if (params.numResults) body.num_results = params.numResults;
    if (params.filtersJson) body.filters_json = params.filtersJson;

    let response = await this.http.post(
      `/api/2.0/vector-search/indexes/${indexName}/query`,
      body
    );
    return response.data as any;
  }

  // ─── DBFS ────────────────────────────────────────────────────────────

  async dbfsList(path: string) {
    let response = await this.http.get('/api/2.0/dbfs/list', {
      params: { path }
    });
    return (response.data as any).files ?? [];
  }

  async dbfsGetStatus(path: string) {
    let response = await this.http.get('/api/2.0/dbfs/get-status', {
      params: { path }
    });
    return response.data as any;
  }

  async dbfsMkdirs(path: string) {
    await this.http.post('/api/2.0/dbfs/mkdirs', { path });
  }

  async dbfsDelete(path: string, recursive?: boolean) {
    await this.http.post('/api/2.0/dbfs/delete', { path, recursive: recursive ?? false });
  }

  async dbfsRead(path: string, offset?: number, length?: number) {
    let params: Record<string, any> = { path };
    if (offset !== undefined) params.offset = offset;
    if (length !== undefined) params.length = length;

    let response = await this.http.get('/api/2.0/dbfs/read', { params });
    return response.data as any;
  }

  async dbfsPut(path: string, contents: string, overwrite?: boolean) {
    await this.http.post('/api/2.0/dbfs/put', {
      path,
      contents,
      overwrite: overwrite ?? false
    });
  }

  // ─── Model Registry Webhooks ─────────────────────────────────────────

  async listRegistryWebhooks(params: { modelName?: string; events?: string[] } = {}) {
    let query: Record<string, any> = {};
    if (params.modelName) query.model_name = params.modelName;
    if (params.events) query.events = params.events;

    let response = await this.http.get('/api/2.0/mlflow/registry-webhooks/list', {
      params: query
    });
    return (response.data as any).webhooks ?? [];
  }

  async createRegistryWebhook(params: {
    events: string[];
    modelName?: string;
    httpUrlSpec?: {
      url: string;
      enableSslVerification?: boolean;
      secret?: string;
      authorization?: string;
    };
    jobSpec?: { jobId: string; workspaceUrl?: string; accessToken?: string };
    description?: string;
    status?: string;
  }) {
    let body: Record<string, any> = {
      events: params.events
    };
    if (params.modelName) body.model_name = params.modelName;
    if (params.description) body.description = params.description;
    if (params.status) body.status = params.status;
    if (params.httpUrlSpec) {
      body.http_url_spec = {
        url: params.httpUrlSpec.url,
        enable_ssl_verification: params.httpUrlSpec.enableSslVerification ?? true
      };
      if (params.httpUrlSpec.secret) body.http_url_spec.secret = params.httpUrlSpec.secret;
      if (params.httpUrlSpec.authorization)
        body.http_url_spec.authorization = params.httpUrlSpec.authorization;
    }
    if (params.jobSpec) {
      body.job_spec = {
        job_id: params.jobSpec.jobId
      };
      if (params.jobSpec.workspaceUrl)
        body.job_spec.workspace_url = params.jobSpec.workspaceUrl;
      if (params.jobSpec.accessToken) body.job_spec.access_token = params.jobSpec.accessToken;
    }

    let response = await this.http.post('/api/2.0/mlflow/registry-webhooks/create', body);
    return response.data as any;
  }

  async deleteRegistryWebhook(webhookId: string) {
    await this.http.delete('/api/2.0/mlflow/registry-webhooks/delete', {
      params: { id: webhookId }
    });
  }

  // ─── Users / Identity ────────────────────────────────────────────────

  async getCurrentUser() {
    let response = await this.http.get('/api/2.0/preview/scim/v2/Me');
    return response.data as any;
  }

  async listUsers(params: { filter?: string; count?: number; startIndex?: number } = {}) {
    let query: Record<string, any> = {};
    if (params.filter) query.filter = params.filter;
    if (params.count !== undefined) query.count = params.count;
    if (params.startIndex !== undefined) query.startIndex = params.startIndex;

    let response = await this.http.get('/api/2.0/preview/scim/v2/Users', { params: query });
    return response.data as any;
  }

  async listGroups(params: { filter?: string; count?: number; startIndex?: number } = {}) {
    let query: Record<string, any> = {};
    if (params.filter) query.filter = params.filter;
    if (params.count !== undefined) query.count = params.count;
    if (params.startIndex !== undefined) query.startIndex = params.startIndex;

    let response = await this.http.get('/api/2.0/preview/scim/v2/Groups', { params: query });
    return response.data as any;
  }

  // ─── Dashboards (Lakeview) ───────────────────────────────────────────

  async listDashboards(params: { pageSize?: number; pageToken?: string } = {}) {
    let query: Record<string, any> = {};
    if (params.pageSize) query.page_size = params.pageSize;
    if (params.pageToken) query.page_token = params.pageToken;

    let response = await this.http.get('/api/2.0/lakeview/dashboards', { params: query });
    return response.data as any;
  }

  async getDashboard(dashboardId: string) {
    let response = await this.http.get(`/api/2.0/lakeview/dashboards/${dashboardId}`);
    return response.data as any;
  }

  async publishDashboard(
    dashboardId: string,
    params: { warehouseId?: string; embedCredentials?: boolean } = {}
  ) {
    let body: Record<string, any> = {};
    if (params.warehouseId) body.warehouse_id = params.warehouseId;
    if (params.embedCredentials !== undefined)
      body.embed_credentials = params.embedCredentials;

    let response = await this.http.post(
      `/api/2.0/lakeview/dashboards/${dashboardId}/published`,
      body
    );
    return response.data as any;
  }
}
