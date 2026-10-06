import { isServiceError } from '@lowerdeck/error';
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  getAdapter
} from 'axios';
import { createAuthenticatedAxios, pickDefined } from 'slates';
import {
  encodedId,
  importedSecrets,
  nativeStatus,
  payloadSize,
  publicData,
  resolveBase,
  safePayload,
  serviceFailure,
  tokenValue
} from './http';
import {
  invalid,
  jsonObject,
  malformed,
  nativeConnection,
  nativeIntegration,
  nativeMetadata,
  nativeSuccess,
  parse,
  text,
  z
} from './schemas';
export type SyncSpec = string | { name: string; variant?: string };
export type NangoClientConfig = {
  token: string;
  baseUrl?: string;
  legacyConfig?: Record<string, unknown>;
};
export class NangoClient {
  private readonly http: AxiosInstance;
  private readonly token: string;
  readonly baseUrl: string;
  constructor(config: NangoClientConfig) {
    const token = tokenValue(config.token);
    this.token = token;
    this.baseUrl = resolveBase(config, config.legacyConfig);
    const nativeAdapter = getAdapter(axios.defaults.adapter);
    this.http = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: { value: 'Bearer ' + token },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 10 * 1024 * 1024,
      maxBodyLength: 1024 * 1024,
      adapter: async request => {
        const requestUrl = new URL(request.url ?? '', request.baseURL);
        if (requestUrl.origin !== this.baseUrl)
          throw invalid('The request does not match the connected Nango instance.');
        const sent =
          typeof request.data === 'string'
            ? (() => {
                try {
                  return JSON.parse(request.data);
                } catch {
                  return undefined;
                }
              })()
            : request.data;
        const supplied =
          sent && typeof sent === 'object' && 'credentials' in sent
            ? sent.credentials
            : undefined;
        const secrets = { token, supplied: importedSecrets(supplied) };
        const safeHeaders = (headers: unknown, strict = false) => {
          try {
            const source = headers as AxiosResponse['headers'] | undefined;
            return AxiosHeaders.from(
              publicData(
                typeof source?.toJSON === 'function' ? source.toJSON() : (source ?? {}),
                secrets
              ) as Record<string, string>
            );
          } catch {
            if (strict) throw malformed();
            return new AxiosHeaders();
          }
        };
        const failure = (rawStatus?: unknown, headers: unknown = {}) => {
          const status = nativeStatus(rawStatus);
          const safeConfig = {
            ...request,
            headers: safeHeaders(request.headers),
            data: publicData(sent, secrets)
          };
          return new AxiosError(
            'Nango request failed. Inspect the exact native state before retrying.',
            'ERR_NANGO_REQUEST',
            safeConfig,
            undefined,
            status === undefined
              ? undefined
              : {
                  status,
                  statusText: 'Nango request failed',
                  config: safeConfig,
                  headers: safeHeaders(headers),
                  data: { error: { code: 'nango_request_failed' } }
                }
          );
        };
        let response: Awaited<ReturnType<typeof nativeAdapter>>;
        try {
          response = await nativeAdapter(request);
        } catch (error) {
          let status: number | undefined;
          let headers: unknown;
          try {
            const raw = axios.isAxiosError(error) ? error.response : undefined;
            status = nativeStatus(raw?.status);
            headers = raw?.headers;
          } catch {
            // Preserve the request trace without retaining a hostile transport graph.
          }
          // A fresh error preserves shared failure tracing without retaining raw transport state.
          throw failure(status, headers);
        }
        let status: number | undefined;
        let headers: AxiosHeaders | undefined;
        // The shared adapter records this response before normal response transforms.
        try {
          status = nativeStatus(response.status);
          headers = safeHeaders(response.headers, true);
          if (status === undefined || status < 200 || status >= 300)
            throw failure(status, headers);
          const contentType = String(headers.get('content-type') ?? '').toLowerCase();
          if (request.url?.startsWith('/proxy/')) {
            const mime = contentType.split(';')[0]!;
            if (
              mime &&
              !mime.startsWith('text/') &&
              !/^(?:application\/json|application\/[a-z0-9.+-]+\+json)$/.test(mime)
            )
              throw failure(status, headers);
          }
          let body: unknown = response.data;
          if (typeof body === 'string' && body.length && contentType.includes('json'))
            body = JSON.parse(body);
          return {
            ...response,
            status,
            statusText: String(publicData(response.statusText, secrets)),
            data: publicData(body, secrets),
            headers
          };
        } catch {
          throw failure(status, headers);
        }
      },
      errorAdapter: serviceFailure
    });
  }
  private async request(
    path: string,
    options: AxiosRequestConfig = {},
    expectedStatus?: number
  ) {
    payloadSize(options.data);
    const data =
      options.data && typeof options.data === 'object' && !Array.isArray(options.data)
        ? Object.fromEntries(
            Object.entries(options.data).filter(([key]) => key !== 'credentials')
          )
        : options.data;
    const general = { path, params: options.params, headers: options.headers, data };
    const credentials =
      options.data && typeof options.data === 'object' ? options.data.credentials : undefined;
    if (
      JSON.stringify(general) !==
      JSON.stringify(
        publicData(general, { token: this.token, supplied: importedSecrets(credentials) })
      )
    )
      throw invalid(
        'Do not supply configured or imported credentials in resource IDs, paths, headers, query or general data fields.'
      );
    try {
      const response = await this.http.request<unknown>({ ...options, url: path });
      if (expectedStatus !== undefined && response.status !== expectedStatus)
        throw malformed();
      return response.data;
    } catch (error) {
      if (isServiceError(error)) throw error;
      throw serviceFailure(error);
    }
  }
  async listIntegrations() {
    return parse(
      z.object({ data: z.array(nativeIntegration).max(2000) }),
      await this.request('/integrations')
    );
  }
  async getIntegration(uniqueKey: string, include?: string[]) {
    if (include?.length)
      throw invalid(
        'Sensitive integration includes are not available. Omit include to read credential-free metadata; use a trusted Nango backend for webhook or client secrets.'
      );
    const result = parse(
      z.object({ data: nativeIntegration }),
      await this.request('/integrations/' + encodedId(uniqueKey))
    );
    if (result.data.unique_key !== uniqueKey) throw malformed();
    return result;
  }
  async createIntegration(body: {
    unique_key: string;
    provider: string;
    display_name?: string;
    credentials?: Record<string, unknown>;
  }) {
    const result = parse(
      z.object({ data: nativeIntegration }),
      await this.request('/integrations', { method: 'POST', data: pickDefined(body) })
    );
    if (result.data.unique_key !== body.unique_key || result.data.provider !== body.provider)
      throw malformed();
    return result;
  }
  async updateIntegration(
    uniqueKey: string,
    body: { display_name?: string; credentials?: Record<string, unknown> }
  ) {
    const result = parse(
      z.object({ data: nativeIntegration }),
      await this.request('/integrations/' + encodedId(uniqueKey), {
        method: 'PATCH',
        data: pickDefined(body)
      })
    );
    if (result.data.unique_key !== uniqueKey) throw malformed();
    return result;
  }
  async deleteIntegration(uniqueKey: string) {
    return parse(
      nativeSuccess,
      await this.request('/integrations/' + encodedId(uniqueKey), { method: 'DELETE' }, 200)
    );
  }
  async listConnections(
    options: {
      connectionId?: string;
      search?: string;
      limit?: number;
      page?: number;
      tags?: Record<string, string>;
    } = {}
  ) {
    return parse(
      z.object({ connections: z.array(nativeConnection).max(2000) }),
      await this.request('/connections', { params: pickDefined(options) })
    );
  }
  async getConnection(
    connectionId: string,
    options: { provider_config_key: string; force_refresh?: boolean; refresh_token?: boolean }
  ) {
    if (options.refresh_token)
      throw invalid(
        'Refresh-token delivery is unavailable. Omit includeRefreshToken to read metadata; use a trusted Nango backend for credential access.'
      );
    const result = parse(
      nativeConnection,
      await this.request('/connections/' + encodedId(connectionId), {
        params: pickDefined({
          provider_config_key: options.provider_config_key,
          force_refresh: options.force_refresh || undefined
        })
      })
    );
    if (
      result.connection_id !== connectionId ||
      result.provider_config_key !== options.provider_config_key
    )
      throw malformed();
    return result;
  }
  async createConnection(body: {
    provider_config_key: string;
    connection_id: string;
    credentials: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    connection_config?: Record<string, unknown>;
    tags?: Record<string, string>;
  }) {
    const result = parse(
      nativeConnection,
      await this.request('/connections', { method: 'POST', data: pickDefined(body) })
    );
    if (
      result.connection_id !== body.connection_id ||
      result.provider_config_key !== body.provider_config_key
    )
      throw malformed();
    return result;
  }
  async deleteConnection(connectionId: string, providerConfigKey: string) {
    return parse(
      nativeSuccess,
      await this.request(
        '/connections/' + encodedId(connectionId),
        { method: 'DELETE', params: { provider_config_key: providerConfigKey } },
        200
      )
    );
  }
  async changeMetadata(
    action: 'set' | 'update',
    body: {
      connection_id: string | string[];
      provider_config_key: string;
      metadata: Record<string, unknown>;
    }
  ) {
    safePayload(body.metadata);
    const result = parse(
      nativeMetadata,
      await this.request('/connections/metadata', {
        method: action === 'set' ? 'POST' : 'PATCH',
        data: body
      })
    );
    const expected =
      typeof body.connection_id === 'string' ? [body.connection_id] : body.connection_id;
    const received =
      typeof result.connection_id === 'string' ? [result.connection_id] : result.connection_id;
    if (
      result.provider_config_key !== body.provider_config_key ||
      received.length !== expected.length ||
      [...received].sort().some((id, index) => id !== [...expected].sort()[index])
    )
      throw malformed();
    return result;
  }
  async manageSync(
    action: 'trigger' | 'start' | 'pause',
    body: {
      provider_config_key: string;
      syncs: SyncSpec[];
      connection_id?: string;
      opts?: { reset?: boolean; emptyCache?: boolean };
    }
  ) {
    return parse(
      nativeSuccess,
      await this.request('/sync/' + action, { method: 'POST', data: pickDefined(body) })
    );
  }
  async getSyncStatus(options: {
    provider_config_key: string;
    syncs: string;
    connection_id?: string;
  }) {
    return parse(
      z.object({
        syncs: z
          .array(
            z.object({
              id: text,
              status: text,
              name: text.optional(),
              variant: z.string().optional(),
              connection_id: text.optional(),
              checkpoint: z.unknown().optional(),
              finishedAt: z.string().nullish(),
              nextScheduledSyncAt: z.string().nullish(),
              frequency: z.string().optional(),
              latestResult: z
                .object({
                  added: z.number().int().nonnegative().optional(),
                  updated: z.number().int().nonnegative().optional(),
                  deleted: z.number().int().nonnegative().optional()
                })
                .optional(),
              recordCount: z.record(z.string(), z.number().int().nonnegative()).optional()
            })
          )
          .max(2000)
      }),
      await this.request('/sync/status', { params: pickDefined(options) })
    );
  }
  async getRecords(options: {
    connectionId: string;
    providerConfigKey: string;
    model: string;
    cursor?: string;
    modifiedAfter?: string;
    ids?: string[];
    limit?: number;
    variant?: string;
  }) {
    return parse(
      z.object({
        records: z.array(jsonObject).max(1000),
        next_cursor: z.string().min(1).nullable()
      }),
      await this.request('/records', {
        headers: {
          'Connection-Id': options.connectionId,
          'Provider-Config-Key': options.providerConfigKey
        },
        params: pickDefined({
          model: options.model,
          cursor: options.cursor,
          modified_after: options.modifiedAfter,
          ids: options.ids,
          limit: options.limit,
          variant: options.variant
        })
      })
    );
  }
  async triggerAction(options: {
    connectionId: string;
    providerConfigKey: string;
    actionName: string;
    input?: Record<string, unknown>;
  }) {
    safePayload(options.input);
    return this.request('/action/trigger', {
      method: 'POST',
      headers: {
        'Connection-Id': options.connectionId,
        'Provider-Config-Key': options.providerConfigKey
      },
      data: pickDefined({ action_name: options.actionName, input: options.input })
    });
  }
  async proxyRequest(options: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    endpoint: string;
    connectionId: string;
    providerConfigKey: string;
    data?: unknown;
    queryParams?: Record<string, string>;
    retries?: number;
    baseUrlOverride?: string;
    headers?: Record<string, string>;
  }) {
    if (options.baseUrlOverride !== undefined)
      throw invalid(
        'Arbitrary baseUrlOverride is unavailable because it forwards connected-provider credentials. Configure the correct provider base URL in Nango.'
      );
    const endpoint = options.endpoint.replace(/^\//, '');
    if (
      !endpoint ||
      endpoint.includes('\\') ||
      endpoint.includes('?') ||
      endpoint.includes('#') ||
      endpoint.includes('://') ||
      endpoint.startsWith('/') ||
      endpoint
        .split('/')
        .some(part => ['.', '..'].includes(part) || /%(?:2f|5c|2e|25)/i.test(part))
    )
      throw invalid(
        'Use a relative provider endpoint path without a URL, query, traversal, or encoded separators. Supply queryParams separately.'
      );
    if (/(?:^|\/)(?:oauth|tokens?|credentials?|secrets?|sessions?)(?:\/|$)/i.test(endpoint))
      throw invalid(
        'Credential, token and session endpoints are unavailable through public proxy requests. Use a trusted provider backend.'
      );
    safePayload(options.data);
    safePayload(options.queryParams);
    if (options.method === 'GET' && options.data !== undefined)
      throw invalid('GET proxy requests cannot have a body.');
    if (options.method !== 'GET' && (options.retries ?? 0) > 0)
      throw invalid(
        'Automatic retries of write requests can duplicate provider effects. Use retries=0 and verify the exact result before retrying.'
      );
    const headers: Record<string, string> = {
      'Connection-Id': options.connectionId,
      'Provider-Config-Key': options.providerConfigKey,
      Retries: String(options.retries ?? 0)
    };
    for (const [key, value] of Object.entries(options.headers ?? {})) {
      const normalized = key.toLowerCase();
      if (
        !['accept', 'if-match', 'if-none-match', 'content-type'].includes(normalized) ||
        [...value].some(c => (c.codePointAt(0) ?? 0) < 32 || c.charCodeAt(0) === 127)
      )
        throw invalid(
          'Only Accept, If-Match, If-None-Match and Content-Type provider headers are supported. Authentication and routing headers cannot be overridden.'
        );
      headers['nango-proxy-' + key] = value;
    }
    return this.request('/proxy/' + endpoint, {
      method: options.method,
      headers,
      data: options.data,
      params: options.queryParams
    });
  }
  async listFunctions(
    uniqueKey: string,
    options: {
      type?: 'sync' | 'action' | 'on-event';
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const result = parse(
      z.object({
        data: z
          .array(
            z.object({
              name: text,
              type: z.enum(['sync', 'action', 'on-event']),
              returns: z.array(z.string()).optional(),
              json_schema: jsonObject.optional(),
              input: z.string().nullish(),
              runs: z.string().nullish(),
              enabled: z.boolean().optional(),
              last_deployed: z.string().optional(),
              description: z.string().optional()
            })
          )
          .max(100),
        pagination: z.object({
          total: z.number().int().nonnegative(),
          page: z.number().int().nonnegative(),
          limit: z.number().int().positive().max(100)
        })
      }),
      await this.request('/integrations/' + encodedId(uniqueKey) + '/functions', {
        params: pickDefined(options)
      })
    );
    if (
      result.pagination.page !== (options.page ?? 0) ||
      result.pagination.limit !== (options.limit ?? 20) ||
      result.data.length > result.pagination.limit ||
      (result.data.length > 0 &&
        result.pagination.page * result.pagination.limit + result.data.length >
          result.pagination.total)
    )
      throw malformed();
    return result;
  }
  async listProviders() {
    return parse(
      z.object({
        data: z
          .array(
            z.object({
              name: text,
              display_name: z.string().optional(),
              auth_mode: text,
              logo_url: z.string().optional(),
              categories: z.array(z.string()).optional()
            })
          )
          .max(2000)
      }),
      await this.request('/providers')
    );
  }
}
export function clientFor(ctx: {
  auth: { token: string; baseUrl?: string };
  config: Record<string, unknown>;
}) {
  return new NangoClient({ ...ctx.auth, legacyConfig: ctx.config });
}
