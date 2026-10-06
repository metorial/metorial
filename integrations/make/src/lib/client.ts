import { createAuthenticatedAxios, pickDefined, requestAxios } from 'slates';
import { privateReceipt, serviceFailure, tokenValue } from './http';
import {
  count,
  execution,
  id,
  input,
  invalid,
  key,
  malformed,
  nativeConnection,
  nativeHook,
  nativeLog,
  nativeOrganization,
  nativeRecord,
  nativeScenario,
  nativeStore,
  nativeStructure,
  nativeTeam,
  nativeUser,
  paging,
  parse,
  record,
  recordPage,
  z,
  zone
} from './schemas';

export interface MakeClientConfig {
  token: string;
  refreshToken?: string;
  zoneUrl?: string;
  authMode?: 'oauth' | 'api_token';
  userId?: number;
}
export function resolveZone(saved: unknown, legacy: unknown, requested?: unknown) {
  const bindings = [saved, requested, legacy]
    .filter(value => value !== undefined)
    .map(value => input(zone, value, 'Choose a documented Make regional host.'));
  if (new Set(bindings).size > 1)
    throw invalid(
      'The saved, requested, or legacy Make regions differ. Use matching regional settings before connecting or using this connection.'
    );
  return bindings[0] ?? 'eu1.make.com';
}
export const clientFor = (ctx: {
  auth: MakeClientConfig;
  config: Record<string, unknown>;
}) => {
  return new MakeClient({
    ...ctx.auth,
    zoneUrl: resolveZone(ctx.auth.zoneUrl, ctx.config.zoneUrl)
  });
};
export const exactId = (value: unknown, label: string) =>
  input(
    id,
    value,
    `${label} must be a positive safe integer. Use the corresponding list tool to discover the exact ID.`
  );
const nonempty = (value: unknown, label: string, max = 128) =>
  input(
    z.string().min(1).max(max),
    value,
    `${label} is required and must be at most ${max} characters.`
  );
export function container(value: { teamId?: number; organizationId?: number }) {
  if ((value.teamId !== undefined) === (value.organizationId !== undefined))
    throw invalid(
      'Provide exactly one teamId or organizationId. Call list_organizations, then list_teams to discover authorized IDs.'
    );
  if (value.teamId !== undefined) exactId(value.teamId, 'teamId');
  if (value.organizationId !== undefined) exactId(value.organizationId, 'organizationId');
}
export function pageParams(
  value: { limit?: number; offset?: number; sortBy?: string; sortDir?: string } = {}
) {
  return pickDefined({
    'pg[limit]': input(
      z.number().int().safe().min(1).max(1000),
      value.limit ?? 100,
      'limit must be an integer from 1 to 1000.'
    ),
    'pg[offset]': input(
      count,
      value.offset ?? 0,
      'offset must be a nonnegative safe integer.'
    ),
    'pg[sortBy]': value.sortBy,
    'pg[sortDir]': value.sortDir
  });
}
function jsonObject(value: unknown, label: string): Record<string, unknown> {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    if (Buffer.byteLength(value) > 8 * 1024 * 1024)
      throw invalid(`${label} exceeds the 8 MiB request bound.`);
    try {
      parsed = JSON.parse(value);
    } catch {
      throw invalid(`${label} must be a valid JSON object.`);
    }
  }
  const result = input(record, parsed, `${label} must be a JSON object.`);
  if (Buffer.byteLength(JSON.stringify(result)) > 8 * 1024 * 1024)
    throw invalid(`${label} exceeds the 8 MiB request bound.`);
  return result;
}
const safeCounter = z.union([count, z.string().regex(/^\d+$/)]);
const usage = z
  .object({
    data: z
      .array(
        z
          .object({
            date: z.string(),
            operations: count.optional(),
            dataTransfer: count.optional(),
            centicredits: safeCounter.optional()
          })
          .passthrough()
      )
      .max(32)
  })
  .passthrough();
