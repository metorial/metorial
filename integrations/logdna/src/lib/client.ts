import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  type AlertRequest,
  type ArchiveConfig,
  alertSchema,
  archiveSchema,
  type BoardRequest,
  boardSchema,
  type ChannelConfig,
  categorySchema,
  type ExclusionRuleRequest,
  type ExportOptions,
  exclusionSchema,
  type IngestOptions,
  type LogLine,
  type ViewRequest,
  viewSchema
} from './types';

export type { ArchiveConfig, ChannelConfig, ExportOptions } from './types';

export const apiEndpoints = ['https://api.logdna.com', 'https://api.mezmo.com'] as const;
export type ClientOptions = {
  serviceKey: string;
  ingestionKey?: string;
  authType?: 'service_key' | 'access_token';
  apiEndpoint?: (typeof apiEndpoints)[number];
};
export const requireValue = (value: string | undefined, label: string) => {
  if (!value?.trim())
    throw createApiServiceError(`${label} is required.`, { reason: 'invalid_input' });
  return value;
};
const segment = (value: string) => {
  requireValue(value, 'Resource ID');
  if (value === '.' || value === '..')
    throw createApiServiceError('Resource ID cannot be a dot path segment.', {
      reason: 'invalid_input'
    });
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('Resource ID must contain valid Unicode.', {
      reason: 'invalid_input'
    });
  }
};
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError('LogDNA returned an invalid response.', {
      reason: 'invalid_response'
    });
  return result.data;
};
const wireId = (...ids: (string | undefined)[]) => {
  const id = ids.find(value => value?.trim());
  if (!id)
    throw createApiServiceError('LogDNA returned a resource without its identifier.', {
      reason: 'invalid_response'
    });
  return id;
};
const normalizeView = (value: unknown) => {
  const view = parse(viewSchema, value);
  return {
    ...view,
    viewID: wireId(view.viewID, view.viewid, view.id),
    presetIds: view.presetids ?? view.presetIds
  };
};
const normalizeAlert = (value: unknown) => {
  const alert = parse(alertSchema, value);
  return { ...alert, presetID: wireId(alert.presetid, alert.presetID, alert.id) };
};
const normalizeBoard = (value: unknown) => {
  const board = parse(boardSchema, value);
  return {
    ...board,
    boardID: wireId(board.boardid, board.boardID, board.id),
    widgets: board.graphs ?? board.widgets
  };
};
const normalizeCategory = (value: unknown) => {
  const category = parse(categorySchema, value);
  return { ...category, id: wireId(category.id, category.Id) };
};
const normalizeExclusion = (value: unknown) => {
  const rule = parse(exclusionSchema, value);
  return { ...rule, id: wireId(rule.id, rule.ID) };
};
export const safeChannels = (channels: z.infer<typeof viewSchema>['channels']) =>
  channels?.map(channel =>
    pickDefined({
      integration: channel.integration,
      emails: channel.emails,
      immediate: channel.immediate,
      operator: channel.operator,
      terminal: channel.terminal,
      timezone: channel.timezone,
      triggerinterval: channel.triggerinterval,
      triggerlimit: channel.triggerlimit,
      autoresolve: channel.autoresolve,
      autoresolveinterval: channel.autoresolveinterval,
      autoresolvelimit: channel.autoresolvelimit
    })
  );

export class Client {
  private api;
  private ingestionApi;
  private adaptError;
  private sensitiveValues = new Set<string>();
  readonly endpoint: string;
  readonly downloadHeaders: Record<string, string>;

