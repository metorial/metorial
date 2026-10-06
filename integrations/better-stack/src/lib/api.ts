import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

export type TokenType = 'uptime' | 'telemetry' | 'global';
export type ClientOptions = { token: string; tokenType?: TokenType; teamName?: string };
export type PageOptions = { page?: number; perPage?: number; nextUrl?: string };
export const teamNameSchema = z
  .string()
  .optional()
  .describe(
    'Team name for a global token. Overrides the connection default; required when creating a team-owned resource with a global token.'
  );
export const nextUrlSchema = z
  .string()
  .optional()
  .describe(
    'Next-page URL returned by the preceding list call. Retains the filters from that URL.'
  );
export const notificationsSchema = z.object({
  call: z.boolean().optional().describe('Enable phone notifications'),
  sms: z.boolean().optional().describe('Enable SMS notifications'),
  email: z.boolean().optional().describe('Enable email notifications'),
  push: z.boolean().optional().describe('Enable push notifications'),
  criticalAlert: z.boolean().optional().describe('Enable critical push notifications'),
  teamWait: z
    .number()
    .nullable()
    .optional()
    .describe('Seconds before escalating to the entire team; null disables this escalation')
});
export function notificationBody(input: z.infer<typeof notificationsSchema>) {
  return pickDefined({
    call: input.call,
    sms: input.sms,
    email: input.email,
    push: input.push,
    critical_alert: input.criticalAlert,
    team_wait: input.teamWait
  });
}

const text = z.string().nullable().optional();
const number = z.number().nullable().optional();
const boolean = z.boolean().nullable().optional();
const records = z.array(z.record(z.string(), z.unknown())).nullable().optional();
const attributesSchema = z
  .object({
    name: text,
    pronounceable_name: text,
    url: text,
    monitor_type: text,
    monitor_group_id: z.union([z.string(), z.number()]).nullable().optional(),
    status: text,
    paused: boolean,
    paused_at: text,
    check_frequency: number,
    last_checked_at: text,
    created_at: text,
    updated_at: text,
    cause: text,
    started_at: text,
    resolved_at: text,
    acknowledged_at: text,
    acknowledged_by: text,
    resolved_by: text,
    call_url: text,
    screenshot_url: text,
    period: number,
    grace: number,
    company_name: text,
    company_url: text,
    subdomain: text,
    custom_domain: text,
    timezone: text,
    subscribable: boolean,
    published: boolean,
    default_calendar: boolean,
    on_call_now: records,
    repeat_count: number,
    repeat_delay: number,
    steps: records,
    platform: text,
    token: text,
    table_id: z.union([z.string(), z.number()]).nullable().optional(),
    table_name: text,
    ingesting_host: text,
    ingesting_paused: boolean,
    data_region: text,
    logs_retention: number,
    metrics_retention: number,
    live_trail_enabled: boolean,
    live_tail_pattern: text,
    description: text,
    widgets: records,
    charts: records,
    sections: records,
    variables: records,
    alert_type: text,
    enabled: boolean,
    source_id: z.union([z.string(), z.number()]).nullable().optional(),
    query: text,
    threshold: number,
    value: number,
    operator: text,
    confirmation_period: number,
    recovery_period: number,
    check_period: number,
    dashboard_id: z.union([z.string(), z.number()]).nullable().optional(),
    chart_id: z.union([z.string(), z.number()]).nullable().optional(),
    exploration_id: z.union([z.string(), z.number()]).nullable().optional(),
    team_name: text,
    item_type: text,
    at: text,
    data: z.record(z.string(), z.unknown()).nullable().optional()
  })
  .catchall(z.unknown());
const resourceSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    type: z.string().optional(),
    attributes: attributesSchema,
    steps: records,
    relationships: z.record(z.string(), z.unknown()).optional()
  })
  .catchall(z.unknown());
export type ApiResource = z.infer<typeof resourceSchema>;
export type ResourceResponse = { data: ApiResource };
export interface PaginatedResponse<T = ApiResource> {
  data: T[];
  pagination?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
}
const paginationSchema = z.object({ first: text, last: text, prev: text, next: text });

