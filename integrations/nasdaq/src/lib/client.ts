import { createApiServiceError } from 'slates';
import { z } from 'zod';
import {
  createNasdaqHttp,
  encodeCode,
  encodeTablePath,
  parseResponse,
  validateFilters,
  validateInteger
} from './http';

export let dataLinkBaseUrl = 'https://data.nasdaq.com/api/v3';
let columnSchema = z.object({ name: z.string().min(1), type: z.string() }).passthrough();
let datasetSchema = z
  .object({
    id: z.number(),
    dataset_code: z.string().min(1),
    database_code: z.string().min(1),
    name: z.string(),
    description: z.string(),
    refreshed_at: z.string().min(1),
    newest_available_date: z.string().min(1),
    oldest_available_date: z.string().min(1),
    column_names: z.array(z.string()),
    frequency: z.string(),
    type: z.string(),
    premium: z.boolean()
  })
  .passthrough();
let databaseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    database_code: z.string().min(1),
    description: z.string(),
    datasets_count: z.number(),
    downloads: z.number(),
    premium: z.boolean()
  })
  .passthrough();
let pageSchema = z
  .object({
    current_page: z.number(),
    total_pages: z.number(),
    total_count: z.number()
  })
  .passthrough();
let bulkExportSchema = z
  .object({
    datatable_bulk_download: z
      .object({
        file: z
          .object({
            link: z.string().nullable().optional(),
            status: z.string().min(1),
            data_snapshot_time: z.string().min(1).nullable().optional()
          })
          .passthrough(),
        datatable: z
          .object({ last_refreshed_time: z.string().min(1).nullable().optional() })
          .passthrough()
          .optional()
      })
      .passthrough()
  })
  .passthrough();

export interface TablesQueryParams {
  tablePath: string;
  filters?: Record<string, string>;
  columns?: string[];
  perPage?: number;
  cursorId?: string;
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

let validateDates = (params: TimeSeriesParams) => {
  for (let [key, value] of [
    ['startDate', params.startDate],
    ['endDate', params.endDate]
  ]) {
    if (
      value !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    ) {
      throw createApiServiceError(`${key} must be a valid YYYY-MM-DD date.`);
    }
  }
  if (params.startDate && params.endDate && params.startDate > params.endDate) {
    throw createApiServiceError('startDate must be on or before endDate.');
  }
};

export let mapRows = (columns: string[], data: unknown[][]) =>
  data.map(row => {
    if (row.length !== columns.length)
      throw createApiServiceError(
        'Nasdaq returned a row that does not match its column definitions.',
        { reason: 'nasdaq_invalid_response' }
      );
    return Object.fromEntries(columns.map((column, index) => [column, row[index]]));
  });

export class TablesClient {
  private apiKey: string;
  private http = createNasdaqHttp(dataLinkBaseUrl);

  constructor(config: { apiKey: string; authMethod: 'api_key' | 'oauth' }) {
    if (config.authMethod !== 'api_key' || !config.apiKey.trim()) {
      throw createApiServiceError('This tool requires a Nasdaq Data Link API Key connection.');
    }
    this.apiKey = config.apiKey;
  }

  async queryTable(params: TablesQueryParams) {
    validateFilters(params.filters);
    validateInteger(params.perPage, 'perPage', 1, 10_000);
    let query: Record<string, string> = { ...params.filters, api_key: this.apiKey };
    if (params.columns?.length) query['qopts.columns'] = params.columns.join(',');
    if (params.perPage !== undefined) query['qopts.per_page'] = String(params.perPage);
    if (params.cursorId) query['qopts.cursor_id'] = params.cursorId;
    let response = await this.http.get(
      `/datatables/${encodeTablePath(params.tablePath)}.json`,
      { params: query }
    );
    return parseResponse(
      z
        .object({
          datatable: z
            .object({ data: z.array(z.array(z.unknown())), columns: z.array(columnSchema) })
            .passthrough(),
          meta: z.object({ next_cursor_id: z.string().nullable() }).passthrough()
        })
        .passthrough(),
      response.data,
      'table query'
    );
  }

