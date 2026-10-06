import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  pickDefined
} from 'slates';
import { bindRow, mapApplication, mapTable, mapUser } from './models';
import {
  appId,
  baseUrl,
  changes,
  credentialVariants,
  invalid,
  malformed,
  object,
  pathId,
  records,
  required,
  safeJson,
  validateTarArchive
} from './validation';

export class Client {
  private readonly axios: ReturnType<typeof createAxios>;
  private readonly secrets: string[];
  private readonly resource: 'workspaces' | 'applications';
  private readonly scope?: string;
  static fromContext(
    ctx: {
      auth: { token: string; baseUrl?: string; apiResource?: 'workspaces' | 'applications' };
      config: Record<string, unknown>;
    },
    scope?: string
  ) {
    return new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      apiResource: ctx.auth.apiResource ?? 'applications',
      appId: scope
    });
  }
  constructor(params: {
    token: string;
    baseUrl: unknown;
    appId?: string;
    apiResource?: 'workspaces' | 'applications';
  }) {
    this.secrets = credentialVariants(params.token);
    const origin = baseUrl(params.baseUrl);
    safeJson(origin, this.secrets);
    this.resource = params.apiResource ?? 'applications';
    if (!['workspaces', 'applications'].includes(this.resource))
      invalid('Choose a documented workspace or legacy application API resource.');
    this.scope = params.appId === undefined ? undefined : appId(params.appId);
    safeJson(this.scope, this.secrets);
    let headers: Record<string, string> = {
      'x-budibase-api-key': params.token,
      'Content-Type': 'application/json'
    };
    if (this.scope) {
      headers['x-budibase-app-id'] = this.scope;
    }

    this.axios = createAxios({
      baseURL: origin,
      headers,
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 4 * 1024 * 1024,
      maxBodyLength: 4 * 1024 * 1024
    });
  }

  private scoped(): string {
    if (!this.scope) return invalid('This action requires an exact application/workspace ID.');
    return this.scope;
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    empty = false
  ): Promise<unknown> {
    safeJson({ path, data }, this.secrets);
    try {
      const response = await this.axios.request<unknown>({
        method,
        url: path,
        data: data === undefined ? undefined : pickDefined(object(data))
      });
      if (response.status !== (empty ? 204 : 200)) malformed();
      if (empty) return undefined;
      safeJson(response.data, this.secrets, true);
      return object(response.data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      const nativeStatus = getApiErrorStatus(error);
      const status =
        typeof nativeStatus === 'number' &&
        Number.isInteger(nativeStatus) &&
        nativeStatus >= 100 &&
        nativeStatus <= 599
          ? nativeStatus
          : undefined;
      throw buildApiServiceError(
        { response: { status } },
        {
          providerLabel: 'Budibase',
          reason: 'budibase_api_error',
          parent: {},
          operation: 'request',
          extractMessage: () =>
            'Check the instance, resource, API key permissions and edition. Reconcile uncertain writes before retrying.'
        }
      );
    }
  }
  private async data(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
    const envelope = object(await this.request(method, path, body));
    if (!Object.hasOwn(envelope, 'data')) malformed();
    return envelope.data;
  }

  async createApplication(data: { name: string; url?: string }) {
    required(data.name, 'Application name');
    const result = await this.data('POST', `/${this.resource}`, data);
    mapApplication(result);
    return result;
  }

  async getApplication(id: string) {
    const nativeId = appId(id);
    const result = await this.data('GET', `/${this.resource}/${encodeURIComponent(nativeId)}`);
    mapApplication(result, nativeId);
    return result;
  }

  async updateApplication(id: string, data: { name?: string; url?: string }) {
    const nativeId = appId(id);
    const supplied = changes(data);
    if (data.name !== undefined) required(data.name, 'Application name');
    // The current native controller implements partial updates despite the PUT verb.
    const result = await this.data(
      'PUT',
      `/${this.resource}/${encodeURIComponent(nativeId)}`,
      supplied
    );
    mapApplication(result, nativeId);
    return result;
  }

  async deleteApplication(id: string): Promise<void> {
    const nativeId = appId(id);
    await this.getApplication(nativeId);
    mapApplication(
      await this.data('DELETE', `/${this.resource}/${encodeURIComponent(nativeId)}`),
      nativeId
    );
  }

  async searchApplications(body: { name?: string } = {}) {
    const result = records(await this.data('POST', `/${this.resource}/search`, body));
    result.forEach(row => mapApplication(row));
    return result;
  }

  async publishApplication(id: string) {
    const nativeId = appId(id);
    if (!nativeId.startsWith('app_dev_'))
      invalid('Publish requires the exact development workspace ID (app_dev_*).');
    await this.getApplication(nativeId);
    const result = object(
      await this.data('POST', `/${this.resource}/${encodeURIComponent(nativeId)}/publish`, {})
    );
    pathId(result._id, 'Deployment ID');
    if (
      !['SUCCESS', 'FAILURE'].includes(String(result.status)) ||
      typeof result.appUrl !== 'string'
    )
      malformed();
    return result;
  }

  async unpublishApplication(id: string): Promise<void> {
    const nativeId = appId(id);
    if (!nativeId.startsWith('app_dev_'))
      invalid('Unpublish requires the exact development workspace ID (app_dev_*).');
    await this.getApplication(nativeId);
    await this.request(
      'POST',
      `/${this.resource}/${encodeURIComponent(nativeId)}/unpublish`,
      {},
      true
    );
  }

  async createTable(data: {
    name: string;
    primaryDisplay?: string;
    schema?: Record<string, unknown>;
  }) {
    this.scoped();
    required(data.name, 'Table name');
    if (data.schema === undefined)
      invalid('Table creation requires schema; provide {} for an empty table.');
    const result = await this.data('POST', '/tables', data);
    mapTable(result);
    return result;
  }

  async getTable(id: string) {
    this.scoped();
    const nativeId = pathId(id, 'Table ID');
    const result = await this.data('GET', `/tables/${encodeURIComponent(nativeId)}`);
    mapTable(result, nativeId);
    return result;
  }

  async updateTable(
    id: string,
    data: { name?: string; primaryDisplay?: string; schema?: Record<string, unknown> }
  ) {
    const nativeId = pathId(id, 'Table ID');
    const supplied = changes(data);
    safeJson(supplied, this.secrets);
    if (data.name !== undefined) required(data.name, 'Table name');
    const current = object(await this.getTable(nativeId));
    // Native PUT requires name/schema and replaces omitted views. Carry the exact current
    // metadata, excluding row-import/rename fields, before applying explicitly supplied fields.
    const { rows: _rows, _rename, ...metadata } = current;
    const result = await this.data('PUT', `/tables/${encodeURIComponent(nativeId)}`, {
      ...metadata,
      ...supplied,
      _id: nativeId
    });
    mapTable(result, nativeId);
    return result;
  }

  async deleteTable(id: string): Promise<void> {
    const nativeId = pathId(id, 'Table ID');
    await this.getTable(nativeId);
    mapTable(await this.data('DELETE', `/tables/${encodeURIComponent(nativeId)}`), nativeId);
  }

  async searchTables(body: { name?: string } = {}) {
    this.scoped();
    const result = records(await this.data('POST', '/tables/search', body));
    result.forEach(row => mapTable(row));
    return result;
  }

  private rowFields(tableId: string, data: Record<string, unknown>, rowId?: string) {
    this.scoped();
    pathId(tableId, 'Table ID');
    safeJson(data, this.secrets);
    if (
      (data.tableId !== undefined && data.tableId !== tableId) ||
      (data._id !== undefined && data._id !== rowId)
    )
      invalid('Row fields must not override the bound row or table ID.');
    if (data.type !== undefined && data.type !== 'row') invalid('Row type must be row.');
    return data;
  }
  async createRow(tableId: string, data: Record<string, unknown>) {
    const nativeId = pathId(tableId, 'Table ID');
    this.rowFields(nativeId, data);
    return bindRow(
      await this.data('POST', `/tables/${encodeURIComponent(nativeId)}/rows`, data),
      nativeId
    );
  }

  async getRow(tableId: string, rowId: string) {
    this.scoped();
    const table = pathId(tableId, 'Table ID'),
      row = pathId(rowId, 'Row ID');
    return bindRow(
      await this.data(
        'GET',
        `/tables/${encodeURIComponent(table)}/rows/${encodeURIComponent(row)}`
      ),
      table,
      row
    );
  }

  async updateRow(tableId: string, rowId: string, data: Record<string, unknown>) {
    const table = pathId(tableId, 'Table ID'),
      row = pathId(rowId, 'Row ID');
    const supplied = this.rowFields(table, changes(data), row);
    const current = await this.getRow(table, row);
    const tableMetadata = object(await this.getTable(table));
    const definitions = object(tableMetadata.schema);
    const retained = { ...current };
    // GET enriches relationships; native writes use their row IDs, not display objects.
    for (const [column, definition] of Object.entries(definitions)) {
      if (object(definition).type !== 'link' || supplied[column] !== undefined) continue;
      const value = retained[column];
      if (value === undefined || value === null) continue;
      if (!Array.isArray(value)) malformed();
      retained[column] = value.map(item =>
        pathId(typeof item === 'string' ? item : object(item)._id, 'Related row ID')
      );
    }
    return bindRow(
      await this.data(
        'PUT',
        `/tables/${encodeURIComponent(table)}/rows/${encodeURIComponent(row)}`,
        { ...retained, ...supplied, _id: row, tableId: table }
      ),
      table,
      row
    );
  }

  async deleteRow(tableId: string, rowId: string): Promise<void> {
    const table = pathId(tableId, 'Table ID'),
      row = pathId(rowId, 'Row ID');
    await this.getRow(table, row);
    bindRow(
      await this.data(
        'DELETE',
        `/tables/${encodeURIComponent(table)}/rows/${encodeURIComponent(row)}`
      ),
      table,
      row
    );
  }

  async searchRows(
    tableId: string,
    body: {
      query?: Record<string, unknown>;
      paginate?: boolean;
      bookmark?: string | number;
      limit?: number;
      sort?: {
        column?: string;
        order?: 'ascending' | 'descending';
        type?: 'string' | 'number';
      };
    } = {}
  ) {
    this.scoped();
    const table = pathId(tableId, 'Table ID');
    if (
      body.limit !== undefined &&
      (!Number.isInteger(body.limit) || body.limit < 1 || body.limit > 1000)
    )
      invalid(
        'limit must be an integer from 1 to 1000 (the conservative internal-table limit).'
      );
    if (body.bookmark !== undefined && body.paginate === false)
      invalid('A bookmark requires pagination.');
    if (
      typeof body.bookmark === 'number' &&
      (!Number.isSafeInteger(body.bookmark) || body.bookmark < 0)
    )
      invalid('Numeric bookmarks must be nonnegative safe integers.');
    const envelope = object(
      await this.request('POST', `/tables/${encodeURIComponent(table)}/rows/search`, {
        ...body,
        paginate: body.paginate ?? true,
        limit: body.limit ?? 100
      })
    );
    const rows = records(envelope.data).map(row => bindRow(row, table));
    const bookmark = envelope.bookmark;
    if (
      bookmark !== undefined &&
      typeof bookmark !== 'string' &&
      (typeof bookmark !== 'number' || !Number.isSafeInteger(bookmark))
    )
      malformed();
    if (envelope.hasNextPage !== undefined && typeof envelope.hasNextPage !== 'boolean')
      malformed();
    if (envelope.hasNextPage === true && bookmark === undefined) malformed();
    return {
      rows,
      bookmark: bookmark as string | number | undefined,
      hasNextPage: envelope.hasNextPage as boolean | undefined
    };
  }

  async createUser(data: {
    email: string;
    password?: string;
    status?: string;
    firstName?: string;
    lastName?: string;
    forceResetPassword?: boolean;
    builder?: { global?: boolean };
    admin?: { global?: boolean };
    roles?: Record<string, string>;
  }) {
    required(data.email, 'Email');
    const result = await this.data('POST', '/users', data);
    mapUser(result);
    this.confirmUserFields(object(result), data);
    return result;
  }

  async getUser(id: string) {
    const nativeId = pathId(id, 'User ID');
    const result = await this.data('GET', `/users/${encodeURIComponent(nativeId)}`);
    mapUser(result, nativeId);
    return result;
  }

  async updateUser(
    userId: string,
    data: {
      email?: string;
      password?: string;
      status?: string;
      firstName?: string;
      lastName?: string;
      forceResetPassword?: boolean;
      builder?: { global?: boolean };
      admin?: { global?: boolean };
      roles?: Record<string, string>;
    }
  ) {
    const nativeId = pathId(userId, 'User ID');
    const supplied = changes(data);
    safeJson(supplied, this.secrets);
    const current = mapUser(await this.getUser(nativeId), nativeId);
    const result = await this.data('PUT', `/users/${encodeURIComponent(nativeId)}`, {
      ...supplied,
      email: data.email ?? current.email
    });
    mapUser(result, nativeId);
    this.confirmUserFields(object(result), supplied);
    return result;
  }

  private confirmUserFields(
    row: Record<string, unknown>,
    supplied: Record<string, unknown>
  ): void {
    for (const [key, value] of Object.entries(supplied)) {
      if (value === undefined || key === 'password') continue;
      if (key === 'builder' || key === 'admin') {
        const requested = object(value);
        if (requested.global !== undefined && object(row[key]).global !== requested.global)
          malformed();
      } else if (key === 'roles') {
        if (
          JSON.stringify(Object.entries(object(value)).sort()) !==
          JSON.stringify(Object.entries(object(row.roles)).sort())
        )
          malformed();
      } else if (row[key] !== value) malformed();
    }
  }
  async deleteUser(id: string): Promise<void> {
    const nativeId = pathId(id, 'User ID');
    await this.getUser(nativeId);
    mapUser(await this.data('DELETE', `/users/${encodeURIComponent(nativeId)}`), nativeId);
  }

  async searchUsers(body: { name?: string } = {}) {
    const result = records(await this.data('POST', '/users/search', body));
    result.forEach(row => mapUser(row));
    return result;
  }

  async searchQueries(body: { name?: string } = {}) {
    this.scoped();
    const result = records(await this.data('POST', '/queries/search', body));
    result.forEach(row => pathId(row._id, 'Native query ID'));
    return result;
  }

  async executeQuery(
    queryId: string,
    parameters?: Record<string, string>,
    pagination?: { page?: string; limit?: number }
  ) {
    this.scoped();
    const id = pathId(queryId, 'Query ID');
    safeJson({ parameters, pagination }, this.secrets);
    if (
      pagination?.limit !== undefined &&
      (!Number.isInteger(pagination.limit) || pagination.limit < 1 || pagination.limit > 1000)
    )
      invalid('Query pagination limit must be an integer from 1 to 1000.');
    const candidates = (await this.searchQueries()).filter(row => row._id === id);
    if (candidates.length !== 1)
      invalid(
        'Discover one exact query in the specified application before executing. Queries can have external write effects.'
      );
    const response = object(
      await this.request('POST', `/queries/${encodeURIComponent(id)}`, {
        parameters: parameters ?? {},
        pagination
      })
    );
    records(response.data);
    if (response.pagination !== undefined) object(response.pagination);
    return {
      results: response.data,
      pagination: response.pagination as Record<string, unknown> | undefined
    };
  }
  async exportApplication(id: string, excludeRows = true) {
    const nativeId = appId(id);
    const current = mapApplication(await this.getApplication(nativeId), nativeId);
    const path = `/${this.resource}/${encodeURIComponent(nativeId)}/export`;
    safeJson(path, this.secrets);
    try {
      const response = await this.axios.request<ArrayBuffer>({
        method: 'POST',
        url: path,
        data: { encryptPassword: '', excludeRows },
        responseType: 'arraybuffer',
        maxContentLength: 8 * 1024 * 1024
      });
      const bytes = new Uint8Array(response.data);
      const mime = getResponseHeaderValue(response.headers, 'content-type');
      if (
        response.status !== 200 ||
        !mime?.toLowerCase().includes('gzip') ||
        bytes.length < 2 ||
        bytes.length > 8 * 1024 * 1024 ||
        bytes[0] !== 0x1f ||
        bytes[1] !== 0x8b
      )
        malformed();
      // Check the uncompressed archive for credential reflection before delivering generated content.
      const { gunzipSync } = await import('node:zlib');
      let uncompressed: Buffer;
      try {
        uncompressed = gunzipSync(bytes, { maxOutputLength: 16 * 1024 * 1024 });
      } catch {
        return malformed();
      }
      validateTarArchive(uncompressed);
      safeJson(uncompressed.toString('utf8'), this.secrets, true, 6 * 16 * 1024 * 1024 + 2);
      return { bytes, application: current, excludeRows };
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      const nativeStatus = getApiErrorStatus(error);
      const status =
        typeof nativeStatus === 'number' &&
        Number.isInteger(nativeStatus) &&
        nativeStatus >= 100 &&
        nativeStatus <= 599
          ? nativeStatus
          : undefined;
      throw buildApiServiceError(
        { response: { status } },
        {
          providerLabel: 'Budibase',
          reason: 'budibase_export_error',
          parent: {},
          extractMessage: () =>
            'Export requires a licensed edition and appropriate workspace permissions. Use the dashboard for exports exceeding the 8 MiB download or 16 MiB expanded validation limit.'
        }
      );
    }
  }
}
