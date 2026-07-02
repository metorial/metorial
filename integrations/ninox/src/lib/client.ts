import { createAxios } from 'slates';

export interface NinoxTeam {
  id: string;
  name: string;
}

export interface NinoxDatabase {
  id: string;
  name: string;
}

export interface NinoxDatabaseSchema {
  id: string;
  settings: Record<string, any>;
  schema: Record<string, any>;
}

export interface NinoxField {
  id: string;
  name: string;
  type: string;
  choices?: Array<{ id: string; caption: string }>;
}

export interface NinoxTable {
  id: string;
  name: string;
  fields: NinoxField[];
}

export interface NinoxRecord {
  id: number;
  sequence?: number;
  createdAt?: string;
  createdBy?: string;
  modifiedAt?: string;
  modifiedBy?: string;
  fields: Record<string, any>;
}

export interface NinoxFileMetadata {
  name: string;
  contentType: string;
  size: number;
  modifiedDate?: string;
  modifiedUser?: string;
  seq?: number;
}

export interface NinoxView {
  id: string;
  order?: number;
  type?: string;
  caption?: string;
  config?: Record<string, any>;
  seq?: number;
}

export interface NinoxChanges {
  config?: Record<string, any>;
  nextRids?: Record<string, number>;
  nextRid?: number;
  updates: Record<string, any>;
  removes: string[];
  files: any[];
  views: Record<string, any>;
  reports?: Record<string, any>;
  seq: number;
}

export interface ListRecordsParams {
  page?: number;
  perPage?: number;
  order?: string;
  desc?: boolean;
  new?: boolean;
  updated?: boolean;
  sinceId?: number;
  sinceSq?: number;
  filters?: Record<string, any>;
  choiceStyle?: 'ids' | 'names';
  ids?: boolean;
}

export class Client {
  private baseUrl: string;
  private token: string;

