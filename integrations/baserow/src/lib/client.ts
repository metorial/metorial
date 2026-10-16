import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

export interface ClientConfig {
  token: string;
  authType: 'database_token' | 'jwt';
  baseUrl?: string;
  refreshToken?: string;
}

export let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Baserow',
    reason: 'baserow_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
  });

export let resolveBaseUrl = (...values: unknown[]) => {
  let value = values.find(value => typeof value === 'string' && value.length > 0);
  let baseUrl = typeof value === 'string' ? value : 'https://api.baserow.io';
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch (error) {
    throw createApiServiceError('Provide a valid Baserow instance base URL.', {
      parent: error
    });
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw createApiServiceError(
      'Use an HTTP or HTTPS Baserow instance URL without credentials, query parameters, or a fragment.'
    );
  }
  return baseUrl.replace(/\/+$/, '');
};

export let requireId = (value: number | undefined, name: string): number => {
  if (value === undefined || !Number.isSafeInteger(value) || value < 1) {
    throw createApiServiceError(`${name} must be a positive integer.`);
  }
  return value;
};

export let requireName = (value: string | undefined, name = 'name') => {
  if (!value?.trim())
    throw createApiServiceError(`${name} is required and must not be empty.`);
  return value;
};

export let readResponse = <T>(schema: z.ZodType<T>, data: unknown, resource: string): T => {
  let result = schema.safeParse(data);
  if (!result.success) {
    throw createApiServiceError(`Baserow returned a malformed ${resource} response.`, {
      reason: 'invalid_response'
    });
  }
  return result.data;
};

let record = z.record(z.string(), z.any());
let rowSchema = z.object({ id: z.number() }).catchall(z.any());
let tableSchema = z
  .object({ id: z.number(), name: z.string(), order: z.number(), database_id: z.number() })
  .catchall(z.any());
let fieldSchema = z
  .object({ id: z.number(), name: z.string(), type: z.string(), order: z.number() })
  .catchall(z.any());
let viewSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    order: z.number(),
    table_id: z.number()
  })
  .catchall(z.any());
let rowsSchema = z.array(rowSchema);

export interface ListRowsParams {
  tableId: number;
  page?: number;
  size?: number;
  search?: string;
  orderBy?: string;
  filterType?: 'AND' | 'OR';
  filters?: Record<string, string>;
  filterTree?: Record<string, unknown>;
  viewId?: number;
  userFieldNames?: boolean;
  include?: string;
  exclude?: string;
}
export interface CreateRowParams {
  tableId: number;
  rows: Record<string, any>[];
  userFieldNames?: boolean;
}
export interface UpdateRowParams {
  tableId: number;
  rowId: number;
  data: Record<string, any>;
  userFieldNames?: boolean;
}
export interface BatchUpdateRowsParams {
  tableId: number;
  rows: { id: number; [key: string]: any }[];
  userFieldNames?: boolean;
}
export interface WebhookConfig {
  name: string;
  url: string;
  includeAllEvents?: boolean;
  events?: string[];
  requestMethod?: string;
  headers?: Record<string, string>;
  useUserFieldNames?: boolean;
}

