import { createAxios } from 'slates';

let TABLES_BASE_URL = 'https://data.nasdaq.com/api/v3';

export interface TablesQueryParams {
  tablePath: string;
  filters?: Record<string, string>;
  columns?: string[];
  perPage?: number;
  cursorId?: string;
  format?: 'json' | 'csv' | 'xml';
}

export interface TimeSeriesParams {
  databaseCode: string;
  datasetCode: string;
  startDate?: string;
  endDate?: string;
  order?: 'asc' | 'desc';
  collapse?: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  transform?: 'none' | 'diff' | 'rdiff' | 'rdiff_from' | 'cumul' | 'normalize';
  limit?: number;
  columnIndex?: number;
}

export interface DatasetSearchParams {
  query: string;
  databaseCode?: string;
  perPage?: number;
  page?: number;
}

export interface TableColumn {
  name: string;
  type: string;
}

export interface TablesResponse {
  datatable: {
    data: any[][];
    columns: TableColumn[];
  };
  meta: {
    next_cursor_id: string | null;
  };
}

export interface TimeSeriesResponse {
  dataset: {
    id: number;
    dataset_code: string;
    database_code: string;
    name: string;
    description: string;
    refreshed_at: string;
    newest_available_date: string;
    oldest_available_date: string;
    column_names: string[];
    frequency: string;
    type: string;
    premium: boolean;
    data: any[][];
  };
}

export interface TimeSeriesDataResponse {
  dataset_data: {
    column_names: string[];
    data: any[][];
    limit: number | null;
    order: string;
    collapse: string | null;
    transform: string | null;
    start_date: string;
    end_date: string;
    frequency: string;
  };
}

export interface DatasetSearchResponse {
  datasets: Array<{
    id: number;
    dataset_code: string;
    database_code: string;
    name: string;
    description: string;
    refreshed_at: string;
    newest_available_date: string;
    oldest_available_date: string;
    column_names: string[];
    frequency: string;
    type: string;
    premium: boolean;
    database_id: number;
  }>;
  meta: {
    query: string;
    per_page: number;
    current_page: number;
    prev_page: number | null;
    total_pages: number;
    total_count: number;
    next_page: number | null;
    current_first_item: number;
  };
}

export interface TableMetadataResponse {
  datatable: {
    vendor_code: string;
    datatable_code: string;
    name: string;
    description: string;
    columns: TableColumn[];
    filters: string[];
    primary_key: string[];
    premium: boolean;
    status: {
      refreshed_at: string;
      status: string;
      expected_at: string | null;
      update_frequency: string;
    };
  };
}

export interface DatabaseMetadataResponse {
  database: {
    id: number;
    name: string;
    database_code: string;
    description: string;
    datasets_count: number;
    downloads: number;
    premium: boolean;
    image: string;
    favorite: boolean;
    url_name: string;
  };
}

export interface BulkExportResponse {
  datatable_bulk_download: {
    file: {
      link: string;
      status: string;
      data_snapshot_time: string;
    };
    datatable: {
      last_refreshed_time: string;
    };
  };
}

export class TablesClient {
  private apiKey: string;
  private http;

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
    this.http = createAxios({
      baseURL: TABLES_BASE_URL
    });
  }

  async queryTable(params: TablesQueryParams): Promise<TablesResponse> {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey
    };

    if (params.columns && params.columns.length > 0) {
      queryParams['qopts.columns'] = params.columns.join(',');
    }

    if (params.perPage) {
      queryParams['qopts.per_page'] = String(params.perPage);
    }

    if (params.cursorId) {
      queryParams['qopts.cursor_id'] = params.cursorId;
    }

    if (params.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        queryParams[key] = value;
      }
    }

    let format = params.format || 'json';
    let response = await this.http.get(`/datatables/${params.tablePath}.${format}`, {
      params: queryParams
    });

    return response.data;
  }

  async getTableMetadata(tablePath: string): Promise<TableMetadataResponse> {
    let response = await this.http.get(`/datatables/${tablePath}/metadata.json`, {
      params: { api_key: this.apiKey }
    });
    return response.data;
  }

  async getTimeSeriesData(params: TimeSeriesParams): Promise<TimeSeriesDataResponse> {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey
    };

    if (params.startDate) queryParams.start_date = params.startDate;
    if (params.endDate) queryParams.end_date = params.endDate;
    if (params.order) queryParams.order = params.order;
    if (params.collapse && params.collapse !== 'none') queryParams.collapse = params.collapse;
    if (params.transform && params.transform !== 'none')
      queryParams.transform = params.transform;
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.columnIndex !== undefined)
      queryParams.column_index = String(params.columnIndex);

    let response = await this.http.get(
      `/datasets/${params.databaseCode}/${params.datasetCode}/data.json`,
      { params: queryParams }
    );

    return response.data;
  }

  async getTimeSeries(params: {
    databaseCode: string;
    datasetCode: string;
  }): Promise<TimeSeriesResponse> {
    let response = await this.http.get(
      `/datasets/${params.databaseCode}/${params.datasetCode}.json`,
      { params: { api_key: this.apiKey } }
    );
    return response.data;
  }

  async searchDatasets(params: DatasetSearchParams): Promise<DatasetSearchResponse> {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey,
      query: params.query
    };

    if (params.databaseCode) queryParams.database_code = params.databaseCode;
    if (params.perPage) queryParams.per_page = String(params.perPage);
    if (params.page) queryParams.page = String(params.page);

    let response = await this.http.get('/datasets.json', {
      params: queryParams
    });

    return response.data;
  }

  async getDatabaseMetadata(databaseCode: string): Promise<DatabaseMetadataResponse> {
    let response = await this.http.get(`/databases/${databaseCode}.json`, {
      params: { api_key: this.apiKey }
    });
    return response.data;
  }

  async listDatabases(params?: { perPage?: number; page?: number }): Promise<{
    databases: Array<{
      id: number;
      name: string;
      database_code: string;
      description: string;
      datasets_count: number;
      downloads: number;
      premium: boolean;
    }>;
    meta: {
      query: string;
      per_page: number;
      current_page: number;
      total_pages: number;
      total_count: number;
      next_page: number | null;
    };
  }> {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey
    };

    if (params?.perPage) queryParams.per_page = String(params.perPage);
    if (params?.page) queryParams.page = String(params.page);

    let response = await this.http.get('/databases.json', {
      params: queryParams
    });

    return response.data;
  }

  async requestBulkExport(
    tablePath: string,
    filters?: Record<string, string>
  ): Promise<BulkExportResponse> {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey,
      'qopts.export': 'true'
    };

    if (filters) {
      for (let [key, value] of Object.entries(filters)) {
        queryParams[key] = value;
      }
    }

    let response = await this.http.get(`/datatables/${tablePath}.json`, {
      params: queryParams
    });

    return response.data;
  }
}
