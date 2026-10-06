import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export type Row = Record<string, unknown>;
export const record = (value: unknown, label = 'response'): Row => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError(`RudderStack returned an invalid ${label}.`, {
      reason: 'invalid_response'
    });
  return value;
};
export const collection = (value: unknown, keys: string[] = []): Row[] => {
  let candidate = value;
  if (isApiErrorRecord(value)) {
    candidate = keys.map(key => value[key]).find(item => Array.isArray(item));
  }
  if (!Array.isArray(candidate))
    throw createApiServiceError('RudderStack returned an invalid collection.', {
      reason: 'invalid_response'
    });
  return candidate.map(item => record(item, 'collection entry'));
};
export const stringField = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim())
    throw createApiServiceError(`RudderStack did not return ${label}.`, {
      reason: 'invalid_response'
    });
  return value;
};
const pathId = (value: string): string => {
  if (!value.trim() || value === '.' || value === '..')
    throw createApiServiceError('A non-empty resource ID is required.');
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('Resource IDs must contain valid Unicode characters.');
  }
};
const integer = (
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  label: string
) => {
  let result = value ?? fallback;
  if (!Number.isInteger(result) || result < minimum || result > maximum)
    throw createApiServiceError(
      `${label} must be an integer between ${minimum} and ${maximum}.`
    );
  return result;
};
const isoDate = (value: string | undefined, label: string) => {
  if (
    value !== undefined &&
    (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))
  )
    throw createApiServiceError(`${label} must be an ISO 8601 date and time.`);
  return value;
};
const safe = (value: unknown, secrets: string[]): unknown => {
  if (typeof value === 'string')
    return secrets
      .filter(Boolean)
      .reduce((s, secret) => s.split(secret).join('[redacted]'), value)
      .replace(
        /([?&][^=&#\s]*(?:token|key|secret|password|credential|signature)[^=&#\s]*=)[^&#\s]*/gi,
        '$1[redacted]'
      )
      .replace(/(:\/\/)[^\s/@]+@/g, '$1[redacted]@');
  if (Array.isArray(value)) return value.map(item => safe(item, secrets));
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      /authorization|cookie|password|secret|credential|token|apikey|writekey|accesskey|privatekey|signingkey|connectionstring/i.test(
        key.replace(/[_-]/g, '')
      )
        ? '[redacted]'
        : safe(item, secrets)
    ])
  );
};
// Test API previews contain real destination requests. Their custom header, query,
// and body credentials cannot be identified safely by guessing property names.
const safeTestResult = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(safeTestResult);
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === 'destination_response'
        ? '[redacted]'
        : key === 'dest_transformed_payload' && Array.isArray(item)
          ? item.map(payload => {
              let request = record(payload, 'destination request');
              return Object.fromEntries(
                Object.entries(request).map(([field, content]) => [
                  field,
                  ['endpoint', 'headers', 'params', 'body', 'files'].includes(field)
                    ? '[redacted]'
                    : safeTestResult(content)
                ])
              );
            })
          : safeTestResult(item)
    ])
  );
};
const apiFailure = (error: unknown, operation: string) => {
  if (error instanceof ServiceError) return error;
  // Never retain request headers, raw response bodies, or downstream credentials in error parents.
  return buildApiServiceError(error, {
    providerLabel: 'RudderStack',
    reason: 'api_error',
    operation,
    parent: {},
    formatMessage: ({ operation, status, message }) =>
      `RudderStack API ${operation} failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}: ${message}`,
    extractMessage: () =>
      'Check the token permissions, region, resource IDs and feature availability. Rate-limited requests can be retried later.'
  });
};
export interface ControlPlaneClientConfig {
  token: string;
  region?: string;
}
export interface DataPlaneClientConfig {
  sourceWriteKey: string;
  dataPlaneUrl: string;
}
export interface CodeInput {
  name?: string;
  code?: string;
  language?: string;
  description?: string;
  publish?: boolean;
}
const language = (value?: string) =>
  value === 'python' ? 'pythonfaas' : (value ?? 'javascript');
