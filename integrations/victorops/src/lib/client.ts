import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

const text = z.string();
const optionalText = text.nullish().transform(value => value ?? undefined);
const object = z.record(z.string(), z.unknown());
const team = z
  .object({
    slug: text.min(1),
    name: text,
    memberCount: z.number().optional(),
    isDefaultTeam: z.boolean().optional()
  })
  .passthrough();
const user = z
  .object({
    username: text.min(1),
    firstName: optionalText,
    lastName: optionalText,
    email: optionalText,
    createdAt: optionalText
  })
  .passthrough();
const incident = z
  .object({
    incidentNumber: text.regex(/^\d+$/),
    currentPhase: optionalText,
    entityId: optionalText,
    startTime: optionalText,
    lastAlertTime: optionalText,
    host: optionalText,
    service: optionalText,
    alertCount: z
      .number()
      .nullish()
      .transform(value => value ?? undefined),
    pagedUsers: z
      .array(text)
      .nullish()
      .transform(value => value ?? undefined),
    pagedTeams: z
      .array(text)
      .nullish()
      .transform(value => value ?? undefined),
    pagedPolicies: z
      .array(object)
      .nullish()
      .transform(value => value ?? undefined),
    transitions: z
      .array(object)
      .nullish()
      .transform(value => value ?? undefined)
  })
  .passthrough();
const policy = z
  .object({
    name: text,
    slug: text.min(1),
    ignoreCustomPagingPolicies: z.boolean(),
    steps: z.array(object)
  })
  .passthrough();
const policyInfo = z
  .object({
    policy: z.object({ name: text, slug: text.min(1) }).passthrough(),
    team: z.object({ slug: text.min(1) }).passthrough()
  })
  .passthrough();
const note = z
  .object({ name: text.min(1), displayName: optionalText, json_value: object })
  .passthrough();
const routingKey = z
  .object({
    routingKey: text.min(1),
    targets: z.array(object),
    isDefault: z.boolean().optional()
  })
  .passthrough();
const maintenance = z
  .object({
    activeInstances: z.array(
      z
        .object({
          instanceId: text.min(1),
          targets: z.array(object),
          isGlobal: z.boolean(),
          startedAt: z.number().optional()
        })
        .passthrough()
    ),
    companyId: optionalText
  })
  .passthrough();
