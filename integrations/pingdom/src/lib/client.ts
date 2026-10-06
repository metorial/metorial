import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { z } from 'zod';

const number = z
  .number()
  .finite()
  .nullish()
  .transform(value => value ?? undefined);
const text = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
const flag = z
  .boolean()
  .nullish()
  .transform(value => value ?? undefined);
const id = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(z.number().int().positive());
const record = z.record(z.string(), z.unknown());
const nestedId = z.object({ id, name: text }).passthrough();
const protocol = z
  .object({
    url: text,
    encryption: flag,
    port: number,
    username: text,
    password: text,
    shouldcontain: text,
    shouldnotcontain: text,
    postdata: text,
    requestheaders: z
      .union([z.array(z.string()), z.record(z.string(), z.string())])
      .nullish()
      .transform(value => value ?? undefined),
    verify_certificate: flag,
    ssl_down_days_before: number,
    stringtosend: text,
    stringtoexpect: text,
    expectedip: text,
    nameserver: text
  })
  .passthrough();
const checkType = z.union([
  z.string(),
  z
    .object({
      name: text,
      http: protocol.optional(),
      httpcustom: protocol.optional(),
      tcp: protocol.optional(),
      udp: protocol.optional(),
      dns: protocol.optional(),
      smtp: protocol.optional(),
      pop3: protocol.optional(),
      imap: protocol.optional()
    })
    .passthrough()
]);
const row = z
  .object({
    id,
    name: text,
    hostname: text,
    status: text,
    type: checkType.optional(),
    resolution: number,
    lasterrortime: number,
    lasttesttime: number,
    lastresponsetime: number,
    created: number,
    paused: flag,
    ipv6: flag,
    sendnotificationwhendown: number,
    notifyagainevery: number,
    notifywhenbackup: flag,
    responsetime_threshold: number,
    custom_message: text,
    integrationids: z.array(id).optional(),
    userids: z.array(id).optional(),
    teams: z.array(nestedId).optional(),
    tags: z.array(z.any()).optional(),
    probe_filters: z.array(z.string()).optional(),
    severity_level: text,
    members: z.array(nestedId.extend({ type: text })).optional(),
    notification_targets: record.optional(),
    owner: flag,
    description: text,
    from: number,
    to: number,
    recurrencetype: text,
    repeatevery: number,
    effectiveto: number,
    checks: z
      .object({ uptime: z.array(id).optional(), tms: z.array(id).optional() })
      .optional(),
    active: flag,
    created_at: number,
    modified_at: number,
    interval: number,
    region: text,
    steps: z.array(record).optional(),
    contact_ids: z.array(id).optional(),
    team_ids: z.array(id).optional(),
    integration_ids: z.array(id).optional(),
    metadata: record.optional(),
    country: text,
    countryiso: text,
    city: text,
    ip: text
  })
  .passthrough();
const checkRow = row.extend({ name: z.string() });
const contactRow = row.extend({ type: text });
const transactionRow = row.extend({ type: text, tags: z.array(z.string()).optional() });
const transactionDetail = transactionRow.omit({ id: true }).extend({
  id: id.optional(),
  name: z.string(),
  active: z.boolean()
});
const resultRow = z
  .object({
    probeid: number,
    probedesc: text,
    time: number,
    status: text,
    responsetime: number,
    statusdesc: text,
    statusdesclong: text
  })
  .passthrough();
const message = z.object({ message: z.string().min(1) }).passthrough();
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'Pingdom returned an invalid API response. Try again or check the resource.'
    );
  return parsed.data;
};
export const pingdomApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Pingdom',
    reason: 'pingdom_api_error',
    formatMessage: ({ status }) =>
      `Pingdom request failed${status ? ` (HTTP ${status})` : ''}. Check the API token, access level, resource and account limits.`,
    parent: createApiServiceError('Pingdom upstream request failed.', {
      upstreamStatus: getApiErrorStatus(error)
    })
  });
