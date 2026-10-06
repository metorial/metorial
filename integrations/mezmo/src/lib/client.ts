import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';

const apiOrigin = 'https://api.mezmo.com';
const record = z.record(z.string(), z.unknown());
const identifier = z.string().min(1);
const strings = z.array(z.string()).optional().default([]);
const numericString = z.union([
  z.number(),
  z
    .string()
    .regex(/^\d+(?:\.\d+)?$/)
    .transform(Number)
]);
const channelResponse = z
  .object({
    integration: z.string(),
    emails: z.array(z.string()).optional(),
    url: z.string().optional(),
    key: z.string().optional(),
    triggerlimit: numericString.optional(),
    triggerinterval: z.unknown().optional(),
    operator: z.string().optional()
  })
  .passthrough();
const viewResponse = z.object({
  viewID: identifier,
  name: z.string(),
  query: z.string().optional().default(''),
  apps: strings,
  hosts: strings,
  levels: strings,
  tags: strings,
  category: strings,
  channels: z.array(channelResponse).optional().default([]),
  presetids: strings
});
const presetResponse = z.object({
  presetid: identifier,
  name: z.string(),
  channels: z.array(channelResponse)
});
const boardResponse = z.object({
  boardID: identifier,
  title: z.string(),
  account: z.string().optional()
});
const exclusionResponse = z.object({
  id: identifier,
  title: z.string().min(1),
  active: z.boolean(),
  apps: z.array(z.string()).optional(),
  hosts: z.array(z.string()).optional(),
  query: z.string().optional(),
  indexonly: z.boolean().optional()
});
const archiveResponse = z.object({
  integration: z.string().min(1),
  bucket: z.string().min(1),
  endpoint: z.string().optional(),
  projectid: z.string().optional()
});
const exportResponse = z.object({
  lines: z.array(record),
  pagination_id: z.string().nullable()
});
const statusResponse = z.object({ isIngesting: z.boolean() });
const okResponse = z.object({ status: z.literal('OK') });

export const mezmoApiError = (error: unknown) =>
  buildApiServiceError(error, {
    parent: {},
    providerLabel: 'Mezmo',
    reason: 'mezmo_api_error',
    formatMessage: ({ status }) =>
      `Mezmo request failed${status ? ` (HTTP ${status})` : ''}. Check credentials, access permissions, resource availability, and account limits.`
  });
export const isMissing = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'data' in error &&
  typeof error.data === 'object' &&
  error.data !== null &&
  'upstreamStatus' in error.data &&
  error.data.upstreamStatus === 404;
