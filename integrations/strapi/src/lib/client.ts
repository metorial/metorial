import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import {
  type AuthOutput,
  connection,
  integer,
  invalid,
  record,
  secretFree,
  segment
} from './connection';
import { fetchUpload, multipart } from './upload';

export type ClientConfig = AuthOutput & { baseUrl: string };
export interface QueryParams {
  fields?: string[];
  populate?: string | Record<string, unknown>;
  filters?: Record<string, unknown>;
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
    withCount?: boolean;
  };
  status?: 'draft' | 'published';
  locale?: string;
}
export interface PaginationMeta {
  page?: number;
  pageSize?: number;
  pageCount?: number;
  total?: number;
  start?: number;
  limit?: number;
}
export interface ListResponse {
  data: Record<string, unknown>[];
  meta: { pagination?: PaginationMeta };
}
export interface SingleResponse {
  data: Record<string, unknown>;
  meta: Record<string, unknown>;
}
const MAX_JSON_BYTES = 8 * 1024 * 1024;
export const malformed = () =>
  createApiServiceError(
    'Strapi returned an unexpected response. A write may already have changed provider state; inspect the exact entry or media before retrying. Do not repeat an upload or create automatically.',
    { reason: 'strapi_invalid_response', parent: {} }
  );
export function apiError(error: unknown, operation: string, write = false) {
  const upstream =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined);
  const status =
    typeof upstream === 'number' &&
    Number.isInteger(upstream) &&
    upstream >= 100 &&
    upstream <= 599
      ? upstream
      : undefined;
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Strapi',
      operation,
      reason: 'strapi_api_error',
      parent: {},
      extractMessage: () =>
        `${status === 401 || status === 403 ? 'Check the selected instance, credential and content or Upload permissions.' : status === 404 ? 'The exact resource or enabled route was not found; verify its identifier, locale and API version.' : status === 429 ? 'The instance rate limit was reached; retry the read later.' : 'The instance request could not be completed.'}${write ? ' The write may already have taken effect. Read the exact resource before retrying; do not automatically repeat creates or uploads.' : ''}`
    }
  );
}
function finiteJson(value: unknown, seen = new Set<object>(), depth = 0): boolean {
  if (
    depth > 20 ||
    typeof value === 'bigint' ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    value === undefined
  )
    return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object') return true;
  if (
    seen.has(value) ||
    (!Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  )
    return false;
  seen.add(value);
  const valid = Object.entries(value).every(
    ([key, child]) =>
      !['__proto__', 'constructor', 'prototype'].includes(key) &&
      finiteJson(child, seen, depth + 1)
  );
  seen.delete(value);
  return valid;
}
export class Client {
  readonly config: ReturnType<typeof connection>;
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: ClientConfig) {
    this.config = connection(config);
    this.axios = createAuthenticatedAxios({
      baseURL: this.config.baseUrl,
      authHeader: { value: `Bearer ${this.config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: MAX_JSON_BYTES,
      maxBodyLength: 34 * 1024 * 1024,
      errorAdapter: error => apiError(error, 'request')
    });
  }
  static fromContext(ctx: { auth: AuthOutput; config: Record<string, unknown> }) {
    return new Client(connection(ctx.auth, ctx.config));
  }
  private safe(value: unknown) {
    if (
      !finiteJson(value) ||
      !secretFree(value, [this.config.token, this.config.refreshToken ?? '']) ||
      Buffer.byteLength(JSON.stringify(value)) > MAX_JSON_BYTES
    )
      throw malformed();
    return value;
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    params?: Record<string, unknown>,
    data?: unknown,
    multipartBody = false
  ) {
    let response: { status: number; data: unknown };
    try {
      response = await this.axios.request({
        method,
        url: path,
        params,
        data,
        ...(multipartBody ? { headers: { 'Content-Type': 'multipart/form-data' } } : {})
      });
    } catch (error) {
      throw apiError(error, method, method !== 'get');
    }
    if (response.status === 204 && method === 'delete')
      return { status: response.status, data: undefined };
    if (response.status < 200 || response.status > 201) throw malformed();
    return { status: response.status, data: this.safe(response.data) };
  }
  private flatten(value: unknown, prefix: string, out: Record<string, unknown>, depth = 0) {
    if (depth > 10 || Object.keys(out).length > 500)
      throw invalid(
        'Keep nested filters and population within 10 levels and 500 query values.'
      );
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key) || /[[\]]/.test(key))
          throw invalid('Query property names cannot contain brackets or prototype keys.');
        this.flatten(child, `${prefix}[${key}]`, out, depth + 1);
      }
    } else out[prefix] = value;
  }
  private query(
    params: QueryParams = {},
    mutation = false,
    collection = false
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    const selected = {
      ...pickDefined(params),
      ...(params.pagination ? { pagination: pickDefined(params.pagination) } : {})
    };
    if (!finiteJson(selected) || Buffer.byteLength(JSON.stringify(selected)) > 65536)
      throw invalid('Use finite JSON query values within 64 KiB.');
    for (const key of ['fields', 'populate', 'filters', 'sort', 'pagination'] as const) {
      if (params[key] !== undefined)
        this.flatten(
          key === 'pagination' ? pickDefined(params.pagination!) : params[key],
          key,
          query
        );
    }
    const page = params.pagination;
    if (page?.page !== undefined) integer(page.page, 'page');
    if (page?.pageSize !== undefined) integer(page.pageSize, 'pageSize', 1, 100);
    if (page?.start !== undefined) integer(page.start, 'start', 0);
    if (page?.limit !== undefined) integer(page.limit, 'limit', 1, 100);
    if (
      page &&
      (page.page !== undefined || page.pageSize !== undefined) &&
      (page.start !== undefined || page.limit !== undefined)
    )
      throw invalid('Use either page or offset pagination, not both.');
    if (params.locale !== undefined) {
      if (
        !params.locale ||
        params.locale.length > 64 ||
        !/^[A-Za-z0-9_-]+$/.test(params.locale)
      )
        throw invalid('Use an enabled exact locale code; omit it for the instance default.');
      if (this.config.apiVersion === '4' && mutation)
        throw invalid(
          'Strapi 4 entries have separate numeric IDs per locale. Omit locale on updates/deletes and use that locale entry ID; localized creation is supported by fields.locale.'
        );
      query.locale = params.locale;
    }
    if (params.status !== undefined) {
      if (this.config.apiVersion === '5') query.status = params.status;
      else if (mutation)
        throw invalid(
          'Strapi 4 does not support status on writes. Omit status and set the documented publishedAt field explicitly when Draft & Publish is enabled.'
        );
      else {
        query.publicationState = params.status === 'published' ? 'live' : 'preview';
        if (params.status === 'draft') {
          if (!collection)
            throw invalid(
              'For Strapi 4 draft reads, use list_entries with status=draft and an exact ID filter. Single-entry preview also includes published entries.'
            );
          this.flatten(
            { $and: [params.filters ?? {}, { publishedAt: { $null: true } }] },
            'filters',
            query
          );
        }
      }
    }
    if (Object.keys(query).length > 500) throw invalid('Keep queries within 500 values.');
    return query;
  }
  private path(type: string, id?: string) {
    const path = `/api/${segment(type, 'contentType')}`;
    if (id === undefined) return path;
    if (this.config.apiVersion === '4' && !/^[1-9][0-9]*$/.test(id))
      throw invalid(
        'For Strapi 4, documentId is the exact numeric entry ID written as a string. For Strapi 5 use documentId from its native response.'
      );
    return `${path}/${segment(id, 'documentId')}`;
  }
  private pagination(value: unknown): PaginationMeta | undefined {
    if (value === undefined) return undefined;
    if (!record(value)) throw malformed();
    for (const [key, count] of Object.entries(value))
      if (
        ['page', 'pageSize', 'pageCount', 'total', 'start', 'limit'].includes(key) &&
        (!Number.isSafeInteger(count) || Number(count) < 0)
      )
        throw malformed();
    return value;
  }
  private entry(value: unknown, expected?: string): Record<string, unknown> {
    if (!record(value)) throw malformed();
    if (!Number.isSafeInteger(value.id) || Number(value.id) < 1) throw malformed();
    if (
      this.config.apiVersion === '5' &&
      (typeof value.documentId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value.documentId))
    )
      throw malformed();
    if (
      expected !== undefined &&
      (this.config.apiVersion === '5'
        ? value.documentId !== expected
        : String(value.id) !== expected)
    )
      throw malformed();
    if (this.config.apiVersion === '4' && !record(value.attributes)) throw malformed();
    return value;
  }
  private single(body: unknown, expected?: string): SingleResponse {
    if (!record(body) || body.error || !record(body.data)) throw malformed();
    return { data: this.entry(body.data, expected), meta: record(body.meta) ? body.meta : {} };
  }
  private fields(data: Record<string, unknown>) {
    if (
      !record(data) ||
      !finiteJson(data) ||
      Object.keys(data).length === 0 ||
      Buffer.byteLength(JSON.stringify(data)) > 1024 * 1024 ||
      !secretFree(data, [this.config.token, this.config.refreshToken ?? ''])
    )
      throw invalid(
        'Provide a nonempty finite JSON fields object within 1 MiB, matching your content model. Do not include connection credentials.'
      );
    return data;
  }
  async listEntries(type: string, params: QueryParams = {}): Promise<ListResponse> {
    const path = this.path(type);
    const query = this.query(
      {
        ...params,
        pagination: { page: 1, pageSize: 25, ...pickDefined(params.pagination ?? {}) }
      },
      false,
      true
    );
    const body = (await this.request('get', path, query)).data;
    if (
      !record(body) ||
      body.error ||
      !Array.isArray(body.data) ||
      body.data.length > (params.pagination?.pageSize ?? 25)
    )
      throw malformed();
    return {
      data: body.data.map(item => this.entry(item)),
      meta: {
        pagination: this.pagination(record(body.meta) ? body.meta.pagination : undefined)
      }
    };
  }
  async getEntry(type: string, id: string, params: QueryParams = {}) {
    const path = this.path(type, id);
    return this.single((await this.request('get', path, this.query(params))).data, id);
  }
  async createEntry(type: string, data: Record<string, unknown>, params: QueryParams = {}) {
    const path = this.path(type);
    const query = this.query(params, true);
    return this.single(
      (await this.request('post', path, query, { data: this.fields(data) })).data
    );
  }
  async updateEntry(
    type: string,
    id: string,
    data: Record<string, unknown>,
    params: QueryParams = {}
  ) {
    const path = this.path(type, id);
    const query = this.query(params, true);
    return this.single(
      (await this.request('put', path, query, { data: this.fields(data) })).data,
      id
    );
  }
  async deleteEntry(
    type: string,
    id: string,
    params: QueryParams = {}
  ): Promise<{ data?: Record<string, unknown> }> {
    const path = this.path(type, id);
    const result = await this.request('delete', path, this.query(params, true));
    return result.status === 204 ? {} : this.single(result.data, id);
  }
  async getSingleType(type: string, params: QueryParams = {}) {
    const path = this.path(type);
    return this.single((await this.request('get', path, this.query(params))).data);
  }
  async updateSingleType(
    type: string,
    data: Record<string, unknown>,
    params: QueryParams = {}
  ) {
    const path = this.path(type);
    const query = this.query(params, true);
    return this.single(
      (await this.request('put', path, query, { data: this.fields(data) })).data
    );
  }
  private file(value: unknown, expected?: number) {
    if (
      !record(value) ||
      !Number.isSafeInteger(value.id) ||
      Number(value.id) < 1 ||
      (expected !== undefined && value.id !== expected)
    )
      throw malformed();
    return value;
  }
  async listFiles(params: QueryParams = {}): Promise<ListResponse> {
    const page = params.pagination?.page ?? 1,
      pageSize = params.pagination?.pageSize ?? 25;
    const query = this.query({
      ...params,
      pagination: this.config.apiVersion === '5' ? { page, pageSize } : undefined
    });
    if (this.config.apiVersion === '4') {
      const start = (integer(page, 'page') - 1) * integer(pageSize, 'pageSize', 1, 100);
      integer(start, 'media offset', 0);
      query.start = start;
      query.limit = pageSize;
    }
    const body = (
      await this.request(
        'get',
        this.config.apiVersion === '5' ? '/api/upload/files/page' : '/api/upload/files',
        query
      )
    ).data;
    if (this.config.apiVersion === '4') {
      if (!Array.isArray(body) || body.length > pageSize) throw malformed();
      return { data: body.map(item => this.file(item)), meta: {} };
    }
    if (
      !record(body) ||
      !Array.isArray(body.data) ||
      body.data.length > pageSize ||
      !record(body.meta)
    )
      throw malformed();
    return {
      data: body.data.map(item => this.file(item)),
      meta: { pagination: this.pagination(body.meta.pagination) }
    };
  }
  async getFile(fileId: number) {
    integer(fileId, 'fileId');
    return this.file((await this.request('get', `/api/upload/files/${fileId}`)).data, fileId);
  }
  async deleteFile(fileId: number) {
    integer(fileId, 'fileId');
    const result = await this.request('delete', `/api/upload/files/${fileId}`);
    return result.status === 204 ? undefined : this.file(result.data, fileId);
  }
  async uploadFileFromUrl(
    fileUrl: string,
    fileName: string,
    fileInfo?: { name?: string; alternativeText?: string; caption?: string }
  ) {
    if (!fileName || fileName.length > 200 || /[\\/"\r\n]/.test(fileName))
      throw invalid(
        'Use a nonempty filename up to 200 characters without paths, quotes or line breaks.'
      );
    if (
      !secretFree({ fileUrl, fileName, ...fileInfo }, [
        this.config.token,
        this.config.refreshToken ?? ''
      ])
    )
      throw invalid(
        'Do not include connection credentials in source URLs, filenames or metadata.'
      );
    if (fileInfo && Object.keys(fileInfo).length) this.fields(fileInfo);
    const source = await fetchUpload(fileUrl);
    const form = multipart(source, fileName, fileInfo);
    const body = (await this.request('post', '/api/upload', undefined, form, true)).data;
    if (!Array.isArray(body) || body.length !== 1) throw malformed();
    return body.map(item => this.file(item));
  }
  async updateFileInfo(
    fileId: number,
    fileInfo: { name?: string; alternativeText?: string; caption?: string }
  ) {
    integer(fileId, 'fileId');
    this.fields(pickDefined(fileInfo));
    const form = new FormData();
    form.append('fileInfo', JSON.stringify(pickDefined(fileInfo)));
    return this.file(
      (await this.request('post', '/api/upload', { id: fileId }, form, true)).data,
      fileId
    );
  }
  async getMe() {
    if (this.config.authMode === 'api_token')
      throw invalid(
        'API tokens authorize content permissions and do not identify an end user. Connect with JWT Login to retrieve the current user.'
      );
    const user = this.file(
      (await this.request('get', '/api/users/me')).data,
      this.config.userId
    );
    return user;
  }
}