  constructor(config: { baseUrl: string; token: string }) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.token = config.token;
  }

  private createAxios() {
    return createAxios({
      baseURL: `${this.baseUrl}/v1`,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Teams ---

  async listTeams(): Promise<NinoxTeam[]> {
    let ax = this.createAxios();
    let response = await ax.get('/teams');
    return response.data;
  }

  async getTeam(teamId: string): Promise<NinoxTeam> {
    let ax = this.createAxios();
    let response = await ax.get(`/teams/${teamId}`);
    return response.data;
  }

  // --- Databases ---

  async listDatabases(teamId: string): Promise<NinoxDatabase[]> {
    let ax = this.createAxios();
    let response = await ax.get(`/teams/${teamId}/databases`);
    return response.data;
  }

  async getDatabase(teamId: string, databaseId: string): Promise<NinoxDatabaseSchema> {
    let ax = this.createAxios();
    let response = await ax.get(`/teams/${teamId}/databases/${databaseId}`);
    return response.data;
  }

  // --- Tables ---

  async listTables(teamId: string, databaseId: string): Promise<NinoxTable[]> {
    let ax = this.createAxios();
    let response = await ax.get(`/teams/${teamId}/databases/${databaseId}/tables`);
    return response.data;
  }

  async getTable(teamId: string, databaseId: string, tableId: string): Promise<NinoxTable> {
    let ax = this.createAxios();
    let response = await ax.get(`/teams/${teamId}/databases/${databaseId}/tables/${tableId}`);
    return response.data;
  }

  // --- Records ---

  async listRecords(
    teamId: string,
    databaseId: string,
    tableId: string,
    params?: ListRecordsParams
  ): Promise<NinoxRecord[]> {
    let ax = this.createAxios();
    let queryParams: Record<string, any> = {};

    if (params) {
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.perPage !== undefined) queryParams.perPage = params.perPage;
      if (params.order !== undefined) queryParams.order = params.order;
      if (params.desc !== undefined) queryParams.desc = params.desc;
      if (params.new !== undefined) queryParams.new = params.new;
      if (params.updated !== undefined) queryParams.updated = params.updated;
      if (params.sinceId !== undefined) queryParams.sinceId = params.sinceId;
      if (params.sinceSq !== undefined) queryParams.sinceSq = params.sinceSq;
      if (params.choiceStyle !== undefined) queryParams.choiceStyle = params.choiceStyle;
      if (params.ids !== undefined) queryParams.ids = params.ids;
      if (params.filters !== undefined) queryParams.filters = JSON.stringify(params.filters);
    }

    let response = await ax.get(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/records`,
      { params: queryParams }
    );
    return response.data;
  }

  async getRecord(
    teamId: string,
    databaseId: string,
    tableId: string,
    recordId: number,
    params?: { choiceStyle?: 'ids' | 'names'; ids?: boolean }
  ): Promise<NinoxRecord> {
    let ax = this.createAxios();
    let queryParams: Record<string, any> = {};
    if (params?.choiceStyle) queryParams.choiceStyle = params.choiceStyle;
    if (params?.ids) queryParams.ids = params.ids;

    let response = await ax.get(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/records/${recordId}`,
      { params: queryParams }
    );
    return response.data;
  }

  async createRecords(
    teamId: string,
    databaseId: string,
    tableId: string,
    records: Array<{ fields: Record<string, any> }>
  ): Promise<NinoxRecord[]> {
    let ax = this.createAxios();
    let response = await ax.post(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/records`,
      records
    );
    return response.data;
  }

  async updateRecord(
    teamId: string,
    databaseId: string,
    tableId: string,
    recordId: number,
    fields: Record<string, any>
  ): Promise<NinoxRecord> {
    let ax = this.createAxios();
    let response = await ax.put(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/records/${recordId}`,
      { fields }
    );
    return response.data;
  }

  async upsertRecords(
    teamId: string,
    databaseId: string,
    tableId: string,
    records: Record<string, any>[]
  ): Promise<any[]> {
    let ax = this.createAxios();
    let response = await ax.post(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/records`,
      records
    );
    return response.data;
  }

  async deleteRecord(
    teamId: string,
    databaseId: string,
    tableId: string,
    recordId: number
  ): Promise<void> {
    let ax = this.createAxios();
    await ax.delete(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/records/${recordId}`
    );
  }

  async deleteRecords(
    teamId: string,
    databaseId: string,
    tableId: string,
    recordIds: number[]
  ): Promise<void> {
    let ax = this.createAxios();
    await ax.delete(`/teams/${teamId}/databases/${databaseId}/tables/${tableId}/records`, {
      data: recordIds
    });
  }

  // --- Query & Exec ---

  async query(teamId: string, databaseId: string, queryStr: string): Promise<any> {
    let ax = this.createAxios();
    let response = await ax.post(`/teams/${teamId}/databases/${databaseId}/query`, {
      query: queryStr
    });
    return response.data;
  }

  async exec(teamId: string, databaseId: string, queryStr: string): Promise<any> {
    let ax = this.createAxios();
    let response = await ax.post(`/teams/${teamId}/databases/${databaseId}/exec`, {
      query: queryStr
    });
    return response.data;
  }

  // --- Files ---

  async listFiles(
    teamId: string,
    databaseId: string,
    tableId: string,
    recordId: number
  ): Promise<NinoxFileMetadata[]> {
    let ax = this.createAxios();
    let response = await ax.get(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/records/${recordId}/files`
    );
    return response.data;
  }

  async getFileMetadata(
    teamId: string,
    databaseId: string,
    tableId: string,
    recordId: number,
    fileName: string
  ): Promise<NinoxFileMetadata> {
    let ax = this.createAxios();
    let response = await ax.get(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/records/${recordId}/files/${encodeURIComponent(fileName)}/metadata`
    );
    return response.data;
  }

  async deleteFile(
    teamId: string,
    databaseId: string,
    tableId: string,
    recordId: number,
    fileName: string
  ): Promise<void> {
    let ax = this.createAxios();
    await ax.delete(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/records/${recordId}/files/${encodeURIComponent(fileName)}`
    );
  }

  // --- Views ---

  async listDatabaseViews(teamId: string, databaseId: string): Promise<NinoxView[]> {
    let ax = this.createAxios();
    let response = await ax.get(`/teams/${teamId}/databases/${databaseId}/views`);
    return response.data;
  }

  async listTableViews(
    teamId: string,
    databaseId: string,
    tableId: string
  ): Promise<NinoxView[]> {
    let ax = this.createAxios();
    let response = await ax.get(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/views`
    );
    return response.data;
  }

  // --- Changes ---

  async getDatabaseChanges(
    teamId: string,
    databaseId: string,
    sinceSq: number
  ): Promise<NinoxChanges> {
    let ax = this.createAxios();
    let response = await ax.get(`/teams/${teamId}/databases/${databaseId}/changes`, {
      params: { sinceSq }
    });
    return response.data;
  }

  async getTableChanges(
    teamId: string,
    databaseId: string,
    tableId: string,
    sinceSq: number
  ): Promise<NinoxChanges> {
    let ax = this.createAxios();
    let response = await ax.get(
      `/teams/${teamId}/databases/${databaseId}/tables/${tableId}/changes`,
      { params: { sinceSq } }
    );
    return response.data;
  }
}
