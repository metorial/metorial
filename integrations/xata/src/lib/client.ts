import { createAxios } from 'slates';

export interface XataClientConfig {
  token: string;
  workspaceId?: string;
  region?: string;
  databaseName?: string;
  branch?: string;
}

export class XataCoreClient {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.xata.io',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // User
  async getUser(): Promise<any> {
    let response = await this.http.get('/user');
    return response.data;
  }

  // Workspaces
  async listWorkspaces(): Promise<any> {
    let response = await this.http.get('/workspaces');
    return response.data;
  }

  async getWorkspace(workspaceId: string): Promise<any> {
    let response = await this.http.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  async createWorkspace(params: { name: string; slug?: string }): Promise<any> {
    let response = await this.http.post('/workspaces', params);
    return response.data;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.http.delete(`/workspaces/${workspaceId}`);
  }

  async listWorkspaceMembers(workspaceId: string): Promise<any> {
    let response = await this.http.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  }

  async inviteWorkspaceMember(
    workspaceId: string,
    params: { email: string; role: string }
  ): Promise<any> {
    let response = await this.http.post(`/workspaces/${workspaceId}/invites`, params);
    return response.data;
  }
}

export class XataWorkspaceClient {
  private http: ReturnType<typeof createAxios>;
  private workspaceId: string;
  private region: string;

