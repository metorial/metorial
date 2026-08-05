import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';

export type OdooTransport = 'json2' | 'jsonrpc';

export type OdooDomainFilter = Array<string | [string, string, unknown]>;

export interface OdooVersionInfo {
  major: number;
  version: string;
  transport: OdooTransport;
}

export interface OdooClientConfig {
  instanceUrl: string;
  database?: string;
  uid: number;
  username: string;
  token: string;
  transport?: OdooTransport;
}

interface OdooMethodRequestBase {
  model: string;
  method: string;
  /** Named arguments used by JSON-2. */
  arguments?: Record<string, unknown>;
  /** Positional arguments used by legacy JSON-RPC. */
  legacyArguments?: unknown[];
  /** Keyword arguments used by legacy JSON-RPC. */
  legacyKeywordArguments?: Record<string, unknown>;
}

export interface OdooModelMethodRequest extends OdooMethodRequestBase {
  kind: 'model';
}

export interface OdooRecordMethodRequest extends OdooMethodRequestBase {
  kind: 'records';
  ids: number[];
}

export type OdooMethodRequest = OdooModelMethodRequest | OdooRecordMethodRequest;

type JsonRecord = Record<string, unknown>;

let isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let requiredText = (value: unknown, label: string) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createApiServiceError(`${label} is required.`, {
      reason: 'odoo_request_invalid'
    });
  }

  return value.trim();
};

let normalizedDatabase = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw createApiServiceError('Odoo database name must be text.', {
      reason: 'odoo_database_invalid'
    });
  }

  let database = value.trim();
  return database === '' ? undefined : database;
};