  async getTableMetadata(tablePath: string) {
    let response = await this.http.get(
      `/datatables/${encodeTablePath(tablePath)}/metadata.json`,
      { params: { api_key: this.apiKey } }
    );
    return parseResponse(
      z
        .object({
          datatable: z
            .object({
              vendor_code: z.string().min(1),
              datatable_code: z.string().min(1),
              name: z.string(),
              description: z.string(),
              columns: z.array(columnSchema),
              filters: z.array(z.string()),
              primary_key: z.array(z.string()),
              premium: z.boolean(),
              status: z
                .object({
                  refreshed_at: z.string().min(1),
                  status: z.string().min(1),
                  update_frequency: z.string()
                })
                .passthrough()
            })
            .passthrough()
        })
        .passthrough(),
      response.data,
      'table metadata'
    );
  }

  async getTimeSeriesData(params: TimeSeriesParams) {
    validateDates(params);
    validateInteger(params.limit, 'limit');
    validateInteger(params.columnIndex, 'columnIndex', 0);
    let query: Record<string, string> = { api_key: this.apiKey };
    if (params.startDate) query.start_date = params.startDate;
    if (params.endDate) query.end_date = params.endDate;
    if (params.order) query.order = params.order;
    if (params.collapse && params.collapse !== 'none') query.collapse = params.collapse;
    if (params.transform && params.transform !== 'none') query.transform = params.transform;
    if (params.limit !== undefined) query.limit = String(params.limit);
    if (params.columnIndex !== undefined) query.column_index = String(params.columnIndex);
    let response = await this.http.get(
      `/datasets/${encodeCode(params.databaseCode, 'Database code')}/${encodeCode(params.datasetCode, 'Dataset code')}/data.json`,
      { params: query }
    );
    return parseResponse(
      z
        .object({
          dataset_data: z
            .object({
              column_names: z.array(z.string()),
              data: z.array(z.array(z.unknown())),
              start_date: z.string().min(1),
              end_date: z.string().min(1),
              order: z.string(),
              frequency: z.string().nullish()
            })
            .passthrough()
        })
        .passthrough(),
      response.data,
      'time-series data'
    );
  }

  async getTimeSeries(params: { databaseCode: string; datasetCode: string }) {
    let response = await this.http.get(
      `/datasets/${encodeCode(params.databaseCode, 'Database code')}/${encodeCode(params.datasetCode, 'Dataset code')}.json`,
      { params: { api_key: this.apiKey, limit: 10, order: 'desc' } }
    );
    return parseResponse(
      z
        .object({ dataset: datasetSchema.extend({ data: z.array(z.array(z.unknown())) }) })
        .passthrough(),
      response.data,
      'dataset information'
    );
  }

  async searchDatasets(params: DatasetSearchParams) {
    validateInteger(params.perPage, 'perPage');
    validateInteger(params.page, 'page');
    let query: Record<string, string> = { api_key: this.apiKey, query: params.query };
    if (params.databaseCode) query.database_code = params.databaseCode;
    if (params.perPage !== undefined) query.per_page = String(params.perPage);
    if (params.page !== undefined) query.page = String(params.page);
    let response = await this.http.get('/datasets.json', { params: query });
    return parseResponse(
      z.object({ datasets: z.array(datasetSchema), meta: pageSchema }).passthrough(),
      response.data,
      'dataset search'
    );
  }

  async getDatabaseMetadata(databaseCode: string) {
    let response = await this.http.get(
      `/databases/${encodeCode(databaseCode, 'Database code')}.json`,
      { params: { api_key: this.apiKey } }
    );
    return parseResponse(
      z.object({ database: databaseSchema }).passthrough(),
      response.data,
      'database metadata'
    );
  }

  async listDatabases(params?: { perPage?: number; page?: number }) {
    validateInteger(params?.perPage, 'perPage');
    validateInteger(params?.page, 'page');
    let query: Record<string, string> = { api_key: this.apiKey };
    if (params?.perPage !== undefined) query.per_page = String(params.perPage);
    if (params?.page !== undefined) query.page = String(params.page);
    let response = await this.http.get('/databases.json', { params: query });
    return parseResponse(
      z.object({ databases: z.array(databaseSchema), meta: pageSchema }).passthrough(),
      response.data,
      'database list'
    );
  }

  async requestBulkExport(tablePath: string, filters?: Record<string, string>) {
    validateFilters(filters);
    let response = await this.http.get(`/datatables/${encodeTablePath(tablePath)}.json`, {
      params: { ...filters, api_key: this.apiKey, 'qopts.export': 'true' }
    });
    return parseResponse(bulkExportSchema, response.data, 'table export');
  }
}
