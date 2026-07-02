import type { AxiosResponse } from 'axios';
import {
  createAuthenticatedAxios,
  createAxios,
  normalizeOAuthTokenResponse,
  pickDefined,
  requestAxios,
  requestAxiosData
} from 'slates';
import { finagoApiError } from './errors';

export const FINAGO_DEFAULT_BASE_URL = 'https://rest.api.24sevenoffice.com/v1';
export const FINAGO_TOKEN_URL = 'https://login.24sevenoffice.com/oauth/token';

export type JsonRecord = Record<string, unknown>;

export type FinagoAuthOutput = {
  token: string;
  expiresAt?: string;
  organizationId: string;
  baseUrl: string;
};

export type FinagoTokenExchangeInput = {
  clientId: string;
  clientSecret: string;
  organizationId: string;
  baseUrl?: string;
};

export type FinagoListResult = {
  records: unknown[];
  count: number;
  pageCount: number;
  hasNextPage: boolean;
  nextLink?: string;
};

let isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export let normalizeBaseUrl = (baseUrl?: string) =>
  (baseUrl?.trim() || FINAGO_DEFAULT_BASE_URL).replace(/\/+$/, '');

let scopesFromTokenResponse = (data: unknown) => {
  if (!isRecord(data)) return undefined;

  let scope = data.scope ?? data.scopes;
  if (typeof scope === 'string') {
    return scope
      .split(/[,\s]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(scope) && scope.every(item => typeof item === 'string')) {
    return scope;
  }

  return undefined;
};

export let exchangeClientCredentialsToken = async (input: FinagoTokenExchangeInput) => {
  let http = createAxios();
  let data = await requestAxiosData<unknown>(
    'OAuth client credentials token exchange',
    () =>
      http.post(
        FINAGO_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          audience: 'https://api.24sevenoffice.com',
          client_id: input.clientId,
          client_secret: input.clientSecret,
          login_organization: input.organizationId
        }).toString(),
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      ),
    finagoApiError
  );

  let token = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Finago',
    operation: 'token exchange'
  });

  return {
    output: {
      token: token.token,
      expiresAt: token.expiresAt,
      organizationId: input.organizationId,
      baseUrl: normalizeBaseUrl(input.baseUrl)
    },
    scopes: scopesFromTokenResponse(data)
  };
};

let headerValue = (headers: AxiosResponse['headers'], name: string) => {
  let value = headers?.[name] ?? headers?.[name.toLowerCase()];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return undefined;
};

let nextLinkFromHeader = (link: string | undefined) => {
  if (!link) return undefined;

  let part = link
    .split(',')
    .map(item => item.trim())
    .find(item => /rel="?next"?/i.test(item));

  return part?.match(/<([^>]+)>/)?.[1];
};

let paramsFromNextLink = (nextLink: string | undefined, baseUrl: string) => {
  if (!nextLink) return undefined;

  try {
    let url = new URL(nextLink, baseUrl);
    return Object.fromEntries(url.searchParams.entries());
  } catch {
    return undefined;
  }
};

export let extractRecords = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;

  if (!isRecord(data)) return [];

  let embedded = data._embedded;
  if (isRecord(embedded) && Array.isArray(embedded.records)) return embedded.records;

  for (let key of ['records', 'items', 'data', 'results']) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }

  return [];
};

let compactParams = (params?: JsonRecord) => pickDefined(params ?? {});

export class FinagoClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private unauthenticatedHttp: ReturnType<typeof createAxios>;
  private baseUrl: string;

  constructor(config: { token: string; baseUrl?: string }) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.http = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error => finagoApiError(error)
    });
    this.unauthenticatedHttp = createAxios();
  }

  async get<T = unknown>(path: string, params?: JsonRecord, operation = `GET ${path}`) {
    return await requestAxiosData<T>(
      operation,
      () => this.http.get(path, { params: compactParams(params) }),
      finagoApiError
    );
  }

  async post<T = unknown>(
    path: string,
    body?: unknown,
    params?: JsonRecord,
    operation = `POST ${path}`
  ) {
    return await requestAxiosData<T>(
      operation,
      () => this.http.post(path, body, { params: compactParams(params) }),
      finagoApiError
    );
  }

  async patch<T = unknown>(
    path: string,
    body?: unknown,
    params?: JsonRecord,
    operation = `PATCH ${path}`
  ) {
    return await requestAxiosData<T>(
      operation,
      () => this.http.patch(path, body, { params: compactParams(params) }),
      finagoApiError
    );
  }

  async putBinaryUrl(params: {
    url: string;
    method: string;
    contentType: string;
    contentBase64: string;
  }) {
    let body = Buffer.from(params.contentBase64.replace(/\s+/g, ''), 'base64');
    await requestAxios(
      'upload file bytes to Finago presigned URL',
      () =>
        this.unauthenticatedHttp.request({
          url: params.url,
          method: params.method,
          data: body,
          headers: {
            'Content-Type': params.contentType,
            'Content-Length': String(body.byteLength)
          }
        }),
      finagoApiError
    );

    return { byteLength: body.byteLength };
  }

  async downloadUrl(url: string, contentType?: string) {
    let response = await requestAxios<ArrayBuffer>(
      'download Finago document',
      () =>
        this.unauthenticatedHttp.get(url, {
          responseType: 'arraybuffer',
          headers: contentType ? { Accept: contentType } : undefined
        }),
      finagoApiError
    );

    let buffer = Buffer.from(response.data);
    return {
      contentBase64: buffer.toString('base64'),
      byteLength: buffer.byteLength,
      contentType: headerValue(response.headers, 'content-type') ?? contentType
    };
  }

  async list(path: string, params?: JsonRecord, maxPages = 1, operation = `GET ${path}`) {
    let records: unknown[] = [];
    let pageCount = 0;
    let hasNextPage = false;
    let nextLink: string | undefined;
    let requestParams: JsonRecord = compactParams(params);

    do {
      let response = await requestAxios<unknown>(
        operation,
        () => this.http.get(path, { params: requestParams }),
        finagoApiError
      );
      records.push(...extractRecords(response.data));
      pageCount += 1;

      let link = headerValue(response.headers, 'link');
      nextLink = nextLinkFromHeader(link);
      hasNextPage = nextLink !== undefined;

      let nextParams = paramsFromNextLink(nextLink, this.baseUrl);
      if (nextParams) {
        requestParams = { ...requestParams, ...nextParams };
      } else if (hasNextPage && typeof requestParams.page === 'number') {
        requestParams = { ...requestParams, page: requestParams.page + 1 };
      }
    } while (hasNextPage && pageCount < maxPages);

    return {
      records,
      count: records.length,
      pageCount,
      hasNextPage,
      nextLink
    } satisfies FinagoListResult;
  }
}
