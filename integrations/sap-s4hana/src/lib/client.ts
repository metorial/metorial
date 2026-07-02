import {
  createAuthenticatedAxios,
  requestAxios,
  requestAxiosData,
  setIfDefined
} from 'slates';
import { sapApiError, sapValidationError } from './errors';

export type SapAuthMethod = 'basic' | 'bearer' | 'apiHubKey';

export type SapAuthOutput = {
  authMethod: SapAuthMethod;
  token?: string;
  apiKey?: string;
};

export type SapConfig = {
  baseUrl: string;
  sapClient?: string;
  sandboxMode?: boolean;
};

export type ODataListResult<T> = {
  items: T[];
  count?: number;
  nextPageToken?: string;
};

type ODataEnvelope<T> = {
  d?: T | { results?: T[]; __count?: string | number; __next?: string };
  value?: T[];
  '@odata.nextLink'?: string;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let normalizeBaseUrl = (baseUrl: string) => {
  let trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) throw sapValidationError('SAP S/4HANA baseUrl is required.');

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw sapValidationError('SAP S/4HANA baseUrl must be a valid URL.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw sapValidationError('SAP S/4HANA baseUrl must use http or https.');
  }

  return trimmed;
};

let serializeParams = (params: Record<string, unknown>) => {
  let search = new URLSearchParams();

  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      for (let item of value) {
        if (item !== undefined && item !== null && item !== '') {
          search.append(key, String(item));
        }
      }
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

let authHeaderFor = (auth: SapAuthOutput) => {
  if (auth.authMethod === 'basic') {
    if (!auth.token) throw sapValidationError('SAP basic authentication is missing a token.');
    return { name: 'Authorization', value: `Basic ${auth.token}` };
  }

  if (auth.authMethod === 'bearer') {
    if (!auth.token) throw sapValidationError('SAP bearer authentication is missing a token.');
    return { name: 'Authorization', value: `Bearer ${auth.token}` };
  }

  if (!auth.apiKey)
    throw sapValidationError('SAP API Hub authentication is missing an API key.');
  return { name: 'apikey', value: auth.apiKey };
};

let ensureRecord = (value: unknown, operation: string) => {
  if (!isRecord(value)) {
    throw sapValidationError(`SAP S/4HANA ${operation} did not return an object.`);
  }

  return value;
};

let normalizeEntity = <T = Record<string, unknown>>(data: unknown, operation: string): T => {
  let envelope = ensureRecord(data, operation) as ODataEnvelope<T>;
  let value = envelope.d ?? data;
  if (!isRecord(value)) {
    throw sapValidationError(`SAP S/4HANA ${operation} did not return an entity.`);
  }

  return value as T;
};

let normalizeList = <T = Record<string, unknown>>(
  data: unknown,
  operation: string
): ODataListResult<T> => {
  let envelope = ensureRecord(data, operation) as ODataEnvelope<T>;

  if (Array.isArray(envelope.value)) {
    return {
      items: envelope.value as T[],
      nextPageToken: envelope['@odata.nextLink']
    };
  }

  if (isRecord(envelope.d)) {
    let results = envelope.d.results;
    if (Array.isArray(results)) {
      let count =
        envelope.d.__count === undefined
          ? undefined
          : Number.parseInt(String(envelope.d.__count), 10);

      return {
        items: results as T[],
        count: count === undefined || Number.isFinite(count) ? count : undefined,
        nextPageToken: typeof envelope.d.__next === 'string' ? envelope.d.__next : undefined
      };
    }
  }

  throw sapValidationError(`SAP S/4HANA ${operation} did not return a list.`);
};

export let odataStringLiteral = (value: string | number) =>
  `'${String(value).replace(/'/g, "''")}'`;

export let odataKeyLiteral = (value: string | number) =>
  `'${encodeURIComponent(String(value).replace(/'/g, "''"))}'`;

export let odataDateTimeLiteral = (
  value: string,
  kind: 'datetime' | 'datetimeoffset' = 'datetimeoffset'
) => {
  let date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw sapValidationError(`"${value}" is not a valid date or datetime.`);
  }

  let iso = date.toISOString();
  return `${kind}'${kind === 'datetime' ? iso.replace(/\.\d{3}Z$/, '') : iso}'`;
};

export let substringFilter = (field: string, value: string) =>
  `substringof(${odataStringLiteral(value)}, ${field})`;

export let andFilters = (filters: Array<string | undefined>) =>
  filters.filter((filter): filter is string => Boolean(filter)).join(' and ');

export let orFilters = (filters: Array<string | undefined>) => {
  let concrete = filters.filter((filter): filter is string => Boolean(filter));
  if (concrete.length === 0) return undefined;
  if (concrete.length === 1) return concrete[0];
  return `(${concrete.join(' or ')})`;
};

export let compoundKey = (keys: Record<string, string | number>) =>
  Object.entries(keys)
    .map(([key, value]) => `${key}=${odataKeyLiteral(value)}`)
    .join(',');

export class SapS4HanaClient {
  private http;
  private baseUrl: string;
  private sapClient?: string;