export const pathSegment = (value: string) => {
  if (!value.trim() || value === '.' || value === '..')
    throw createApiServiceError('A valid Mezmo resource identifier is required.');
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('The Mezmo resource identifier contains invalid characters.');
  }
};
export const validateTimeRange = (params: { from: number; to: number }, allowZero = false) => {
  if (
    ![params.from, params.to].every(n => Number.isSafeInteger(n) && n >= 0) ||
    ((!allowZero || (params.from !== 0 && params.to !== 0)) && params.from > params.to)
  )
    throw createApiServiceError(
      'Use non-negative integer timestamps with from no later than to.'
    );
};
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'Mezmo returned an invalid API response. Check the resource and try again.'
    );
  return result.data;
};
const withId = (value: unknown, field: string, aliases: string[], fallback?: string) => {
  const row = parse(record, value);
  return {
    ...row,
    [field]:
      row[field] ?? aliases.map(key => row[key]).find(id => id !== undefined) ?? fallback
  };
};
const collection = <T>(
  value: unknown,
  schema: z.ZodType<T>,
  field: string,
  aliases: string[]
): T[] => {
  if (Array.isArray(value))
    return value.map(row => parse(schema, withId(row, field, aliases)));
  return Object.entries(parse(record, value)).map(([id, row]) =>
    parse(schema, withId(row, field, aliases, id))
  );
};
const requireUpdate = (params: object) => {
  if (!Object.values(params).some(value => value !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
};
const channelsForApi = (channels?: ChannelConfig[]) =>
  channels?.map(channel => {
    const flag = (value?: string) => {
      if (value === undefined) return undefined;
      if (value !== 'true' && value !== 'false')
        throw createApiServiceError(
          'Alert immediate and terminal values must be "true" or "false".'
        );
      return value === 'true';
    };
    return {
      ...channel,
      triggerlimit:
        channel.triggerlimit === undefined ? undefined : String(channel.triggerlimit),
      immediate: flag(channel.immediate),
      terminal: flag(channel.terminal),
      autoresolvelimit:
        channel.autoresolvelimit === undefined ? undefined : String(channel.autoresolvelimit)
    };
  });
export interface ExportRequest {
  from: number;
  to: number;
  query?: string;
  levels?: string;
  apps?: string;
  hosts?: string;
  prefer?: 'head' | 'tail';
  size?: number;
  paginationId?: string | null;
}
export const exportQuery = (params: ExportRequest) => {
  validateTimeRange(params, true);
  if (
    params.size !== undefined &&
    (!Number.isInteger(params.size) || params.size < 1 || params.size > 10000)
  )
    throw createApiServiceError('Log export size must be an integer from 1 to 10000.');
  const query: Record<string, string> = { from: String(params.from), to: String(params.to) };
  for (const key of ['query', 'levels', 'apps', 'hosts', 'prefer', 'size'] as const)
    if (params[key] !== undefined) query[key] = String(params[key]);
  if (params.paginationId) query.pagination_id = params.paginationId;
  return query;
};
export const exportDownloadUrl = `${apiOrigin}/v1/export`;

export class MezmoClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;
  private ingestionApi: ReturnType<typeof createAuthenticatedAxios> | undefined;
  constructor(options: { token: string; ingestionKey?: string }) {
    if (!options.token.trim() || /[\r\n]/.test(options.token))
      throw createApiServiceError('A valid Mezmo IAM access token is required.');
    const defaults = { timeout: 30000, maxRedirects: 0, errorAdapter: mezmoApiError };
    this.api = createAuthenticatedAxios({
      ...defaults,
      baseURL: apiOrigin,
      authHeader: { value: `Token ${options.token.trim()}` }
    });
    if (options.ingestionKey?.trim()) {
      if (/[\r\n]/.test(options.ingestionKey))
        throw createApiServiceError('A valid Mezmo ingestion key is required.');
      this.ingestionApi = createAuthenticatedAxios({
        ...defaults,
        baseURL: 'https://logs.mezmo.com',
        authHeader: { name: 'apikey', value: options.ingestionKey.trim() }
      });
    }
  }
  async ingestLogs(params: {
    hostname: string;
    lines: Array<{
      line: string;
      timestamp?: number;
      app?: string;
      level?: string;
      env?: string;
      meta?: Record<string, unknown>;
      tags?: string;
    }>;
    tags?: string;
    now?: number;
  }) {
    if (!this.ingestionApi)
      throw createApiServiceError(
        'Add an ingestion key to this connection before sending logs. IAM access tokens do not authenticate log ingestion.'
      );
    if (!params.hostname.trim()) throw createApiServiceError('A source hostname is required.');
    const { hostname, tags, now, lines } = params;
    const response = await this.ingestionApi.post(
      '/logs/ingest',
      { lines },
      { params: { hostname, tags, now } }
    );
    if (response.status === 207)
      throw createApiServiceError(
        'Mezmo accepted only part of the log batch (HTTP 207). Some lines may already be stored. Inspect the submitted lines before retrying to avoid duplicates.',
        { reason: 'mezmo_ingestion_partial_success', upstreamStatus: 207 }
      );
    return response.data;
  }
  async exportLogs(params: ExportRequest) {
    return parse(
      exportResponse,
      (await this.api.get('/v2/export', { params: exportQuery(params) })).data
    );
  }
  async listViews() {
    return collection((await this.api.get('/v1/config/view')).data, viewResponse, 'viewID', [
      'viewid',
      'id'
    ]);
  }
  async getView(id: string) {
    const result = parse(
      viewResponse,
      withId((await this.api.get(`/v1/config/view/${pathSegment(id)}`)).data, 'viewID', [
        'viewid',
        'id'
      ])
    );
    if (result.viewID !== id)
      throw createApiServiceError('Mezmo returned a different resource than requested.');
    return result;
  }
  async createView(params: ViewRequest) {
    const raw = (
      await this.api.post('/v1/config/view', {
        ...params,
        channels: channelsForApi(params.channels)
      })
    ).data;
    const id = parse(
      z.object({ viewID: identifier }),
      withId(raw, 'viewID', ['viewid', 'id'])
    ).viewID;
    return this.getView(id);
  }
  async updateView(id: string, params: Partial<ViewRequest>) {
    requireUpdate(params);
    await this.api.put(`/v1/config/view/${pathSegment(id)}`, {
      ...params,
      channels: channelsForApi(params.channels)
    });
    return this.getView(id);
  }
  async deleteView(id: string) {
    await this.api.delete(`/v1/config/view/${pathSegment(id)}`);
  }
  async listPresetAlerts() {
    return collection(
      (await this.api.get('/v1/config/presetalert')).data,
      presetResponse,
      'presetid',
      ['id']
    );
  }
  async getPresetAlert(id: string) {
    const result = parse(
      presetResponse,
      withId(
        (await this.api.get(`/v1/config/presetalert/${pathSegment(id)}`)).data,
        'presetid',
        ['id']
      )
    );
    if (result.presetid !== id)
      throw createApiServiceError('Mezmo returned a different resource than requested.');
    return result;
  }
  async createPresetAlert(params: PresetAlertRequest) {
    const raw = (
      await this.api.post('/v1/config/presetalert', {
        ...params,
        channels: channelsForApi(params.channels)
      })
    ).data;
    const id = parse(
      z.object({ presetid: identifier }),
      withId(raw, 'presetid', ['id'])
    ).presetid;
    return this.getPresetAlert(id);
  }
  async updatePresetAlert(id: string, params: Partial<PresetAlertRequest>) {
    requireUpdate(params);
    await this.api.put(`/v1/config/presetalert/${pathSegment(id)}`, {
      ...params,
      channels: channelsForApi(params.channels)
    });
    return this.getPresetAlert(id);
  }
  async deletePresetAlert(id: string) {
    await this.api.delete(`/v1/config/presetalert/${pathSegment(id)}`);
  }
  async listBoards() {
    return collection(
      (await this.api.get('/v1/config/board')).data,
      boardResponse,
      'boardID',
      ['boardid', 'id']
    );
  }
  async getBoard(id: string) {
    const result = parse(
      boardResponse,
      withId((await this.api.get(`/v1/config/board/${pathSegment(id)}`)).data, 'boardID', [
        'boardid',
        'id'
      ])
    );
    if (result.boardID !== id)
      throw createApiServiceError('Mezmo returned a different resource than requested.');
    return result;
  }
  async createBoard(params: BoardRequest) {
    const raw = (await this.api.post('/v1/config/board', params)).data;
    const id = parse(
      z.object({ boardID: identifier }),
      withId(raw, 'boardID', ['boardid', 'id'])
    ).boardID;
    return this.getBoard(id);
  }
  async deleteBoard(id: string) {
    await this.api.delete(`/v1/config/board/${pathSegment(id)}`);
  }
  async listExclusionRules() {
    return parse(
      z.array(exclusionResponse),
      (await this.api.get('/v1/config/ingestion/exclusions')).data
    );
  }
  async getExclusionRule(id: string) {
    const raw: unknown = (
      await this.api.get(`/v1/config/ingestion/exclusions/${pathSegment(id)}`)
    ).data;
    const rows = Array.isArray(raw)
      ? parse(z.array(exclusionResponse), raw)
      : [parse(exclusionResponse, raw)];
    if (rows.length !== 1 || rows[0]!.id !== id)
      throw createApiServiceError('Mezmo returned an unexpected exclusion rule.');
    return rows[0]!;
  }
  async createExclusionRule(params: ExclusionRuleRequest) {
    const result = parse(
      exclusionResponse,
      (await this.api.post('/v1/config/ingestion/exclusions', params)).data
    );
    return this.getExclusionRule(result.id);
  }
  async updateExclusionRule(id: string, params: Partial<ExclusionRuleRequest>) {
    requireUpdate(params);
    await this.api.patch(`/v1/config/ingestion/exclusions/${pathSegment(id)}`, params);
    return this.getExclusionRule(id);
  }
  async deleteExclusionRule(id: string) {
    await this.api.delete(`/v1/config/ingestion/exclusions/${pathSegment(id)}`);
  }
  async getIngestionStatus() {
    return parse(statusResponse, (await this.api.get('/v1/config/ingestion/status')).data);
  }
  async suspendIngestion() {
    return parse(
      z.object({ token: identifier }),
      (await this.api.post('/v1/config/ingestion/suspend')).data
    );
  }
  async confirmSuspendIngestion(token: string) {
    return parse(
      okResponse,
      (await this.api.post('/v1/config/ingestion/suspend/confirm', { token })).data
    );
  }
  async resumeIngestion() {
    return parse(okResponse, (await this.api.post('/v1/config/ingestion/resume')).data);
  }
  async getUsage(params: { from: number; to: number }) {
    validateTimeRange(params);
    const dates = [params.from, params.to].map(seconds => new Date(seconds * 1000));
    if (dates.some(date => !Number.isFinite(date.getTime())))
      throw createApiServiceError('Usage dates exceed the supported date range.');
    return parse(
      z.object({
        from: z.string(),
        to: z.string(),
        results: z.record(z.string(), z.number())
      }),
      (
        await this.api.get('/v2/usage', {
          params: { from: dates[0]!.toISOString(), to: dates[1]!.toISOString() }
        })
      ).data
    );
  }
  private async usageV1(path: string, params: { from: number; to: number }, nullable = false) {
    validateTimeRange(params);
    return parse(
      nullable ? record.nullable() : record,
      (await this.api.get(path, { params })).data
    );
  }
  async getUsageByApps(params: { from: number; to: number }) {
    return this.usageV1('/v1/usage/apps', params);
  }
  async getUsageByApp(name: string, params: { from: number; to: number }) {
    return this.usageV1(`/v1/usage/apps/${pathSegment(name)}`, params, true);
  }
  async getUsageByHosts(params: { from: number; to: number }) {
    return this.usageV1('/v1/usage/hosts', params);
  }
  async getUsageByTags(params: { from: number; to: number }) {
    return this.usageV1('/v1/usage/tags', params);
  }
  async getDimensionUsage(
    dimension: 'apps' | 'hosts' | 'tags',
    params: { from: number; to: number; limit?: number },
    metric: 'percentage' | 'bytes',
    appName?: string
  ) {
    validateTimeRange(params);
    const path = `/${metric === 'bytes' ? 'v2' : 'v1'}/usage/${dimension}${appName ? `/${pathSegment(appName)}` : ''}`;
    if (metric === 'percentage') return this.usageV1(path, params, Boolean(appName));
    const dates = [params.from, params.to].map(seconds => new Date(seconds * 1000));
    if (dates.some(date => !Number.isFinite(date.getTime())))
      throw createApiServiceError('Usage dates exceed the supported date range.');
    return parse(
      z.object({
        from: z.string(),
        to: z.string(),
        results: z.array(z.object({ name: z.string(), total_bytes: z.number().nonnegative() }))
      }),
      (
        await this.api.get(path, {
          params: {
            from: dates[0]!.toISOString(),
            to: dates[1]!.toISOString(),
            limit: appName ? undefined : params.limit
          }
        })
      ).data
    );
  }
  async getArchiveConfig() {
    const raw: unknown = (await this.api.get('/v1/config/archiving')).data;
    if (
      raw === null ||
      (typeof raw === 'object' &&
        raw !== null &&
        !Array.isArray(raw) &&
        Object.keys(raw).length === 0)
    )
      return null;
    return parse(archiveResponse, raw);
  }
  async createArchiveConfig(params: ArchiveRequest) {
    await this.api.post('/v1/config/archiving', params);
    return this.readWrittenArchive();
  }
  async updateArchiveConfig(params: ArchiveRequest) {
    await this.api.put('/v1/config/archiving', params);
    return this.readWrittenArchive();
  }
  private async readWrittenArchive() {
    const result = await this.getArchiveConfig();
    if (!result)
      throw createApiServiceError(
        'Mezmo did not return the archiving configuration after the update.'
      );
    return result;
  }
  async deleteArchiveConfig() {
    await this.api.delete('/v1/config/archiving');
  }
}
export interface ChannelConfig {
  integration: string;
  emails?: string[];
  url?: string;
  key?: string;
  method?: string;
  headers?: Record<string, string>;
  bodyTemplate?: Record<string, unknown>;
  triggerlimit?: number;
  triggerinterval?: string;
  operator?: string;
  immediate?: string;
  terminal?: string;
  timezone?: string;
  autoresolve?: boolean;
  autoresolveinterval?: string;
  autoresolvelimit?: number;
}
export interface ViewRequest {
  name: string;
  query?: string;
  apps?: string[];
  hosts?: string[];
  levels?: string[];
  tags?: string[];
  category?: string[];
  channels?: ChannelConfig[];
  presetid?: string;
}
export interface PresetAlertRequest {
  name: string;
  channels: ChannelConfig[];
}
export interface BoardRequest {
  title: string;
  account?: string;
  category?: string[];
}
export interface ExclusionRuleRequest {
  title: string;
  active?: boolean;
  apps?: string[];
  hosts?: string[];
  query?: string;
  indexonly?: boolean;
}
export interface ArchiveRequest {
  integration: string;
  bucket: string;
  endpoint?: string;
  apikey?: string;
  resourceinstanceid?: string;
  accountname?: string;
  accountkey?: string;
  projectid?: string;
  space?: string;
  accesskey?: string;
  secretkey?: string;
  authurl?: string;
  expires?: string;
  username?: string;
  password?: string;
  tenantname?: string;
}