export function pathId(value: string) {
  if (!value.trim()) throw createApiServiceError('Resource ID must not be empty.');
  return encodeURIComponent(value);
}
export function requireFields(...values: unknown[]) {
  if (
    values.some(value => value === undefined || (typeof value === 'string' && !value.trim()))
  )
    throw createApiServiceError('Provide the required fields described for this action.');
}
export function pausedState(attrs: ApiResource['attributes']) {
  if (attrs.paused !== undefined && attrs.paused !== null) return attrs.paused;
  if (attrs.paused_at !== undefined) return Boolean(attrs.paused_at);
  return attrs.status == null ? null : attrs.status === 'paused';
}
export function onCallUsers(item: ApiResource) {
  const relation = item.relationships?.on_call_users;
  if (!isApiErrorRecord(relation)) return item.attributes.on_call_now ?? null;
  const parsed = z.array(z.record(z.string(), z.unknown())).safeParse(relation.data);
  return parsed.success ? parsed.data : (item.attributes.on_call_now ?? null);
}
export function validatePage(params?: PageOptions, max = 250) {
  if (params?.page !== undefined && (!Number.isInteger(params.page) || params.page < 1))
    throw createApiServiceError('page must be a positive integer.');
  if (
    params?.perPage !== undefined &&
    (!Number.isInteger(params.perPage) || params.perPage < 1 || params.perPage > max)
  )
    throw createApiServiceError(`perPage must be an integer from 1 to ${max}.`);
}
export const errorAdapter = (error: unknown) =>
  buildApiServiceError(error, {
    parent: {},
    providerLabel: 'Better Stack',
    reason: 'better_stack_api_error',
    formatMessage: ({ status }) =>
      status === 429
        ? 'Better Stack rate limit reached. Wait before retrying.'
        : `Better Stack request failed${status ? ` (HTTP ${status})` : ''}. Check the token type, permissions, selected team, resource IDs and request fields.`
  });

export class BetterStackApi {
  protected http;
  readonly baseUrl: string;
  private teamName?: string;
  private tokenType?: TokenType;
  constructor(options: ClientOptions, product: 'uptime' | 'telemetry') {
    if (!options.token.trim())
      throw createApiServiceError('A nonempty API token is required.');
    if (options.tokenType && options.tokenType !== 'global' && options.tokenType !== product)
      throw createApiServiceError(
        `This tool requires an ${product === 'uptime' ? 'Uptime' : 'Telemetry'} or Global API token.`
      );
    this.tokenType = options.tokenType;
    this.teamName = options.teamName?.trim() || undefined;
    this.baseUrl = `https://${product === 'uptime' ? 'incidents' : 'telemetry'}.betterstack.com/api`;
    this.http = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      timeout: 30_000,
      authHeader: { value: `Bearer ${options.token.trim()}` },
      errorAdapter
    });
  }
  private continuation(endpoint: string, nextUrl?: string | null) {
    if (!nextUrl) return undefined;
    let url: URL;
    try {
      url = new URL(nextUrl, this.baseUrl);
    } catch {
      throw createApiServiceError(
        'Invalid continuation URL. Use the preceding list response.'
      );
    }
    const allowedHosts =
      new URL(this.baseUrl).hostname === 'telemetry.betterstack.com'
        ? ['telemetry.betterstack.com']
        : ['incidents.betterstack.com', 'uptime.betterstack.com'];
    if (
      url.protocol !== 'https:' ||
      url.port ||
      !allowedHosts.includes(url.hostname) ||
      url.pathname.replace(/\/$/, '') !== `/api${endpoint}`.replace(/\/$/, '') ||
      url.username ||
      url.password ||
      url.hash
    )
      throw createApiServiceError(
        'The continuation URL must address the same Better Stack list resource.'
      );
    return url.toString();
  }
  protected async page(
    endpoint: string,
    params?: PageOptions,
    filters?: Record<string, unknown>,
    max = 250
  ): Promise<PaginatedResponse> {
    validatePage(params, max);
    const response = await this.http.get<unknown>(
      this.continuation(endpoint, params?.nextUrl) ?? endpoint,
      {
        params: params?.nextUrl
          ? undefined
          : pickDefined({
              page: params?.page,
              per_page: params?.perPage,
              team_name: this.teamName,
              ...filters
            })
      }
    );
    const parsed = z
      .object({ data: z.array(resourceSchema), pagination: paginationSchema.optional() })
      .safeParse(response.data);
    if (!parsed.success)
      throw createApiServiceError('Better Stack returned an invalid resource list.');
    if (parsed.data.pagination?.next)
      parsed.data.pagination.next = this.continuation(endpoint, parsed.data.pagination.next);
    return parsed.data;
  }
  protected normalize(value: unknown): ResourceResponse {
    const parsed = resourceSchema.safeParse(
      isApiErrorRecord(value) && 'data' in value ? value.data : value
    );
    if (!parsed.success)
      throw createApiServiceError('Better Stack returned an invalid resource response.');
    return { data: parsed.data };
  }
  protected async get(endpoint: string) {
    return this.normalize((await this.http.get<unknown>(endpoint)).data);
  }
  protected async post(endpoint: string, body: Record<string, unknown>, create = true) {
    if (create && this.tokenType === 'global' && !this.teamName)
      throw createApiServiceError(
        'Select teamName before creating a resource with a Global API token.'
      );
    return this.normalize(
      (
        await this.http.post<unknown>(
          endpoint,
          pickDefined({ ...body, ...(create ? { team_name: this.teamName } : {}) })
        )
      ).data
    );
  }
  protected async patch(endpoint: string, body: Record<string, unknown>) {
    if (!Object.values(body).some(value => value !== undefined))
      throw createApiServiceError('Provide at least one field to update.');
    return this.normalize((await this.http.patch<unknown>(endpoint, pickDefined(body))).data);
  }
  protected async remove(endpoint: string) {
    await this.http.delete(endpoint);
  }
}
