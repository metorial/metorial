import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

type Fields = Record<string, unknown>;
type Family =
  | 'uptime'
  | 'pagespeed'
  | 'ssl'
  | 'heartbeat'
  | 'contact-groups'
  | 'maintenance-windows';
type Page = { page?: number; limit?: number };
type History = Page & { before?: string; after?: string };
const recordSchema = z.record(z.string(), z.unknown());
const resourceSchema = z.looseObject({ id: z.string().min(1) });
const paginationSchema = z.looseObject({
  page: z.number().int().min(1),
  per_page: z.number().int().min(1),
  page_count: z.number().int().min(0),
  total_count: z.number().int().min(0)
});
const collectionSchema = z.object({
  data: z.array(resourceSchema),
  metadata: paginationSchema
});
const detailSchema = z.object({ data: resourceSchema });
const createdSchema = z.object({ data: z.object({ new_id: z.string().min(1) }) });
const historySchema = z.object({
  data: z.array(recordSchema),
  metadata: recordSchema.optional(),
  links: z.looseObject({ self: z.string(), next: z.string().nullish() })
});
const locationsSchema = z.object({
  data: z.array(
    z.looseObject({
      description: z.string(),
      region: z.string(),
      region_code: z.string(),
      status: z.string()
    })
  )
});
const uptimeRates = [0, 30, 60, 300, 900, 1800, 3600, 86400];
const pagespeedRates = [60, 300, 600, 900, 1800, 3600, 86400];
const sslRates = [300, 600, 1800, 3600, 86400, 2073600];
const pagespeedRegions = ['AU', 'CA', 'DE', 'FR', 'IN', 'JP', 'NL', 'SG', 'UK', 'US', 'USW'];
const arrayFields = [
  'contact_groups',
  'regions',
  'tags',
  'dns_ips',
  'email_addresses',
  'mobile_numbers',
  'integrations',
  'tests'
];
const booleanFields = [
  'paused',
  'do_not_find',
  'enable_ssl_alert',
  'follow_redirects',
  'include_header',
  'use_jar',
  'alert_broken',
  'alert_expiry',
  'alert_mixed',
  'alert_reminder'
];

const segment = (value: string, label: string) => {
  if (!value.trim() || value === '.' || value === '..')
    throw createApiServiceError(
      `${label} must be a nonempty identifier from a list or create tool.`
    );
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError(`${label} contains invalid Unicode.`);
  }
};
const integer = (
  value: unknown,
  label: string,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER
) => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  )
    throw createApiServiceError(
      `${label} must be an integer between ${minimum} and ${maximum}.`
    );
};
const pageParams = (params: Fields = {}) => {
  if (params.page !== undefined) integer(params.page, 'page', 1);
  if (params.limit !== undefined) integer(params.limit, 'limit', 1, 100);
  const values = pickDefined(params);
  for (const flag of ['matchany', 'nouptime']) {
    if (values[flag] === false) delete values[flag];
    else if (values[flag] === true) values[flag] = '';
  }
  return values;
};
const timestamp = (value: string, label: string) => {
  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    integer(seconds, label, 0);
    return seconds;
  }
  if (!z.iso.datetime({ offset: true }).safeParse(value).success)
    throw createApiServiceError(
      `${label} must be an RFC3339 timestamp or a UNIX-seconds string.`
    );
  const seconds = Math.floor(Date.parse(value) / 1000);
  integer(seconds, label, 0);
  return seconds;
};
const historyParams = (params: History = {}) => {
  pageParams(params);
  if (params.page !== undefined && params.page !== 1)
    throw createApiServiceError(
      'History uses before/after cursors rather than page numbers. Follow nextBefore from the preceding response.'
    );
  const before = params.before === undefined ? undefined : timestamp(params.before, 'before');
  const after = params.after === undefined ? undefined : timestamp(params.after, 'after');
  if (before !== undefined && after !== undefined && after >= before)
    throw createApiServiceError('after must precede before.');
  return pickDefined({ before, after, limit: params.limit });
};
export const nextPage = (metadata: z.output<typeof paginationSchema>) =>
  metadata.page < metadata.page_count ? metadata.page + 1 : undefined;
