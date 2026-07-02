import { createAxios } from 'slates';

export class BigQueryClient {
  private http: ReturnType<typeof createAxios>;
  private projectId: string;
  private location: string;

  constructor(config: { token: string; projectId: string; location: string }) {
    this.projectId = config.projectId;
    this.location = config.location;
    this.http = createAxios({
      baseURL: 'https://bigquery.googleapis.com/bigquery/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Datasets ──────────────────────────────────────────────────────────

  async listDatasets(params?: {
    maxResults?: number;
    pageToken?: string;
    all?: boolean;
    filter?: string;
  }) {
    let response = await this.http.get(`/projects/${this.projectId}/datasets`, {
      params: {
        maxResults: params?.maxResults,
        pageToken: params?.pageToken,
        all: params?.all,
        filter: params?.filter
      }
    });
    return response.data;
  }

  async getDataset(datasetId: string) {
    let response = await this.http.get(`/projects/${this.projectId}/datasets/${datasetId}`);
    return response.data;
  }

  async createDataset(dataset: {
    datasetId: string;
    friendlyName?: string;
    description?: string;
    location?: string;
    defaultTableExpirationMs?: string;
    defaultPartitionExpirationMs?: string;
    labels?: Record<string, string>;
  }) {
    let response = await this.http.post(`/projects/${this.projectId}/datasets`, {
      datasetReference: {
        projectId: this.projectId,
        datasetId: dataset.datasetId
      },
      friendlyName: dataset.friendlyName,
      description: dataset.description,
      location: dataset.location || this.location,
      defaultTableExpirationMs: dataset.defaultTableExpirationMs,
      defaultPartitionExpirationMs: dataset.defaultPartitionExpirationMs,
      labels: dataset.labels
    });
    return response.data;
  }

  async updateDataset(
    datasetId: string,
    updates: {
      friendlyName?: string;
      description?: string;
      defaultTableExpirationMs?: string;
      defaultPartitionExpirationMs?: string;
      labels?: Record<string, string>;
    }
  ) {
    let response = await this.http.patch(
      `/projects/${this.projectId}/datasets/${datasetId}`,
      updates
    );
    return response.data;
  }

  async deleteDataset(datasetId: string, deleteContents?: boolean) {
    await this.http.delete(`/projects/${this.projectId}/datasets/${datasetId}`, {
      params: { deleteContents }
    });
  }

  // ── Tables ────────────────────────────────────────────────────────────

  async listTables(datasetId: string, params?: { maxResults?: number; pageToken?: string }) {
    let response = await this.http.get(
      `/projects/${this.projectId}/datasets/${datasetId}/tables`,
      {
        params: {
          maxResults: params?.maxResults,
          pageToken: params?.pageToken
        }
      }
    );
    return response.data;
  }

  async getTable(datasetId: string, tableId: string) {
    let response = await this.http.get(
      `/projects/${this.projectId}/datasets/${datasetId}/tables/${tableId}`
    );
    return response.data;
  }

  async createTable(
    datasetId: string,
    table: {
      tableId: string;
      friendlyName?: string;
      description?: string;
      schema?: { fields: any[] };
      expirationTime?: string;
      timePartitioning?: { type: string; field?: string; expirationMs?: string };
      rangePartitioning?: {
        field: string;
        range: { start: string; end: string; interval: string };
      };
      clustering?: { fields: string[] };
      labels?: Record<string, string>;
      view?: { query: string; useLegacySql?: boolean };
      materializedView?: {
        query: string;
        enableRefresh?: boolean;
        refreshIntervalMs?: string;
      };
      externalDataConfiguration?: any;
    }
  ) {
    let body: any = {
      tableReference: {
        projectId: this.projectId,
        datasetId,
        tableId: table.tableId
      },
      friendlyName: table.friendlyName,
      description: table.description,
      schema: table.schema,
      expirationTime: table.expirationTime,
      timePartitioning: table.timePartitioning,
      rangePartitioning: table.rangePartitioning,
      clustering: table.clustering,
      labels: table.labels
    };

    if (table.view) {
      body.view = table.view;
    }
    if (table.materializedView) {
      body.materializedView = table.materializedView;
    }
    if (table.externalDataConfiguration) {
      body.externalDataConfiguration = table.externalDataConfiguration;
    }

    let response = await this.http.post(
      `/projects/${this.projectId}/datasets/${datasetId}/tables`,
      body
    );
    return response.data;
  }

  async updateTable(
    datasetId: string,
    tableId: string,
    updates: {
      friendlyName?: string;
      description?: string;
      schema?: { fields: any[] };
      expirationTime?: string;
      labels?: Record<string, string>;
    }
  ) {
    let response = await this.http.patch(
      `/projects/${this.projectId}/datasets/${datasetId}/tables/${tableId}`,
      updates
    );
    return response.data;
  }

  async deleteTable(datasetId: string, tableId: string) {
    await this.http.delete(
      `/projects/${this.projectId}/datasets/${datasetId}/tables/${tableId}`
    );
  }

  // ── Jobs / Queries ────────────────────────────────────────────────────

  async createQueryJob(params: {
    query: string;
    useLegacySql?: boolean;
    defaultDataset?: { datasetId: string; projectId?: string };
    destinationTable?: { projectId?: string; datasetId: string; tableId: string };
    writeDisposition?: string;
    createDisposition?: string;
    priority?: string;
    maximumBytesBilled?: string;
    dryRun?: boolean;
    labels?: Record<string, string>;
    queryParameters?: any[];
    parameterMode?: string;
  }) {
    let body: any = {
      configuration: {
        query: {
          query: params.query,
          useLegacySql: params.useLegacySql ?? false,
          priority: params.priority || 'INTERACTIVE',
          maximumBytesBilled: params.maximumBytesBilled,
          queryParameters: params.queryParameters,
          parameterMode: params.parameterMode
        },
        dryRun: params.dryRun,
        labels: params.labels
      },
      jobReference: {
        projectId: this.projectId,
        location: this.location
      }
    };

    if (params.defaultDataset) {
      body.configuration.query.defaultDataset = {
        projectId: params.defaultDataset.projectId || this.projectId,
        datasetId: params.defaultDataset.datasetId
      };
    }

    if (params.destinationTable) {
      body.configuration.query.destinationTable = {
        projectId: params.destinationTable.projectId || this.projectId,
        datasetId: params.destinationTable.datasetId,
        tableId: params.destinationTable.tableId
      };
      body.configuration.query.writeDisposition = params.writeDisposition || 'WRITE_TRUNCATE';
      body.configuration.query.createDisposition =
        params.createDisposition || 'CREATE_IF_NEEDED';
    }

    let response = await this.http.post(`/projects/${this.projectId}/jobs`, body);
    return response.data;
  }

  async getJob(jobId: string, location?: string) {
    let response = await this.http.get(`/projects/${this.projectId}/jobs/${jobId}`, {
      params: { location: location || this.location }
    });
    return response.data;
  }

  async getQueryResults(
    jobId: string,
    params?: {
      maxResults?: number;
      pageToken?: string;
      startIndex?: string;
      timeoutMs?: number;
      location?: string;
    }
  ) {
    let response = await this.http.get(`/projects/${this.projectId}/queries/${jobId}`, {
      params: {
        maxResults: params?.maxResults,
        pageToken: params?.pageToken,
        startIndex: params?.startIndex,
        timeoutMs: params?.timeoutMs,
        location: params?.location || this.location
      }
    });
    return response.data;
  }

  async listJobs(params?: {
    allUsers?: boolean;
    maxResults?: number;
    pageToken?: string;
    projection?: string;
    stateFilter?: string;
    parentJobId?: string;
    minCreationTime?: string;
    maxCreationTime?: string;
  }) {
    let response = await this.http.get(`/projects/${this.projectId}/jobs`, {
      params: {
        allUsers: params?.allUsers,
        maxResults: params?.maxResults,
        pageToken: params?.pageToken,
        projection: params?.projection || 'full',
        stateFilter: params?.stateFilter,
        parentJobId: params?.parentJobId,
        minCreationTime: params?.minCreationTime,
        maxCreationTime: params?.maxCreationTime
      }
    });
    return response.data;
  }

  async cancelJob(jobId: string, location?: string) {
    let response = await this.http.post(
      `/projects/${this.projectId}/jobs/${jobId}/cancel`,
      null,
      { params: { location: location || this.location } }
    );
    return response.data;
  }

  // ── Table Data ────────────────────────────────────────────────────────

  async listTableData(
    datasetId: string,
    tableId: string,
    params?: {
      maxResults?: number;
      pageToken?: string;
      startIndex?: string;
      selectedFields?: string;
    }
  ) {
    let response = await this.http.get(
      `/projects/${this.projectId}/datasets/${datasetId}/tables/${tableId}/data`,
      {
        params: {
          maxResults: params?.maxResults,
          pageToken: params?.pageToken,
          startIndex: params?.startIndex,
          selectedFields: params?.selectedFields
        }
      }
    );
    return response.data;
  }

  async insertTableData(
    datasetId: string,
    tableId: string,
    rows: Array<{ insertId?: string; json: Record<string, any> }>,
    options?: {
      skipInvalidRows?: boolean;
      ignoreUnknownValues?: boolean;
      templateSuffix?: string;
    }
  ) {
    let response = await this.http.post(
      `/projects/${this.projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`,
      {
        kind: 'bigquery#tableDataInsertAllRequest',
        skipInvalidRows: options?.skipInvalidRows,
        ignoreUnknownValues: options?.ignoreUnknownValues,
        templateSuffix: options?.templateSuffix,
        rows
      }
    );
    return response.data;
  }

  // ── Copy Table ────────────────────────────────────────────────────────

  async createCopyJob(params: {
    sourceDatasetId: string;
    sourceTableId: string;
    sourceProjectId?: string;
    destinationDatasetId: string;
    destinationTableId: string;
    destinationProjectId?: string;
    writeDisposition?: string;
    createDisposition?: string;
  }) {
    let response = await this.http.post(`/projects/${this.projectId}/jobs`, {
      configuration: {
        copy: {
          sourceTable: {
            projectId: params.sourceProjectId || this.projectId,
            datasetId: params.sourceDatasetId,
            tableId: params.sourceTableId
          },
          destinationTable: {
            projectId: params.destinationProjectId || this.projectId,
            datasetId: params.destinationDatasetId,
            tableId: params.destinationTableId
          },
          writeDisposition: params.writeDisposition || 'WRITE_TRUNCATE',
          createDisposition: params.createDisposition || 'CREATE_IF_NEEDED'
        }
      },
      jobReference: {
        projectId: this.projectId,
        location: this.location
      }
    });
    return response.data;
  }

  // ── Load Job ──────────────────────────────────────────────────────────

  async createLoadJob(params: {
    datasetId: string;
    tableId: string;
    sourceUris: string[];
    sourceFormat: string;
    writeDisposition?: string;
    createDisposition?: string;
    autodetect?: boolean;
    schema?: { fields: any[] };
    skipLeadingRows?: number;
    maxBadRecords?: number;
    allowJaggedRows?: boolean;
    allowQuotedNewlines?: boolean;
    ignoreUnknownValues?: boolean;
    fieldDelimiter?: string;
  }) {
    let loadConfig: any = {
      destinationTable: {
        projectId: this.projectId,
        datasetId: params.datasetId,
        tableId: params.tableId
      },
      sourceUris: params.sourceUris,
      sourceFormat: params.sourceFormat,
      writeDisposition: params.writeDisposition || 'WRITE_APPEND',
      createDisposition: params.createDisposition || 'CREATE_IF_NEEDED',
      autodetect: params.autodetect,
      maxBadRecords: params.maxBadRecords,
      ignoreUnknownValues: params.ignoreUnknownValues
    };

    if (params.schema) {
      loadConfig.schema = params.schema;
    }

    if (params.sourceFormat === 'CSV') {
      loadConfig.skipLeadingRows = params.skipLeadingRows;
      loadConfig.allowJaggedRows = params.allowJaggedRows;
      loadConfig.allowQuotedNewlines = params.allowQuotedNewlines;
      loadConfig.fieldDelimiter = params.fieldDelimiter;
    }

    let response = await this.http.post(`/projects/${this.projectId}/jobs`, {
      configuration: { load: loadConfig },
      jobReference: {
        projectId: this.projectId,
        location: this.location
      }
    });
    return response.data;
  }

  // ── Extract/Export Job ────────────────────────────────────────────────

  async createExtractJob(params: {
    datasetId: string;
    tableId: string;
    destinationUris: string[];
    destinationFormat?: string;
    compression?: string;
    fieldDelimiter?: string;
    printHeader?: boolean;
  }) {
    let response = await this.http.post(`/projects/${this.projectId}/jobs`, {
      configuration: {
        extract: {
          sourceTable: {
            projectId: this.projectId,
            datasetId: params.datasetId,
            tableId: params.tableId
          },
          destinationUris: params.destinationUris,
          destinationFormat: params.destinationFormat || 'CSV',
          compression: params.compression || 'NONE',
          fieldDelimiter: params.fieldDelimiter,
          printHeader: params.printHeader
        }
      },
      jobReference: {
        projectId: this.projectId,
        location: this.location
      }
    });
    return response.data;
  }

  // ── Routines ──────────────────────────────────────────────────────────

  async listRoutines(
    datasetId: string,
    params?: { maxResults?: number; pageToken?: string; filter?: string }
  ) {
    let response = await this.http.get(
      `/projects/${this.projectId}/datasets/${datasetId}/routines`,
      {
        params: {
          maxResults: params?.maxResults,
          pageToken: params?.pageToken,
          filter: params?.filter
        }
      }
    );
    return response.data;
  }

  async getRoutine(datasetId: string, routineId: string) {
    let response = await this.http.get(
      `/projects/${this.projectId}/datasets/${datasetId}/routines/${routineId}`
    );
    return response.data;
  }

  async createRoutine(
    datasetId: string,
    routine: {
      routineId: string;
      routineType: string;
      language?: string;
      definitionBody: string;
      arguments?: Array<{ name: string; dataType: any; mode?: string }>;
      returnType?: any;
      description?: string;
    }
  ) {
    let response = await this.http.post(
      `/projects/${this.projectId}/datasets/${datasetId}/routines`,
      {
        routineReference: {
          projectId: this.projectId,
          datasetId,
          routineId: routine.routineId
        },
        routineType: routine.routineType,
        language: routine.language,
        definitionBody: routine.definitionBody,
        arguments: routine.arguments,
        returnType: routine.returnType,
        description: routine.description
      }
    );
    return response.data;
  }

  async deleteRoutine(datasetId: string, routineId: string) {
    await this.http.delete(
      `/projects/${this.projectId}/datasets/${datasetId}/routines/${routineId}`
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  async waitForJob(
    jobId: string,
    timeoutMs: number = 60000,
    intervalMs: number = 2000
  ): Promise<any> {
    let startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      let job = await this.getJob(jobId);
      if (job.status?.state === 'DONE') {
        return job;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`);
  }
}