const resourceId = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 1)
    throw createApiServiceError('Use a positive integer Pingdom resource ID.');
  return value;
};
const validateQuery = (params: Record<string, unknown>) => {
  for (const key of [
    'limit',
    'offset',
    'from',
    'to',
    'probeid',
    'minresponse',
    'maxresponse'
  ]) {
    const value = params[key];
    if (
      value !== undefined &&
      (typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < (key === 'limit' || key === 'probeid' ? 1 : 0))
    )
      throw createApiServiceError(`Use a valid integer ${key}.`);
  }
  if (
    typeof params.from === 'number' &&
    typeof params.to === 'number' &&
    params.from > params.to
  )
    throw createApiServiceError('The from timestamp must be no later than to.');
};
export const requireUpdate = (data: Record<string, unknown>) => {
  if (!Object.values(data).some(value => value !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
};
export const validateCheckSettings = (data: Record<string, unknown>, creating = false) => {
  if (data.shouldcontain !== undefined && data.shouldnotcontain !== undefined)
    throw createApiServiceError('Use only one of shouldContain and shouldNotContain.');
  if (data.resolution !== undefined && ![1, 5, 15, 30, 60].includes(Number(data.resolution)))
    throw createApiServiceError('Check resolution must be 1, 5, 15, 30 or 60 minutes.');
  for (const key of [
    'port',
    'sendnotificationwhendown',
    'notifyagainevery',
    'responsetime_threshold',
    'ssl_down_days_before'
  ]) {
    const value = data[key];
    if (
      value !== undefined &&
      (typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < (key === 'port' ? 1 : 0) ||
        (key === 'port' && value > 65535))
    )
      throw createApiServiceError(`Use a valid integer ${key}.`);
  }
  if (creating) {
    const required =
      data.type === 'dns'
        ? ['nameserver', 'expectedip']
        : data.type === 'tcp'
          ? ['port']
          : data.type === 'udp'
            ? ['port']
            : data.type === 'httpcustom'
              ? ['url']
              : [];
    for (const key of required)
      if (data[key] === undefined || data[key] === '')
        throw createApiServiceError(`The ${data.type} check requires ${key}.`);
  }
};
const maintenanceSettings = (data: Record<string, unknown>) => {
  validateQuery(data);
  for (const key of ['uptimeids', 'tmsids']) {
    if (
      data[key] !== undefined &&
      (!Array.isArray(data[key]) ||
        !(data[key] as unknown[]).every(
          v => typeof v === 'number' && Number.isSafeInteger(v) && v > 0
        ))
    )
      throw createApiServiceError('Use positive integer check IDs for maintenance.');
  }
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: { token: string; accountEmail?: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token))
      throw createApiServiceError('Provide a valid Pingdom API token.');
    if (
      config.accountEmail !== undefined &&
      (!config.accountEmail.trim() || /[\r\n]/.test(config.accountEmail))
    )
      throw createApiServiceError('Provide a valid account owner email or omit it.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.pingdom.com/api/3.1',
      authHeader: { value: `Bearer ${config.token}` },
      headers: config.accountEmail ? { 'Account-Email': config.accountEmail } : {},
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: pingdomApiError
    });
  }
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    schema: z.ZodType<T>,
    data?: Record<string, unknown>,
    params?: Record<string, unknown>
  ) {
    validateQuery(params ?? {});
    const response = await this.http.request<unknown>({
      method,
      url,
      data: data ? pickDefined(data) : undefined,
      params: params ? pickDefined(params) : undefined
    });
    const body = parse(record, response.data);
    if (body.error !== undefined)
      throw createApiServiceError(
        'Pingdom rejected the request. Check credentials, permissions and inputs.'
      );
    return parse(schema, body);
  }
  async listChecks(params: Record<string, unknown> = {}) {
    return this.request(
      'GET',
      '/checks',
      z.object({
        checks: z.array(checkRow),
        counts: z.object({ total: number, filtered: number, limited: number }).optional()
      }),
      undefined,
      params
    );
  }
  async getCheck(checkId: number, params: Record<string, unknown> = {}) {
    const result = await this.request(
      'GET',
      `/checks/${resourceId(checkId)}`,
      z.object({ check: checkRow }),
      undefined,
      params
    );
    if (result.check.id !== checkId)
      throw createApiServiceError('Pingdom returned a different check than requested.');
    return result;
  }
  async createCheck(data: Record<string, unknown>) {
    validateCheckSettings(data, true);
    return this.request(
      'POST',
      '/checks',
      z.object({ check: z.object({ id, name: text }) }),
      data
    );
  }
  async updateCheck(checkId: number, data: Record<string, unknown>) {
    requireUpdate(data);
    validateCheckSettings(data);
    return this.request('PUT', `/checks/${resourceId(checkId)}`, message, data);
  }
  async deleteCheck(checkId: number) {
    return this.request('DELETE', `/checks/${resourceId(checkId)}`, message);
  }
  async listTmsChecks(params: Record<string, unknown> = {}) {
    return this.request(
      'GET',
      '/tms/check',
      z.object({ checks: z.array(transactionRow), limit: number, offset: number }),
      undefined,
      params
    );
  }
  async getTmsCheck(checkId: number) {
    const result = await this.request(
      'GET',
      `/tms/check/${resourceId(checkId)}`,
      transactionDetail,
      undefined,
      { extended_tags: false }
    );
    if (result.id !== undefined && result.id !== checkId)
      throw createApiServiceError(
        'Pingdom returned a different transaction check than requested.'
      );
    return { ...result, id: checkId };
  }
  async createTmsCheck(data: Record<string, unknown>) {
    return this.request('POST', '/tms/check', z.object({ id, name: text }), data);
  }
  async updateTmsCheck(checkId: number, data: Record<string, unknown>) {
    requireUpdate(data);
    const result = await this.request(
      'PUT',
      `/tms/check/${resourceId(checkId)}`,
      transactionDetail,
      data
    );
    if (result.id !== undefined && result.id !== checkId)
      throw createApiServiceError(
        'Pingdom returned a different transaction check than requested.'
      );
    return this.getTmsCheck(checkId);
  }
  async deleteTmsCheck(checkId: number) {
    return this.request('DELETE', `/tms/check/${resourceId(checkId)}`, message);
  }
  async getCheckResults(checkId: number, params: Record<string, unknown> = {}) {
    return this.request(
      'GET',
      `/results/${resourceId(checkId)}`,
      z.object({ results: z.array(resultRow), activeprobes: z.array(id).optional() }),
      undefined,
      params
    );
  }
  async getSummaryAverage(checkId: number, params: Record<string, unknown> = {}) {
    return this.summary(checkId, 'average', params);
  }
  async getSummaryPerformance(checkId: number, params: Record<string, unknown> = {}) {
    return this.summary(checkId, 'performance', params);
  }
  async getSummaryOutage(checkId: number, params: Record<string, unknown> = {}) {
    return this.summary(checkId, 'outage', params);
  }
  async getSummaryHoursOfDay(checkId: number, params: Record<string, unknown> = {}) {
    return this.request(
      'GET',
      `/summary.hoursofday/${resourceId(checkId)}`,
      z.object({ hoursofday: z.array(z.object({ hour: number, avgresponse: number })) }),
      undefined,
      params
    );
  }
  private summary(checkId: number, type: string, params: Record<string, unknown>) {
    return this.request(
      'GET',
      `/summary.${type}/${resourceId(checkId)}`,
      z.object({ summary: record }),
      undefined,
      params
    );
  }
  async listContacts() {
    return this.request(
      'GET',
      '/alerting/contacts',
      z.object({ contacts: z.array(contactRow) })
    );
  }
  async getContact(contactId: number) {
    const result = await this.request(
      'GET',
      `/alerting/contacts/${resourceId(contactId)}`,
      z.object({ contact: contactRow })
    );
    if (result.contact.id !== contactId)
      throw createApiServiceError('Pingdom returned a different contact than requested.');
    return result;
  }
  async createContact(data: Record<string, unknown>) {
    return this.request(
      'POST',
      '/alerting/contacts',
      z.object({ contact: z.object({ id }) }),
      data
    );
  }
  async updateContact(contactId: number, data: Record<string, unknown>) {
    requireUpdate(data);
    const previous = (await this.getContact(contactId)).contact;
    const payload = {
      name: previous.name,
      paused: previous.paused,
      notification_targets: previous.notification_targets,
      ...pickDefined(data)
    };
    if (
      payload.name === undefined ||
      payload.paused === undefined ||
      payload.notification_targets === undefined
    )
      throw createApiServiceError(
        'Pingdom did not provide the existing contact configuration required to update it safely.'
      );
    return this.request(
      'PUT',
      `/alerting/contacts/${resourceId(contactId)}`,
      z.object({ contact: contactRow }),
      payload
    );
  }
  async deleteContact(contactId: number) {
    return this.request('DELETE', `/alerting/contacts/${resourceId(contactId)}`, message);
  }
  async listTeams() {
    return this.request('GET', '/alerting/teams', z.object({ teams: z.array(row) }));
  }
  async getTeam(teamId: number) {
    const result = await this.request(
      'GET',
      `/alerting/teams/${resourceId(teamId)}`,
      z.object({ team: row })
    );
    if (result.team.id !== teamId)
      throw createApiServiceError('Pingdom returned a different team than requested.');
    return result;
  }
  async createTeam(data: Record<string, unknown>) {
    return this.request('POST', '/alerting/teams', z.object({ team: z.object({ id }) }), {
      member_ids: [],
      ...data
    });
  }
  async updateTeam(teamId: number, data: Record<string, unknown>) {
    requireUpdate(data);
    const previous = (await this.getTeam(teamId)).team;
    const payload = {
      name: previous.name,
      member_ids: previous.members?.map(member => member.id),
      ...pickDefined(data)
    };
    if (payload.name === undefined || payload.member_ids === undefined)
      throw createApiServiceError(
        'Pingdom did not provide the existing team configuration required to update it safely.'
      );
    return this.request(
      'PUT',
      `/alerting/teams/${resourceId(teamId)}`,
      z.object({ team: row }),
      payload
    );
  }
  async deleteTeam(teamId: number) {
    return this.request('DELETE', `/alerting/teams/${resourceId(teamId)}`, message);
  }
  async listMaintenance(params: Record<string, unknown> = {}) {
    return this.request(
      'GET',
      '/maintenance',
      z.object({ maintenance: z.array(row) }),
      undefined,
      params
    );
  }
  async getMaintenance(maintenanceId: number) {
    const result = await this.request(
      'GET',
      `/maintenance/${resourceId(maintenanceId)}`,
      z.object({ maintenance: row })
    );
    if (result.maintenance.id !== maintenanceId)
      throw createApiServiceError(
        'Pingdom returned a different maintenance window than requested.'
      );
    return result;
  }
  async createMaintenance(data: Record<string, unknown>) {
    maintenanceSettings(data);
    return this.request(
      'POST',
      '/maintenance',
      z.object({ maintenance: z.object({ id }) }),
      data
    );
  }
  async updateMaintenance(maintenanceId: number, data: Record<string, unknown>) {
    requireUpdate(data);
    maintenanceSettings(data);
    return this.request('PUT', `/maintenance/${resourceId(maintenanceId)}`, message, data);
  }
  async deleteMaintenance(maintenanceId: number) {
    return this.request('DELETE', `/maintenance/${resourceId(maintenanceId)}`, message);
  }
  async getAnalysis(checkId: number, params: Record<string, unknown> = {}) {
    return this.request(
      'GET',
      `/analysis/${resourceId(checkId)}`,
      z.object({
        analysis: z.array(z.object({ id, timefirsttest: number, timeconfirmtest: number }))
      }),
      undefined,
      params
    );
  }
  async getAnalysisDetail(checkId: number, analysisId: number) {
    return this.request(
      'GET',
      `/analysis/${resourceId(checkId)}/${resourceId(analysisId)}`,
      record
    );
  }
  async performSingleCheck(params: Record<string, unknown>) {
    validateCheckSettings(params, true);
    return this.request('GET', '/single', z.object({ result: resultRow }), undefined, params);
  }
  async listProbes(params: Record<string, unknown> = {}) {
    return this.request(
      'GET',
      '/probes',
      z.object({ probes: z.array(row.omit({ ipv6: true }).extend({ ipv6: text })) }),
      undefined,
      params
    );
  }
  async getCredits() {
    return this.request(
      'GET',
      '/credits',
      z.object({
        credits: z
          .object({
            checklimit: number,
            availablechecks: number,
            useddefault: number,
            usedtransaction: number,
            availablesms: number,
            availablesmstests: number,
            autofillsms: flag,
            autofillsms_amount: number,
            autofillsms_when_left: number,
            max_sms_overage: number,
            availablerumsites: number,
            usedrumsites: number,
            maxrumfilters: number,
            maxrumpageviews: number
          })
          .passthrough()
      })
    );
  }
  async listActions(params: Record<string, unknown> = {}) {
    return this.request(
      'GET',
      '/actions',
      z.object({ actions: z.object({ alerts: z.array(record).optional() }) }),
      undefined,
      params
    );
  }
}