  constructor(private options: ClientOptions) {
    requireValue(
      options.serviceKey,
      options.authType === 'access_token' ? 'Access token' : 'Service key'
    );
    this.rememberSecrets(options.serviceKey, options.ingestionKey);
    this.endpoint =
      options.apiEndpoint ??
      (options.authType === 'access_token' ? apiEndpoints[1] : apiEndpoints[0]);
    if (!apiEndpoints.some(endpoint => endpoint === this.endpoint))
      throw createApiServiceError('Select a documented LogDNA or Mezmo API host.', {
        reason: 'invalid_input'
      });
    this.downloadHeaders =
      options.authType === 'access_token'
        ? { Authorization: `Token ${options.serviceKey}` }
        : { servicekey: options.serviceKey };
    const adapter = (failure: unknown) =>
      buildApiServiceError(failure, {
        providerLabel: 'LogDNA',
        reason: 'upstream_error',
        extractMessage: (error, helpers) =>
          [...this.sensitiveValues]
            .sort((a, b) => b.length - a.length)
            .reduce<string>(
              (message, secret) => message.split(secret).join('[redacted]'),
              helpers.extractMessage(error) ?? 'Provider request failed.'
            ),
        // Upstream parents may retain credential-bearing response bodies.
        parent: createApiServiceError('LogDNA upstream request failed.', {
          reason: 'upstream_error',
          upstreamStatus: getApiErrorStatus(failure)
        })
      });
    this.adaptError = adapter;
    this.api = createAuthenticatedAxios({
      baseURL: this.endpoint,
      headers: this.downloadHeaders,
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: adapter
    });
    this.ingestionApi = createAuthenticatedAxios({
      baseURL:
        this.endpoint === apiEndpoints[1]
          ? 'https://logs.mezmo.com'
          : 'https://logs.logdna.com',
      headers: options.ingestionKey ? { apikey: options.ingestionKey } : {},
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: adapter
    });
  }
  private rememberSecrets(...values: (string | undefined)[]) {
    for (const value of values) {
      if (!value) continue;
      this.sensitiveValues.add(value);
      this.sensitiveValues.add(JSON.stringify(value).slice(1, -1));
    }
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    const response = await this.api.request<unknown>({ method, url: path, data, params });
    if (
      isApiErrorRecord(response.data) &&
      (response.data.error ||
        response.data.success === false ||
        /^(error|failed|failure)$/i.test(String(response.data.status ?? '')))
    )
      throw this.adaptError({ response });
    return response.data;
  }
  private list<T>(value: unknown, normalize: (item: unknown) => T) {
    return parse(z.array(z.unknown()), value).map(normalize);
  }
  private checkId(actual: string, expected: string) {
    if (actual !== expected)
      throw createApiServiceError('LogDNA returned a different resource than requested.', {
        reason: 'invalid_response'
      });
  }
  private nonemptyUpdate(value: Record<string, unknown>) {
    const updates = pickDefined(value);
    if (!Object.keys(updates).length)
      throw createApiServiceError('Supply at least one field to update.', {
        reason: 'invalid_input'
      });
    return updates;
  }
  private channels(channels: ChannelConfig[] | undefined) {
    return channels?.map(channel => {
      this.rememberSecrets(channel.key, channel.url, ...Object.values(channel.headers ?? {}));
      if (!['email', 'webhook', 'slack', 'pagerduty'].includes(channel.integration))
        throw createApiServiceError(
          'Use an email, webhook, slack, or pagerduty alert integration.',
          { reason: 'invalid_input' }
        );
      if (
        channel.triggerlimit !== undefined &&
        (!Number.isInteger(channel.triggerlimit) || channel.triggerlimit < 1)
      )
        throw createApiServiceError('Alert triggerlimit must be a positive integer.', {
          reason: 'invalid_input'
        });
      if (channel.integration === 'email' && !channel.emails?.length)
        throw createApiServiceError('Email alert channels require recipients.', {
          reason: 'invalid_input'
        });
      if (['webhook', 'slack'].includes(channel.integration))
        requireValue(channel.url, 'Notification URL');
      if (channel.integration === 'pagerduty') requireValue(channel.key, 'PagerDuty key');
      return pickDefined({
        ...channel,
        triggerlimit:
          channel.triggerlimit === undefined ? undefined : String(channel.triggerlimit)
      });
    });
  }
  async ingestLogs(lines: LogLine[], options: IngestOptions) {
    requireValue(this.options.ingestionKey, 'Separate ingestion key');
    requireValue(options.hostname, 'Hostname');
    if (!lines.length) throw createApiServiceError('Supply at least one log line.');
    for (const line of lines) {
      requireValue(line.line, 'Log message');
      if (line.file !== undefined)
        throw createApiServiceError(
          'The public ingestion API does not document a file field. Put the file path in meta.file instead.'
        );
      if (
        line.timestamp !== undefined &&
        (!Number.isSafeInteger(line.timestamp) || line.timestamp < 0)
      )
        throw createApiServiceError(
          'Log timestamps must be nonnegative integer milliseconds.'
        );
    }
    const body = { lines };
    if (new TextEncoder().encode(JSON.stringify(body)).length > 10 * 1024 * 1024)
      throw createApiServiceError(
        'The log ingestion body exceeds 10 MB. Send smaller batches.'
      );
    const response = await this.ingestionApi.post<unknown>('/logs/ingest', body, {
      params: pickDefined({ ...options, now: options.now ?? Date.now() })
    });
    if (response.status === 207)
      throw createApiServiceError(
        'LogDNA accepted only part of this batch. Some lines may already be stored; inspect the line format before sending a corrected batch.',
        { reason: 'partial_success', upstreamStatus: 207 }
      );
    if (
      isApiErrorRecord(response.data) &&
      (response.data.error ||
        response.data.success === false ||
        /^(error|failed|failure)$/i.test(String(response.data.status ?? '')))
    )
      throw this.adaptError({ response });
    return { status: 'accepted' };
  }
  exportParams(options: ExportOptions) {
    for (const value of [options.from, options.to])
      if (!Number.isSafeInteger(value) || value < 0)
        throw createApiServiceError(
          'Export timestamps must be nonnegative integer seconds or milliseconds.'
        );
    if (options.from && options.to && options.from > options.to)
      throw createApiServiceError('Export from must not be after to.');
    if (
      options.size !== undefined &&
      (!Number.isInteger(options.size) || options.size < 1 || options.size > 10_000)
    )
      throw createApiServiceError('Export size must be an integer from 1 to 10000.');
    if (options.prefer !== undefined && !['head', 'tail'].includes(options.prefer))
      throw createApiServiceError('Export prefer must be head or tail.');
    if (options.tags !== undefined)
      throw createApiServiceError(
        'The current export API does not support a tags parameter. Use a tag condition in query instead.'
      );
    return pickDefined({
      from: options.from,
      to: options.to,
      query: options.query,
      hosts: options.hosts,
      apps: options.apps,
      levels: options.levels,
      prefer: options.prefer,
      size: options.size,
      pagination_id: options.paginationId
    });
  }
  async exportLogsV2(options: ExportOptions) {
    const value = parse(
      z.object({ lines: z.array(z.unknown()), pagination_id: z.string().nullish() }),
      await this.request('GET', '/v2/export', undefined, this.exportParams(options))
    );
    return {
      lines: value.lines.map(line => JSON.stringify(line)).join('\n'),
      paginationId: value.pagination_id ?? undefined,
      lineCount: value.lines.length
    };
  }
  async listViews() {
    return this.list(await this.request('GET', '/v1/config/view'), normalizeView);
  }
  async getView(id: string) {
    const view = normalizeView(await this.request('GET', `/v1/config/view/${segment(id)}`));
    this.checkId(view.viewID, id);
    return view;
  }
  async createView(view: ViewRequest) {
    requireValue(view.name, 'View name');
    const { presetId, channels, ...fields } = view;
    const created = normalizeView(
      await this.request(
        'POST',
        '/v1/config/view',
        pickDefined({ ...fields, presetid: presetId, channels: this.channels(channels) })
      )
    );
    return this.getView(created.viewID);
  }
  async updateView(id: string, view: Partial<ViewRequest>) {
    if (view.name !== undefined) requireValue(view.name, 'View name');
    const { presetId, channels, ...fields } = view;
    await this.request(
      'PUT',
      `/v1/config/view/${segment(id)}`,
      this.nonemptyUpdate({ ...fields, presetid: presetId, channels: this.channels(channels) })
    );
    return this.getView(id);
  }
  async deleteView(id: string) {
    await this.request('DELETE', `/v1/config/view/${segment(id)}`);
  }
  async listPresetAlerts() {
    return this.list(await this.request('GET', '/v1/config/presetalert'), normalizeAlert);
  }
  async getPresetAlert(id: string) {
    const alert = normalizeAlert(
      await this.request('GET', `/v1/config/presetalert/${segment(id)}`)
    );
    this.checkId(alert.presetID, id);
    return alert;
  }
  async createPresetAlert(alert: AlertRequest) {
    requireValue(alert.name, 'Alert name');
    if (!alert.channels.length)
      throw createApiServiceError('Provide at least one notification channel.');
    const created = normalizeAlert(
      await this.request('POST', '/v1/config/presetalert', {
        ...alert,
        channels: this.channels(alert.channels)
      })
    );
    return this.getPresetAlert(created.presetID);
  }
  async updatePresetAlert(id: string, alert: Partial<AlertRequest>) {
    if (alert.name !== undefined) requireValue(alert.name, 'Alert name');
    if (alert.channels && !alert.channels.length)
      throw createApiServiceError(
        'A preset alert requires at least one notification channel.'
      );
    await this.request(
      'PUT',
      `/v1/config/presetalert/${segment(id)}`,
      this.nonemptyUpdate({ ...alert, channels: this.channels(alert.channels) })
    );
    return this.getPresetAlert(id);
  }
  async deletePresetAlert(id: string) {
    await this.request('DELETE', `/v1/config/presetalert/${segment(id)}`);
  }
  private categoryType(type: string) {
    if (!['views', 'boards', 'screens'].includes(type))
      throw createApiServiceError('Category type must be views, boards, or screens.');
    return type;
  }
  async listCategories(type: string) {
    return this.list(
      await this.request('GET', `/v1/config/categories/${this.categoryType(type)}`),
      normalizeCategory
    );
  }
  async getCategory(type: string, id: string) {
    const category = normalizeCategory(
      await this.request(
        'GET',
        `/v1/config/categories/${this.categoryType(type)}/${segment(id)}`
      )
    );
    this.checkId(category.id, id);
    return category;
  }
  async createCategory(type: string, category: { name: string }) {
    requireValue(category.name, 'Category name');
    const created = normalizeCategory(
      await this.request('POST', `/v1/config/categories/${this.categoryType(type)}`, category)
    );
    return this.getCategory(type, created.id);
  }
  async updateCategory(type: string, id: string, category: { name: string }) {
    requireValue(category.name, 'Category name');
    await this.request(
      'PUT',
      `/v1/config/categories/${this.categoryType(type)}/${segment(id)}`,
      category
    );
    return this.getCategory(type, id);
  }
  async deleteCategory(type: string, id: string) {
    await this.request(
      'DELETE',
      `/v1/config/categories/${this.categoryType(type)}/${segment(id)}`
    );
  }
  async listBoards() {
    return this.list(await this.request('GET', '/v1/config/board'), normalizeBoard);
  }
  async getBoard(id: string) {
    const board = normalizeBoard(await this.request('GET', `/v1/config/board/${segment(id)}`));
    this.checkId(board.boardID, id);
    return board;
  }
  async createBoard(board: BoardRequest) {
    requireValue(board.title, 'Board title');
    if (board.widgets !== undefined)
      throw createApiServiceError(
        'The current Board create API does not accept widgets. Create an empty board and configure graphs in the dashboard.'
      );
    const created = normalizeBoard(
      await this.request('POST', '/v1/config/board', pickDefined(board))
    );
    return this.getBoard(created.boardID);
  }
  async deleteBoard(id: string) {
    await this.request('DELETE', `/v1/config/board/${segment(id)}`);
  }
  async listExclusionRules() {
    return this.list(
      await this.request('GET', '/v1/config/ingestion/exclusions'),
      normalizeExclusion
    );
  }
  async getExclusionRule(id: string) {
    const value = await this.request('GET', `/v1/config/ingestion/exclusions/${segment(id)}`);
    const rules = Array.isArray(value)
      ? value.map(normalizeExclusion)
      : [normalizeExclusion(value)];
    const matching = rules.filter(rule => rule.id === id);
    const match = matching[0];
    if (!match || matching.length !== 1)
      throw createApiServiceError(
        'LogDNA did not return exactly the requested exclusion rule.',
        { reason: 'invalid_response' }
      );
    return match;
  }
  async createExclusionRule(rule: ExclusionRuleRequest) {
    requireValue(rule.title, 'Rule title');
    const created = normalizeExclusion(
      await this.request('POST', '/v1/config/ingestion/exclusions', pickDefined(rule))
    );
    return this.getExclusionRule(created.id);
  }
  async updateExclusionRule(id: string, rule: Partial<ExclusionRuleRequest>) {
    if (rule.title !== undefined) requireValue(rule.title, 'Rule title');
    await this.request(
      'PATCH',
      `/v1/config/ingestion/exclusions/${segment(id)}`,
      this.nonemptyUpdate(rule)
    );
    return this.getExclusionRule(id);
  }
  async deleteExclusionRule(id: string) {
    await this.request('DELETE', `/v1/config/ingestion/exclusions/${segment(id)}`);
  }
  async getArchiveConfig() {
    const archive = parse(archiveSchema, await this.request('GET', '/v1/config/archiving'));
    if (!archive.integration?.trim())
      throw createApiServiceError('LogDNA returned an archive without its storage provider.', {
        reason: 'invalid_response'
      });
    return archive;
  }
  private validateArchive(archive: ArchiveConfig) {
    this.rememberSecrets(
      archive.apikey,
      archive.accountkey,
      archive.accesskey,
      archive.secretkey,
      archive.password,
      archive.authurl
    );
    const required: Record<string, string[]> = {
      ibm: ['bucket', 'endpoint', 'apikey', 'resourceinstanceid'],
      s3: ['bucket'],
      azblob: ['accountname', 'accountkey'],
      gcs: ['bucket', 'projectid'],
      dos: ['space', 'endpoint', 'accesskey', 'secretkey'],
      swift: ['authurl', 'username', 'password', 'tenantname']
    };
    for (const field of required[archive.integration] ?? [])
      requireValue(archive[field as keyof ArchiveConfig], `Archive ${field}`);
    if ((archive.accesskey === undefined) !== (archive.secretkey === undefined))
      throw createApiServiceError('Provide both archive access and secret keys together.');
    return pickDefined(archive);
  }
  private async writeArchive(method: 'POST' | 'PUT', archive: ArchiveConfig) {
    await this.request(method, '/v1/config/archiving', this.validateArchive(archive));
    const actual = await this.getArchiveConfig();
    for (const field of [
      'integration',
      'bucket',
      'endpoint',
      'accountname',
      'projectid',
      'space',
      'resourceinstanceid'
    ] as const)
      if (archive[field] !== undefined && actual[field] !== archive[field])
        throw createApiServiceError(
          'The saved archive configuration does not match the requested destination.',
          { reason: 'invalid_response' }
        );
    return actual;
  }
  createArchiveConfig(archive: ArchiveConfig) {
    return this.writeArchive('POST', archive);
  }
  updateArchiveConfig(archive: ArchiveConfig) {
    return this.writeArchive('PUT', archive);
  }
  async deleteArchiveConfig() {
    await this.request('DELETE', '/v1/config/archiving');
  }
  async getIngestionStatus() {
    return parse(
      z.object({ isIngesting: z.boolean() }),
      await this.request('GET', '/v1/config/ingestion/status')
    );
  }
  async suspendIngestion() {
    return parse(
      z.object({ token: z.string().min(1) }),
      await this.request('POST', '/v1/config/ingestion/suspend')
    );
  }
  async confirmSuspendIngestion(token: string) {
    requireValue(token, 'Suspend confirmation token');
    const result = parse(
      z.object({ status: z.literal('OK') }),
      await this.request('POST', '/v1/config/ingestion/suspend/confirm', { token })
    );
    if ((await this.getIngestionStatus()).isIngesting)
      throw createApiServiceError('Ingestion is still active after suspension.');
    return result;
  }
  async resumeIngestion() {
    const result = parse(
      z.object({ status: z.literal('OK') }),
      await this.request('POST', '/v1/config/ingestion/resume')
    );
    if (!(await this.getIngestionStatus()).isIngesting)
      throw createApiServiceError('Ingestion is still suspended after resume.');
    return result;
  }
  private usageDates(from: number, to: number) {
    if (
      ![from, to].every(
        value =>
          Number.isSafeInteger(value) && value >= 0 && value * 1000 <= 8_640_000_000_000_000
      ) ||
      from > to
    )
      throw createApiServiceError(
        'Usage from/to must be valid integer Unix seconds with from no later than to.'
      );
    return {
      from: new Date(from * 1000).toISOString(),
      to: new Date(to * 1000).toISOString()
    };
  }
  async getUsage(
    from: number,
    to: number,
    dimension?: 'apps' | 'hosts' | 'tags',
    name?: string
  ) {
    const path = `/v2/usage${dimension ? `/${dimension}` : ''}${name ? `/${segment(name)}` : ''}`;
    return parse(
      z.object({
        from: z.string(),
        to: z.string(),
        results: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
      }),
      await this.request('GET', path, undefined, this.usageDates(from, to))
    );
  }
  getUsageByApps(from: number, to: number) {
    return this.getUsage(from, to, 'apps');
  }
  getUsageByHosts(from: number, to: number) {
    return this.getUsage(from, to, 'hosts');
  }
  getUsageByTags(from: number, to: number) {
    return this.getUsage(from, to, 'tags');
  }
  getUsageForApp(name: string, from: number, to: number) {
    return this.getUsage(from, to, 'apps', requireValue(name, 'App name'));
  }
}
export const archiveMissing = (failure: unknown) => {
  const status =
    getApiErrorStatus(failure) ??
    (isApiErrorRecord(failure) && isApiErrorRecord(failure.data)
      ? failure.data.upstreamStatus
      : undefined);
  return status === 404 || status === '404';
};