export class MakeClient {
  readonly token: string;
  readonly zoneUrl: z.output<typeof zone>;
  readonly authMode: 'oauth' | 'api_token';
  readonly secrets: Record<string, unknown>;
  readonly userId?: number;
  constructor(config: MakeClientConfig) {
    this.token = tokenValue(config.token);
    this.zoneUrl = input(
      zone,
      config.zoneUrl ?? 'eu1.make.com',
      'Choose a documented Make regional host.'
    );
    this.authMode = input(
      z.enum(['oauth', 'api_token']),
      config.authMode ?? 'api_token',
      'Reconnect with a supported authentication method.'
    );
    this.userId =
      config.userId === undefined ? undefined : exactId(config.userId, 'Saved userId');
    this.secrets = { token: this.token, refreshToken: config.refreshToken };
  }
  async request<T extends z.ZodType>(
    shape: T,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    const http = createAuthenticatedAxios({
      baseURL: `https://${this.zoneUrl}/api/v2`,
      authHeader: { value: `${this.authMode === 'oauth' ? 'Bearer' : 'Token'} ${this.token}` },
      timeout: 60000,
      maxRedirects: 0,
      maxContentLength: 32 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024
    });
    const response = await requestAxios(
      'Make request',
      () =>
        http.request<unknown>({
          method,
          url: path,
          data,
          params: params ? pickDefined(params) : undefined,
          paramsSerializer: {
            serialize: values => {
              const query = new URLSearchParams();
              for (const [k, v] of Object.entries(values))
                for (const item of Array.isArray(v) ? v : [v])
                  if (item !== undefined) query.append(k, String(item));
              return query.toString();
            }
          }
        }),
      serviceFailure
    );
    if (response.status !== 200) throw malformed();
    privateReceipt(this.secrets, response.data);
    return parse(shape, response.data);
  }
  async page<K extends string, T extends z.ZodType>(
    name: K,
    shape: T,
    path: string,
    params: Record<string, unknown>
  ) {
    const response = await this.request(record, 'GET', path, undefined, params);
    const rows = parse(z.array(shape).max(1000), response[name]);
    const pg = response.pg === undefined ? undefined : parse(paging, response.pg);
    return { [name]: rows, pg } as Record<K, z.output<T>[]> & { pg?: z.output<typeof paging> };
  }
  async exact<K extends string, T extends z.ZodType>(
    name: K,
    shape: T,
    path: string,
    expectedId: number,
    method: 'GET' | 'POST' | 'PATCH' = 'GET',
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    const response = await this.request(record, method, path, data, params);
    const row = parse(shape, response[name]);
    if (parse(z.object({ id }), row).id !== expectedId) throw malformed();
    return { [name]: row } as Record<K, z.output<T>>;
  }
  async getCurrentUser() {
    const response = await this.request(
      z.object({ authUser: nativeUser }),
      'GET',
      '/users/me',
      undefined,
      { 'cols[]': ['id', 'name', 'email', 'avatar'] }
    );
    if (this.userId !== undefined && response.authUser.id !== this.userId)
      throw invalid('The Make user identity changed. Reconnect before using this connection.');
    return response.authUser;
  }
  async listScenarios(options: {
    teamId?: number;
    organizationId?: number;
    folderId?: number;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    container(options);
    const response = await this.page('scenarios', nativeScenario, '/scenarios', {
      ...pageParams(options),
      teamId: options.teamId,
      organizationId: options.organizationId,
      folderId:
        options.folderId === undefined ? undefined : exactId(options.folderId, 'folderId'),
      isActive: options.isActive
    });
    if (
      options.teamId !== undefined &&
      response.scenarios.some(row => row.teamId !== options.teamId)
    )
      throw malformed();
    return response;
  }
  getScenario(sid: number) {
    const exact = exactId(sid, 'scenarioId');
    return this.exact(
      'scenario',
      nativeScenario,
      `/scenarios/${exact}`,
      exact,
      'GET',
      undefined,
      {
        'cols[]': [
          'id',
          'name',
          'teamId',
          'isActive',
          'isPaused',
          'created',
          'lastEdit',
          'nextExec',
          'description',
          'scheduling',
          'deleted',
          'deletedAt'
        ]
      }
    );
  }
  async createScenario(options: {
    teamId: number;
    name?: string;
    blueprint?: string;
    scheduling?: Record<string, unknown>;
    folderId?: number;
    confirmed?: boolean;
  }) {
    const teamId = exactId(options.teamId, 'teamId');
    if (!options.blueprint || !options.scheduling)
      throw invalid(
        'Creating a scenario requires blueprint JSON text and an explicit scheduling object. Creation does not activate it; use an on-demand schedule for controlled setup.'
      );
    jsonObject(options.blueprint, 'blueprint');
    const scheduling = jsonObject(options.scheduling, 'scheduling');
    if (options.name !== undefined) nonempty(options.name, 'name', 120);
    const response = await this.request(
      z.object({ scenario: nativeScenario }),
      'POST',
      '/scenarios',
      pickDefined({
        teamId,
        blueprint: options.blueprint,
        scheduling: JSON.stringify(scheduling),
        folderId:
          options.folderId === undefined ? undefined : exactId(options.folderId, 'folderId')
      }),
      { confirmed: options.confirmed }
    );
    if (response.scenario.teamId !== teamId) throw malformed();
    if (options.name !== undefined && response.scenario.name !== options.name) {
      try {
        return await this.updateScenario(response.scenario.id, { name: options.name });
      } catch {
        throw invalid(
          `Scenario ${response.scenario.id} was created, but its requested name was not confirmed. Read that exact scenario and rename it; do not retry creation.`
        );
      }
    }
    return response;
  }
  async updateScenario(
    sid: number,
    options: {
      name?: string;
      scheduling?: Record<string, unknown>;
      folderId?: number;
      confirmed?: boolean;
    }
  ) {
    const exact = exactId(sid, 'scenarioId');
    const body = pickDefined({
      name: options.name === undefined ? undefined : nonempty(options.name, 'name', 120),
      scheduling:
        options.scheduling === undefined
          ? undefined
          : JSON.stringify(jsonObject(options.scheduling, 'scheduling')),
      folderId:
        options.folderId === undefined ? undefined : exactId(options.folderId, 'folderId')
    });
    if (!Object.keys(body).length)
      throw invalid(
        'Provide at least one supported scenario update: name, scheduling, or folderId.'
      );
    const response = await this.exact(
      'scenario',
      nativeScenario,
      `/scenarios/${exact}`,
      exact,
      'PATCH',
      body,
      { confirmed: options.confirmed }
    );
    if (options.name !== undefined && response.scenario.name !== options.name)
      throw malformed();
    return response;
  }
  async deleteScenario(sid: number) {
    const exact = exactId(sid, 'scenarioId');
    const result = await this.request(
      z.object({ scenario: id }),
      'DELETE',
      `/scenarios/${exact}`
    );
    if (result.scenario !== exact) throw malformed();
    return result;
  }
  async stateScenario(sid: number, active: boolean) {
    const exact = exactId(sid, 'scenarioId');
    const result = await this.exact(
      'scenario',
      z.object({ id, isActive: z.boolean() }),
      `/scenarios/${exact}/${active ? 'start' : 'stop'}`,
      exact,
      'POST'
    );
    if (result.scenario.isActive !== active) throw malformed();
    return result;
  }
  activateScenario(sid: number) {
    return this.stateScenario(sid, true);
  }
  deactivateScenario(sid: number) {
    return this.stateScenario(sid, false);
  }
  runScenario(sid: number, data?: Record<string, unknown>) {
    return this.request(
      z.object({ executionId: key, status: z.string().optional() }).passthrough(),
      'POST',
      `/scenarios/${exactId(sid, 'scenarioId')}/run`,
      {
        responsive: false,
        ...(data === undefined ? {} : { data: jsonObject(data, 'runData') })
      }
    );
  }
  async cloneScenario(
    sid: number,
    options: {
      targetTeamId?: number;
      organizationId?: number;
      name?: string;
      states?: boolean;
      confirmed?: boolean;
      mappings?: Record<string, unknown>;
    }
  ) {
    const exact = exactId(sid, 'scenarioId'),
      teamId = exactId(options.targetTeamId, 'targetTeamId'),
      organizationId = exactId(options.organizationId, 'organizationId');
    const name = nonempty(options.name, 'cloneName', 120);
    if (typeof options.states !== 'boolean')
      throw invalid(
        'Choose cloneStates explicitly: true copies module state; false resets it.'
      );
    const mappings =
      options.mappings === undefined
        ? {}
        : input(
            z
              .object({
                account: record.optional(),
                key: record.optional(),
                hook: record.optional(),
                device: record.optional(),
                udt: record.optional(),
                datastore: record.optional()
              })
              .strict(),
            options.mappings,
            'cloneMappings must contain only documented account/key/hook/device/udt/datastore maps.'
          );
    const result = await this.request(
      z.object({ scenario: nativeScenario }),
      'POST',
      `/scenarios/${exact}/clone`,
      { name, teamId, states: options.states, ...mappings },
      { organizationId, confirmed: options.confirmed }
    );
    if (
      result.scenario.id === exact ||
      result.scenario.teamId !== teamId ||
      result.scenario.name !== name
    )
      throw malformed();
    return result;
  }
  getScenarioBlueprint(sid: number) {
    return this.request(
      z
        .object({
          response: z
            .object({
              blueprint: record,
              scheduling: record.optional(),
              version: count.optional()
            })
            .passthrough()
        })
        .passthrough(),
      'GET',
      `/scenarios/${exactId(sid, 'scenarioId')}/blueprint`
    );
  }
  getScenarioUsage(sid: number) {
    return this.request(usage, 'GET', `/scenarios/${exactId(sid, 'scenarioId')}/usage`);
  }
  getScenarioLogs(sid: number, options: { limit?: number; offset?: number }) {
    return this.page(
      'scenarioLogs',
      nativeLog,
      `/scenarios/${exactId(sid, 'scenarioId')}/logs`,
      pageParams(options)
    );
  }
  getExecution(sid: number, eid: string) {
    const e = input(key, eid, 'Provide the exact execution ID from run or logs.');
    return this.request(
      execution,
      'GET',
      `/scenarios/${exactId(sid, 'scenarioId')}/executions/${encodeURIComponent(e)}`
    );
  }
  async listConnections(team: number, options: { limit?: number; offset?: number }) {
    const teamId = exactId(team, 'teamId');
    const result = await this.page('connections', nativeConnection, '/connections', {
      teamId,
      ...pageParams(options)
    });
    if (result.connections.some(c => c.teamId !== teamId)) throw malformed();
    return result;
  }
  getConnection(cid: number) {
    const exact = exactId(cid, 'connectionId');
    return this.exact('connection', nativeConnection, `/connections/${exact}`, exact);
  }
  async updateConnection(cid: number, options: { name: string }) {
    const exact = exactId(cid, 'connectionId'),
      name = nonempty(options.name, 'name');
    const response = await this.exact(
      'connection',
      nativeConnection,
      `/connections/${exact}`,
      exact,
      'PATCH',
      { name }
    );
    if (response.connection.name !== name) throw malformed();
    return response;
  }
  verifyConnection(cid: number) {
    return this.request(
      z.object({ verified: z.boolean() }),
      'POST',
      `/connections/${exactId(cid, 'connectionId')}/test`
    );
  }
  async deleteConnection(cid: number, confirmed?: boolean) {
    const exact = exactId(cid, 'connectionId');
    const result = await this.request(
      z.object({ connection: id }),
      'DELETE',
      `/connections/${exact}`,
      undefined,
      { confirmed }
    );
    if (result.connection !== exact) throw malformed();
    return result;
  }
  async listDataStores(
    team: number,
    options: { limit?: number; offset?: number; sortBy?: string; sortDir?: string }
  ) {
    const teamId = exactId(team, 'teamId');
    const result = await this.page('dataStores', nativeStore, '/data-stores', {
      teamId,
      ...pageParams(options)
    });
    if (result.dataStores.some(c => c.teamId !== teamId)) throw malformed();
    return result;
  }
  getDataStore(sid: number) {
    const exact = exactId(sid, 'dataStoreId');
    return this.exact('dataStore', nativeStore, `/data-stores/${exact}`, exact);
  }
  async createDataStore(body: {
    name?: string;
    teamId?: number;
    datastructureId?: number;
    maxSizeMB?: number;
  }) {
    const teamId = exactId(body.teamId, 'teamId');
    const result = await this.request(
      z.object({ dataStore: nativeStore }),
      'POST',
      '/data-stores',
      {
        teamId,
        name: nonempty(body.name, 'name'),
        datastructureId: exactId(body.datastructureId, 'dataStructureId'),
        maxSizeMB: exactId(body.maxSizeMB, 'maxSizeMB')
      }
    );
    if (
      result.dataStore.teamId !== teamId ||
      result.dataStore.name !== body.name ||
      result.dataStore.datastructureId !== body.datastructureId
    )
      throw malformed();
    return result;
  }
  async updateDataStore(
    sid: number,
    body: { name?: string; datastructureId?: number; maxSizeMB?: number }
  ) {
    const exact = exactId(sid, 'dataStoreId');
    const data = pickDefined({
      name: body.name === undefined ? undefined : nonempty(body.name, 'name'),
      datastructureId:
        body.datastructureId === undefined
          ? undefined
          : exactId(body.datastructureId, 'dataStructureId'),
      maxSizeMB:
        body.maxSizeMB === undefined ? undefined : exactId(body.maxSizeMB, 'maxSizeMB')
    });
    if (!Object.keys(data).length)
      throw invalid('Provide at least one supported data store update.');
    return this.exact('dataStore', nativeStore, `/data-stores/${exact}`, exact, 'PATCH', data);
  }
  async deleteDataStore(sid: number, team: number, confirmed?: boolean) {
    const exact = exactId(sid, 'dataStoreId');
    const result = await this.request(
      z.object({ dataStores: z.array(id) }),
      'DELETE',
      '/data-stores',
      { ids: [exact] },
      { teamId: exactId(team, 'teamId'), confirmed }
    );
    if (result.dataStores.length !== 1 || result.dataStores[0] !== exact) throw malformed();
    return result;
  }
  listDataStoreRecords(sid: number, options: { limit?: number; offset?: number }) {
    return this.request(
      recordPage,
      'GET',
      `/data-stores/${exactId(sid, 'dataStoreId')}/data`,
      undefined,
      pageParams(options)
    );
  }
  async findDataStoreRecord(sid: number, recordKey: string) {
    exactId(sid, 'dataStoreId');
    const exact = input(
      key,
      recordKey,
      'recordKey is required and must be a valid exact key.'
    );
    const seen = new Set<string>();
    let total: number | undefined;
    for (let offset = 0; offset < 1000; offset += 100) {
      const page = await this.listDataStoreRecords(sid, { limit: 100, offset });
      if (page.pg?.offset !== offset || page.pg.limit !== 100 || page.records.length > 100)
        throw invalid(
          'Exact-key lookup is incomplete because native pagination was not confirmed. Use the list action to inspect records; do not infer absence.'
        );
      if (total !== undefined && page.count !== total)
        throw invalid(
          'Records changed during lookup. Repeat the bounded read after concurrent changes stop.'
        );
      total = page.count;
      const matches = page.records.filter(row => row.key === exact);
      if (matches.length > 1 || page.records.some(row => seen.has(row.key))) throw malformed();
      for (const row of page.records) seen.add(row.key);
      if (matches[0]) return matches[0];
      if (
        total !== undefined &&
        total === seen.size &&
        seen.size === offset + page.records.length
      )
        return undefined;
      if (page.records.length < 100) break;
    }
    throw invalid(
      'Exact-key lookup reached its 1000-record bound or lacked a complete native count. Use paginated list results; absence is not confirmed.'
    );
  }
  async getDataStoreRecord(sid: number, recordKey: string) {
    const row = await this.findDataStoreRecord(sid, recordKey);
    if (!row)
      throw invalid(
        'The exact record key was not found in a complete bounded collection read. Check the key and data store ID.'
      );
    return row;
  }
  async createDataStoreRecord(sid: number, data: Record<string, unknown>, recordKey?: string) {
    const body = {
      data: jsonObject(data, 'recordData'),
      key:
        recordKey === undefined
          ? undefined
          : input(key, recordKey, 'Provide a valid recordKey.')
    };
    const result = await this.request(
      nativeRecord,
      'POST',
      `/data-stores/${exactId(sid, 'dataStoreId')}/data`,
      pickDefined(body)
    );
    if (recordKey !== undefined && result.key !== recordKey) throw malformed();
    return result;
  }
  async updateDataStoreRecord(sid: number, recordKey: string, data: Record<string, unknown>) {
    const exact = input(key, recordKey, 'recordKey is required.');
    const result = await this.request(
      nativeRecord,
      'PUT',
      `/data-stores/${exactId(sid, 'dataStoreId')}/data/${encodeURIComponent(exact)}`,
      jsonObject(data, 'recordData')
    );
    if (result.key !== exact) throw malformed();
    return result;
  }
  async deleteDataStoreRecord(sid: number, recordKey: string) {
    const exact = input(key, recordKey, 'recordKey is required.');
    const result = await this.request(
      z.object({ keys: z.array(z.string()) }),
      'DELETE',
      `/data-stores/${exactId(sid, 'dataStoreId')}/data`,
      { keys: [exact] }
    );
    if (result.keys.length !== 1 || result.keys[0] !== exact) throw malformed();
    return result;
  }
  async listHooks(
    team: number,
    options: { typeName?: string; assigned?: boolean; limit?: number; offset?: number }
  ) {
    const teamId = exactId(team, 'teamId'),
      p = pageParams(options);
    const result = await this.request(
      z.object({ hooks: z.array(nativeHook).max(1000) }),
      'GET',
      '/hooks',
      undefined,
      pickDefined({
        teamId: String(teamId),
        typeName: options.typeName,
        assigned: options.assigned
      })
    );
    if (result.hooks.some(row => row.teamId !== teamId)) throw malformed();
    const offset = Number(p['pg[offset]']),
      limit = Number(p['pg[limit]']);
    return { hooks: result.hooks.slice(offset, offset + limit), total: result.hooks.length };
  }
  getHook(hid: number) {
    const exact = exactId(hid, 'hookId');
    return this.exact('hook', nativeHook, `/hooks/${exact}`, exact);
  }
  async createHook(body: {
    name?: string;
    teamId?: number;
    typeName?: string;
    method?: boolean;
    headers?: boolean;
    stringify?: boolean;
  }) {
    const teamId = exactId(body.teamId, 'teamId');
    const result = await this.request(z.object({ hook: nativeHook }), 'POST', '/hooks', {
      name: nonempty(body.name, 'name'),
      teamId: String(teamId),
      typeName: nonempty(body.typeName, 'typeName'),
      method: body.method ?? false,
      headers: body.headers ?? false,
      stringify: body.stringify ?? false
    });
    if (
      result.hook.teamId !== teamId ||
      result.hook.name !== body.name ||
      result.hook.typeName !== body.typeName ||
      result.hook.data?.method !== (body.method ?? false) ||
      result.hook.data?.headers !== (body.headers ?? false) ||
      result.hook.data?.stringify !== (body.stringify ?? false)
    )
      throw malformed();
    return result;
  }
  async updateHook(hid: number, body: { name: string }) {
    const exact = exactId(hid, 'hookId'),
      name = nonempty(body.name, 'name');
    const result = await this.exact('hook', nativeHook, `/hooks/${exact}`, exact, 'PATCH', {
      name
    });
    if (result.hook.name !== name) throw malformed();
    return result;
  }
  async hookState(hid: number, enabled: boolean) {
    const exact = exactId(hid, 'hookId');
    await this.request(
      z.object({ success: z.literal(true) }),
      'POST',
      `/hooks/${exact}/${enabled ? 'enable' : 'disable'}`
    );
    const result = await this.getHook(exact);
    if (result.hook.enabled !== enabled) throw malformed();
    return result;
  }
  enableHook(hid: number) {
    return this.hookState(hid, true);
  }
  disableHook(hid: number) {
    return this.hookState(hid, false);
  }
  pingHook(hid: number) {
    return this.request(
      z.object({
        gone: z.boolean(),
        attached: z.boolean().optional(),
        learning: z.boolean().optional(),
        address: z.string().optional(),
        teamId: id.optional()
      }),
      'GET',
      `/hooks/${exactId(hid, 'hookId')}/ping`
    );
  }
  async deleteHook(hid: number, confirmed?: boolean) {
    const exact = exactId(hid, 'hookId');
    const result = await this.request(
      z.object({ hook: id }),
      'DELETE',
      `/hooks/${exact}`,
      undefined,
      { confirmed }
    );
    if (result.hook !== exact) throw malformed();
    return result;
  }
  listOrganizations(options: { limit?: number; offset?: number } = {}) {
    return this.page('organizations', nativeOrganization, '/organizations', {
      zone: this.zoneUrl,
      ...pageParams(options)
    });
  }
  async listTeams(org: number, options: { limit?: number; offset?: number }) {
    const organizationId = exactId(org, 'organizationId');
    const result = await this.page('teams', nativeTeam, '/teams', {
      organizationId,
      ...pageParams(options)
    });
    if (result.teams.some(row => row.organizationId !== organizationId)) throw malformed();
    return result;
  }
  listUsers(options: {
    teamId?: number;
    organizationId?: number;
    limit?: number;
    offset?: number;
  }) {
    container(options);
    return this.page('users', nativeUser, '/users', {
      ...pageParams(options),
      teamId: options.teamId,
      organizationId: options.organizationId,
      'cols[]': ['id', 'name', 'email', 'language', 'lastLogin', 'avatar']
    });
  }
  getOrganizationUsage(org: number) {
    return this.request(
      usage,
      'GET',
      `/organizations/${exactId(org, 'organizationId')}/usage`
    );
  }
  getTeamUsage(team: number) {
    return this.request(usage, 'GET', `/teams/${exactId(team, 'teamId')}/usage`);
  }
  async listDataStructures(team: number, options: { limit?: number; offset?: number } = {}) {
    const teamId = exactId(team, 'teamId');
    const result = await this.page('dataStructures', nativeStructure, '/data-structures', {
      teamId,
      ...pageParams(options)
    });
    if (result.dataStructures.some(row => row.teamId !== teamId)) throw malformed();
    return result;
  }
}
