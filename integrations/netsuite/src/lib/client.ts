import {
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';
import {
  account,
  credential,
  externalId,
  guard,
  nativeErrorCode,
  object,
  paging,
  recordId,
  recordType,
  requireValue,
  sameInternalId,
  upstream
} from './contracts';
import { buildOAuth1Header } from './oauth1';
export interface NetSuiteAuth {
  token: string;
  accountId: string;
  authType: 'oauth2' | 'tba';
  consumerKey?: string;
  consumerSecret?: string;
  tokenId?: string;
  tokenSecret?: string;
  refreshToken?: string;
}
export interface RecordListResponse {
  items: Record<string, unknown>[];
  totalResults: number;
  count: number;
  offset: number;
  hasMore: boolean;
  links?: unknown[];
}
export type SuiteQLResponse = RecordListResponse;
export function connection(
  auth: Omit<NetSuiteAuth, 'accountId'> & { accountId?: string },
  config: { accountId?: unknown }
) {
  return new Client({ ...auth, accountId: account(auth.accountId ?? config.accountId).realm });
}
export class Client {
  readonly baseUrl: string;
  readonly accountId: string;
  private readonly auth: NetSuiteAuth;
  private readonly secrets: string[];
  private readonly http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(auth: NetSuiteAuth) {
    const bound = account(auth.accountId);
    this.accountId = bound.realm;
    requireValue(
      auth.authType === 'oauth2' || auth.authType === 'tba',
      'Reconnect using the original NetSuite OAuth2 or TBA authentication method.'
    );
    credential(auth.token);
    if (auth.authType === 'tba') {
      for (const value of [
        auth.consumerKey,
        auth.consumerSecret,
        auth.tokenId,
        auth.tokenSecret
      ])
        credential(value);
      requireValue(
        auth.token === auth.tokenId,
        'The saved TBA token identifier is inconsistent; reconnect.'
      );
    }
    this.auth = { ...auth, accountId: bound.realm };
    this.secrets = [
      auth.token,
      auth.refreshToken,
      auth.consumerKey,
      auth.consumerSecret,
      auth.tokenId,
      auth.tokenSecret
    ].filter((s): s is string => typeof s === 'string' && s.length > 0);
    this.baseUrl = `https://${bound.host}.suitetalk.api.netsuite.com/services/rest`;
    this.http = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 4 * 1024 * 1024,
      errorMapping: {
        mapAxiosError: error => {
          const code = nativeErrorCode(error.response?.data);
          let safeCode: string | undefined;
          try {
            if (code) {
              guard(code, this.secrets);
              safeCode = code;
            }
          } catch {}
          return {
            message:
              'NetSuite request failed. Check credentials, role permissions and native parameters.',
            upstream: { code: safeCode }
          };
        }
      },
      errorAdapter: upstream
    });
  }
  private async request(
    method: string,
    path: string,
    options: {
      data?: Record<string, unknown>;
      params?: Record<string, string | number | boolean | undefined>;
      accept?: string;
    } = {}
  ) {
    const params = pickDefined(options.params ?? {}),
      query = new URLSearchParams(
        Object.entries(params).map(([k, v]): [string, string] => [k, String(v)])
      ).toString(),
      url = `${this.baseUrl}${path}${query ? `?${query}` : ''}`;
    guard({ path, params, data: options.data }, this.secrets);
    const authorization =
      this.auth.authType === 'tba'
        ? buildOAuth1Header(method, url, {
            accountId: this.accountId,
            consumerKey: this.auth.consumerKey!,
            consumerSecret: this.auth.consumerSecret!,
            tokenId: this.auth.tokenId!,
            tokenSecret: this.auth.tokenSecret!
          })
        : `Bearer ${this.auth.token}`;
    try {
      const response = await this.http.request({
        method,
        url: path,
        params,
        paramsSerializer: p =>
          new URLSearchParams(
            Object.entries(p).map(([k, v]): [string, string] => [k, String(v)])
          ).toString(),
        data: options.data,
        headers: {
          Authorization: authorization,
          ...(options.accept ? { Accept: options.accept } : {}),
          ...(path === '/query/v1/suiteql' ? { Prefer: 'transient' } : {})
        }
      });
      guard(
        {
          data: response.data,
          headers: response.headers,
          status: response.status,
          statusText: response.statusText
        },
        this.secrets
      );
      requireValue(
        response.status === (method === 'GET' || path === '/query/v1/suiteql' ? 200 : 204),
        'NetSuite did not return the documented synchronous receipt. Effects may already exist; reconcile before retrying.'
      );
      return response;
    } catch (error) {
      throw upstream(error);
    }
  }
  private path(type: string, id?: string) {
    recordType(type);
    if (id !== undefined) recordId(id);
    return `/record/v1/${encodeURIComponent(type)}${id === undefined ? '' : `/${encodeURIComponent(id).replace(/^eid%3A/, 'eid:')}`}`;
  }
  private location(value: unknown, type: string) {
    requireValue(
      typeof value === 'string' && value.length > 0,
      'NetSuite accepted the mutation but omitted its record Location. Reconcile the account before retrying; no record ID is invented.'
    );
    let url: URL;
    try {
      url = new URL(value, `${this.baseUrl}/`);
    } catch {
      requireValue(
        false,
        'NetSuite returned an invalid mutation Location; reconcile before retrying.'
      );
    }
    const prefix = `/services/rest/record/v1/${type}/`;
    requireValue(
      url.origin === new URL(this.baseUrl).origin &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname.startsWith(prefix),
      'NetSuite mutation Location is bound to another account or record type. Reconcile before retrying.'
    );
    const id = url.pathname.slice(prefix.length);
    requireValue(
      /^-?\d+$/.test(id),
      'NetSuite mutation receipt has no safe native internal ID. Reconcile before retrying.'
    );
    return { recordId: id, location: url.href };
  }
  async getRecord(
    type: string,
    id: string,
    options: { expandSubResources?: boolean; fields?: string[] } = {}
  ) {
    const fields = options.fields;
    if (fields)
      fields.forEach(f =>
        requireValue(
          typeof f === 'string' && /^[A-Za-z_][A-Za-z0-9_.]*$/.test(f),
          'Use exact native field names without delimiters or controls.'
        )
      );
    const response = await this.request('GET', this.path(type, id), {
      params: {
        expandSubResources: options.expandSubResources,
        fields: fields?.length ? fields.join(',') : undefined
      }
    });
    object(response.data);
    requireValue(Object.keys(response.data).length > 0, 'NetSuite returned an empty record.');
    const actual = response.data.id;
    if (actual !== undefined)
      requireValue(
        typeof actual === 'string' &&
          /^-?\d+$/.test(actual) &&
          (id.startsWith('eid:') || sameInternalId(actual, id)),
        'NetSuite returned a different record ID.'
      );
    if (id.startsWith('eid:') && response.data.externalId !== undefined)
      requireValue(
        response.data.externalId === externalId(id),
        'NetSuite returned a different external ID.'
      );
    return response.data;
  }
  async createRecord(type: string, data: Record<string, unknown>) {
    object(data);
    const response = await this.request('POST', this.path(type), { data });
    return this.location(getResponseHeaderValue(response.headers, 'location'), type);
  }
  async updateRecord(type: string, id: string, data: Record<string, unknown>) {
    object(data);
    const response = await this.request('PATCH', this.path(type, id), { data });
    const location = getResponseHeaderValue(response.headers, 'location');
    if (location !== undefined) {
      const receipt = this.location(location, type);
      requireValue(
        id.startsWith('eid:') || sameInternalId(receipt.recordId, id),
        'NetSuite updated another record; reconcile before retrying.'
      );
    }
    return { recordId: id, success: true };
  }
  async upsertRecord(type: string, value: string, data: Record<string, unknown>) {
    const eid = externalId(value);
    object(data);
    requireValue(
      data.externalId === undefined || data.externalId === eid,
      'The upsert body externalId must match its exact requested external ID.'
    );
    const response = await this.request('PUT', this.path(type, `eid:${eid}`), { data }),
      location = getResponseHeaderValue(response.headers, 'location');
    const receipt = location === undefined ? undefined : this.location(location, type);
    let current: Record<string, unknown>;
    try {
      current = await this.getRecord(type, `eid:${eid}`);
    } catch {
      throw createApiServiceError(
        `NetSuite accepted the upsert for external ID ${eid}, but its exact readback is unconfirmed. Reported Location ID: ${receipt?.recordId ?? 'unavailable'}. Effects may remain; reconcile this account and record before retrying.`,
        { reason: 'netsuite_upsert_readback_unconfirmed' }
      );
    }
    requireValue(
      typeof current.id === 'string' && /^-?\d+$/.test(current.id),
      `NetSuite accepted the upsert for external ID ${eid} but its internal ID is unconfirmed. Reported Location ID: ${receipt?.recordId ?? 'unavailable'}. Reconcile this account and external ID before retrying.`
    );
    requireValue(
      receipt === undefined || sameInternalId(receipt.recordId, current.id),
      `NetSuite accepted the upsert for external ID ${eid}, but its Location ID ${receipt?.recordId} and exact readback ID ${current.id} identify different records. Effects may remain; reconcile both records before retrying.`
    );
    return { recordId: current.id, location: `${this.baseUrl}${this.path(type, current.id)}` };
  }
  async deleteRecord(type: string, id: string) {
    await this.request('DELETE', this.path(type, id));
  }
  private page(data: unknown, requested: { limit: number; offset: number }) {
    object(data);
    requireValue(
      Array.isArray(data.items) &&
        data.items.every(i => typeof i === 'object' && i !== null && !Array.isArray(i)) &&
        typeof data.hasMore === 'boolean' &&
        ['count', 'offset', 'totalResults'].every(
          k => Number.isSafeInteger(data[k]) && Number(data[k]) >= 0
        ),
      'NetSuite paging metadata is missing or invalid; no empty page or zero total is invented.'
    );
    requireValue(
      data.count === data.items.length &&
        data.items.length <= requested.limit &&
        data.offset === requested.offset &&
        (data.items.length === 0 ||
          Number(data.totalResults) >= requested.offset + data.items.length) &&
        (!data.hasMore || data.items.length > 0),
      'NetSuite returned an inconsistent or mismatched page.'
    );
    return data as unknown as RecordListResponse;
  }
  async listRecords(
    type: string,
    options: { limit?: number; offset?: number; query?: string; fields?: string[] } = {}
  ) {
    requireValue(
      !options.fields?.length,
      'Native record collections return IDs and links. Use get_record fields or query_suiteql for field selection; the legacy list fields input cannot be applied.'
    );
    const p = paging(options.limit, options.offset);
    return this.page(
      (await this.request('GET', this.path(type), { params: { ...p, q: options.query } }))
        .data,
      p
    );
  }
  async transformRecord(
    sourceType: string,
    id: string,
    targetType: string,
    data: Record<string, unknown> = {}
  ) {
    recordType(targetType);
    object(data);
    const response = await this.request(
      'POST',
      `${this.path(sourceType, id)}/!transform/${encodeURIComponent(targetType)}`,
      { data }
    );
    return {
      ...this.location(getResponseHeaderValue(response.headers, 'location'), targetType),
      targetType
    };
  }
  async executeSuiteQL(query: string, options: { limit?: number; offset?: number } = {}) {
    requireValue(
      typeof query === 'string' &&
        query.trim().length > 0 &&
        Buffer.byteLength(query) <= 64 * 1024,
      'A nonempty SuiteQL query up to 64 KiB is required. Native REST SuiteQL supports read-only queries.'
    );
    const p = paging(options.limit, options.offset);
    return this.page(
      (await this.request('POST', '/query/v1/suiteql', { data: { q: query }, params: p }))
        .data,
      p
    );
  }
  async getRecordMetadata(type: string) {
    recordType(type);
    const response = await this.request(
      'GET',
      `/record/v1/metadata-catalog/${encodeURIComponent(type)}`,
      { accept: 'application/swagger+json' }
    );
    object(response.data);
    requireValue(Object.keys(response.data).length > 0, 'NetSuite metadata is empty.');
    return response.data;
  }
  async listRecordTypes() {
    const response = await this.request('GET', '/record/v1/metadata-catalog', {
      accept: 'application/json'
    });
    object(response.data);
    const items = response.data.items;
    requireValue(
      Array.isArray(items) && items.length <= 10000,
      'NetSuite metadata catalog is missing or exceeds the supported bound.'
    );
    const names = items.map(item => {
      object(item);
      recordType(item.name);
      return item.name;
    });
    requireValue(
      new Set(names).size === names.length,
      'NetSuite returned duplicate record-type identities.'
    );
    return names;
  }
}
