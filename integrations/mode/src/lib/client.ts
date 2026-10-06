import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  getEmbedded,
  getNextLink,
  normalizeAccount,
  normalizeCollection,
  normalizeQueryRun,
  normalizeReportRun
} from './helpers';

export interface ModeClientConfig {
  token: string;
  secret: string;
  workspaceName: string;
}
export interface ListOptions {
  filter?: string;
  order?: 'asc' | 'desc';
  orderBy?: 'created_at' | 'updated_at';
  page?: number;
}
export interface ScheduleData {
  name?: string;
  frequency?: string;
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeZone?: string;
  params?: Record<string, unknown>;
  timeout?: number;
}
export const pathToken = (value: string) => {
  if (!value || value !== value.trim() || value === '.' || value === '..')
    throw createApiServiceError(
      'Provide a nonempty resource token without surrounding whitespace.'
    );
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('The resource token contains invalid characters.');
  }
};
export const requireToken = (value: string | undefined, label: string) => {
  if (!value) throw createApiServiceError(`Provide ${label} for this action.`);
  pathToken(value);
  return value;
};
export const requireUpdate = (data: Record<string, unknown>) => {
  if (!Object.values(data).some(value => value !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
};
const integer = (
  value: number | undefined,
  label: string,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER
) => {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || value < minimum || value > maximum)
  )
    throw createApiServiceError(
      `${label} must be a whole number from ${minimum} to ${maximum}.`
    );
};
const listParams = (options?: ListOptions) => {
  integer(options?.page, 'page');
  return pickDefined({
    filter: options?.filter,
    order: options?.order,
    order_by: options?.orderBy,
    page: options?.page
  });
};
const scheduleBody = (data: Partial<ScheduleData>) => {
  integer(data.hour, 'hour', 0, 23);
  integer(data.minute, 'minute', 0, 59);
  integer(data.dayOfWeek, 'dayOfWeek', 0, 6);
  integer(data.dayOfMonth, 'dayOfMonth', 1, 31);
  integer(data.timeout, 'timeout');
  if (data.timeZone !== undefined) {
    if (
      !data.timeZone.trim() ||
      [...data.timeZone].some(character => character.charCodeAt(0) < 32)
    )
      throw createApiServiceError(
        'Provide a supported Mode time zone, such as UTC or Pacific Time (US & Canada).'
      );
  }
  const cron = pickDefined({
    freq: data.frequency,
    hour: data.hour,
    minute: data.minute,
    day_of_week: data.dayOfWeek,
    day_of_month: data.dayOfMonth,
    time_zone: data.timeZone
  });
  return {
    report_schedule: pickDefined({
      name: data.name,
      params: data.params,
      timeout: data.timeout,
      cron: Object.keys(cron).length ? cron : undefined
    })
  };
};
export class ModeClient {
  private http;
  private workspace: string;
  static fromContext(ctx: {
    auth: { token: string; secret: string; workspaceName?: string };
    config: unknown;
  }) {
    const legacy = z.object({ workspaceName: z.string().optional() }).safeParse(ctx.config);
    const workspaceName =
      ctx.auth.workspaceName ?? (legacy.success ? legacy.data.workspaceName : undefined);
    if (!workspaceName) throw createApiServiceError('Reconnect with the Mode workspace slug.');
    return new ModeClient({ token: ctx.auth.token, secret: ctx.auth.secret, workspaceName });
  }
  constructor(config: ModeClientConfig) {
    if (!config.token.trim() || config.token.includes(':') || !config.secret.trim())
      throw createApiServiceError(
        'Provide the Mode API token and secret. The token cannot contain a colon.'
      );
    this.workspace = pathToken(config.workspaceName);
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.mode.com/api',
      authHeader: {
        value: `Basic ${Buffer.from(`${config.token}:${config.secret}`, 'utf8').toString('base64')}`
      },
      headers: { 'Content-Type': 'application/json', Accept: 'application/hal+json' },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Mode',
          reason: 'mode_api_error',
          parent: {},
          extractMessage: () =>
            'The API request failed. Check the account, token permissions, requested resource and submitted configuration.'
        })
    });
  }
  private async list(
    endpoint: string,
    key: string,
    params: Record<string, unknown> = {},
    onePage = false
  ): Promise<unknown> {
    let data: unknown = (await this.http.get(endpoint, { params })).data;
    if (onePage) {
      getEmbedded(data, key);
      return data;
    }
    const items = [...getEmbedded(data, key)];
    const visited = new Set<string>();
    const expectedPath = new URL(`https://app.mode.com/api${endpoint}`).pathname;
    for (let page = 0; ; page++) {
      const link = getNextLink(data);
      if (!link) return { _embedded: { [key]: items } };
      if (page >= 99 || visited.has(link))
        throw createApiServiceError(
          'Mode pagination did not complete. Request a specific page or narrow the filters.'
        );
      visited.add(link);
      let next: URL;
      try {
        next = new URL(link, 'https://app.mode.com');
      } catch {
        throw createApiServiceError('Mode returned an invalid pagination link.');
      }
      if (
        next.origin !== 'https://app.mode.com' ||
        next.pathname !== expectedPath ||
        next.username ||
        next.password ||
        next.hash
      )
        throw createApiServiceError(
          'Mode returned a pagination link outside the requested resource.'
        );
      for (const [key, value] of Object.entries(params)) {
        if (key === 'page' || value === undefined) continue;
        const expected = String(value);
        const advertised = next.searchParams.get(key);
        if (advertised !== null && advertised !== expected)
          throw createApiServiceError(
            'Mode returned a pagination link that changed the requested filters or ordering.'
          );
        next.searchParams.set(key, expected);
      }
      data = (await this.http.get(`${next.pathname.slice(4)}${next.search}`)).data;
      items.push(...getEmbedded(data, key));
    }
  }
  async verify(): Promise<void> {
    await this.http.get('/verify');
  }
  async getCurrentAccount() {
    await this.verify();
    await this.listCollections({ page: 1, perPage: 1 });
    const value = normalizeAccount((await this.http.get(`/${this.workspace}`)).data);
    if (pathToken(value.accountName) !== this.workspace)
      throw createApiServiceError(
        'Mode returned an account different from the configured workspace.'
      );
    return value;
  }
  async getReport(token: string): Promise<unknown> {
    return (await this.http.get(`/${this.workspace}/reports/${pathToken(token)}`)).data;
  }
  async listWorkspaceReports(options?: ListOptions) {
    return this.list(
      `/${this.workspace}/reports`,
      'reports',
      listParams(options),
      options?.page !== undefined
    );
  }
  async listReportsInCollection(token: string, options?: ListOptions) {
    return this.list(
      `/${this.workspace}/spaces/${pathToken(token)}/reports`,
      'reports',
      listParams(options),
      options?.page !== undefined
    );
  }
  async listReportsByDataSource(token: string, options?: ListOptions) {
    return this.list(
      `/${this.workspace}/data_sources/${pathToken(token)}/reports`,
      'reports',
      listParams(options),
      options?.page !== undefined
    );
  }
  async updateReport(
    token: string,
    data: { name?: string; description?: string; spaceToken?: string }
  ): Promise<unknown> {
    requireUpdate(data);
    if (data.spaceToken !== undefined) pathToken(data.spaceToken);
    return (
      await this.http.patch(`/${this.workspace}/reports/${pathToken(token)}`, {
        report: pickDefined({
          name: data.name,
          description: data.description,
          space_token: data.spaceToken
        })
      })
    ).data;
  }
  async archiveReport(token: string): Promise<unknown> {
    return (await this.http.patch(`/${this.workspace}/reports/${pathToken(token)}/archive`))
      .data;
  }
  async unarchiveReport(token: string): Promise<unknown> {
    return (await this.http.patch(`/${this.workspace}/reports/${pathToken(token)}/unarchive`))
      .data;
  }
  async deleteReport(token: string) {
    await this.http.delete(`/${this.workspace}/reports/${pathToken(token)}`);
  }
  async getQuery(report: string, query: string): Promise<unknown> {
    return (
      await this.http.get(
        `/${this.workspace}/reports/${pathToken(report)}/queries/${pathToken(query)}`
      )
    ).data;
  }
  async listQueries(report: string) {
    return this.list(`/${this.workspace}/reports/${pathToken(report)}/queries`, 'queries');
  }
  async createQuery(
    report: string,
    data: { rawQuery: string; dataSourceId: number; name?: string }
  ): Promise<unknown> {
    if (!data.rawQuery?.trim())
      throw createApiServiceError('Provide rawQuery when creating a query.');
    integer(data.dataSourceId, 'dataSourceId');
    return (
      await this.http.post(`/${this.workspace}/reports/${pathToken(report)}/queries`, {
        query: pickDefined({
          raw_query: data.rawQuery,
          data_source_id: data.dataSourceId,
          name: data.name
        })
      })
    ).data;
  }
  async updateQuery(
    report: string,
    query: string,
    data: { rawQuery?: string; dataSourceId?: number; name?: string }
  ): Promise<unknown> {
    requireUpdate(data);
    integer(data.dataSourceId, 'dataSourceId');
    return (
      await this.http.patch(
        `/${this.workspace}/reports/${pathToken(report)}/queries/${pathToken(query)}`,
        {
          query: pickDefined({
            raw_query: data.rawQuery,
            data_source_id: data.dataSourceId,
            name: data.name
          })
        }
      )
    ).data;
  }
  async deleteQuery(report: string, query: string) {
    await this.http.delete(
      `/${this.workspace}/reports/${pathToken(report)}/queries/${pathToken(query)}`
    );
  }
  async getReportRun(report: string, run: string): Promise<unknown> {
    return (
      await this.http.get(
        `/${this.workspace}/reports/${pathToken(report)}/runs/${pathToken(run)}`
      )
    ).data;
  }
  async listReportRuns(report: string, options?: ListOptions) {
    return this.list(
      `/${this.workspace}/reports/${pathToken(report)}/runs`,
      'report_runs',
      listParams(options),
      options?.page !== undefined
    );
  }
  async createReportRun(
    report: string,
    parameters?: Record<string, unknown>
  ): Promise<unknown> {
    return (
      await this.http.post(
        `/${this.workspace}/reports/${pathToken(report)}/runs`,
        pickDefined({ parameters })
      )
    ).data;
  }
  async getQueryRun(report: string, run: string, queryRun: string): Promise<unknown> {
    return (
      await this.http.get(
        `/${this.workspace}/reports/${pathToken(report)}/runs/${pathToken(run)}/query_runs/${pathToken(queryRun)}`
      )
    ).data;
  }
  async listQueryRuns(report: string, run: string) {
    return this.list(
      `/${this.workspace}/reports/${pathToken(report)}/runs/${pathToken(run)}/query_runs`,
      'query_runs'
    );
  }
  async getCollection(token: string): Promise<unknown> {
    return (await this.http.get(`/${this.workspace}/spaces/${pathToken(token)}`)).data;
  }
  async listCollections(options?: { filter?: string; page?: number; perPage?: number }) {
    integer(options?.page, 'page');
    integer(options?.perPage, 'perPage');
    return this.list(
      `/${this.workspace}/spaces`,
      'spaces',
      pickDefined({
        filter: options?.filter,
        page: options?.page,
        per_page: options?.perPage
      }),
      options?.page !== undefined || options?.perPage !== undefined
    );
  }
  async createCollection(data: {
    name: string;
    description?: string;
    spaceType?: string;
  }): Promise<unknown> {
    if (!data.name?.trim())
      throw createApiServiceError('Provide a name when creating a collection.');
    return (
      await this.http.post(`/${this.workspace}/spaces`, {
        space: pickDefined({
          name: data.name,
          description: data.description,
          space_type: data.spaceType ?? 'custom'
        })
      })
    ).data;
  }
  async updateCollection(
    token: string,
    data: { name?: string; description?: string }
  ): Promise<unknown> {
    requireUpdate(data);
    const name = data.name ?? normalizeCollection(await this.getCollection(token)).name;
    return (
      await this.http.post(`/${this.workspace}/spaces/${pathToken(token)}`, {
        space: pickDefined({ name, description: data.description })
      })
    ).data;
  }
  async deleteCollection(token: string) {
    await this.http.delete(`/${this.workspace}/spaces/${pathToken(token)}`);
  }
  async getDataset(token: string): Promise<unknown> {
    return (await this.http.get(`/${this.workspace}/datasets/${pathToken(token)}`)).data;
  }
  async listDatasetsInCollection(token: string, options?: ListOptions) {
    return this.list(
      `/${this.workspace}/spaces/${pathToken(token)}/datasets`,
      'datasets',
      listParams(options),
      options?.page !== undefined
    );
  }
  async listDatasetsByDataSource(token: string, options?: ListOptions) {
    return this.list(
      `/${this.workspace}/data_sources/${pathToken(token)}/datasets`,
      'datasets',
      listParams(options),
      options?.page !== undefined
    );
  }
  async updateDataset(
    token: string,
    data: { name?: string; description?: string; spaceToken?: string }
  ): Promise<unknown> {
    requireUpdate(data);
    if (data.spaceToken !== undefined) pathToken(data.spaceToken);
    return (
      await this.http.patch(`/${this.workspace}/datasets/${pathToken(token)}`, {
        report: pickDefined({
          name: data.name,
          description: data.description,
          space_token: data.spaceToken
        })
      })
    ).data;
  }
  async deleteDataset(token: string) {
    await this.http.delete(`/${this.workspace}/datasets/${pathToken(token)}`);
  }
  async getDataSource(token: string): Promise<unknown> {
    return (await this.http.get(`/${this.workspace}/data_sources/${pathToken(token)}`)).data;
  }
  async listDataSources() {
    return this.list(`/${this.workspace}/data_sources`, 'data_sources');
  }
  async getReportSchedule(report: string, schedule: string): Promise<unknown> {
    return (
      await this.http.get(
        `/${this.workspace}/reports/${pathToken(report)}/schedules/${pathToken(schedule)}`
      )
    ).data;
  }
  async listReportSchedules(report: string) {
    return this.list(
      `/${this.workspace}/reports/${pathToken(report)}/schedules`,
      'report_schedules'
    );
  }
  async createReportSchedule(report: string, data: ScheduleData): Promise<unknown> {
    if (!data.frequency?.trim())
      throw createApiServiceError(
        'Provide a frequency when creating a schedule. Recurring execution may incur warehouse costs.'
      );
    return (
      await this.http.post(
        `/${this.workspace}/reports/${pathToken(report)}/schedules`,
        scheduleBody(data)
      )
    ).data;
  }
  async updateReportSchedule(
    report: string,
    schedule: string,
    data: Partial<ScheduleData>
  ): Promise<unknown> {
    requireUpdate(data);
    return (
      await this.http.patch(
        `/${this.workspace}/reports/${pathToken(report)}/schedules/${pathToken(schedule)}`,
        scheduleBody(data)
      )
    ).data;
  }
  async deleteReportSchedule(report: string, schedule: string) {
    await this.http.delete(
      `/${this.workspace}/reports/${pathToken(report)}/schedules/${pathToken(schedule)}`
    );
  }
  async listReportSubscriptions(report: string) {
    return this.list(
      `/${this.workspace}/reports/${pathToken(report)}/subscriptions`,
      'report_subscriptions'
    );
  }
  async getDefinition(token: string): Promise<unknown> {
    return (await this.http.get(`/${this.workspace}/definitions/${pathToken(token)}`)).data;
  }
  async listDefinitions(options?: { filter?: string; tokens?: string }) {
    return this.list(
      `/${this.workspace}/definitions`,
      'definitions',
      pickDefined({
        filter: options?.tokens ? 'by_tokens' : options?.filter,
        tokens: options?.tokens
      })
    );
  }
  async createDefinition(data: {
    name?: string;
    description?: string;
    source?: string;
    data_source_id?: number;
  }): Promise<unknown> {
    if (!data.name?.trim())
      throw createApiServiceError('Provide a name when creating a definition.');
    integer(data.data_source_id, 'dataSourceId');
    return (
      await this.http.post(`/${this.workspace}/definitions`, { definition: pickDefined(data) })
    ).data;
  }
  async updateDefinition(
    token: string,
    data: { name?: string; description?: string; source?: string; data_source_id?: number }
  ): Promise<unknown> {
    requireUpdate(data);
    integer(data.data_source_id, 'dataSourceId');
    return (
      await this.http.patch(`/${this.workspace}/definitions/${pathToken(token)}`, {
        definition: pickDefined(data)
      })
    ).data;
  }
  async deleteDefinition(token: string) {
    await this.http.delete(`/${this.workspace}/definitions/${pathToken(token)}`);
  }
  async listMembers() {
    return this.list(`/${this.workspace}/memberships`, 'memberships');
  }
  async download(
    report: string,
    run: string,
    format: 'csv' | 'json' | 'pdf',
    queryRun?: string
  ) {
    if (queryRun !== undefined) pathToken(queryRun);
    if (format === 'pdf' && queryRun !== undefined)
      throw createApiServiceError(
        'PDF exports apply to the whole report run. Omit queryRunToken or choose CSV/JSON.'
      );
    const reportRun = queryRun
      ? undefined
      : normalizeReportRun(await this.getReportRun(report, run));
    const state = queryRun
      ? normalizeQueryRun(await this.getQueryRun(report, run, queryRun)).state
      : reportRun?.state;
    if (state !== 'succeeded' && (queryRun !== undefined || state !== 'completed'))
      throw createApiServiceError(
        'Wait for a successful completed run before downloading its results. No execution is started by this download.'
      );
    if (format === 'pdf' && !['none', 'succeeded'].includes(reportRun?.pythonState ?? ''))
      throw createApiServiceError(
        'Wait for the report notebook to finish successfully before downloading the complete PDF. No execution is started by this download.'
      );
    const base = `/${this.workspace}/reports/${pathToken(report)}`;
    const endpoint =
      format === 'pdf'
        ? `${base}/exports/runs/${pathToken(run)}/pdf/download`
        : `${base}/runs/${pathToken(run)}${queryRun ? `/query_runs/${pathToken(queryRun)}` : ''}/results/content.${format}`;
    const response = await this.http.get<ArrayBuffer>(endpoint, {
      responseType: 'arraybuffer',
      headers: {
        Accept:
          format === 'pdf'
            ? 'application/pdf'
            : format === 'json'
              ? 'application/json'
              : 'text/csv'
      },
      maxContentLength: 50 * 1024 * 1024
    });
    const mimeType = getResponseHeaderValue(response.headers, 'content-type')
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();
    const expected =
      format === 'pdf'
        ? ['application/pdf']
        : format === 'json'
          ? ['application/json']
          : ['text/csv', 'application/csv', 'text/plain'];
    const bytes = new Uint8Array(response.data);
    if (
      !mimeType ||
      !expected.includes(mimeType) ||
      !bytes.byteLength ||
      (format === 'pdf' && Buffer.from(bytes.subarray(0, 5)).toString('ascii') !== '%PDF-')
    )
      throw createApiServiceError(
        'Mode did not return a valid result file in the requested format.'
      );
    if (format !== 'pdf') {
      const content = new TextDecoder().decode(bytes);
      if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(content))
        throw createApiServiceError('Mode returned an HTML page instead of result data.');
      if (format === 'json') {
        try {
          JSON.parse(content);
        } catch {
          throw createApiServiceError('Mode returned invalid JSON result data.');
        }
      }
    }
    return { bytes, mimeType, runState: state };
  }
}
