import { createAuthenticatedAxios, getResponseHeaderValue } from 'slates';
import {
  appUrl,
  type Document,
  fail,
  fields,
  integer,
  json,
  object,
  own,
  reflected,
  segment,
  text,
  typeName
} from './validation';
export type BubbleRecord = Document & { _id: string };
export interface BubbleConstraint {
  key: string;
  constraint_type: string;
  value?: unknown;
}
export interface SearchParams {
  constraints?: BubbleConstraint[];
  sortField?: string;
  descending?: boolean;
  limit?: number;
  cursor?: number;
}
export interface BubbleSearchResponse {
  cursor: number;
  count: number;
  remaining: number;
  results: BubbleRecord[];
  nextCursor?: number;
}
export class Client {
  readonly baseUrl: string;
  private readonly secrets: string[];
  private readonly token?: string;
  constructor(config: { baseUrl: string; token?: string }) {
    this.baseUrl = appUrl(config.baseUrl);
    this.token = config.token === undefined ? undefined : text(config.token, 'Bearer token');
    this.secrets = this.token ? [this.token] : [];
  }
  private remember(value: unknown, sensitive = false) {
    if (typeof value === 'string' && sensitive && value.length >= 4) this.secrets.push(value);
    else if (Array.isArray(value)) for (const entry of value) this.remember(entry, sensitive);
    else if (value && typeof value === 'object')
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value)))
        if ('value' in descriptor)
          this.remember(
            descriptor.value,
            sensitive || /password|secret|token|api.?key|authorization/i.test(key)
          );
  }
  private recovery(value: Document) {
    const safe: Document = {};
    for (const [key, entry] of Object.entries(value)) {
      try {
        safe[key] = json(entry, this.secrets, true);
      } catch {
        safe[key] = '[withheld]';
      }
    }
    return safe;
  }
  private reportedId(row: unknown): string[] {
    try {
      const value = own(row, 'id');
      if (typeof value !== 'string') return [];
      const id = segment(value, 'reported record ID');
      json(id, this.secrets);
      return [id];
    } catch {
      // An unusable receipt must not discard other safe IDs needed for reconciliation.
      return [];
    }
  }
  private adapt(error: unknown, write: boolean, recovery: Document) {
    const data = own(error, 'data') ?? own(own(error, 'error'), 'data');
    const status =
      own(own(error, 'response'), 'status') ??
      own(own(data, 'upstream'), 'status') ??
      own(data, 'upstreamStatus');
    const code =
      typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
        ? status
        : undefined;
    const advice =
      code === 401 || code === 403
        ? 'Check token validity, exposed data types and Data API privacy permissions; admin and user tokens have different access.'
        : code === 404
          ? 'Verify the app branch, exposed data type and exact record ID; the record may be absent or hidden by privacy rules.'
          : code === 429
            ? 'Wait for Bubble capacity/rate limits before continuing.'
            : 'Check Bubble and the app’s API configuration.';
    return fail(
      `Bubble request failed. ${advice}${write ? ' It may have taken effect; reconcile retained IDs and effects before repeating.' : ''}`,
      { upstreamStatus: code, outcomeUncertain: write, recovery: this.recovery(recovery) }
    );
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, string>,
    statuses = [200],
    plain = false,
    recovery: Document = {}
  ) {
    this.remember(data);
    json(path, this.secrets);
    if (params) json(params, this.secrets);
    const write = method !== 'GET' || path.startsWith('/wf/');
    const ax = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      ...(this.token ? { authHeader: { value: `Bearer ${this.token}` } } : {}),
      contentType: plain ? 'text/plain' : 'application/json',
      timeout: plain ? 250000 : 30000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      maxBodyLength: 16 * 1024 * 1024
    });
    let reportedIds: string[] = [];
    try {
      const response = await ax.request<unknown>({
        method,
        url: path,
        data,
        params,
        ...(plain
          ? { responseType: 'text' as const, transformResponse: [(value: unknown) => value] }
          : {})
      });
      if (write) {
        const rows =
          typeof response.data === 'string'
            ? response.data
                .split(/\r?\n/)
                .slice(0, 1000)
                .flatMap(line => {
                  try {
                    return [JSON.parse(line)];
                  } catch {
                    return [];
                  }
                })
            : [response.data];
        reportedIds = rows.flatMap(row => this.reportedId(row));
      }
      if (!statuses.includes(response.status))
        throw fail('Bubble returned an unexpected HTTP status.', {
          upstreamStatus: response.status
        });
      for (const key of Object.keys(response.headers)) {
        const value = getResponseHeaderValue(response.headers, key);
        if (value && reflected(value, this.secrets))
          throw fail('Credential-bearing response headers were withheld.');
      }
      return response.status === 204 ? null : json(response.data, this.secrets, true);
    } catch (error) {
      throw this.adapt(error, write, {
        ...recovery,
        ...(reportedIds.length ? { reportedIds } : {})
      });
    }
  }
  async getRecord(dataType: string, recordId: string): Promise<BubbleRecord> {
    const exact = segment(recordId, 'record ID');
    const record = object(
      object(
        await this.request(
          'GET',
          `/obj/${encodeURIComponent(typeName(dataType))}/${encodeURIComponent(exact)}`
        )
      ).response
    );
    if (record._id !== exact) throw fail('Bubble returned a different record ID.');
    return record as BubbleRecord;
  }
  async searchRecords(
    dataType: string,
    params: SearchParams = {}
  ): Promise<BubbleSearchResponse> {
    const query: Record<string, string> = {};
    if (params.constraints !== undefined)
      query.constraints = JSON.stringify(json(params.constraints));
    if (params.sortField !== undefined)
      query.sort_field = text(params.sortField, 'sort field');
    if (params.descending !== undefined) query.descending = String(params.descending);
    if (params.limit !== undefined)
      query.limit = String(integer(params.limit, 'limit', 1, 100));
    if (params.cursor !== undefined)
      query.cursor = String(integer(params.cursor, 'cursor', 0));
    const result = object(
      object(
        await this.request(
          'GET',
          `/obj/${encodeURIComponent(typeName(dataType))}`,
          undefined,
          query
        )
      ).response
    );
    const cursor = integer(result.cursor, 'returned cursor', 0),
      count = integer(result.count, 'returned count', 0, 100),
      remaining = integer(result.remaining, 'returned remaining');
    if (
      cursor !== (params.cursor ?? 0) ||
      !Array.isArray(result.results) ||
      result.results.length !== count ||
      (params.limit !== undefined && count > params.limit)
    )
      throw fail('Bubble returned an inconsistent page.');
    const results = result.results.map(value => {
      const record = object(value);
      segment(record._id, 'returned record ID');
      return record as BubbleRecord;
    });
    if (
      new Set(results.map(record => record._id)).size !== results.length ||
      (remaining > 0 && count === 0)
    )
      throw fail('Bubble returned duplicate records or a non-advancing page.');
    return {
      cursor,
      count,
      remaining,
      results,
      ...(remaining > 0 ? { nextCursor: integer(cursor + count, 'next cursor') } : {})
    };
  }
  async createRecord(dataType: string, value: Record<string, unknown>) {
    const typename = typeName(dataType),
      payload = fields(value);
    const result = object(
      await this.request(
        'POST',
        `/obj/${encodeURIComponent(typename)}`,
        payload,
        undefined,
        [201],
        false,
        { dataType: typename }
      )
    );
    if (result.status !== 'success' || typeof result.id !== 'string')
      throw fail(
        'The creation receipt is incomplete. A record may remain; reconcile before repeating.',
        {
          outcomeUncertain: true,
          recovery: {
            dataType: typename,
            ...(typeof result.id === 'string'
              ? { reportedIds: [segment(result.id, 'reported record ID')] }
              : {})
          }
        }
      );
    return { id: segment(result.id, 'created record ID'), status: result.status };
  }
  async updateRecord(dataType: string, recordId: string, value: Record<string, unknown>) {
    await this.request(
      'PATCH',
      `/obj/${encodeURIComponent(typeName(dataType))}/${encodeURIComponent(segment(recordId, 'record ID'))}`,
      fields(value),
      undefined,
      [204],
      false,
      { dataType: typeName(dataType), recordId }
    );
  }
  async replaceRecord(dataType: string, recordId: string, value: Record<string, unknown>) {
    await this.request(
      'PUT',
      `/obj/${encodeURIComponent(typeName(dataType))}/${encodeURIComponent(segment(recordId, 'record ID'))}`,
      fields(value),
      undefined,
      [204],
      false,
      { dataType: typeName(dataType), recordId }
    );
  }
  async deleteRecord(dataType: string, recordId: string) {
    await this.request(
      'DELETE',
      `/obj/${encodeURIComponent(typeName(dataType))}/${encodeURIComponent(segment(recordId, 'record ID'))}`,
      undefined,
      undefined,
      [204],
      false,
      { dataType: typeName(dataType), recordId }
    );
  }
  async bulkCreateRecords(dataType: string, records: Record<string, unknown>[]) {
    if (!records.length || records.length > 1000)
      throw fail('Bulk creation requires 1–1000 records.');
    const payloads = records.map(fields);
    this.remember(payloads);
    const result = await this.request(
      'POST',
      `/obj/${encodeURIComponent(typeName(dataType))}/bulk`,
      payloads.map(value => JSON.stringify(value)).join('\n'),
      undefined,
      [200],
      true,
      { dataType: typeName(dataType), requestedCount: records.length }
    );
    const lines = typeof result === 'string' ? result.trim().split(/\r?\n/) : [];
    const reportedIds = lines.flatMap(line => {
      try {
        const row = JSON.parse(line);
        return this.reportedId(row);
      } catch {
        return [];
      }
    });
    const ids: string[] = [],
      failures: { index: number; message: string }[] = [];
    try {
      if (lines.length !== records.length)
        throw fail('The bulk receipt does not match every requested row.');
      for (const [index, line] of lines.entries()) {
        const row = object(json(JSON.parse(line), this.secrets, true));
        if (row.status === 'success' && typeof row.id === 'string')
          ids.push(segment(row.id, 'created record ID'));
        else if (row.status === 'error')
          failures.push({
            index,
            message: 'Bubble rejected this row. Check its fields and privacy permissions.'
          });
        else throw fail('Bubble returned an unsupported bulk receipt.');
      }
      if (new Set(ids).size !== ids.length)
        throw fail('Bubble returned duplicate created IDs.');
    } catch {
      throw fail(
        'Bulk creation returned an incomplete receipt. Some records may remain; reconcile before repeating.',
        {
          outcomeUncertain: true,
          recovery: this.recovery({
            dataType: typeName(dataType),
            requestedCount: records.length,
            receivedCount: lines.length,
            receiptComplete: false,
            reportedIds
          })
        }
      );
    }
    return { ids, failures, partialFailure: failures.length > 0 };
  }
  async triggerWorkflow(
    workflowName: string,
    params: Record<string, unknown>,
    method: 'POST' | 'GET' = 'POST'
  ) {
    const workflow = segment(workflowName, 'workflow name');
    if (!/^[A-Za-z0-9_-]+$/.test(workflow))
      throw fail(
        'Use the exact workflow endpoint name from get_api_spec, without spaces or special characters.'
      );
    const payload = object(json(params));
    this.remember(payload);
    const data = await this.request(
      method,
      `/wf/${encodeURIComponent(workflow)}`,
      method === 'POST' ? payload : undefined,
      method === 'GET'
        ? Object.fromEntries(
            Object.entries(payload).map(([key, value]) => [
              key,
              typeof value === 'string' ? value : JSON.stringify(value)
            ])
          )
        : undefined,
      [200],
      false,
      { workflowName: workflow }
    );
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (data.status !== undefined && data.status !== 'success')
        throw fail(
          'The workflow did not report success. Effects may remain; reconcile before repeating.',
          { outcomeUncertain: true, recovery: { workflowName: workflow } }
        );
      return Object.hasOwn(data, 'response') ? data.response : data;
    }
    return data;
  }
  async getSwaggerSpec() {
    const result = object(await this.request('GET', '/meta/swagger.json'));
    if (
      !result.paths ||
      typeof result.paths !== 'object' ||
      !('swagger' in result || 'openapi' in result)
    )
      throw fail(
        'Bubble did not return an API specification. Enable Swagger access in Settings → API.'
      );
    if (
      typeof result.basePath === 'string' &&
      result.basePath !== new URL(this.baseUrl).pathname
    )
      throw fail('The API specification belongs to another branch.');
    return result;
  }
}
export function clientFor(ctx: {
  auth?: { token?: string; appBaseUrl?: string };
  config?: { [key: string]: unknown };
}) {
  return new Client({
    baseUrl: appUrl(ctx.auth?.appBaseUrl ?? ctx.config?.appBaseUrl),
    token: ctx.auth?.token
  });
}