  constructor(config: { token: string; workspaceId: string; region: string }) {
    this.workspaceId = config.workspaceId;
    this.region = config.region;

    let baseURL = `https://${config.workspaceId}.${config.region}.xata.sh`;
    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Databases
  async listDatabases(): Promise<any> {
    let response = await this.http.get('/dbs');
    return response.data;
  }

  async createDatabase(
    dbName: string,
    params?: { region?: string; branchName?: string }
  ): Promise<any> {
    let response = await this.http.put(`/dbs/${dbName}`, params || {});
    return response.data;
  }

  async deleteDatabase(dbName: string): Promise<void> {
    await this.http.delete(`/dbs/${dbName}`);
  }

  async getDatabaseMetadata(dbName: string): Promise<any> {
    let response = await this.http.get(`/dbs/${dbName}`);
    return response.data;
  }

  // Branches
  async listBranches(dbName: string): Promise<any> {
    let response = await this.http.get(`/dbs/${dbName}`);
    return response.data;
  }

  async getBranch(dbName: string, branch: string): Promise<any> {
    let response = await this.http.get(`/db/${dbName}:${branch}`);
    return response.data;
  }

  async createBranch(
    dbName: string,
    branch: string,
    params?: { from?: string }
  ): Promise<any> {
    let response = await this.http.put(`/db/${dbName}:${branch}`, params || {});
    return response.data;
  }

  async deleteBranch(dbName: string, branch: string): Promise<void> {
    await this.http.delete(`/db/${dbName}:${branch}`);
  }

  // Tables
  async listTables(dbName: string, branch: string): Promise<any> {
    let response = await this.http.get(`/db/${dbName}:${branch}/tables`);
    return response.data;
  }

  async createTable(dbName: string, branch: string, tableName: string): Promise<any> {
    let response = await this.http.put(`/db/${dbName}:${branch}/tables/${tableName}`);
    return response.data;
  }

  async deleteTable(dbName: string, branch: string, tableName: string): Promise<void> {
    await this.http.delete(`/db/${dbName}:${branch}/tables/${tableName}`);
  }

  async getTableSchema(dbName: string, branch: string, tableName: string): Promise<any> {
    let response = await this.http.get(`/db/${dbName}:${branch}/tables/${tableName}/schema`);
    return response.data;
  }

  async getTableColumns(dbName: string, branch: string, tableName: string): Promise<any> {
    let response = await this.http.get(`/db/${dbName}:${branch}/tables/${tableName}/columns`);
    return response.data;
  }

  async addColumn(
    dbName: string,
    branch: string,
    tableName: string,
    column: any
  ): Promise<any> {
    let response = await this.http.post(
      `/db/${dbName}:${branch}/tables/${tableName}/columns`,
      column
    );
    return response.data;
  }

  async deleteColumn(
    dbName: string,
    branch: string,
    tableName: string,
    columnName: string
  ): Promise<void> {
    await this.http.delete(
      `/db/${dbName}:${branch}/tables/${tableName}/columns/${columnName}`
    );
  }

  // Records
  async insertRecord(
    dbName: string,
    branch: string,
    tableName: string,
    record: any,
    recordId?: string
  ): Promise<any> {
    if (recordId) {
      let response = await this.http.put(
        `/db/${dbName}:${branch}/tables/${tableName}/data/${recordId}`,
        record
      );
      return response.data;
    }
    let response = await this.http.post(
      `/db/${dbName}:${branch}/tables/${tableName}/data`,
      record
    );
    return response.data;
  }

  async getRecord(
    dbName: string,
    branch: string,
    tableName: string,
    recordId: string,
    columns?: string[]
  ): Promise<any> {
    let params: any = {};
    if (columns && columns.length > 0) {
      params.columns = columns.join(',');
    }
    let response = await this.http.get(
      `/db/${dbName}:${branch}/tables/${tableName}/data/${recordId}`,
      { params }
    );
    return response.data;
  }

  async updateRecord(
    dbName: string,
    branch: string,
    tableName: string,
    recordId: string,
    fields: any
  ): Promise<any> {
    let response = await this.http.patch(
      `/db/${dbName}:${branch}/tables/${tableName}/data/${recordId}`,
      fields
    );
    return response.data;
  }

  async upsertRecord(
    dbName: string,
    branch: string,
    tableName: string,
    recordId: string,
    record: any
  ): Promise<any> {
    let response = await this.http.post(
      `/db/${dbName}:${branch}/tables/${tableName}/data/${recordId}`,
      record
    );
    return response.data;
  }

  async deleteRecord(
    dbName: string,
    branch: string,
    tableName: string,
    recordId: string
  ): Promise<void> {
    await this.http.delete(`/db/${dbName}:${branch}/tables/${tableName}/data/${recordId}`);
  }

  async bulkInsertRecords(
    dbName: string,
    branch: string,
    tableName: string,
    records: any[]
  ): Promise<any> {
    let response = await this.http.post(`/db/${dbName}:${branch}/tables/${tableName}/bulk`, {
      records
    });
    return response.data;
  }

  // Transactions
  async executeTransaction(dbName: string, branch: string, operations: any[]): Promise<any> {
    let response = await this.http.post(`/db/${dbName}:${branch}/transaction`, { operations });
    return response.data;
  }

  // Query
  async queryTable(
    dbName: string,
    branch: string,
    tableName: string,
    params: {
      filter?: any;
      sort?: any;
      page?: any;
      columns?: string[];
      consistency?: string;
    }
  ): Promise<any> {
    let body: any = {};
    if (params.filter) body.filter = params.filter;
    if (params.sort) body.sort = params.sort;
    if (params.page) body.page = params.page;
    if (params.columns) body.columns = params.columns;
    if (params.consistency) body.consistency = params.consistency;

    let response = await this.http.post(
      `/db/${dbName}:${branch}/tables/${tableName}/query`,
      body
    );
    return response.data;
  }

  // Search
  async searchBranch(
    dbName: string,
    branch: string,
    params: {
      query: string;
      tables?: any[];
      fuzziness?: number;
      prefix?: string;
      highlight?: any;
    }
  ): Promise<any> {
    let response = await this.http.post(`/db/${dbName}:${branch}/search`, params);
    return response.data;
  }

  async searchTable(
    dbName: string,
    branch: string,
    tableName: string,
    params: {
      query: string;
      filter?: any;
      fuzziness?: number;
      prefix?: string;
      highlight?: any;
      boosters?: any[];
      page?: any;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/db/${dbName}:${branch}/tables/${tableName}/search`,
      params
    );
    return response.data;
  }

  // Vector Search
  async vectorSearch(
    dbName: string,
    branch: string,
    tableName: string,
    params: {
      queryVector: number[];
      column: string;
      similarityFunction?: string;
      size?: number;
      filter?: any;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/db/${dbName}:${branch}/tables/${tableName}/vectorSearch`,
      params
    );
    return response.data;
  }

  // Aggregation
  async aggregate(
    dbName: string,
    branch: string,
    tableName: string,
    params: {
      filter?: any;
      aggs: any;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/db/${dbName}:${branch}/tables/${tableName}/aggregate`,
      params
    );
    return response.data;
  }

  // Summarize
  async summarize(
    dbName: string,
    branch: string,
    tableName: string,
    params: {
      filter?: any;
      columns?: string[];
      summaries?: any;
      sort?: any;
      summariesFilter?: any;
      page?: { size?: number };
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/db/${dbName}:${branch}/tables/${tableName}/summarize`,
      params
    );
    return response.data;
  }

  // Ask AI
  async askTable(
    dbName: string,
    branch: string,
    tableName: string,
    params: {
      question: string;
      rules?: string[];
      searchType?: string;
      search?: any;
      sessionId?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/db/${dbName}:${branch}/tables/${tableName}/ask`,
      params
    );
    return response.data;
  }

  // Schema / Migrations
  async getBranchSchemaHistory(
    dbName: string,
    branch: string,
    params?: { page?: any }
  ): Promise<any> {
    let response = await this.http.post(
      `/db/${dbName}:${branch}/schema/history`,
      params || {}
    );
    return response.data;
  }

  async compareBranchSchemas(
    dbName: string,
    branch: string,
    params: { branchName: string }
  ): Promise<any> {
    let response = await this.http.post(
      `/db/${dbName}:${branch}/schema/compare/${params.branchName}`,
      {}
    );
    return response.data;
  }

  // File Attachments
  async getFileUrl(
    dbName: string,
    branch: string,
    tableName: string,
    recordId: string,
    columnName: string
  ): Promise<any> {
    let response = await this.http.get(
      `/db/${dbName}:${branch}/tables/${tableName}/data/${recordId}/column/${columnName}/file`
    );
    return response.data;
  }

  async putFile(
    dbName: string,
    branch: string,
    tableName: string,
    recordId: string,
    columnName: string,
    fileData: any
  ): Promise<any> {
    let response = await this.http.put(
      `/db/${dbName}:${branch}/tables/${tableName}/data/${recordId}/column/${columnName}/file`,
      fileData
    );
    return response.data;
  }

  async deleteFile(
    dbName: string,
    branch: string,
    tableName: string,
    recordId: string,
    columnName: string
  ): Promise<void> {
    await this.http.delete(
      `/db/${dbName}:${branch}/tables/${tableName}/data/${recordId}/column/${columnName}/file`
    );
  }
}