export let getClient = (ctx: { auth: ClientConfig; config: Record<string, unknown> }) =>
  new Client({ ...ctx.auth, baseUrl: resolveBaseUrl(ctx.auth.baseUrl, ctx.config.baseUrl) });

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    if (!config.token)
      throw createApiServiceError('Reconnect Baserow to provide an authentication token.');
    this.config = config;
    this.http = createAuthenticatedAxios({
      baseURL: resolveBaseUrl(config.baseUrl),
      authHeader: { value: `${config.authType === 'jwt' ? 'JWT' : 'Token'} ${config.token}` },
      errorAdapter: apiError
    });
  }

  requireJwt() {
    if (this.config.authType !== 'jwt')
      throw createApiServiceError(
        'This operation requires a Baserow JWT connection. Database tokens support table data operations and token table discovery.'
      );
  }

  async listRows(params: ListRowsParams) {
    requireId(params.tableId, 'tableId');
    if (params.page !== undefined) requireId(params.page, 'page');
    if (params.size !== undefined && requireId(params.size, 'size') > 200)
      throw createApiServiceError('size must be between 1 and 200.');
    if (params.viewId !== undefined) requireId(params.viewId, 'viewId');
    if (params.filterTree && params.filters && Object.keys(params.filters).length)
      throw createApiServiceError('Provide filterTree or filters, not both.');
    let query = pickDefined({
      page: params.page,
      size: params.size,
      search: params.search,
      order_by: params.orderBy,
      filter_type: params.filterType,
      view_id: params.viewId,
      user_field_names: params.userFieldNames,
      include: params.include,
      exclude: params.exclude
    });
    if (params.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        if (!/^filter__.+__[^_].*$/.test(key))
          throw createApiServiceError(
            'filters keys must use filter__{field}__{filter}, for example filter__field_123__equal.'
          );
        Object.assign(query, { [key]: value });
      }
    }
    if (params.filterTree)
      Object.assign(query, { filters: JSON.stringify(params.filterTree) });
    let response = await this.http.get(`/api/database/rows/table/${params.tableId}/`, {
      params: query
    });
    return readResponse(
      z
        .object({
          count: z.number(),
          next: z.string().nullable(),
          previous: z.string().nullable(),
          results: rowsSchema
        })
        .catchall(z.any()),
      response.data,
      'row list'
    );
  }

  async getRow(tableId: number, rowId: number, userFieldNames?: boolean) {
    let response = await this.http.get(
      `/api/database/rows/table/${requireId(tableId, 'tableId')}/${requireId(rowId, 'rowId')}/`,
      { params: pickDefined({ user_field_names: userFieldNames }) }
    );
    return readResponse(rowSchema, response.data, 'row');
  }

  async createRows(params: CreateRowParams) {
    requireId(params.tableId, 'tableId');
    if (!params.rows.length) throw createApiServiceError('Provide at least one row.');
    let options = { params: pickDefined({ user_field_names: params.userFieldNames }) };
    if (params.rows.length === 1) {
      let response = await this.http.post(
        `/api/database/rows/table/${params.tableId}/`,
        params.rows[0],
        options
      );
      return [readResponse(rowSchema, response.data, 'created row')];
    }
    let response = await this.http.post(
      `/api/database/rows/table/${params.tableId}/batch/`,
      { items: params.rows },
      options
    );
    return readResponse(z.object({ items: rowsSchema }), response.data, 'created rows').items;
  }

  async updateRow(params: UpdateRowParams) {
    let response = await this.http.patch(
      `/api/database/rows/table/${requireId(params.tableId, 'tableId')}/${requireId(params.rowId, 'rowId')}/`,
      params.data,
      { params: pickDefined({ user_field_names: params.userFieldNames }) }
    );
    return readResponse(rowSchema, response.data, 'updated row');
  }

  async batchUpdateRows(params: BatchUpdateRowsParams) {
    requireId(params.tableId, 'tableId');
    if (!params.rows.length) throw createApiServiceError('Provide at least one row.');
    for (let row of params.rows) requireId(row.id, 'rows[].id');
    let response = await this.http.patch(
      `/api/database/rows/table/${params.tableId}/batch/`,
      { items: params.rows },
      { params: pickDefined({ user_field_names: params.userFieldNames }) }
    );
    return readResponse(z.object({ items: rowsSchema }), response.data, 'updated rows').items;
  }

  async deleteRows(tableId: number, rowIds: number[]) {
    requireId(tableId, 'tableId');
    if (!rowIds.length) throw createApiServiceError('Provide at least one row ID.');
    for (let id of rowIds) requireId(id, 'rowIds[]');
    if (rowIds.length === 1)
      await this.http.delete(`/api/database/rows/table/${tableId}/${rowIds[0]}/`);
    else
      await this.http.post(`/api/database/rows/table/${tableId}/batch-delete/`, {
        items: rowIds
      });
  }

  async moveRow(tableId: number, rowId: number, beforeId?: number, userFieldNames?: boolean) {
    if (beforeId !== undefined) requireId(beforeId, 'beforeId');
    let response = await this.http.patch(
      `/api/database/rows/table/${requireId(tableId, 'tableId')}/${requireId(rowId, 'rowId')}/move/`,
      null,
      { params: pickDefined({ before_id: beforeId, user_field_names: userFieldNames }) }
    );
    return readResponse(rowSchema, response.data, 'moved row');
  }

  async listTokenTables() {
    if (this.config.authType !== 'database_token')
      throw createApiServiceError(
        'Token table discovery requires a Database Token connection. With JWT, use list_databases and list_tables.'
      );
    let response = await this.http.get('/api/database/tables/all-tables/');
    return readResponse(z.array(tableSchema), response.data, 'token table list');
  }

  async listTables(databaseId: number) {
    this.requireJwt();
    let response = await this.http.get(
      `/api/database/tables/database/${requireId(databaseId, 'databaseId')}/`
    );
    return readResponse(z.array(tableSchema), response.data, 'table list');
  }
  async getTable(tableId: number) {
    this.requireJwt();
    let response = await this.http.get(
      `/api/database/tables/${requireId(tableId, 'tableId')}/`
    );
    return readResponse(tableSchema, response.data, 'table');
  }
  async createTable(
    databaseId: number,
    name: string,
    data?: any[][],
    firstRowHeader?: boolean
  ) {
    this.requireJwt();
    let response = await this.http.post(
      `/api/database/tables/database/${requireId(databaseId, 'databaseId')}/`,
      pickDefined({ name: requireName(name), data, first_row_header: firstRowHeader })
    );
    return readResponse(tableSchema, response.data, 'created table');
  }
  async updateTable(tableId: number, name: string) {
    this.requireJwt();
    let response = await this.http.patch(
      `/api/database/tables/${requireId(tableId, 'tableId')}/`,
      { name: requireName(name) }
    );
    return readResponse(tableSchema, response.data, 'updated table');
  }
  async deleteTable(tableId: number) {
    this.requireJwt();
    await this.http.delete(`/api/database/tables/${requireId(tableId, 'tableId')}/`);
  }

  async listFields(tableId: number) {
    let response = await this.http.get(
      `/api/database/fields/table/${requireId(tableId, 'tableId')}/`
    );
    return readResponse(z.array(fieldSchema), response.data, 'field list');
  }
  async getField(fieldId: number) {
    this.requireJwt();
    let response = await this.http.get(
      `/api/database/fields/${requireId(fieldId, 'fieldId')}/`
    );
    return readResponse(fieldSchema, response.data, 'field');
  }
  async createField(tableId: number, field: Record<string, any>) {
    this.requireJwt();
    let response = await this.http.post(
      `/api/database/fields/table/${requireId(tableId, 'tableId')}/`,
      field
    );
    return readResponse(fieldSchema, response.data, 'created field');
  }
  async updateField(fieldId: number, data: Record<string, any>) {
    this.requireJwt();
    let response = await this.http.patch(
      `/api/database/fields/${requireId(fieldId, 'fieldId')}/`,
      data
    );
    return readResponse(fieldSchema, response.data, 'updated field');
  }
  async deleteField(fieldId: number) {
    this.requireJwt();
    await this.http.delete(`/api/database/fields/${requireId(fieldId, 'fieldId')}/`);
  }

  async listViews(
    tableId: number,
    options?: { include?: string; type?: string; limit?: number }
  ) {
    this.requireJwt();
    if (options?.limit !== undefined) requireId(options.limit, 'limit');
    let response = await this.http.get(
      `/api/database/views/table/${requireId(tableId, 'tableId')}/`,
      { params: options }
    );
    return readResponse(z.array(viewSchema), response.data, 'view list');
  }
  async getView(viewId: number) {
    this.requireJwt();
    let response = await this.http.get(`/api/database/views/${requireId(viewId, 'viewId')}/`);
    return readResponse(viewSchema, response.data, 'view');
  }
  async createView(tableId: number, view: Record<string, any>) {
    this.requireJwt();
    let response = await this.http.post(
      `/api/database/views/table/${requireId(tableId, 'tableId')}/`,
      view
    );
    return readResponse(viewSchema, response.data, 'created view');
  }
  async updateView(viewId: number, data: Record<string, any>) {
    this.requireJwt();
    let response = await this.http.patch(
      `/api/database/views/${requireId(viewId, 'viewId')}/`,
      data
    );
    return readResponse(viewSchema, response.data, 'updated view');
  }
  async deleteView(viewId: number) {
    this.requireJwt();
    await this.http.delete(`/api/database/views/${requireId(viewId, 'viewId')}/`);
  }

  async listWorkspaces() {
    this.requireJwt();
    let response = await this.http.get('/api/workspaces/');
    return readResponse(
      z.array(z.object({ id: z.number(), name: z.string() }).catchall(z.any())),
      response.data,
      'workspace list'
    );
  }
  async listApplications(workspaceId: number) {
    this.requireJwt();
    let response = await this.http.get(
      `/api/applications/workspace/${requireId(workspaceId, 'workspaceId')}/`
    );
    return readResponse(
      z.array(
        z.object({ id: z.number(), name: z.string(), type: z.string() }).catchall(z.any())
      ),
      response.data,
      'application list'
    );
  }

  async getCurrentUser() {
    this.requireJwt();
    if (!this.config.refreshToken)
      throw createApiServiceError(
        'Reconnect Baserow to obtain a refresh token for current-user verification.'
      );
    let response = await this.http.post('/api/user/token-verify/', {
      refresh_token: this.config.refreshToken
    });
    return readResponse(
      z.object({
        user: z.object({ username: z.string(), first_name: z.string() }).catchall(z.any())
      }),
      response.data,
      'current user'
    ).user;
  }

  async listWebhooks(tableId: number) {
    this.requireJwt();
    let response = await this.http.get(
      `/api/database/webhooks/table/${requireId(tableId, 'tableId')}/`
    );
    return readResponse(z.array(record), response.data, 'webhook list');
  }
  async getWebhook(webhookId: number) {
    this.requireJwt();
    let response = await this.http.get(
      `/api/database/webhooks/${requireId(webhookId, 'webhookId')}/`
    );
    return readResponse(record, response.data, 'webhook');
  }
  async createWebhook(tableId: number, webhook: WebhookConfig) {
    this.requireJwt();
    let body = {
      name: webhook.name,
      url: webhook.url,
      include_all_events: webhook.events?.length ? false : (webhook.includeAllEvents ?? false),
      request_method: webhook.requestMethod ?? 'POST',
      use_user_field_names: webhook.useUserFieldNames ?? true,
      ...pickDefined({ events: webhook.events, headers: webhook.headers })
    };
    let response = await this.http.post(
      `/api/database/webhooks/table/${requireId(tableId, 'tableId')}/`,
      body
    );
    return readResponse(record, response.data, 'created webhook');
  }
  async updateWebhook(webhookId: number, data: Partial<WebhookConfig>) {
    this.requireJwt();
    let response = await this.http.patch(
      `/api/database/webhooks/${requireId(webhookId, 'webhookId')}/`,
      pickDefined({
        name: data.name,
        url: data.url,
        include_all_events: data.includeAllEvents,
        request_method: data.requestMethod,
        use_user_field_names: data.useUserFieldNames,
        events: data.events,
        headers: data.headers
      })
    );
    return readResponse(record, response.data, 'updated webhook');
  }
  async deleteWebhook(webhookId: number) {
    this.requireJwt();
    await this.http.delete(`/api/database/webhooks/${requireId(webhookId, 'webhookId')}/`);
  }

  async uploadFileViaUrl(url: string) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (error) {
      throw createApiServiceError('Provide a valid publicly accessible fileUrl.', {
        parent: error
      });
    }
    if (!['http:', 'https:'].includes(parsed.protocol))
      throw createApiServiceError('fileUrl must use HTTP or HTTPS.');
    let response = await this.http.post('/api/user-files/upload-via-url/', { url });
    return readResponse(
      z
        .object({
          url: z.string(),
          name: z.string(),
          original_name: z.string().optional(),
          size: z.number(),
          mime_type: z.string().optional(),
          is_image: z.boolean().optional()
        })
        .catchall(z.any()),
      response.data,
      'uploaded file'
    );
  }
  async uploadFile(file: Uint8Array, filename: string) {
    let formData = new FormData();
    formData.append('file', new Blob([file]), filename);
    let response = await this.http.post('/api/user-files/upload-file/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    if (!isApiErrorRecord(response.data))
      throw createApiServiceError('Baserow returned a malformed uploaded file response.');
    return response.data;
  }
}