const codeResource = (value: unknown, key: string) => {
  let outer = record(value);
  let resource = record(outer[key] ?? outer);
  stringField(resource.id, 'the resource ID');
  stringField(resource.versionId, 'the revision ID');
  return resource;
};
export class ControlPlaneClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private basicHttp: ReturnType<typeof createAuthenticatedAxios>;
  private secrets: string[];
  constructor(config: ControlPlaneClientConfig) {
    if (!config.token.trim() || /[\r\n]/.test(config.token))
      throw createApiServiceError('An access token is required.');
    let baseURL =
      config.region === 'eu'
        ? 'https://api.eu.rudderstack.com'
        : 'https://api.rudderstack.com';
    let basic = Buffer.from(`:${config.token}`).toString('base64');
    this.secrets = [config.token, basic];
    this.http = createAuthenticatedAxios({
      baseURL,
      timeout: 30000,
      maxRedirects: 0,
      authHeader: { value: `Bearer ${config.token}` }
    });
    this.basicHttp = createAuthenticatedAxios({
      baseURL,
      timeout: 30000,
      maxRedirects: 0,
      authHeader: { value: `Basic ${basic}` }
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Row,
    basic = false,
    syncStatus = false
  ): Promise<unknown> {
    try {
      let response = await (basic ? this.basicHttp : this.http).request<unknown>({
        method,
        url: path,
        data,
        params
      });
      if (
        isApiErrorRecord(response.data) &&
        (response.data.success === false ||
          (response.data.error && !(syncStatus && response.data.status === 'failed')))
      )
        throw createApiServiceError('RudderStack rejected the operation.', {
          reason: 'api_error',
          upstreamStatus: response.status
        });
      return safe(response.data, this.secrets);
    } catch (error) {
      throw apiFailure(error, method);
    }
  }
  async createTransformation(data: CodeInput) {
    let { publish, ...body } = data;
    return codeResource(
      await this.request(
        'POST',
        '/transformations',
        { ...pickDefined(body), language: language(data.language) },
        { publish: publish ?? false }
      ),
      'transformation'
    );
  }
  async listTransformations() {
    return collection(await this.request('GET', '/transformations'), ['transformations']);
  }
  async getTransformation(id: string) {
    return codeResource(
      await this.request('GET', `/transformations/${pathId(id)}`),
      'transformation'
    );
  }
  async getTransformationVersions(id: string, order?: string, count?: number) {
    return collection(
      await this.request('GET', `/transformations/${pathId(id)}/versions`, undefined, {
        orderBy: order ?? 'asc',
        count: integer(count, 5, 1, 1000, 'Version count')
      }),
      ['TransformationVersions', 'transformationVersions', 'versions']
    );
  }
  async updateTransformation(id: string, data: CodeInput) {
    if (data.language !== undefined) {
      let latest = (await this.getTransformationVersions(id, 'desc', 1))[0];
      if (!latest || latest.language !== language(data.language))
        throw createApiServiceError('A transformation language cannot be changed.');
    }
    let { publish, language: _language, ...body } = data;
    if (!Object.values(body).some(value => value !== undefined))
      throw createApiServiceError('Provide name, code or description for an update.');
    return codeResource(
      await this.request('POST', `/transformations/${pathId(id)}`, pickDefined(body), {
        publish: publish ?? false
      }),
      'transformation'
    );
  }
  async deleteTransformation(id: string) {
    await this.request('DELETE', `/transformations/${pathId(id)}`);
  }
  async createLibrary(data: CodeInput) {
    let { publish, ...body } = data;
    return codeResource(
      await this.request(
        'POST',
        '/libraries',
        { ...pickDefined(body), language: language(data.language) },
        { publish: publish ?? false }
      ),
      'library'
    );
  }
  async listLibraries() {
    return collection(await this.request('GET', '/libraries'), ['libraries']);
  }
  async getLibrary(id: string) {
    return codeResource(await this.request('GET', `/libraries/${pathId(id)}`), 'library');
  }
  async getLibraryVersions(id: string, order?: string, count?: number) {
    return collection(
      await this.request('GET', `/libraries/${pathId(id)}/versions`, undefined, {
        orderBy: order ?? 'asc',
        count: integer(count, 5, 1, 1000, 'Version count')
      }),
      ['libraryVersions', 'LibraryVersions', 'versions']
    );
  }
  async updateLibrary(id: string, data: CodeInput) {
    let latest = (await this.getLibraryVersions(id, 'desc', 1))[0];
    if (!latest) throw createApiServiceError('No library revision was found.');
    if (data.name !== undefined && data.name !== latest.name)
      throw createApiServiceError('A library name cannot be changed.');
    if (data.language !== undefined && language(data.language) !== latest.language)
      throw createApiServiceError('A library language cannot be changed.');
    if (data.code === undefined && data.description === undefined)
      throw createApiServiceError('Provide code or description for an update.');
    if (
      data.code === undefined &&
      typeof latest.code === 'string' &&
      latest.code.includes('[redacted]')
    )
      throw createApiServiceError(
        'Provide code explicitly; stored library code containing redacted credentials cannot be safely reused.'
      );
    return codeResource(
      await this.request(
        'POST',
        `/libraries/${pathId(id)}`,
        {
          code: data.code ?? stringField(latest.code, 'the library code'),
          language: stringField(latest.language, 'the library language'),
          ...pickDefined({ description: data.description })
        },
        { publish: data.publish ?? false }
      ),
      'library'
    );
  }
  async deleteLibrary(id: string) {
    await this.request('DELETE', `/libraries/${pathId(id)}`);
  }
  async publish(data: {
    transformationIds?: string[];
    libraryIds?: string[];
    testInput?: Row[];
  }) {
    let transformations: Row[] = [];
    let libraries: Row[] = [];
    for (let id of data.transformationIds ?? []) {
      let revision = (await this.getTransformationVersions(id, 'desc', 1))[0];
      transformations.push(
        pickDefined({
          versionId: stringField(revision?.versionId, 'the latest transformation revision ID'),
          testInput: data.testInput
        })
      );
    }
    for (let id of data.libraryIds ?? []) {
      let revision = (await this.getLibraryVersions(id, 'desc', 1))[0];
      libraries.push({
        versionId: stringField(revision?.versionId, 'the latest library revision ID')
      });
    }
    let result = record(
      await this.request(
        'POST',
        '/libraries/publish',
        pickDefined({
          transformations: transformations.length ? transformations : undefined,
          libraries: libraries.length ? libraries : undefined
        })
      )
    );
    if (result.published !== true)
      throw createApiServiceError('RudderStack did not confirm publishing.', {
        reason: 'invalid_response'
      });
  }
  async createTrackingPlan(data: { name: string; description?: string }) {
    return this.plan(
      await this.request('POST', '/v2/catalog/tracking-plans', pickDefined(data))
    );
  }
  private plan(value: unknown) {
    let outer = record(value);
    let result = record(outer.trackingPlan ?? outer);
    stringField(result.id, 'the tracking plan ID');
    return result;
  }
  async listTrackingPlans() {
    return collection(await this.request('GET', '/v2/catalog/tracking-plans'), [
      'trackingPlans'
    ]);
  }
  async getTrackingPlan(id: string) {
    return this.plan(
      await this.request('GET', `/v2/catalog/tracking-plans/${pathId(id)}`, undefined, {
        rebuildSchemas: false
      })
    );
  }
  async updateTrackingPlan(id: string, data: { name?: string; description?: string }) {
    if (data.name === undefined && data.description === undefined)
      throw createApiServiceError('Provide name or description for an update.');
    return this.plan(
      await this.request('PUT', `/v2/catalog/tracking-plans/${pathId(id)}`, pickDefined(data))
    );
  }
  async deleteTrackingPlan(id: string) {
    await this.request('DELETE', `/v2/catalog/tracking-plans/${pathId(id)}`);
  }
  async upsertTrackingPlanEvents(id: string, events: Row[]) {
    let results: Row[] = [];
    for (let event of events) {
      let method: 'PUT' | 'PATCH' | 'POST' =
        typeof event.id === 'string' ? 'PUT' : event.rules !== undefined ? 'PATCH' : 'POST';
      results.push(
        record(
          await this.request(
            method,
            `/v2/catalog/tracking-plans/${pathId(id)}/events`,
            event,
            { rebuildSchemas: false }
          )
        )
      );
    }
    return results;
  }
  async listTrackingPlanEvents(id: string, page?: number) {
    let result = record(
      await this.request('GET', `/v2/catalog/tracking-plans/${pathId(id)}/events`, undefined, {
        page: integer(page, 1, 1, 50, 'Page'),
        rebuildSchemas: false
      })
    );
    let data = collection(result, ['data']);
    return {
      events: data,
      total: typeof result.total === 'number' ? result.total : undefined,
      currentPage: typeof result.currentPage === 'number' ? result.currentPage : undefined,
      pageSize: typeof result.pageSize === 'number' ? result.pageSize : undefined
    };
  }
  async deleteTrackingPlanEvent(id: string, eventId: string) {
    await this.request(
      'DELETE',
      `/v2/catalog/tracking-plans/${pathId(id)}/events/${pathId(eventId)}`
    );
  }
  async createRegulation(data: {
    regulationType: string;
    sourceIds?: string[];
    destinationIds?: string[];
    users: Array<{ userId: string; email?: string; phone?: string }>;
  }) {
    if (!data.users.length || data.users.some(user => !user.userId.trim()))
      throw createApiServiceError(
        'Provide at least one non-empty synthetic or authorized user ID.'
      );
    if (
      (data.regulationType === 'suppress' && data.destinationIds !== undefined) ||
      (data.regulationType === 'suppress_with_delete' && data.sourceIds !== undefined)
    )
      throw createApiServiceError(
        'Use only sourceIds for suppress, or destinationIds for suppress_with_delete.'
      );
    let result = await this.request('POST', '/v2/regulations', pickDefined(data));
    if (result === 'Created') return {};
    return record(result, 'regulation acknowledgement');
  }
  async deleteRegulation(id: string) {
    await this.request('DELETE', `/v2/regulations/${pathId(id)}`);
  }
  private cursor(value: unknown, path: string): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    let next = stringField(value, 'the next-page URL');
    let url: URL;
    try {
      url = new URL(next, 'https://api.rudderstack.com');
    } catch {
      throw createApiServiceError('RudderStack returned an invalid next-page URL.');
    }
    if (
      !['api.rudderstack.com', 'api.eu.rudderstack.com'].includes(url.hostname) ||
      url.pathname !== path ||
      url.username ||
      url.password ||
      url.hash
    )
      throw createApiServiceError('RudderStack returned an unexpected next-page URL.');
    let cursor = url.searchParams.get('after_cursor');
    if (!cursor)
      throw createApiServiceError('RudderStack omitted the next-page cursor.', {
        reason: 'invalid_response'
      });
    return cursor;
  }
  private async cursorWindow(
    path: string,
    params: { limit?: number; offset?: number; afterCursor?: string; endDate?: string },
    filters: Row,
    pageSize: boolean
  ) {
    let limit = integer(params.limit, 100, 1, 1000, 'Limit');
    let offset = integer(params.offset, 0, 0, 10000, 'Offset');
    let result: Row[] = [];
    let cursor = params.afterCursor;
    let seen = new Set<string>(cursor ? [cursor] : []);
    let skipped = 0;
    let next: string | undefined;
    for (let page = 0; page < 120; page++) {
      let body = record(
        await this.request(
          'GET',
          path,
          undefined,
          pickDefined({
            ...filters,
            after_cursor: cursor,
            per_page: pageSize
              ? Math.min(100, limit + offset - skipped - result.length)
              : undefined
          })
        )
      );
      let items = collection(body, ['data', 'regulations']);
      let paging = body.paging === undefined ? {} : record(body.paging, 'paging');
      next = this.cursor(paging.next, path);
      let eligibleInPage = 0;
      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        let item = items[itemIndex]!;
        if (params.endDate !== undefined) {
          let createdAt = stringField(item.createdAt, 'the audit entry timestamp');
          if (!Number.isFinite(Date.parse(createdAt)))
            throw createApiServiceError('RudderStack returned an invalid audit timestamp.', {
              reason: 'invalid_response'
            });
          if (Date.parse(createdAt) > Date.parse(params.endDate)) continue;
        }
        eligibleInPage++;
        if (skipped < offset) {
          skipped++;
          continue;
        }
        result.push(item);
        if (result.length === limit && itemIndex + 1 < items.length)
          return {
            data: result,
            nextCursor: cursor,
            nextOffset: eligibleInPage,
            hasMore: true,
            total: typeof paging.total === 'number' ? paging.total : undefined
          };
        if (result.length === limit) break;
      }
      if (result.length === limit || !next)
        return {
          data: result,
          nextCursor: next,
          nextOffset: 0,
          hasMore: Boolean(next),
          total: typeof paging.total === 'number' ? paging.total : undefined
        };
      if (seen.has(next))
        throw createApiServiceError('RudderStack repeated a pagination cursor.', {
          reason: 'invalid_response'
        });
      seen.add(next);
      cursor = next;
    }
    throw createApiServiceError(
      'Pagination exceeded the safe window. Use a narrower date range or a known provider cursor.'
    );
  }
  async listRegulations(
    params: { limit?: number; offset?: number; afterCursor?: string } = {}
  ) {
    return this.cursorWindow('/v2/regulations', params, {}, false);
  }
  async getAuditLogs(
    params: {
      workspaceId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
      afterCursor?: string;
    } = {}
  ) {
    isoDate(params.startDate, 'Start date');
    isoDate(params.endDate, 'End date');
    if (
      params.startDate &&
      params.endDate &&
      Date.parse(params.endDate) < Date.parse(params.startDate)
    )
      throw createApiServiceError('End date must not be before start date.');
    return this.cursorWindow(
      '/v2/audit-logs',
      params,
      pickDefined({ workspace_id: params.workspaceId, created_after: params.startDate }),
      true
    );
  }
  async triggerRetlSync(id: string, syncType: string) {
    let result = record(
      await this.request('POST', `/v2/retl-connections/${pathId(id)}/start`, { syncType })
    );
    stringField(result.syncId, 'the sync ID');
    return result;
  }
  async stopRetlSync(id: string) {
    await this.request('POST', `/v2/retl-connections/${pathId(id)}/stop`);
  }
  async getRetlSyncStatus(id: string, syncId: string) {
    // A failed sync legitimately includes an error string in an HTTP 200 status DTO.
    let result = record(
      await this.request(
        'GET',
        `/v2/retl-connections/${pathId(id)}/syncs/${pathId(syncId)}`,
        undefined,
        undefined,
        false,
        true
      )
    );
    if (
      result.id !== syncId ||
      !['running', 'succeeded', 'failed'].includes(String(result.status))
    )
      throw createApiServiceError('RudderStack returned an invalid sync status.', {
        reason: 'invalid_response'
      });
    return result;
  }
  async listRetlSyncs(
    id: string,
    params: {
      status?: string;
      limit?: number;
      offset?: number;
      startedAfter?: string;
      startedBefore?: string;
    } = {}
  ) {
    if (params.status && !['running', 'succeeded', 'failed'].includes(params.status))
      throw createApiServiceError('Status must be running, succeeded or failed.');
    isoDate(params.startedAfter, 'Started after');
    isoDate(params.startedBefore, 'Started before');
    if (
      params.startedAfter &&
      params.startedBefore &&
      Date.parse(params.startedBefore) < Date.parse(params.startedAfter)
    )
      throw createApiServiceError('Started before must not be before started after.');
    let limit = integer(params.limit, 100, 1, 1000, 'Limit');
    let offset = integer(params.offset, 0, 0, 10000, 'Offset');
    let page = Math.floor(offset / 100) + 1;
    let skip = offset % 100;
    let syncs: Row[] = [];
    for (let index = 0; index < 12; index++, page++) {
      let result = record(
        await this.request(
          'GET',
          `/v2/retl-connections/${pathId(id)}/syncs`,
          undefined,
          pickDefined({
            status: params.status,
            started_after: params.startedAfter,
            started_before: params.startedBefore,
            per_page: 100,
            page
          })
        )
      );
      let entries = collection(result, ['syncs']);
      syncs.push(...entries.slice(skip));
      skip = 0;
      // Without paging metadata, a full provider page cannot establish completion.
      let more =
        result.paging === undefined
          ? entries.length === 100
          : Boolean(record(result.paging, 'paging').next);
      if (syncs.length >= limit || !more)
        return {
          syncs: syncs.slice(0, limit),
          nextOffset: syncs.length > limit || more ? offset + limit : undefined,
          hasMore: syncs.length > limit || more
        };
    }
    throw createApiServiceError('Reverse ETL pagination exceeded the safe window.');
  }
  private testStage(stage?: string): Row {
    if (stage === undefined || ['dest_transform', 'dest_transformation'].includes(stage))
      return { user_transform: false, dest_transform: true, send_to_destination: false };
    if (['user_transform', 'user_transformation'].includes(stage))
      return { user_transform: true, dest_transform: false, send_to_destination: false };
    if (['router', 'send_to_destination'].includes(stage))
      return { user_transform: true, dest_transform: true, send_to_destination: true };
    throw createApiServiceError(
      'Stage must be user_transformation, dest_transformation or router. Router sends data to real destinations.'
    );
  }
  async testDestination(data: {
    destinationId: string;
    sourceId: string;
    stage?: string;
    event?: Row;
  }) {
    if (!data.event)
      throw createApiServiceError(
        'Provide an event payload, including its type and identity.'
      );
    return record(
      safeTestResult(
        await this.request(
          'POST',
          `/v0/testDestination/${pathId(data.destinationId)}`,
          { message: data.event, stage: this.testStage(data.stage) },
          undefined,
          true
        )
      )
    );
  }
  async testSource(data: { sourceId: string; stage?: string; event?: Row }) {
    if (!data.event)
      throw createApiServiceError(
        'Provide an event payload, including its type and identity.'
      );
    let result = safeTestResult(
      await this.request(
        'POST',
        `/v0/testSource/${pathId(data.sourceId)}`,
        { message: data.event, stage: this.testStage(data.stage) },
        undefined,
        true
      )
    );
    return Array.isArray(result) ? { destinations: collection(result) } : record(result);
  }
  async getEventModels(params: { sourceId?: string } = {}) {
    return collection(
      await this.request('GET', '/v1/event-audit/event-models', undefined, params, true),
      ['eventModels', 'data']
    );
  }
  async getEventModelMetadata(id: string) {
    return record(
      await this.request(
        'GET',
        `/v1/event-audit/event-models/${pathId(id)}/metadata`,
        undefined,
        undefined,
        true
      )
    );
  }
}