export const nextBefore = (links: z.output<typeof historySchema>['links']) => {
  if (!links.next) return undefined;
  try {
    const url = new URL(links.next);
    if (url.protocol !== 'https:' || url.hostname !== 'api.statuscake.com') return undefined;
    const value = url.searchParams.get('before');
    return value && /^\d+$/.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

const validateWrite = (family: Family, data: Fields, creating: boolean) => {
  const body = pickDefined(data);
  if (!Object.keys(body).length)
    throw createApiServiceError('Provide at least one property to update.');
  const required = creating
    ? {
        uptime: ['name', 'test_type', 'website_url', 'check_rate'],
        pagespeed: ['name', 'website_url', 'check_rate', 'region'],
        ssl: ['website_url', 'check_rate', 'alert_at'],
        heartbeat: ['name', 'period'],
        'contact-groups': ['name'],
        'maintenance-windows': ['name', 'start_at', 'end_at', 'timezone']
      }[family]
    : [];
  for (const key of required)
    if (body[key] === undefined)
      throw createApiServiceError(`${key} is required to create this resource.`);
  for (const key of ['name', 'website_url'])
    if (body[key] !== undefined && (typeof body[key] !== 'string' || !body[key].trim()))
      throw createApiServiceError(`${key} must be nonempty.`);
  for (const key of arrayFields)
    if (
      body[key] !== undefined &&
      (!Array.isArray(body[key]) || !body[key].every(value => typeof value === 'string'))
    )
      throw createApiServiceError(
        `${key} must be an array of strings; an empty array clears it.`
      );
  for (const key of booleanFields)
    if (body[key] !== undefined && typeof body[key] !== 'boolean')
      throw createApiServiceError(`${key} must be a boolean.`);
  if (body.check_rate !== undefined) {
    const allowed =
      family === 'uptime' ? uptimeRates : family === 'pagespeed' ? pagespeedRates : sslRates;
    if (!allowed.includes(Number(body.check_rate)))
      throw createApiServiceError(
        `checkRate must be one of ${allowed.join(', ')} for ${family}.`
      );
  }
  for (const [key, minimum, maximum] of [
    ['confirmation', 0, 3],
    ['timeout', 5, 75],
    ['trigger_rate', 0, 60],
    ['port', 0, 65535],
    ['period', 30, 172800],
    ['alert_bigger', 0, Number.MAX_SAFE_INTEGER],
    ['alert_smaller', 0, Number.MAX_SAFE_INTEGER],
    ['alert_slower', 0, Number.MAX_SAFE_INTEGER]
  ] as const)
    if (body[key] !== undefined) integer(body[key], key, minimum, maximum);
  if (
    body.test_type !== undefined &&
    !['HTTP', 'HEAD', 'TCP', 'DNS', 'SMTP', 'SSH', 'PING'].includes(String(body.test_type))
  )
    throw createApiServiceError('testType is not supported.');
  if (body.region !== undefined && !pagespeedRegions.includes(String(body.region)))
    throw createApiServiceError(
      'locationIso must be a documented region from list_monitoring_locations.'
    );
  if (body.tags !== undefined && ['pagespeed', 'ssl'].includes(family))
    throw createApiServiceError(
      'StatusCake does not document tags for page-speed or SSL checks. Use uptime or heartbeat tags instead.'
    );
  if (
    body.alert_at !== undefined &&
    (!Array.isArray(body.alert_at) ||
      body.alert_at.length !== 3 ||
      !body.alert_at.every(value => typeof value === 'number' && Number.isSafeInteger(value)))
  )
    throw createApiServiceError(
      'alertAt must contain exactly three integer day values; it is required for SSL creation.'
    );
  if (family === 'ssl' && body.website_url !== undefined) {
    let url: URL;
    try {
      url = new URL(String(body.website_url));
    } catch {
      throw createApiServiceError('SSL websiteUrl must be a valid HTTPS URL.');
    }
    if (url.protocol !== 'https:')
      throw createApiServiceError('SSL websiteUrl must use HTTPS.');
  }
  for (const key of ['custom_header', 'post_body'])
    if (body[key] !== undefined && body[key] !== '') {
      let json: unknown;
      try {
        json = JSON.parse(String(body[key]));
      } catch {
        throw createApiServiceError(
          `${key} must encode a JSON object, or be empty to clear it.`
        );
      }
      if (!isApiErrorRecord(json))
        throw createApiServiceError(
          `${key} must encode a JSON object, or be empty to clear it.`
        );
    }
  if (family === 'maintenance-windows') {
    for (const key of ['start_at', 'end_at'])
      if (
        body[key] !== undefined &&
        !z.iso.datetime({ offset: true }).safeParse(body[key]).success
      )
        throw createApiServiceError(
          `${key} must use RFC3339 format. The provider interprets its clock time in timezone and ignores the UTC offset.`
        );
    if (body.timezone !== undefined) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: String(body.timezone) });
      } catch {
        throw createApiServiceError('timezone must be a valid IANA timezone.');
      }
    }
    if (body.start_at !== undefined && body.end_at !== undefined) {
      const local = (value: unknown) =>
        Date.parse(String(value).replace(/(?:Z|[+-]\d{2}:\d{2})$/, 'Z'));
      if (local(body.end_at) <= local(body.start_at))
        throw createApiServiceError('endAt must follow startAt in the selected timezone.');
    }
    if (
      creating &&
      !['tests', 'tags'].some(key => Array.isArray(body[key]) && body[key].length)
    )
      throw createApiServiceError(
        'Provide nonempty tests or tags to select uptime checks for maintenance.'
      );
  }
  return body;
};
const encodeForm = (body: Fields) => {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) {
      if (!value.length) form.append(`${key}[]`, '');
      else for (const item of value) form.append(`${key}[]`, String(item));
    } else form.append(key, String(value));
  }
  return form.toString();
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(private config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A StatusCake API token is required.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.statuscake.com/v1',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30_000,
      maxRedirects: 0,
      validateStatus: () => true
    });
  }
  private async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    schema: z.ZodType<T>,
    body?: Fields,
    params?: Fields
  ) {
    const operation = `${method.toUpperCase()} ${path}`;
    const adaptError = (upstream: unknown) =>
      buildApiServiceError(upstream, {
        parent: {},
        providerLabel: 'StatusCake',
        reason: 'statuscake_api_error',
        operation,
        extractMessage: (error, helpers) => {
          let message = helpers.extractMessage(error);
          const payload = helpers.getResponse(error)?.data;
          if (isApiErrorRecord(payload) && isApiErrorRecord(payload.errors)) {
            const details: string[] = [];
            for (const [field, value] of Object.entries(payload.errors)) {
              const messages: string[] = [];
              helpers.collectDetails(value, messages);
              if (messages.length) details.push(`${field}: ${messages.join('; ')}`);
            }
            if (details.length) message += ` ${details.join(' ')}`;
          }
          let secrets: unknown[] = [
            this.config.token,
            body?.basic_password,
            body?.basic_username,
            body?.custom_header,
            body?.post_body,
            body?.post_raw,
            body?.ping_url
          ];
          for (const field of ['custom_header', 'post_body']) {
            if (typeof body?.[field] === 'string' && body[field]) {
              try {
                secrets.push(JSON.parse(body[field]));
              } catch {
                /* Already validated where applicable. */
              }
            }
          }
          while (secrets.length) {
            const secret = secrets.pop();
            if (typeof secret === 'string' && secret)
              message = message.replaceAll(secret, '[redacted]');
            else if (Array.isArray(secret)) for (const item of secret) secrets.push(item);
            else if (isApiErrorRecord(secret))
              for (const value of Object.values(secret)) secrets.push(value);
          }
          return message;
        }
      });
    const data = await requestAxiosData<unknown>(
      operation,
      async () => {
        const response = await this.http.request<unknown>({
          method,
          url: path,
          params,
          ...(body
            ? {
                data: encodeForm(body),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
              }
            : {})
        });
        if (response.status < 200 || response.status >= 300) {
          const error = adaptError({
            response: {
              status: response.status,
              statusText: response.statusText,
              data: response.data
            }
          });
          for (const [field, name] of [
            ['retryAfter', 'Retry-After'],
            ['rateLimit', 'X-RateLimit-Limit'],
            ['rateLimitRemaining', 'X-RateLimit-Remaining'],
            ['rateLimitResetSeconds', 'X-RateLimit-Reset']
          ] as const) {
            const value = getResponseHeaderValue(response.headers, name);
            if (value !== undefined) error.data[field] = value;
          }
          throw error;
        }
        return response;
      },
      error => adaptError(error)
    );
    const parsed = schema.safeParse(data);
    if (!parsed.success)
      throw createApiServiceError('StatusCake returned an unexpected response shape.');
    return parsed.data;
  }
  private list(family: Family, params: Fields = {}) {
    return this.request('get', `/${family}`, collectionSchema, undefined, pageParams(params));
  }
  private async get(family: Family, id: string) {
    const result = await this.request(
      'get',
      `/${family}/${segment(id, 'resource ID')}`,
      detailSchema
    );
    if (result.data.id !== id)
      throw createApiServiceError('StatusCake returned a different resource ID.', {
        reason: 'invalid_response'
      });
    return result;
  }
  private create(family: Family, data: Fields) {
    return this.request(
      'post',
      `/${family}`,
      createdSchema,
      validateWrite(family, data, true)
    );
  }
  private update(family: Family, id: string, data: Fields) {
    return this.request(
      'put',
      `/${family}/${segment(id, 'resource ID')}`,
      z.union([z.literal(''), z.null(), z.undefined()]),
      validateWrite(family, data, false)
    );
  }
  private delete(family: Family, id: string) {
    return this.request(
      'delete',
      `/${family}/${segment(id, 'resource ID')}`,
      z.union([z.literal(''), z.null(), z.undefined()])
    );
  }
  listUptimeTests(
    params?: Page & { status?: string; tags?: string; matchany?: boolean; nouptime?: boolean }
  ) {
    return this.list('uptime', params);
  }
  getUptimeTest(testId: string) {
    return this.get('uptime', testId);
  }
  createUptimeTest(data: Fields) {
    return this.create('uptime', data);
  }
  updateUptimeTest(testId: string, data: Fields) {
    return this.update('uptime', testId, data);
  }
  deleteUptimeTest(testId: string) {
    return this.delete('uptime', testId);
  }
  listPagespeedTests(params?: Page) {
    return this.list('pagespeed', params);
  }
  getPagespeedTest(testId: string) {
    return this.get('pagespeed', testId);
  }
  createPagespeedTest(data: Fields) {
    return this.create('pagespeed', data);
  }
  updatePagespeedTest(testId: string, data: Fields) {
    return this.update('pagespeed', testId, data);
  }
  deletePagespeedTest(testId: string) {
    return this.delete('pagespeed', testId);
  }
  listSslTests(params?: Page) {
    return this.list('ssl', params);
  }
  getSslTest(testId: string) {
    return this.get('ssl', testId);
  }
  createSslTest(data: Fields) {
    return this.create('ssl', data);
  }
  updateSslTest(testId: string, data: Fields) {
    return this.update('ssl', testId, data);
  }
  deleteSslTest(testId: string) {
    return this.delete('ssl', testId);
  }
  listHeartbeatTests(
    params?: Page & { status?: string; tags?: string; matchany?: boolean; nouptime?: boolean }
  ) {
    return this.list('heartbeat', params);
  }
  getHeartbeatTest(testId: string) {
    return this.get('heartbeat', testId);
  }
  createHeartbeatTest(data: Fields) {
    return this.create('heartbeat', data);
  }
  updateHeartbeatTest(testId: string, data: Fields) {
    return this.update('heartbeat', testId, data);
  }
  deleteHeartbeatTest(testId: string) {
    return this.delete('heartbeat', testId);
  }
  listContactGroups(params?: Page) {
    return this.list('contact-groups', params);
  }
  getContactGroup(groupId: string) {
    return this.get('contact-groups', groupId);
  }
  createContactGroup(data: Fields) {
    return this.create('contact-groups', data);
  }
  updateContactGroup(groupId: string, data: Fields) {
    return this.update('contact-groups', groupId, data);
  }
  deleteContactGroup(groupId: string) {
    return this.delete('contact-groups', groupId);
  }
  listMaintenanceWindows(params?: Page & { state?: string }) {
    return this.list('maintenance-windows', params);
  }
  getMaintenanceWindow(windowId: string) {
    return this.get('maintenance-windows', windowId);
  }
  createMaintenanceWindow(data: Fields) {
    return this.create('maintenance-windows', data);
  }
  async updateMaintenanceWindow(windowId: string, data: Fields) {
    if (
      data.start_at !== undefined ||
      data.end_at !== undefined ||
      data.timezone !== undefined
    ) {
      const existing = (await this.get('maintenance-windows', windowId)).data;
      validateWrite('maintenance-windows', { ...existing, ...pickDefined(data) }, false);
    }
    return this.update('maintenance-windows', windowId, data);
  }
  deleteMaintenanceWindow(windowId: string) {
    return this.delete('maintenance-windows', windowId);
  }
  listUptimeTestHistory(testId: string, params?: History) {
    return this.request(
      'get',
      `/uptime/${segment(testId, 'testId')}/history`,
      historySchema,
      undefined,
      historyParams(params)
    );
  }
  listUptimeTestPeriods(testId: string, params?: History) {
    return this.request(
      'get',
      `/uptime/${segment(testId, 'testId')}/periods`,
      historySchema,
      undefined,
      historyParams(params)
    );
  }
  listUptimeTestAlerts(testId: string, params?: History) {
    return this.request(
      'get',
      `/uptime/${segment(testId, 'testId')}/alerts`,
      historySchema,
      undefined,
      historyParams(params)
    );
  }
  listPagespeedTestHistory(testId: string, params?: History) {
    return this.request(
      'get',
      `/pagespeed/${segment(testId, 'testId')}/history`,
      historySchema,
      undefined,
      historyParams(params)
    );
  }
  listUptimeLocations(params?: { region_code?: string }) {
    return this.request(
      'get',
      '/uptime-locations',
      locationsSchema,
      undefined,
      pickDefined(params ?? {})
    );
  }
  listPagespeedLocations(params?: { location?: string }) {
    return this.request(
      'get',
      '/pagespeed-locations',
      locationsSchema,
      undefined,
      pickDefined(params ?? {})
    );
  }
}