const parse = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success)
    throw createApiServiceError(
      'Splunk On-Call returned an invalid API response. Read the resource before retrying a write.',
      { reason: 'victorops_invalid_response' }
    );
  return result.data;
};
const nonempty = (value: string, label: string) => {
  if (!value.trim()) throw createApiServiceError(`Provide ${label}.`);
  return value;
};
const identifier = (value: string) => {
  nonempty(value, 'a resource identifier');
  if (
    value === '.' ||
    value === '..' ||
    Array.from(value).some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    throw createApiServiceError('Provide a valid resource identifier.');
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('Provide a valid resource identifier.');
  }
};
const incidentNumber = (value: string) => {
  if (!/^\d+$/.test(value)) throw createApiServiceError('Provide a numeric incident number.');
  return value;
};
export const victoropsApiError = (error: unknown) => {
  const result = buildApiServiceError(error, {
    providerLabel: 'Splunk On-Call',
    reason: 'victorops_api_error',
    parent: createApiServiceError('The upstream Splunk On-Call request failed.', {
      upstreamStatus: getApiErrorStatus(error)
    }),
    formatMessage: ({ status }) =>
      `Splunk On-Call request failed${status ? ` (HTTP ${status})` : ''}. Check the API credentials, key permissions, resource and request fields. Rate-limited requests should be retried later; read back uncertain writes before retrying.`
  });
  const headers =
    isApiErrorRecord(error) && isApiErrorRecord(error.response)
      ? error.response.headers
      : undefined;
  const retryAfter = getResponseHeaderValue(headers, 'Retry-After');
  if (
    retryAfter !== undefined &&
    /^(?:\d+(?:\.\d+)?|[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT)$/.test(
      retryAfter
    )
  )
    result.data.retryAfter = retryAfter;
  return result;
};
const boundedNumber = (value: number | undefined, label: string, min: number, max: number) => {
  if (value !== undefined && (!Number.isFinite(value) || value < min || value > max))
    throw createApiServiceError(`Use ${label} between ${min} and ${max}.`);
};
const confirmIdentifier = (actual: string, expected: string) => {
  if (actual !== expected)
    throw createApiServiceError(
      'Splunk On-Call returned a different resource identifier. Read the target before retrying.'
    );
};
export type PolicyStep = { timeout: number; entries: Array<{ type: string; slug: string }> };
const policySteps = (steps: PolicyStep[], unit: 'seconds' | 'minutes' = 'seconds') => {
  if (!steps.length)
    throw createApiServiceError('Provide at least one escalation policy step.');
  return steps.map(step => {
    const timeout = unit === 'seconds' ? step.timeout / 60 : step.timeout;
    if (!Number.isSafeInteger(timeout) || timeout < 0)
      throw createApiServiceError(
        'Escalation timeouts must be nonnegative whole minutes. Legacy seconds must be divisible by 60; use timeoutUnit="minutes" for minute values.'
      );
    return {
      timeout,
      entries: step.entries.map(entry => {
        nonempty(entry.slug, 'an escalation target identifier');
        switch (entry.type) {
          case 'rotationGroup':
          case 'rotation_group':
            return { executionType: 'rotation_group', rotationGroup: { slug: entry.slug } };
          case 'rotation_group_next':
          case 'rotation_group_previous':
            return { executionType: entry.type, rotationGroup: { slug: entry.slug } };
          case 'user':
            return { executionType: 'user', user: { username: entry.slug } };
          case 'policy':
          case 'policy_routing':
            return {
              executionType: 'policy_routing',
              targetPolicy: { policySlug: entry.slug }
            };
          case 'email':
            return { executionType: 'email', email: { address: entry.slug } };
          case 'webhook':
            return { executionType: 'webhook', webhook: { slug: entry.slug } };
          default:
            throw createApiServiceError(
              'Use a documented escalation entry type: rotationGroup, user, policy, email, webhook, rotation_group_next or rotation_group_previous.'
            );
        }
      })
    };
  });
};
export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private lastRequest = 0;
  constructor(config: { apiId: string; token: string }) {
    for (const credential of [config.apiId, config.token]) {
      if (
        !credential.trim() ||
        /\s/.test(credential) ||
        Array.from(credential).some(
          character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
        )
      )
        throw createApiServiceError(
          'Provide valid API ID and API key credentials without whitespace or control characters.'
        );
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.victorops.com',
      headers: { 'X-VO-Api-Id': config.apiId, 'X-VO-Api-Key': config.token },
      timeout: 30_000,
      maxRedirects: 0,
      validateStatus: () => true,
      errorAdapter: victoropsApiError
    });
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    body?: unknown,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    // Internal read/modify/write sequences respect the documented two requests/second limit.
    const delay = 550 - (Date.now() - this.lastRequest);
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    this.lastRequest = Date.now();
    const response = await this.http.request({ method, url: path, data: body, params });
    if (response.status !== 200) throw victoropsApiError({ response });
    if (
      typeof response.data === 'object' &&
      response.data !== null &&
      'error' in response.data &&
      response.data.error
    )
      throw createApiServiceError(
        'Splunk On-Call rejected the operation. Check its fields and permissions; partial writes may require a readback.'
      );
    return response.data;
  }
  async listIncidents() {
    return parse(
      z.object({ incidents: z.array(incident) }),
      await this.request('get', '/api-public/v1/incidents')
    );
  }
  async getIncident(number: string) {
    const result = parse(
      incident,
      await this.request('get', `/api-public/v1/incidents/${incidentNumber(number)}`)
    );
    if (BigInt(result.incidentNumber) !== BigInt(number))
      throw createApiServiceError(
        'Splunk On-Call returned a different incident number. Read the target before retrying.'
      );
    return result;
  }
  async createIncident(data: {
    summary: string;
    details: string;
    userName: string;
    targets: Array<{ type: string; slug: string }>;
    isMultiResponder?: boolean;
  }) {
    nonempty(data.summary, 'an incident summary');
    nonempty(data.details, 'incident details');
    nonempty(data.userName, 'the creating username');
    if (!data.targets.length)
      throw createApiServiceError(
        'Provide at least one authorized incident target; creation pages responders.'
      );
    return parse(
      z.object({ incidentNumber: text.regex(/^\d+$/), error: optionalText }),
      await this.request('post', '/api-public/v1/incidents', pickDefined(data))
    );
  }
  private async action(
    path: string,
    data: { userName: string; incidentNames?: string[]; message?: string }
  ) {
    nonempty(data.userName, 'the acting username');
    if (data.incidentNames !== undefined && !data.incidentNames.length)
      throw createApiServiceError('Provide at least one incident number for this action.');
    for (const number of data.incidentNames ?? []) incidentNumber(number);
    const result = parse(
      z.object({
        results: z.array(
          z
            .object({ incidentNumber: text, cmdAccepted: z.boolean(), message: optionalText })
            .passthrough()
        )
      }),
      await this.request('patch', path, pickDefined(data))
    );
    if (
      result.results.some(result => !result.cmdAccepted) ||
      data.incidentNames?.some(
        number => !result.results.some(result => result.incidentNumber === number)
      )
    )
      throw createApiServiceError(
        'Splunk On-Call did not accept every incident action. Some incidents may have changed; read them before retrying.'
      );
    return result;
  }
  async acknowledgeIncidents(data: {
    userName: string;
    incidentNames: string[];
    message?: string;
  }) {
    return this.action('/api-public/v1/incidents/ack', data);
  }
  async resolveIncidents(data: {
    userName: string;
    incidentNames: string[];
    message?: string;
  }) {
    return this.action('/api-public/v1/incidents/resolve', data);
  }
  async acknowledgeUserIncidents(data: { userName: string; message?: string }) {
    return this.action('/api-public/v1/incidents/byUser/ack', data);
  }
  async resolveUserIncidents(data: { userName: string; message?: string }) {
    return this.action('/api-public/v1/incidents/byUser/resolve', data);
  }
  async rerouteIncidents(data: {
    userName: string;
    reroutes: Array<{
      incidentNames: string[];
      targets: Array<{ type: string; slug: string }>;
    }>;
  }) {
    nonempty(data.userName, 'the acting username');
    for (const reroute of data.reroutes) {
      if (!reroute.incidentNames.length || !reroute.targets.length)
        throw createApiServiceError(
          'Provide incident numbers and authorized reroute targets.'
        );
      for (const number of reroute.incidentNames) incidentNumber(number);
    }
    const result = parse(
      z.object({
        statuses: z.array(
          z
            .object({
              incidentNumber: text,
              success: z.boolean(),
              targetStatus: z.array(
                z.object({ slug: text, success: z.boolean() }).passthrough()
              )
            })
            .passthrough()
        )
      }),
      await this.request('post', '/api-public/v1/incidents/reroute', {
        userName: data.userName,
        reroutes: data.reroutes.flatMap(reroute =>
          reroute.incidentNames.map(number => ({
            incidentNumber: number,
            targets: reroute.targets
          }))
        )
      })
    );
    if (
      !result.statuses.length ||
      result.statuses.some(
        status => !status.success || status.targetStatus.some(target => !target.success)
      ) ||
      data.reroutes.some(reroute =>
        reroute.incidentNames.some(
          number =>
            !result.statuses.some(
              status =>
                status.incidentNumber === number &&
                reroute.targets.every(target =>
                  status.targetStatus.some(
                    actual => actual.slug === target.slug && actual.success
                  )
                )
            )
        )
      )
    )
      throw createApiServiceError(
        'Splunk On-Call did not accept every reroute target. Some incidents may have changed; read them before retrying.'
      );
    return { ...result, results: result.statuses };
  }
  async getIncidentNotes(number: string) {
    const body = await this.request(
      'get',
      `/api-public/v1/incidents/${incidentNumber(number)}/notes`
    );
    // The published GET schema is one note; also accept provider collections for existing accounts.
    if (Array.isArray(body)) return { notes: parse(z.array(note), body) };
    if (typeof body === 'object' && body !== null && 'notes' in body)
      return parse(z.object({ notes: z.array(note) }), body);
    return { notes: [parse(note, body)] };
  }
  async createIncidentNote(
    number: string,
    data: {
      content?: string;
      name?: string;
      displayName?: string;
      jsonValue?: Record<string, unknown>;
    }
  ) {
    if (data.content === undefined && data.jsonValue === undefined)
      throw createApiServiceError('Provide content or jsonValue for the note.');
    return parse(
      note,
      await this.request('post', `/api-public/v1/incidents/${incidentNumber(number)}/notes`, {
        name: data.name ?? crypto.randomUUID(),
        display_name: data.displayName ?? data.name ?? 'Incident note',
        json_value: data.jsonValue ?? { content: data.content }
      })
    );
  }
  async updateIncidentNote(
    number: string,
    name: string,
    data: { content?: string; displayName?: string; jsonValue?: Record<string, unknown> }
  ) {
    if (data.content === undefined && data.jsonValue === undefined)
      throw createApiServiceError('Provide content or jsonValue for the note.');
    const current = (await this.getIncidentNotes(number)).notes.find(
      note => note.name === name
    );
    if (!current) throw createApiServiceError('The named incident note was not found.');
    await this.request(
      'put',
      `/api-public/v1/incidents/${incidentNumber(number)}/notes/${identifier(name)}`,
      {
        name,
        display_name: data.displayName ?? current.displayName ?? name,
        json_value: data.jsonValue ?? { ...current.json_value, content: data.content }
      }
    );
    const updated = (await this.getIncidentNotes(number)).notes.find(
      note => note.name === name
    );
    if (!updated)
      throw createApiServiceError(
        'Splunk On-Call did not return the updated note. Read the incident before retrying.'
      );
    return updated;
  }
  async deleteIncidentNote(number: string, name: string) {
    await this.request(
      'delete',
      `/api-public/v1/incidents/${incidentNumber(number)}/notes/${identifier(name)}`
    );
  }
  async listUsers() {
    return parse(
      z.object({ users: z.array(user) }),
      await this.request('get', '/api-public/v2/user')
    );
  }
  async getUser(username: string) {
    return parse(
      user,
      await this.request('get', `/api-public/v1/user/${identifier(username)}`)
    );
  }
  async createUser(data: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    admin?: boolean;
    expirationHours?: number;
  }) {
    for (const [key, value] of Object.entries({
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      email: data.email
    }))
      nonempty(value, key);
    return parse(user, await this.request('post', '/api-public/v1/user', pickDefined(data)));
  }
  async updateUser(
    username: string,
    data: {
      firstName?: string;
      lastName?: string;
      username?: string;
      email?: string;
      admin?: boolean;
    }
  ) {
    if (!Object.values(data).some(value => value !== undefined))
      throw createApiServiceError('Provide at least one user field to update.');
    const current = await this.getUser(username);
    return parse(
      user,
      await this.request(
        'put',
        `/api-public/v1/user/${identifier(username)}`,
        pickDefined({
          firstName: data.firstName ?? current.firstName,
          lastName: data.lastName ?? current.lastName,
          username: data.username ?? current.username,
          email: data.email ?? current.email,
          admin: data.admin
        })
      )
    );
  }
  async deleteUser(username: string, replacement: string) {
    nonempty(replacement, 'a replacement username');
    await this.request('delete', `/api-public/v1/user/${identifier(username)}`, {
      replacement,
      replacementStrategy: 'specifiedUser'
    });
  }
  async listTeams() {
    return parse(z.array(team), await this.request('get', '/api-public/v1/team'));
  }
  async getTeam(slug: string) {
    const result = parse(
      team,
      await this.request('get', `/api-public/v1/team/${identifier(slug)}`)
    );
    confirmIdentifier(result.slug, slug);
    return result;
  }
  async createTeam(data: { name: string }) {
    nonempty(data.name, 'a team name');
    return parse(team, await this.request('post', '/api-public/v1/team', data));
  }
  async updateTeam(slug: string, data: { name: string }) {
    nonempty(data.name, 'a team name');
    return parse(
      team,
      await this.request('put', `/api-public/v1/team/${identifier(slug)}`, data)
    );
  }
  async deleteTeam(slug: string) {
    await this.request('delete', `/api-public/v1/team/${identifier(slug)}`);
  }
  async getTeamMembers(slug: string) {
    return parse(
      z.object({ members: z.array(z.object({ username: text }).passthrough()) }),
      await this.request('get', `/api-public/v1/team/${identifier(slug)}/members`)
    );
  }
  async addTeamMember(slug: string, username: string) {
    nonempty(username, 'the member username');
    return parse(
      z.object({ members: z.array(z.object({ username: text }).passthrough()) }),
      await this.request('post', `/api-public/v1/team/${identifier(slug)}/members`, {
        username
      })
    );
  }
  async removeTeamMember(slug: string, username: string, replacement: string) {
    nonempty(replacement, 'a replacement username');
    await this.request(
      'delete',
      `/api-public/v1/team/${identifier(slug)}/members/${identifier(username)}`,
      { replacement }
    );
  }
  async getTeamAdmins(slug: string) {
    return parse(
      z.object({ teamAdmins: z.array(z.object({ username: text }).passthrough()) }),
      await this.request('get', `/api-public/v1/team/${identifier(slug)}/admins`)
    );
  }
  async getCurrentOnCall() {
    return parse(
      z.object({ teamsOnCall: z.array(object) }),
      await this.request('get', '/api-public/v1/oncall/current')
    );
  }
  async getUserOnCallSchedule(username: string) {
    return parse(
      z.object({ teamSchedules: z.array(object) }).passthrough(),
      await this.request('get', `/api-public/v2/user/${identifier(username)}/oncall/schedule`)
    );
  }
  async getTeamOnCallSchedule(
    slug: string,
    params?: { daysForward?: number; daysSkip?: number; step?: number }
  ) {
    boundedNumber(params?.daysForward, 'daysForward', 0, 123);
    boundedNumber(params?.daysSkip, 'daysSkip', 0, 90);
    return parse(
      z.object({ team: object, schedules: z.array(object) }).passthrough(),
      await this.request(
        'get',
        `/api-public/v2/team/${identifier(slug)}/oncall/schedule`,
        undefined,
        pickDefined(params ?? {})
      )
    );
  }
  async createOnCallOverride(slug: string, data: { fromUser: string; toUser: string }) {
    nonempty(data.fromUser, 'the currently on-call username');
    nonempty(data.toUser, 'the takeover username');
    return parse(
      z.object({ result: text.min(1) }),
      await this.request(
        'patch',
        `/api-public/v1/policies/${identifier(slug)}/oncall/user`,
        data
      )
    );
  }
  async listEscalationPolicies() {
    return parse(
      z.object({ policies: z.array(policyInfo) }),
      await this.request('get', '/api-public/v1/policies')
    );
  }
  async getEscalationPolicy(slug: string) {
    const result = parse(
      policy,
      await this.request('get', `/api-public/v1/policies/${identifier(slug)}`)
    );
    confirmIdentifier(result.slug, slug);
    return result;
  }
  async getTeamEscalationPolicies(slug: string) {
    nonempty(slug, 'a team slug');
    const result = await this.listEscalationPolicies();
    return { policies: result.policies.filter(policy => policy.team.slug === slug) };
  }
  async createEscalationPolicy(data: {
    name: string;
    teamId: string;
    steps: PolicyStep[];
    timeoutUnit?: 'seconds' | 'minutes';
    ignoreCustomPagingPolicies?: boolean;
  }) {
    nonempty(data.name, 'a policy name');
    nonempty(data.teamId, 'a team slug');
    return parse(
      policy,
      await this.request(
        'post',
        '/api-public/v1/policies',
        pickDefined({
          name: data.name,
          teamSlug: data.teamId,
          steps: policySteps(data.steps, data.timeoutUnit),
          ignoreCustomPagingPolicies: data.ignoreCustomPagingPolicies
        })
      )
    );
  }
  async updateEscalationPolicy(
    slug: string,
    data: {
      steps: PolicyStep[];
      timeoutUnit?: 'seconds' | 'minutes';
      ignoreCustomPagingPolicies?: boolean;
    }
  ) {
    const steps = policySteps(data.steps, data.timeoutUnit);
    // PUT defaults the omitted paging flag to false; retain its current value for a steps-only update.
    const ignoreCustomPagingPolicies =
      data.ignoreCustomPagingPolicies ??
      (await this.getEscalationPolicy(slug)).ignoreCustomPagingPolicies;
    return parse(
      policy,
      await this.request('put', `/api-public/v1/policies/${identifier(slug)}`, {
        steps,
        ignoreCustomPagingPolicies
      })
    );
  }
  async deleteEscalationPolicy(slug: string) {
    await this.request('delete', `/api-public/v1/policies/${identifier(slug)}`);
  }
  async listRoutingKeys() {
    return parse(
      z.object({ routingKeys: z.array(routingKey) }),
      await this.request('get', '/api-public/v1/org/routing-keys')
    );
  }
  async createRoutingKey(data: {
    routingKey: string;
    targets: Array<{ policySlug: string; _type?: string }>;
  }) {
    nonempty(data.routingKey, 'a routing key name');
    const result = parse(
      z.object({ routingKey: text.min(1), targets: z.array(text) }),
      await this.request('post', '/api-public/v1/org/routing-keys', {
        routingKey: data.routingKey,
        targets: data.targets.map(target => nonempty(target.policySlug, 'a policy slug'))
      })
    );
    confirmIdentifier(result.routingKey, data.routingKey);
    return result;
  }
  async deleteRoutingKey(key: string) {
    const result = parse(
      z.object({ routingKey: text.min(1), result: text.min(1) }),
      await this.request('delete', `/api-public/v1/org/routing-keys/${identifier(key)}`)
    );
    confirmIdentifier(result.routingKey, key);
    return result;
  }
  async getTeamRotations(slug: string) {
    return parse(
      z.object({ rotationGroups: z.array(object) }),
      await this.request('get', `/api-public/v2/team/${identifier(slug)}/rotations`)
    );
  }
  async getMaintenanceMode() {
    return parse(maintenance, await this.request('get', '/api-public/v1/maintenancemode'));
  }
  async startMaintenanceMode(data: { names: string[]; purpose: string; type: string }) {
    nonempty(data.purpose, 'a maintenance purpose');
    return parse(
      maintenance,
      await this.request('post', '/api-public/v1/maintenancemode/start', data)
    );
  }
  async endMaintenanceMode(id: string) {
    await this.request('put', `/api-public/v1/maintenancemode/${identifier(id)}/end`);
  }
  async searchIncidentHistory(params?: {
    entityId?: string;
    incidentNumber?: string;
    startedAfter?: string;
    startedBefore?: string;
    host?: string;
    service?: string;
    currentPhase?: string;
    routingKey?: string;
    offset?: number;
    limit?: number;
  }) {
    boundedNumber(params?.offset, 'offset', 0, Number.MAX_SAFE_INTEGER);
    if (
      params?.limit !== undefined &&
      (!Number.isFinite(params.limit) || params.limit <= 0 || params.limit > 100)
    )
      throw createApiServiceError(
        'Use a history limit greater than 0 and no greater than 100.'
      );
    const aliases: Record<string, string> = {
      UNACKED: 'triggered',
      ACKED: 'acknowledged',
      RESOLVED: 'resolved'
    };
    const phase = params?.currentPhase
      ?.split(',')
      .map(value => aliases[value.trim()] ?? value.trim())
      .join(',');
    return parse(
      z.object({
        incidents: z.array(incident),
        offset: z.number().int().nonnegative().optional(),
        limit: z.number().int().nonnegative().optional(),
        total: z.number().int().nonnegative().optional()
      }),
      await this.request(
        'get',
        '/api-reporting/v2/incidents',
        undefined,
        pickDefined({ ...params, currentPhase: phase })
      )
    );
  }
  async getTeamShiftLog(
    slug: string,
    params?: { start?: string; end?: string; userName?: string }
  ) {
    return parse(
      z
        .object({ teamSlug: text, start: text, end: text, userLogs: z.array(object) })
        .passthrough(),
      await this.request(
        'get',
        `/api-reporting/v1/team/${identifier(slug)}/oncall/log`,
        undefined,
        pickDefined(params ?? {})
      )
    );
  }
  async sendChatMessage(data: {
    username: string;
    text: string;
    monitoringTool?: string;
    externalUsername?: string;
    incidentId?: number;
    tags?: string[];
  }) {
    nonempty(data.username, 'the sender username');
    nonempty(data.text, 'message text');
    if (!data.monitoringTool?.trim())
      throw createApiServiceError(
        'Provide the monitoringTool value registered for the chat integration.'
      );
    const result = await this.request(
      'post',
      '/api-public/v1/chat',
      pickDefined({ ...data, externalUsername: data.externalUsername ?? data.username })
    );
    return result ?? { sent: true };
  }
  async listChatMessages(params?: { incidentId?: number; limit?: number; offset?: number }) {
    const result = parse(
      z.object({
        messages: z.array(
          z
            .object({
              username: text,
              text: text,
              serviceTime: z.number().int(),
              sequence: z.number().int(),
              tags: z.array(text).optional()
            })
            .passthrough()
        ),
        hasMore: z.boolean()
      }),
      await this.request('get', '/api-public/v1/chat', undefined, pickDefined(params ?? {}))
    );
    if (result.hasMore && !result.messages.length)
      throw createApiServiceError(
        'Splunk On-Call returned an empty chat page with more results. Retry the read later rather than advancing past unseen messages.'
      );
    return result;
  }
}