export let normalizeOdooInstanceUrl = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createApiServiceError('Odoo instance URL is required.', {
      reason: 'odoo_instance_url_required'
    });
  }

  let input = value.trim();
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw createApiServiceError(
      'Odoo instance URL must be a valid absolute HTTP or HTTPS URL.',
      { reason: 'odoo_instance_url_invalid' }
    );
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw createApiServiceError('Odoo instance URL must use HTTP or HTTPS.', {
      reason: 'odoo_instance_url_invalid'
    });
  }

  if (url.username !== '' || url.password !== '') {
    throw createApiServiceError('Odoo instance URL must not include a username or password.', {
      reason: 'odoo_instance_url_invalid'
    });
  }

  if (url.search !== '' || url.hash !== '') {
    throw createApiServiceError(
      'Odoo instance URL must not include query parameters or a fragment.',
      { reason: 'odoo_instance_url_invalid' }
    );
  }

  let pathname = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${pathname}`;
};

let odooApiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Odoo',
    operation,
    reason: 'odoo_api_request_failed'
  });

let invalidResponse = (operation: string) =>
  createApiServiceError(`Odoo returned an invalid response while ${operation}.`, {
    reason: 'odoo_response_invalid'
  });

let odooRpcError = (error: unknown, operation: string) => {
  let errorRecord = isRecord(error) ? error : {};
  let data = isRecord(errorRecord.data) ? errorRecord.data : {};
  let message =
    (typeof data.message === 'string' && data.message.trim() !== ''
      ? data.message
      : undefined) ??
    (typeof errorRecord.message === 'string' && errorRecord.message.trim() !== ''
      ? errorRecord.message
      : undefined) ??
    'The server rejected the request.';

  return buildApiServiceError(
    {
      response: {
        data: errorRecord,
        status: 400
      }
    },
    {
      providerLabel: 'Odoo',
      operation,
      reason: 'odoo_rpc_error',
      extractMessage: () => ` ${message}`,
      extractUpstreamCode: () => {
        let code = data.code ?? errorRecord.code;
        return typeof code === 'string'
          ? code
          : typeof code === 'number'
            ? String(code)
            : undefined;
      }
    }
  );
};

let parseJsonRpcResult = (data: unknown, expectedId: number, operation: string) => {
  if (!isRecord(data) || data.jsonrpc !== '2.0') {
    throw invalidResponse(operation);
  }

  if (data.id !== expectedId) {
    throw invalidResponse(operation);
  }

  if (data.error !== undefined) {
    throw odooRpcError(data.error, operation);
  }

  if (!Object.hasOwn(data, 'result')) {
    throw invalidResponse(operation);
  }

  return data.result;
};

let parseMajorVersion = (data: unknown): { major: number; version: string } | undefined => {
  if (!isRecord(data)) {
    return undefined;
  }

  let info = Array.isArray(data.version_info)
    ? data.version_info
    : Array.isArray(data.server_version_info)
      ? data.server_version_info
      : undefined;
  let majorValue = info?.[0];
  let versionValue = data.version ?? data.server_version;
  let major =
    typeof majorValue === 'number'
      ? majorValue
      : typeof majorValue === 'string'
        ? Number.parseInt(
            majorValue.trim().match(/^(?:saas~)?(\d+)(?:[.~+-].*)?$/i)?.[1] ?? '',
            10
          )
        : Number.NaN;

  if (!Number.isSafeInteger(major) || major <= 0) {
    return undefined;
  }

  let version =
    typeof versionValue === 'string' && versionValue.trim() !== ''
      ? versionValue.trim()
      : String(major);

  return { major, version };
};

let json2Headers = (token: string, database?: string) => ({
  Authorization: `bearer ${token}`,
  ...(database ? { 'X-Odoo-Database': database } : {})
});

export let detectOdooVersion = async (instanceUrl: string): Promise<OdooVersionInfo> => {
  let baseURL = normalizeOdooInstanceUrl(instanceUrl);
  let axios = createAxios({
    baseURL,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });

  try {
    let response = await axios.get('/web/version');
    let parsed = parseMajorVersion(response.data);
    if (parsed) {
      return {
        ...parsed,
        transport: parsed.major >= 19 ? 'json2' : 'jsonrpc'
      };
    }
  } catch {
    // Older servers may not expose /web/version. The documented legacy
    // common.version call remains the compatibility fallback.
  }

  let id = 1;
  try {
    let response = await axios.post('/jsonrpc', {
      jsonrpc: '2.0',
      method: 'call',
      id,
      params: {
        service: 'common',
        method: 'version',
        args: []
      }
    });
    let result = parseJsonRpcResult(response.data, id, 'detecting the server version');
    let parsed = parseMajorVersion(result);
    if (!parsed) {
      throw invalidResponse('detecting the server version');
    }

    return {
      ...parsed,
      transport: parsed.major >= 19 ? 'json2' : 'jsonrpc'
    };
  } catch (error) {
    throw odooApiError(error, 'detecting the server version');
  }
};

export let authenticateOdooJsonRpc = async ({
  instanceUrl,
  database,
  username,
  token
}: {
  instanceUrl: string;
  database: string;
  username: string;
  token: string;
}) => {
  let axios = createAxios({
    baseURL: normalizeOdooInstanceUrl(instanceUrl),
    headers: { 'Content-Type': 'application/json' }
  });
  let id = 1;

  try {
    let response = await axios.post('/jsonrpc', {
      jsonrpc: '2.0',
      method: 'call',
      id,
      params: {
        service: 'common',
        method: 'authenticate',
        args: [
          requiredText(database, 'Odoo database name'),
          requiredText(username, 'Odoo username'),
          requiredText(token, 'Odoo credential'),
          {}
        ]
      }
    });
    let result = parseJsonRpcResult(response.data, id, 'authenticating');
    if (typeof result !== 'number' || !Number.isInteger(result) || result <= 0) {
      throw createApiServiceError(
        'Odoo authentication failed. Check the credentials, instance URL, and database name.',
        { reason: 'odoo_authentication_failed' }
      );
    }

    return result;
  } catch (error) {
    throw odooApiError(error, 'authenticating');
  }
};

export let authenticateOdooJson2 = async ({
  instanceUrl,
  database,
  token
}: {
  instanceUrl: string;
  database?: string;
  token: string;
}) => {
  let normalizedToken = requiredText(token, 'Odoo API key');
  let axios = createAxios({
    baseURL: normalizeOdooInstanceUrl(instanceUrl),
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });

  try {
    let response = await axios.post(
      '/json/2/res.users/context_get',
      {},
      { headers: json2Headers(normalizedToken, normalizedDatabase(database)) }
    );
    if (!isRecord(response.data)) {
      throw invalidResponse('authenticating');
    }

    let uid = response.data.uid;
    if (typeof uid !== 'number' || !Number.isInteger(uid) || uid <= 0) {
      throw invalidResponse('authenticating');
    }

    return uid;
  } catch (error) {
    throw odooApiError(error, 'authenticating');
  }
};

export class OdooClient {
  private axios: ReturnType<typeof createAxios>;
  private database?: string;
  private uid: number;
  private token: string;
  private transport: OdooTransport;
  private requestId = 0;

  constructor(config: OdooClientConfig) {
    this.axios = createAxios({
      baseURL: normalizeOdooInstanceUrl(config.instanceUrl),
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
    this.database = normalizedDatabase(config.database);
    this.uid = config.uid;
    this.token = requiredText(config.token, 'Odoo credential');
    this.transport = config.transport ?? 'jsonrpc';

    if (!Number.isInteger(this.uid) || this.uid <= 0) {
      throw createApiServiceError('Odoo authenticated user ID is invalid.', {
        reason: 'odoo_auth_state_invalid'
      });
    }

    if (this.transport === 'jsonrpc' && !this.database) {
      throw createApiServiceError('Odoo database name is required for legacy JSON-RPC.', {
        reason: 'odoo_database_required'
      });
    }
  }

  private nextId(): number {
    this.requestId += 1;
    return this.requestId;
  }

  private async rpc(service: string, method: string, args: unknown[]): Promise<unknown> {
    let id = this.nextId();
    try {
      let response = await this.axios.post('/jsonrpc', {
        jsonrpc: '2.0',
        method: 'call',
        id,
        params: { service, method, args }
      });

      return parseJsonRpcResult(response.data, id, `calling ${method}`);
    } catch (error) {
      throw odooApiError(error, `calling ${method}`);
    }
  }

  private async json2(request: OdooMethodRequest): Promise<unknown> {
    let model = requiredText(request.model, 'Odoo model');
    let method = requiredText(request.method, 'Odoo method');
    let body: Record<string, unknown> = { ...(request.arguments ?? {}) };
    if (request.kind === 'records') {
      body.ids = request.ids;
    }

    try {
      let response = await this.axios.post(
        `/json/2/${encodeURIComponent(model)}/${encodeURIComponent(method)}`,
        body,
        { headers: json2Headers(this.token, this.database) }
      );
      if (response.data === undefined) {
        throw invalidResponse(`calling ${model}.${method}`);
      }

      return response.data;
    } catch (error) {
      throw odooApiError(error, `calling ${model}.${method}`);
    }
  }

  async request(request: OdooMethodRequest): Promise<unknown> {
    if (this.transport === 'json2') {
      return this.json2(request);
    }

    let args = [...(request.legacyArguments ?? [])];
    if (request.kind === 'records') {
      args.unshift(request.ids);
    }

    return this.executeKw(request.model, request.method, args, request.legacyKeywordArguments);
  }

  async callModelMethod(request: Omit<OdooModelMethodRequest, 'kind'>): Promise<unknown> {
    return this.request({ kind: 'model', ...request });
  }

  async callRecordMethod(request: Omit<OdooRecordMethodRequest, 'kind'>): Promise<unknown> {
    return this.request({ kind: 'records', ...request });
  }

  async executeKw(
    model: string,
    method: string,
    args: unknown[],
    kwargs?: Record<string, unknown>
  ): Promise<unknown> {
    if (this.transport === 'json2') {
      throw createApiServiceError(
        'Odoo JSON-2 requires named method arguments. Use callModelMethod or callRecordMethod for this request.',
        { reason: 'odoo_json2_named_arguments_required' }
      );
    }

    let callArgs: unknown[] = [this.database, this.uid, this.token, model, method, args];
    if (kwargs) {
      callArgs.push(kwargs);
    }
    return this.rpc('object', 'execute_kw', callArgs);
  }

  async searchRead(
    model: string,
    domain: OdooDomainFilter,
    options?: {
      fields?: string[];
      limit?: number;
      offset?: number;
      order?: string;
    }
  ): Promise<Record<string, unknown>[]> {
    let methodArguments: Record<string, unknown> = { domain };
    if (options?.fields) methodArguments.fields = options.fields;
    if (options?.limit !== undefined) methodArguments.limit = options.limit;
    if (options?.offset !== undefined) methodArguments.offset = options.offset;
    if (options?.order) methodArguments.order = options.order;

    let result = await this.callModelMethod({
      model,
      method: 'search_read',
      arguments: methodArguments,
      legacyArguments: [domain],
      legacyKeywordArguments: options
    });
    return this.requireRecordArray(result, `${model}.search_read`);
  }

  async search(
    model: string,
    domain: OdooDomainFilter,
    options?: {
      limit?: number;
      offset?: number;
      order?: string;
    }
  ): Promise<number[]> {
    let methodArguments: Record<string, unknown> = { domain };
    if (options?.limit !== undefined) methodArguments.limit = options.limit;
    if (options?.offset !== undefined) methodArguments.offset = options.offset;
    if (options?.order) methodArguments.order = options.order;

    let result = await this.callModelMethod({
      model,
      method: 'search',
      arguments: methodArguments,
      legacyArguments: [domain],
      legacyKeywordArguments: options
    });
    if (!Array.isArray(result) || !result.every(id => Number.isInteger(id) && id > 0)) {
      throw invalidResponse(`calling ${model}.search`);
    }
    return result as number[];
  }

  async searchCount(model: string, domain: OdooDomainFilter): Promise<number> {
    let result = await this.callModelMethod({
      model,
      method: 'search_count',
      arguments: { domain },
      legacyArguments: [domain]
    });
    if (typeof result !== 'number' || !Number.isInteger(result) || result < 0) {
      throw invalidResponse(`calling ${model}.search_count`);
    }
    return result;
  }

  async read(
    model: string,
    ids: number[],
    fields?: string[]
  ): Promise<Record<string, unknown>[]> {
    let result = await this.callRecordMethod({
      model,
      method: 'read',
      ids,
      arguments: fields ? { fields } : undefined,
      legacyKeywordArguments: fields ? { fields } : undefined
    });
    return this.requireRecordArray(result, `${model}.read`);
  }

  async create(model: string, values: Record<string, unknown>): Promise<number> {
    let result = await this.callModelMethod({
      model,
      method: 'create',
      arguments: { vals_list: values },
      legacyArguments: [values]
    });
    let id =
      typeof result === 'number'
        ? result
        : Array.isArray(result) && result.length === 1
          ? result[0]
          : isRecord(result)
            ? result.id
            : undefined;
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      throw invalidResponse(`calling ${model}.create`);
    }
    return id;
  }

  async write(
    model: string,
    ids: number[],
    values: Record<string, unknown>
  ): Promise<boolean> {
    let result = await this.callRecordMethod({
      model,
      method: 'write',
      ids,
      arguments: { vals: values },
      legacyArguments: [values]
    });
    return this.requireBoolean(result, `${model}.write`);
  }

  async unlink(model: string, ids: number[]): Promise<boolean> {
    let result = await this.callRecordMethod({ model, method: 'unlink', ids });
    return this.requireBoolean(result, `${model}.unlink`);
  }

  async fieldsGet(
    model: string,
    attributes?: string[]
  ): Promise<Record<string, Record<string, unknown>>> {
    let result = await this.callModelMethod({
      model,
      method: 'fields_get',
      arguments: attributes ? { attributes } : undefined,
      legacyKeywordArguments: attributes ? { attributes } : undefined
    });
    if (!isRecord(result) || !Object.values(result).every(isRecord)) {
      throw invalidResponse(`calling ${model}.fields_get`);
    }
    return result as Record<string, Record<string, unknown>>;
  }

  async callMethod(
    model: string,
    method: string,
    recordIds: number[],
    args?: unknown[],
    kwargs?: Record<string, unknown>
  ): Promise<unknown> {
    if (this.transport === 'json2' && args && args.length > 0) {
      throw createApiServiceError(
        'Odoo JSON-2 does not accept positional arguments. Pass method parameters as named keyword arguments.',
        { reason: 'odoo_json2_named_arguments_required' }
      );
    }

    if (recordIds.length === 0) {
      return this.callModelMethod({
        model,
        method,
        arguments: kwargs,
        legacyArguments: args,
        legacyKeywordArguments: kwargs
      });
    }

    return this.callRecordMethod({
      model,
      method,
      ids: recordIds,
      arguments: kwargs,
      legacyArguments: args,
      legacyKeywordArguments: kwargs
    });
  }

  private requireRecordArray(value: unknown, operation: string): Record<string, unknown>[] {
    if (!Array.isArray(value) || !value.every(isRecord)) {
      throw invalidResponse(`calling ${operation}`);
    }
    return value;
  }

  private requireBoolean(value: unknown, operation: string): boolean {
    if (typeof value !== 'boolean') {
      throw invalidResponse(`calling ${operation}`);
    }
    return value;
  }
}
