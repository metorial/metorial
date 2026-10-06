import { createApiServiceError, getResponseHeaderValue, pickDefined } from 'slates';
import type { JumpCloudAuth } from '../auth';
import { httpClient } from './http';
import type {
  Association,
  AssociationRequest,
  JumpCloudApplication,
  JumpCloudCommand,
  JumpCloudCommandResult,
  JumpCloudEvent,
  JumpCloudGroup,
  JumpCloudSystem,
  JumpCloudUser,
  PaginatedResponse
} from './types';
import { credential, identifier, protect, record, region, regions, whole } from './validation';

type Parameters = {
  limit?: number;
  skip?: number;
  sort?: string;
  filter?: string;
  fields?: string;
};
export type ClientOptions = JumpCloudAuth & { orgId?: string; requestSecrets?: string[] };
const sourcePaths = {
  user: 'users',
  user_group: 'usergroups',
  system: 'systems',
  system_group: 'systemgroups'
} as const;
const userTargets = [
  'active_directory',
  'application',
  'g_suite',
  'idp_routing_policy',
  'ldap_server',
  'office_365',
  'password_manager_item',
  'policy',
  'policy_group',
  'radius_server',
  'system',
  'system_group'
];
const targets = {
  user: userTargets,
  user_group: userTargets,
  system: ['command', 'policy', 'policy_group', 'user', 'user_group'],
  system_group: ['command', 'policy', 'policy_group', 'radius_server', 'user', 'user_group']
} as const;
const groupFields = [
  'name',
  'description',
  'email',
  'attributes',
  'memberQuery',
  'membershipMethod',
  'memberSuggestionsNotify',
  'memberQueryExemptions'
];
const commandFields = [
  'command',
  'commandRunners',
  'commandTarget',
  'targetOrganizationId',
  'commandType',
  'files',
  'launchType',
  'listensTo',
  'name',
  'schedule',
  'scheduleRepeatType',
  'sudo',
  'template',
  'timeout',
  'trigger',
  'user',
  'shell',
  'timeToLiveSeconds',
  'scheduleYear',
  'filesS3',
  'description',
  'aiGenerated',
  'templatingRequired',
  'managedBy'
];
function selected(value: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(
    keys.filter(key => value[key] !== undefined).map(key => [key, value[key]])
  );
}
function eventCursor(value: unknown): string {
  const fail = () => {
    throw createApiServiceError(
      'Pass a bounded native searchAfter array from the same organization, service and time query.'
    );
  };
  if (!Array.isArray(value) || value.length > 8) fail();
  let nodes = 0;
  const seen = new Set<object>();
  function canonical(item: unknown, depth: number): unknown {
    if (++nodes > 512 || depth > 16) fail();
    if (item === null || typeof item === 'boolean') return item;
    if (typeof item === 'string' && item.length <= 4096) return item;
    if (typeof item === 'number' && Number.isFinite(item)) return item;
    if (item && typeof item === 'object') {
      if (seen.has(item)) fail();
      seen.add(item);
      if (Array.isArray(item)) return item.map(child => canonical(child, depth + 1));
      if (![Object.prototype, null].includes(Object.getPrototypeOf(item))) fail();
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, child]) => {
            if (key.length > 4096) fail();
            return [key, canonical(child, depth + 1)];
          })
      );
    }
    return fail();
  }
  const serialized = JSON.stringify(canonical(value, 0));
  if (serialized.length > 32768) fail();
  return serialized;
}
function nonempty(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim())
    throw createApiServiceError(`${label} is required.`);
}
function pageParams(params: Parameters = {}, defaults = 100, fields?: string[]) {
  const limit = params.limit ?? defaults,
    skip = params.skip ?? 0;
  whole(limit, 1, 100, 'Limit');
  whole(skip, 0, Number.MAX_SAFE_INTEGER, 'Skip');
  for (const value of [params.filter, params.sort, params.fields])
    if (
      value !== undefined &&
      (value.length > 4096 || [...value].some(c => c.charCodeAt(0) < 32))
    )
      throw createApiServiceError(
        'Query text exceeds the supported bound or contains control characters.'
      );
  return {
    ...pickDefined({
      ...params,
      fields:
        params.fields && fields
          ? [...new Set([...params.fields.split(','), ...fields])].join(',')
          : params.fields
    }),
    limit,
    skip
  };
}
function entity<T extends object>(
  value: unknown,
  idKey: string,
  expected?: string,
  required: string[] = []
): T {
  const row = record(value, 'resource receipt');
  identifier(row[idKey], 'Native resource ID');
  if (expected && row[idKey] !== expected)
    throw createApiServiceError(
      'JumpCloud returned a different resource identity. Reconcile any changed state before retrying.'
    );
  for (const key of required) nonempty(row[key], `Native ${key}`);
  return Object.fromEntries(
    Object.entries(row).filter(
      ([key, value]) =>
        value !== null ||
        [
          'attributes',
          'memberQuery',
          'memberQueryExemptions',
          'memberSuggestionsNotify',
          'membershipMethod'
        ].includes(key)
    )
  ) as T;
}
export function clientFor(ctx: {
  auth: JumpCloudAuth;
  config: Record<string, unknown>;
  input: { orgId?: string; [key: string]: unknown };
}) {
  const stored = ctx.auth.orgId;
  const requested = ctx.input.orgId;
  if (stored && requested && stored !== requested)
    throw createApiServiceError(
      'This connection is fixed to another organization; reconnect or use that authorized organization.'
    );
  const fallback = ctx.config.orgId;
  const orgId = stored ?? requested ?? fallback;
  if (orgId !== undefined) identifier(orgId, 'Organization ID');
  protect(ctx.input, [ctx.auth.token]);
  return new Client({
    ...ctx.auth,
    orgId,
    requestSecrets: typeof ctx.input.password === 'string' ? [ctx.input.password] : []
  });
}
export class Client {
  didWrite = false;
  readonly options: ClientOptions;
  constructor(options: ClientOptions) {
    credential(options.token);
    if (options.orgId !== undefined) identifier(options.orgId, 'Organization ID');
    if (
      options.expiresAt &&
      (Number.isNaN(Date.parse(options.expiresAt)) ||
        Date.parse(options.expiresAt) <= Date.now())
    )
      throw createApiServiceError(
        'The JumpCloud token expired; renew or reconnect the original service account.'
      );
    this.options = { ...options, region: region(options.region) };
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    api: 'v1' | 'v2' | 'insights',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    const domain = regions[region(this.options.region)];
    const baseURL =
      api === 'insights'
        ? `https://api.${domain}/insights/directory/v1`
        : `https://console.${domain}/api${api === 'v2' ? '/v2' : ''}`;
    const write = method !== 'GET' && api !== 'insights';
    if (write) this.didWrite = true;
    const client = httpClient({
      baseURL,
      token: this.options.token,
      bearer: this.options.authType === 'service_account',
      orgId: this.options.orgId,
      secrets: [this.options.token, ...(this.options.requestSecrets ?? [])]
    });
    const response = await client.request<unknown>({ method, url: path, data, params });
    const expected = method === 'GET' || api === 'insights' ? [200] : [200, 201, 204];
    if (!expected.includes(response.status))
      throw createApiServiceError(
        'JumpCloud returned an unexpected status; reconcile any action before retrying.'
      );
    protect(response.data, [this.options.token, ...(this.options.requestSecrets ?? [])]);
    return response;
  }
  private bound<T extends object>(
    data: unknown,
    idKey: string,
    id?: string,
    required: string[] = []
  ): T {
    const row = entity<T>(data, idKey, id, required);
    const values = row as Record<string, unknown>;
    const org = values.organization ?? values.organizationObjectId;
    if (org !== undefined && this.options.orgId && org !== this.options.orgId)
      throw createApiServiceError('JumpCloud returned a resource from another organization.');
    return row;
  }
  private async list<T extends object>(
    path: string,
    params: Parameters,
    idKey: string,
    required: string[] = []
  ) {
    const p = pageParams(params, 100, [idKey, ...required]);
    const r = await this.request('GET', 'v1', path, undefined, p);
    const envelope = record(r.data, 'native page');
    if (!Array.isArray(envelope.results))
      throw createApiServiceError('JumpCloud returned an invalid native results page.');
    whole(envelope.totalCount, 0, Number.MAX_SAFE_INTEGER, 'Native total count');
    if (
      envelope.results.length > p.limit ||
      envelope.totalCount < envelope.results.length ||
      (envelope.results.length > 0 && envelope.totalCount < p.skip + envelope.results.length)
    )
      throw createApiServiceError('JumpCloud returned inconsistent page counts.');
    const results = envelope.results.map(v => this.bound<T>(v, idKey, undefined, required));
    if (
      new Set(results.map(v => (v as Record<string, unknown>)[idKey])).size !== results.length
    )
      throw createApiServiceError('JumpCloud returned repeated resource IDs in one page.');
    return { results, totalCount: envelope.totalCount } as PaginatedResponse<T>;
  }
  listUsers(p: Parameters = {}) {
    return this.list<JumpCloudUser>('/systemusers', p, '_id', ['username', 'email']);
  }
  listSystems(p: Parameters = {}) {
    return this.list<JumpCloudSystem>('/systems', p, '_id');
  }
  listCommands(p: Parameters = {}) {
    return this.list<JumpCloudCommand>('/commands', p, '_id', [
      'name',
      'command',
      'commandType'
    ]);
  }
  listCommandResults(p: Parameters = {}) {
    return this.list<JumpCloudCommandResult>(
      '/commandresults',
      { ...p, limit: p.limit ?? 50 },
      '_id',
      ['command', 'name', 'systemId']
    );
  }
  listApplications(p: Parameters = {}) {
    return this.list<JumpCloudApplication>('/applications', p, '_id');
  }
  listOrganizations(p: Parameters = {}) {
    return this.list<{ _id: string; displayName: string }>('/organizations', p, '_id', [
      'displayName'
    ]);
  }
  async getUser(id: string) {
    identifier(id);
    return this.bound<JumpCloudUser>(
      (await this.request('GET', 'v1', `/systemusers/${encodeURIComponent(id)}`)).data,
      '_id',
      id,
      ['username', 'email']
    );
  }
  async createUser(data: Record<string, unknown>) {
    nonempty(data.username, 'Username');
    nonempty(data.email, 'Email');
    return this.bound<JumpCloudUser>(
      (await this.request('POST', 'v1', '/systemusers', pickDefined(data))).data,
      '_id',
      undefined,
      ['username', 'email']
    );
  }
  async updateUser(id: string, data: Record<string, unknown>) {
    identifier(id);
    if (data.password !== undefined)
      throw createApiServiceError(
        'The password field is supported only when creating a user; omit it for update.'
      );
    if (!Object.keys(data).length)
      throw createApiServiceError('Supply a user field to update.');
    return this.bound<JumpCloudUser>(
      (await this.request('PUT', 'v1', `/systemusers/${encodeURIComponent(id)}`, data)).data,
      '_id',
      id,
      ['username', 'email']
    );
  }
  async deleteUser(id: string) {
    identifier(id);
    return this.bound<JumpCloudUser>(
      (await this.request('DELETE', 'v1', `/systemusers/${encodeURIComponent(id)}`)).data,
      '_id',
      id,
      ['username', 'email']
    );
  }
  async resetUserMfa(id: string) {
    identifier(id);
    await this.request('POST', 'v1', `/systemusers/${encodeURIComponent(id)}/resetmfa`);
  }
  async unlockUser(id: string) {
    identifier(id);
    await this.request('POST', 'v1', `/systemusers/${encodeURIComponent(id)}/unlock`);
  }
  async getSystem(id: string) {
    identifier(id);
    return this.bound<JumpCloudSystem>(
      (await this.request('GET', 'v1', `/systems/${encodeURIComponent(id)}`)).data,
      '_id',
      id
    );
  }
  async updateSystem(id: string, data: Record<string, unknown>) {
    identifier(id);
    if (!Object.keys(data).length)
      throw createApiServiceError('Supply a system field to update.');
    return this.bound<JumpCloudSystem>(
      (await this.request('PUT', 'v1', `/systems/${encodeURIComponent(id)}`, data)).data,
      '_id',
      id
    );
  }
  async deleteSystem(id: string) {
    identifier(id);
    return this.bound<JumpCloudSystem>(
      (await this.request('DELETE', 'v1', `/systems/${encodeURIComponent(id)}`)).data,
      '_id',
      id
    );
  }
  async getOrganization(id: string) {
    identifier(id);
    if (this.options.orgId && id !== this.options.orgId)
      throw createApiServiceError('This connection is fixed to another organization.');
    return this.bound<{
      _id: string;
      displayName: string;
      created?: string;
      provider?: string;
    }>(
      (await this.request('GET', 'v1', `/organizations/${encodeURIComponent(id)}`)).data,
      '_id',
      id,
      ['displayName']
    );
  }
  private async groups(kind: 'user' | 'system', p: Parameters) {
    const params = pageParams(p);
    const result = (await this.request('GET', 'v2', `/${kind}groups`, undefined, params)).data;
    if (!Array.isArray(result) || result.length > params.limit)
      throw createApiServiceError('JumpCloud returned an invalid group page.');
    return result.map(v => this.bound<JumpCloudGroup>(v, 'id', undefined, ['name']));
  }
  listUserGroups(p: Parameters = {}) {
    return this.groups('user', p);
  }
  listSystemGroups(p: Parameters = {}) {
    return this.groups('system', p);
  }
  private async group(kind: 'user' | 'system', id: string) {
    identifier(id);
    return this.bound<JumpCloudGroup>(
      (await this.request('GET', 'v2', `/${kind}groups/${encodeURIComponent(id)}`)).data,
      'id',
      id,
      ['name']
    );
  }
  getUserGroup(id: string) {
    return this.group('user', id);
  }
  getSystemGroup(id: string) {
    return this.group('system', id);
  }
  private async createGroup(kind: 'user' | 'system', data: Record<string, unknown>) {
    nonempty(data.name, 'Group name');
    return this.bound<JumpCloudGroup>(
      (await this.request('POST', 'v2', `/${kind}groups`, pickDefined(data))).data,
      'id',
      undefined,
      ['name']
    );
  }
  createUserGroup(data: Record<string, unknown>) {
    return this.createGroup('user', data);
  }
  createSystemGroup(data: Record<string, unknown>) {
    return this.createGroup('system', data);
  }
  private async updateGroup(
    kind: 'user' | 'system',
    id: string,
    data: Record<string, unknown>
  ) {
    identifier(id);
    if (!Object.keys(data).length)
      throw createApiServiceError('Supply a group field to update.');
    const current = await this.group(kind, id);
    const body = { ...selected(current, groupFields), ...data };
    nonempty(body.name, 'Group name');
    return this.bound<JumpCloudGroup>(
      (await this.request('PUT', 'v2', `/${kind}groups/${encodeURIComponent(id)}`, body)).data,
      'id',
      id,
      ['name']
    );
  }
  updateUserGroup(id: string, data: Record<string, unknown>) {
    return this.updateGroup('user', id, data);
  }
  updateSystemGroup(id: string, data: Record<string, unknown>) {
    return this.updateGroup('system', id, data);
  }
  private async deleteGroup(kind: 'user' | 'system', id: string) {
    identifier(id);
    const r = await this.request('DELETE', 'v2', `/${kind}groups/${encodeURIComponent(id)}`);
    if (r.status !== 204) this.bound<JumpCloudGroup>(r.data, 'id', id, ['name']);
  }
  deleteUserGroup(id: string) {
    return this.deleteGroup('user', id);
  }
  deleteSystemGroup(id: string) {
    return this.deleteGroup('system', id);
  }
  private async connections(path: string, p: Parameters, target?: string) {
    const params = pageParams(p);
    const result = (
      await this.request('GET', 'v2', path, undefined, {
        ...params,
        ...(target ? { targets: target } : {})
      })
    ).data;
    if (!Array.isArray(result) || result.length > params.limit)
      throw createApiServiceError('JumpCloud returned an invalid relationship page.');
    return result.map(v => {
      const row = record(v, 'relationship');
      const to = record(row.to, 'relationship target');
      identifier(to.id, 'Native target ID');
      identifier(to.type, 'Native target type');
      if (target && to.type !== target)
        throw createApiServiceError(
          'JumpCloud returned a relationship outside the requested target type.'
        );
      return row as unknown as Association;
    });
  }
  listUserGroupMembers(id: string, p: Parameters = {}) {
    identifier(id);
    return this.connections(`/usergroups/${encodeURIComponent(id)}/members`, p, 'user');
  }
  listSystemGroupMembers(id: string, p: Parameters = {}) {
    identifier(id);
    return this.connections(`/systemgroups/${encodeURIComponent(id)}/members`, p, 'system');
  }
  async manageUserGroupMembers(
    id: string,
    body: { op: 'add' | 'remove'; type: 'user'; id: string }
  ) {
    identifier(id);
    identifier(body.id, 'Member ID');
    await this.request('POST', 'v2', `/usergroups/${encodeURIComponent(id)}/members`, body);
  }
  async manageSystemGroupMembers(
    id: string,
    body: { op: 'add' | 'remove'; type: 'system'; id: string }
  ) {
    identifier(id);
    identifier(body.id, 'Member ID');
    await this.request('POST', 'v2', `/systemgroups/${encodeURIComponent(id)}/members`, body);
  }
  private target(source: keyof typeof sourcePaths, target: string) {
    if (!(targets[source] as readonly string[]).includes(target))
      throw createApiServiceError(
        'That target type is not supported for this source. Use a documented native association type.'
      );
  }
  listAssociations(
    source: keyof typeof sourcePaths,
    id: string,
    target: string,
    p: Parameters = {}
  ) {
    identifier(id);
    this.target(source, target);
    return this.connections(
      `/${sourcePaths[source]}/${encodeURIComponent(id)}/associations`,
      p,
      target
    );
  }
  async manageAssociation(
    source: keyof typeof sourcePaths,
    id: string,
    body: AssociationRequest
  ) {
    identifier(id);
    identifier(body.id, 'Target ID');
    this.target(source, body.type);
    if (
      body.attributes &&
      !(
        (source === 'user' && ['system', 'system_group'].includes(body.type)) ||
        (source === 'system' && ['user', 'user_group'].includes(body.type))
      )
    )
      throw createApiServiceError(
        'Sudo attributes are supported only by native user/system association routes; omit them for this source and target.'
      );
    await this.request(
      'POST',
      'v2',
      `/${sourcePaths[source]}/${encodeURIComponent(id)}/associations`,
      body
    );
  }
  getUserAssociations(id: string, target: string, p: Parameters = {}) {
    return this.listAssociations('user', id, target, p);
  }
  listUserGroupAssociations(id: string, target: string, p: Parameters = {}) {
    return this.listAssociations('user_group', id, target, p);
  }
  getSystemAssociations(id: string, target: string, p: Parameters = {}) {
    return this.listAssociations('system', id, target, p);
  }
  manageUserAssociations(id: string, b: AssociationRequest) {
    return this.manageAssociation('user', id, b);
  }
  manageUserGroupAssociations(id: string, b: AssociationRequest) {
    return this.manageAssociation('user_group', id, b);
  }
  manageSystemAssociations(id: string, b: AssociationRequest) {
    return this.manageAssociation('system', id, b);
  }
  manageSystemGroupAssociations(id: string, b: AssociationRequest) {
    return this.manageAssociation('system_group', id, b);
  }
  async getCommand(id: string) {
    identifier(id);
    return this.bound<JumpCloudCommand>(
      (await this.request('GET', 'v1', `/commands/${encodeURIComponent(id)}`)).data,
      '_id',
      id,
      ['name', 'command', 'commandType']
    );
  }
  private commandData(data: Record<string, unknown>) {
    if (Array.isArray(data.systems) && data.systems.length)
      throw createApiServiceError(
        'The native command payload ignores systems. Omit systems and explicitly bind devices with manage_associations using sourceType system and targetType command.'
      );
    const body = selected(data, commandFields);
    for (const key of ['name', 'command', 'commandType']) nonempty(body[key], key);
    if (['linux', 'mac'].includes(String(body.commandType)))
      identifier(body.user, 'Run-as system-user ID');
    if (body.timeout !== undefined) {
      const n = Number(body.timeout);
      whole(n, 1, 86400, 'Command timeout');
    }
    return body;
  }
  async createCommand(data: Record<string, unknown>) {
    const body = this.commandData(data);
    return this.bound<JumpCloudCommand>(
      (await this.request('POST', 'v1', '/commands', body)).data,
      '_id',
      undefined,
      ['name', 'command', 'commandType']
    );
  }
  async updateCommand(id: string, data: Record<string, unknown>) {
    identifier(id);
    if (!Object.keys(data).length)
      throw createApiServiceError('Supply a command field to update.');
    const current = await this.getCommand(id);
    const body = this.commandData({ ...selected(current, commandFields), ...data });
    return this.bound<JumpCloudCommand>(
      (await this.request('PUT', 'v1', `/commands/${encodeURIComponent(id)}`, body)).data,
      '_id',
      id,
      ['name', 'command', 'commandType']
    );
  }
  async deleteCommand(id: string) {
    identifier(id);
    return this.bound<JumpCloudCommand>(
      (await this.request('DELETE', 'v1', `/commands/${encodeURIComponent(id)}`)).data,
      '_id',
      id,
      ['name', 'command', 'commandType']
    );
  }
  async runCommandByTrigger(name: string, data: Record<string, unknown> = {}) {
    identifier(name, 'Trigger name');
    const r = record(
      (await this.request('POST', 'v1', `/command/trigger/${encodeURIComponent(name)}`, data))
        .data,
      'command trigger receipt'
    );
    if (typeof r.triggered !== 'boolean')
      throw createApiServiceError(
        'JumpCloud returned an unusable trigger receipt; execution may have been requested. Reconcile command results and do not retry blindly.'
      );
    return { triggered: r.triggered };
  }
  async getCommandResult(id: string) {
    identifier(id);
    return this.bound<JumpCloudCommandResult>(
      (await this.request('GET', 'v1', `/commandresults/${encodeURIComponent(id)}`)).data,
      '_id',
      id,
      ['command', 'name', 'systemId']
    );
  }
  async getApplication(id: string) {
    identifier(id);
    return this.bound<JumpCloudApplication>(
      (await this.request('GET', 'v1', `/applications/${encodeURIComponent(id)}`)).data,
      '_id',
      id
    );
  }
  async queryEvents(p: {
    service: string[];
    startTime: string;
    endTime?: string;
    limit?: number;
    searchAfter?: unknown;
    q?: string;
  }) {
    if (!p.service.length || p.service.length > 32)
      throw createApiServiceError('Supply one or more native event services.');
    const services = [
      'alerts',
      'all',
      'directory',
      'ldap',
      'mdm',
      'notifications',
      'object_storage',
      'password_manager',
      'password_vault',
      'pam',
      'radius',
      'reports',
      'saas_app_management',
      'software',
      'sso',
      'systems',
      'access_management',
      'asset_management',
      'workflows',
      'access_certification',
      'genai',
      'aigw',
      'ai_admin',
      'adbridge_user',
      'generic_di'
    ];
    if (p.service.some(v => !services.includes(v)))
      throw createApiServiceError(
        'Use a service listed in the current Directory Insights API.'
      );
    for (const time of [p.startTime, p.endTime])
      if (
        time !== undefined &&
        (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(time) ||
          Number.isNaN(Date.parse(time)))
      )
        throw createApiServiceError('Use RFC3339 UTC timestamps ending in Z.');
    if (p.endTime && Date.parse(p.endTime) < Date.parse(p.startTime))
      throw createApiServiceError('End time must not precede start time.');
    const limit = p.limit ?? 100;
    whole(limit, 1, 10000, 'Event limit');
    const previousCursor =
      p.searchAfter === undefined ? undefined : eventCursor(p.searchAfter);
    const response = await this.request(
      'POST',
      'insights',
      '/events',
      pickDefined({
        service: p.service,
        start_time: p.startTime,
        end_time: p.endTime,
        limit,
        search_after: p.searchAfter,
        q: p.q
      })
    );
    if (!Array.isArray(response.data))
      throw createApiServiceError('JumpCloud returned an invalid event page.');
    for (const event of response.data) {
      const row = record(event, 'event');
      if (
        this.options.orgId &&
        row.organization !== undefined &&
        row.organization !== this.options.orgId
      )
        throw createApiServiceError(
          'Directory Insights returned an event for another organization.'
        );
    }
    const count = Number(getResponseHeaderValue(response.headers, 'x-result-count')),
      nativeLimit = Number(getResponseHeaderValue(response.headers, 'x-limit'));
    whole(count, 0, 10000, 'Native result count');
    whole(nativeLimit, 1, 10000, 'Native page limit');
    if (count !== response.data.length || nativeLimit !== limit || count > nativeLimit)
      throw createApiServiceError(
        'Directory Insights returned inconsistent native paging headers.'
      );
    let searchAfter: unknown;
    const header = getResponseHeaderValue(response.headers, 'x-search_after');
    if (header !== undefined) {
      try {
        searchAfter = JSON.parse(header);
      } catch {
        throw createApiServiceError(
          'Directory Insights returned an unusable continuation cursor.'
        );
      }
      eventCursor(searchAfter);
    }
    if (count === nativeLimit && (!Array.isArray(searchAfter) || searchAfter.length === 0))
      throw createApiServiceError(
        'Directory Insights omitted the continuation cursor for a full page.'
      );
    if (
      count === nativeLimit &&
      previousCursor !== undefined &&
      eventCursor(searchAfter) === previousCursor
    )
      throw createApiServiceError(
        'Directory Insights repeated the full-page continuation cursor; stop paging and reconcile the query.'
      );
    return {
      events: response.data as JumpCloudEvent[],
      searchAfter,
      hasMore: count === nativeLimit
    };
  }
}