  constructor(params: { auth: SapAuthOutput; config: SapConfig }) {
    if (!params.config?.baseUrl) {
      throw sapValidationError('SAP S/4HANA baseUrl config is required.');
    }

    this.baseUrl = normalizeBaseUrl(params.config.baseUrl);
    this.sapClient = params.config.sapClient;
    this.http = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: authHeaderFor(params.auth),
      headers: {
        Accept: 'application/json'
      },
      paramsSerializer: { serialize: serializeParams }
    });
  }

  get profileId() {
    return new URL(this.baseUrl).host;
  }

  get normalizedBaseUrl() {
    return this.baseUrl;
  }

  private serviceRoot(serviceName: string) {
    return `/sap/opu/odata/sap/${serviceName}`;
  }

  private queryParams(params: Record<string, unknown> = {}) {
    return {
      $format: 'json',
      ...params,
      'sap-client': this.sapClient
    };
  }

  private requestPathFor(pathname: string, search = '') {
    let basePath = new URL(this.baseUrl).pathname.replace(/\/+$/, '');
    let requestPath = pathname;

    if (
      basePath &&
      basePath !== '/' &&
      (requestPath === basePath || requestPath.startsWith(`${basePath}/`))
    ) {
      requestPath = requestPath.slice(basePath.length) || '/';
    }

    return `${requestPath.startsWith('/') ? requestPath : `/${requestPath}`}${search}`;
  }

  private resolvePageToken(pageToken: string) {
    let trimmed = pageToken.trim();
    if (!trimmed) throw sapValidationError('skipToken cannot be empty.');

    let base = new URL(this.baseUrl);

    if (/^https?:\/\//i.test(trimmed)) {
      let nextUrl: URL;
      try {
        nextUrl = new URL(trimmed);
      } catch {
        throw sapValidationError('skipToken next link is not a valid URL.');
      }

      if (nextUrl.origin !== base.origin) {
        throw sapValidationError(
          'skipToken next link must point to the configured SAP tenant.'
        );
      }

      return this.requestPathFor(nextUrl.pathname, nextUrl.search);
    }

    if (trimmed.startsWith('/')) {
      let nextUrl = new URL(trimmed, base.origin);
      return this.requestPathFor(nextUrl.pathname, nextUrl.search);
    }

    return undefined;
  }

  async getMetadata(serviceName: string) {
    let response = await requestAxios(
      `read ${serviceName} metadata`,
      () =>
        this.http.get(`${this.serviceRoot(serviceName)}/$metadata`, {
          params: this.sapClient ? { 'sap-client': this.sapClient } : undefined,
          responseType: 'text'
        }),
      sapApiError
    );

    return String(response.data ?? '');
  }

  async queryEntitySet<T = Record<string, unknown>>(params: {
    serviceName: string;
    entitySet: string;
    query?: Record<string, unknown>;
    pageToken?: string;
  }) {
    let nextPath = params.pageToken ? this.resolvePageToken(params.pageToken) : undefined;

    if (nextPath) {
      let data = await requestAxiosData<unknown>(
        `query ${params.entitySet} page`,
        () => this.http.get(nextPath),
        sapApiError
      );
      return normalizeList<T>(data, `query ${params.entitySet} page`);
    }

    let query = this.queryParams({
      ...params.query,
      ...(params.pageToken ? { $skiptoken: params.pageToken } : {})
    });

    let data = await requestAxiosData<unknown>(
      `query ${params.entitySet}`,
      () =>
        this.http.get(`${this.serviceRoot(params.serviceName)}/${params.entitySet}`, {
          params: query
        }),
      sapApiError
    );

    return normalizeList<T>(data, `query ${params.entitySet}`);
  }

  async getEntity<T = Record<string, unknown>>(params: {
    serviceName: string;
    entitySet: string;
    key: string | Record<string, string | number>;
    query?: Record<string, unknown>;
  }) {
    let key =
      typeof params.key === 'string' ? odataKeyLiteral(params.key) : compoundKey(params.key);
    let path = `${this.serviceRoot(params.serviceName)}/${params.entitySet}(${key})`;

    let data = await requestAxiosData<unknown>(
      `get ${params.entitySet}`,
      () =>
        this.http.get(path, {
          params: this.queryParams(params.query)
        }),
      sapApiError
    );

    return normalizeEntity<T>(data, `get ${params.entitySet}`);
  }

  async queryEntityIds(params: {
    serviceName: string;
    entitySet: string;
    idField: string;
    filter?: string;
    top?: number;
  }) {
    let query: Record<string, unknown> = {
      $select: params.idField,
      $top: params.top ?? 100
    };
    setIfDefined(query, '$filter', params.filter);

    let result = await this.queryEntitySet<Record<string, unknown>>({
      serviceName: params.serviceName,
      entitySet: params.entitySet,
      query
    });

    return result.items
      .map(item => item[params.idField])
      .filter(
        (value): value is string | number =>
          typeof value === 'string' || typeof value === 'number'
      )
      .map(String);
  }
}