export class DataPlaneClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: DataPlaneClientConfig) {
    if (!config.sourceWriteKey.trim() || /[\r\n:]/.test(config.sourceWriteKey))
      throw createApiServiceError('A valid Source Write Key is required.');
    let url: URL;
    try {
      url = new URL(config.dataPlaneUrl);
    } catch {
      throw createApiServiceError('Provide a valid Data Plane URL.');
    }
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw createApiServiceError(
        'The Data Plane URL must be an HTTP or HTTPS server URL without credentials, a query or fragment.'
      );
    this.http = createAuthenticatedAxios({
      baseURL: config.dataPlaneUrl.replace(/\/+$/, ''),
      timeout: 30000,
      maxRedirects: 0,
      authHeader: {
        value: `Basic ${Buffer.from(`${config.sourceWriteKey}:`).toString('base64')}`
      }
    });
  }
  private validate(type: string, data: Row) {
    let required =
      type === 'alias'
        ? ['userId', 'previousId']
        : type === 'track'
          ? ['event']
          : type === 'group'
            ? ['groupId']
            : [];
    for (let field of required)
      if (typeof data[field] !== 'string' || !(data[field] as string).trim())
        throw createApiServiceError(`${field} is required for ${type} events.`);
    if (
      type !== 'alias' &&
      ![data.userId, data.anonymousId].some(value => typeof value === 'string' && value.trim())
    )
      throw createApiServiceError('Either userId or anonymousId is required.');
    isoDate(typeof data.timestamp === 'string' ? data.timestamp : undefined, 'Timestamp');
    if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 32 * 1024)
      throw createApiServiceError('Each event must be at most 32 KB.');
  }
  private async send(type: string, data: Row) {
    this.validate(type, data);
    try {
      await this.http.post(`/v1/${type}`, data);
    } catch (error) {
      throw apiFailure(error, 'event ingestion');
    }
  }
  async identify(data: Row) {
    await this.send('identify', data);
  }
  async track(data: Row) {
    await this.send('track', data);
  }
  async page(data: Row) {
    await this.send('page', data);
  }
  async screen(data: Row) {
    await this.send('screen', data);
  }
  async group(data: Row) {
    await this.send('group', data);
  }
  async alias(data: Row) {
    await this.send('alias', data);
  }
  async batch(data: { batch: Array<Row & { type: string }> }) {
    if (!data.batch.length) throw createApiServiceError('Provide at least one event.');
    for (let event of data.batch) this.validate(event.type, event);
    if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 4 * 1024 * 1024)
      throw createApiServiceError('A batch must be at most 4 MB.');
    try {
      await this.http.post('/v1/batch', data);
    } catch (error) {
      throw apiFailure(error, 'batch ingestion');
    }
  }
}
