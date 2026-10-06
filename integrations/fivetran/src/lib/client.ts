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

const text = z.string().min(1);
const optionalText = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
const json = z.record(z.string(), z.unknown());
const group = z.object({ id: text, name: text, created_at: optionalText });
const user = z.object({
  id: text,
  email: text,
  given_name: optionalText,
  family_name: optionalText,
  verified: z.boolean().optional(),
  active: z.boolean().optional(),
  invited: z.boolean().optional(),
  role: optionalText,
  phone: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  created_at: optionalText,
  logged_in_at: z.string().nullable().optional()
});
const team = z.object({
  id: text,
  name: text,
  description: z.string().nullable().optional(),
  role: optionalText
});
const membership = z.object({ user_id: text, role: text, created_at: optionalText });
const setupTests = z
  .array(
    z.object({ status: z.enum(['PASSED', 'SKIPPED', 'WARNING', 'FAILED', 'JOB_FAILED']) })
  )
  .optional();
const connection = z.object({
  id: text,
  group_id: text,
  service: text,
  schema: optionalText,
  status: z.object({
    setup_state: text,
    sync_state: text,
    update_state: optionalText,
    is_historical_sync: z.boolean().optional()
  }),
  paused: z.boolean().optional(),
  sync_frequency: z
    .number()
    .nullish()
    .transform(value => value ?? undefined),
  schedule_type: optionalText,
  daily_sync_time: optionalText,
  succeeded_at: z.string().nullable().optional(),
  failed_at: z.string().nullable().optional(),
  created_at: optionalText,
  setup_tests: setupTests
});
const destination = z.object({
  id: text,
  group_id: text,
  service: text,
  region: optionalText,
  networking_method: optionalText,
  setup_status: optionalText,
  time_zone_offset: text,
  daylight_saving_time_enabled: z.boolean().optional(),
  setup_tests: setupTests
});
const schedule = z.object({
  schedule_type: text,
  cron: z.array(z.string()).optional(),
  interval: z.number().optional(),
  days_of_week: z.array(z.string()).optional(),
  time_of_day: optionalText,
  connection_ids: z.array(text).optional(),
  transformation_ids: z.array(text).optional(),
  smart_syncing: z.boolean().optional()
});
const transformation = z.object({
  id: text,
  type: z.enum(['DBT_CORE', 'QUICKSTART']),
  status: text,
  paused: z.boolean(),
  schedule,
  created_at: optionalText,
  output_model_names: z.array(z.string()).optional(),
  transformation_config: z
    .object({
      name: optionalText,
      project_id: optionalText,
      package_name: optionalText,
      connection_ids: z.array(text).optional()
    })
    .optional()
});
const webhook = z.object({
  id: text,
  type: text,
  url: text,
  events: z.array(text),
  active: z.boolean(),
  group_id: z.string().nullable().optional(),
  created_at: optionalText,
  created_by: optionalText
});
const metadata = z.object({
  id: text,
  name: text,
  type: optionalText,
  description: optionalText,
  icon_url: optionalText,
  service_status: optionalText,
  connector_class: optionalText,
  link_to_docs: optionalText,
  link_to_erd: optionalText,
  supported_features: z.array(z.object({ id: text, notes: optionalText })).optional(),
  config: json.optional(),
  auth: json.optional()
});
const account = z.object({
  account_id: text,
  account_name: optionalText,
  user_id: optionalText,
  system_key_id: optionalText
});
const schemaConfig = z.object({ schema_change_handling: text, schemas: json });
const role = z.object({
  name: text,
  description: optionalText,
  scope: z.array(text),
  is_custom: z.boolean(),
  is_deprecated: z.boolean(),
  replacement_role_name: optionalText
});
const envelope = z.object({
  code: text,
  message: z.string().optional(),
  data: z.unknown().optional()
});
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'Fivetran returned an invalid API response. Read the resource before retrying a write.',
      { reason: 'fivetran_invalid_response' }
    );
  return result.data;
};
export const requiredText = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim())
    throw createApiServiceError(`Provide ${label}.`);
  return value;
};
const identifier = (value: string) => {
  requiredText(value, 'a resource identifier');
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
export const fivetranApiError = (error: unknown) => {
  const result = buildApiServiceError(error, {
    providerLabel: 'Fivetran',
    reason: 'fivetran_api_error',
    parent: createApiServiceError('The upstream Fivetran request failed.', {
      upstreamStatus: getApiErrorStatus(error)
    }),
    formatMessage: ({ status }) =>
      `Fivetran request failed${status ? ` (HTTP ${status})` : ''}. Check API credentials, resource access and request fields. Read uncertain writes before retrying; retry rate-limited requests later.`
  });
  const headers =
    isApiErrorRecord(error) && isApiErrorRecord(error.response)
      ? error.response.headers
      : undefined;
  const retryAfter = getResponseHeaderValue(headers, 'Retry-After');
  if (
    retryAfter &&
    /^(?:\d+(?:\.\d+)?|[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT)$/.test(
      retryAfter
    )
  )
    result.data.retryAfter = retryAfter;
  return result;
};
const nonemptyUpdate = (body: Record<string, unknown>) => {
  if (!Object.keys(body).length)
    throw createApiServiceError('Provide at least one field to update.');
};
const validateConnectionSettings = (body: Record<string, unknown>) => {
  if (
    body.sync_frequency !== undefined &&
    ![1, 5, 15, 30, 60, 120, 180, 360, 480, 720, 1440].includes(body.sync_frequency as number)
  )
    throw createApiServiceError(
      'Use a supported sync frequency: 1, 5, 15, 30, 60, 120, 180, 360, 480, 720 or 1440 minutes. Some frequencies require a plan feature.'
    );
  if (
    body.daily_sync_time !== undefined &&
    (typeof body.daily_sync_time !== 'string' ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(body.daily_sync_time))
  )
    throw createApiServiceError('Use dailySyncTime in HH:MM format.');
};
const validateWebhook = (body: Record<string, unknown>) => {
  if (body.url !== undefined) {
    try {
      const url = new URL(requiredText(body.url, 'an HTTPS webhook URL'));
      if (url.protocol !== 'https:' || url.username || url.password) throw 0;
    } catch {
      throw createApiServiceError('Use an HTTPS webhook URL without embedded credentials.');
    }
  }
  if (
    body.events !== undefined &&
    (!Array.isArray(body.events) ||
      !body.events.length ||
      body.events.some(event => typeof event !== 'string' || !event.trim()))
  )
    throw createApiServiceError('Provide at least one nonempty webhook event.');
};
const transformationBody = (
  body: Record<string, unknown>,
  type: 'DBT_CORE' | 'QUICKSTART',
  creating: boolean
) => {
  const config = body.config === undefined ? undefined : parse(json, body.config);
  const nativeConfig = config
    ? Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'type'))
    : undefined;
  if (creating && type === 'DBT_CORE') {
    requiredText(nativeConfig?.project_id, 'config.project_id for the dbt Core project');
    requiredText(nativeConfig?.name, 'config.name for the transformation');
    if (!Array.isArray(nativeConfig?.steps) || !nativeConfig.steps.length)
      throw createApiServiceError('Provide config.steps with at least one dbt step.');
  }
  let nativeSchedule =
    body.schedule === undefined ? undefined : { ...parse(json, body.schedule) };
  if (nativeSchedule?.schedule_type !== undefined) {
    const scheduleType = requiredText(
      nativeSchedule.schedule_type,
      'schedule.schedule_type'
    ).toUpperCase();
    if (!['INTEGRATED', 'TIME_OF_DAY', 'INTERVAL', 'CRON'].includes(scheduleType))
      throw createApiServiceError(
        'Use schedule_type INTEGRATED, TIME_OF_DAY, INTERVAL or CRON.'
      );
    nativeSchedule.schedule_type = scheduleType;
  }
  if (body.connection_ids !== undefined) {
    const ids = parse(z.array(text), body.connection_ids);
    if (type === 'QUICKSTART') {
      if (!creating)
        throw createApiServiceError(
          'Quickstart connection dependencies cannot be changed through this update. Create a new transformation with the intended connections.'
        );
      if (nativeConfig) nativeConfig.connection_ids = ids;
    } else {
      if (!nativeSchedule && !creating)
        throw createApiServiceError(
          'Provide schedule when changing dbt connection dependencies.'
        );
      nativeSchedule = {
        ...(nativeSchedule ?? { schedule_type: 'INTEGRATED' }),
        connection_ids: ids
      };
    }
  }
  return pickDefined({
    ...(creating ? { type } : {}),
    transformation_config: nativeConfig,
    schedule: nativeSchedule,
    paused: body.paused
  });
};
export class FivetranClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(token: string) {
    if (!token || !/^[A-Za-z0-9+/]+={0,2}$/.test(token))
      throw createApiServiceError('Provide a valid encoded API key and secret.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.fivetran.com/v1',
      headers: {
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30_000,
      maxRedirects: 0,
      validateStatus: () => true,
      errorAdapter: fivetranApiError
    });
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    body?: unknown,
    params?: Record<string, unknown>
  ) {
    const response = await this.http.request({
      method,
      url: path,
      data: body,
      params,
      headers:
        /^\/(?:connections(?:\/[^/]+(?:\/(?:sync|resync))?)?|destinations(?:\/[^/]+)?)$/.test(
          path
        )
          ? { Accept: 'application/json;version=2' }
          : undefined
    });
    const expectedStatus =
      method === 'post' &&
      ([
        '/groups',
        '/connections',
        '/destinations',
        '/users',
        '/teams',
        '/transformations'
      ].includes(path) ||
        /^\/teams\/[^/]+\/users$/.test(path))
        ? 201
        : 200;
    if (method === 'delete' && response.status === 204) return { code: 'Success' };
    if (response.status !== expectedStatus) throw fivetranApiError({ response });
    const result = parse(envelope, response.data);
    if (result.code !== 'Success' && result.code !== 'Created')
      throw createApiServiceError(
        'Fivetran did not confirm the request succeeded. Read the resource before retrying a write.',
        { reason: 'fivetran_api_rejected' }
      );
    return result;
  }
  private async resource<T>(
    method: 'get' | 'post' | 'patch',
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
    expectedId?: string
  ): Promise<T> {
    const result = parse(schema, (await this.request(method, path, body)).data);
    if (expectedId !== undefined && parse(z.object({ id: text }), result).id !== expectedId)
      throw createApiServiceError(
        'Fivetran returned a different resource identifier. Read the intended resource before retrying.'
      );
    return result;
  }
  async paginate<T>(
    path: string,
    schema: z.ZodType<T>,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T[]> {
    const items: T[] = [],
      seen = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < 1000; page++) {
      const data = parse(
        z.object({ items: z.array(schema), next_cursor: optionalText }),
        (
          await this.request(
            'get',
            path,
            undefined,
            pickDefined({ ...params, cursor, limit: 100 })
          )
        ).data
      );
      items.push(...data.items);
      if (!data.next_cursor) return items;
      if (!data.items.length || seen.has(data.next_cursor))
        throw createApiServiceError(
          'Fivetran returned non-advancing pagination; the result is incomplete. Narrow the request and retry.',
          { reason: 'fivetran_invalid_pagination' }
        );
      seen.add(data.next_cursor);
      cursor = data.next_cursor;
    }
    throw createApiServiceError(
      'Fivetran pagination exceeded the safe page limit; the result is incomplete. Narrow the request.',
      { reason: 'fivetran_pagination_limit' }
    );
  }
  async getAccount() {
    return parse(account, (await this.request('get', '/account/info')).data);
  }
  async listGroups() {
    return this.paginate('/groups', group);
  }
  async getGroup(id: string) {
    return this.resource('get', `/groups/${identifier(id)}`, group, undefined, id);
  }
  async createGroup(name: string) {
    return this.resource('post', '/groups', group, {
      name: requiredText(name, 'a group name')
    });
  }
  async updateGroup(id: string, name: string) {
    return this.resource(
      'patch',
      `/groups/${identifier(id)}`,
      group,
      { name: requiredText(name, 'a group name') },
      id
    );
  }
  async deleteGroup(id: string) {
    await this.request('delete', `/groups/${identifier(id)}`);
  }
  async listGroupConnections(id: string) {
    return this.paginate(`/groups/${identifier(id)}/connections`, connection);
  }
  async listGroupUsers(id: string) {
    return this.paginate(`/groups/${identifier(id)}/users`, user);
  }
  async listConnections() {
    return this.paginate('/connections', connection);
  }
  async getConnection(id: string) {
    return this.resource('get', `/connections/${identifier(id)}`, connection, undefined, id);
  }
  async createConnection(body: Record<string, unknown>) {
    requiredText(body.group_id, 'groupId from list_groups');
    requiredText(body.service, 'service from list_connector_types');
    validateConnectionSettings(body);
    return this.resource('post', '/connections', connection, body);
  }
  async updateConnection(id: string, body: Record<string, unknown>) {
    nonemptyUpdate(body);
    validateConnectionSettings(body);
    return this.resource('patch', `/connections/${identifier(id)}`, connection, body, id);
  }
  async deleteConnection(id: string) {
    await this.request('delete', `/connections/${identifier(id)}`);
  }
  async triggerSync(id: string, force?: boolean) {
    return this.request('post', `/connections/${identifier(id)}/sync`, pickDefined({ force }));
  }
  async triggerResync(id: string, scope?: Record<string, unknown>) {
    if (scope) {
      if (!Object.keys(scope).length)
        throw createApiServiceError(
          'Provide a nonempty resyncScope or omit it for a full historical reload.'
        );
      const valid = z.record(text, z.array(text).min(1)).safeParse(scope);
      if (!valid.success)
        throw createApiServiceError(
          'Each resyncScope schema must have a nonempty table-name array. Discover names with get_connection_schema.'
        );
    }
    return this.request(
      'post',
      `/connections/${identifier(id)}/resync`,
      pickDefined({ scope })
    );
  }
  async getConnectionSchema(id: string) {
    return parse(
      schemaConfig,
      (await this.request('get', `/connections/${identifier(id)}/schemas`)).data
    );
  }
  async updateConnectionSchema(id: string, body: Record<string, unknown>) {
    nonemptyUpdate(body);
    return parse(
      schemaConfig,
      (await this.request('patch', `/connections/${identifier(id)}/schemas`, body)).data
    );
  }
  async reloadConnectionSchema(id: string, excludeMode?: string) {
    return parse(
      schemaConfig,
      (
        await this.request(
          'post',
          `/connections/${identifier(id)}/schemas/reload`,
          pickDefined({ exclude_mode: excludeMode })
        )
      ).data
    );
  }
  async listDestinations() {
    return this.paginate('/destinations', destination);
  }
  async getDestination(id: string) {
    return this.resource('get', `/destinations/${identifier(id)}`, destination, undefined, id);
  }
  async createDestination(body: Record<string, unknown>) {
    requiredText(body.time_zone_offset, 'timeZoneOffset for the destination');
    if (body.time_zone_offset === '+0') body = { ...body, time_zone_offset: '0' };
    return this.resource('post', '/destinations', destination, body);
  }
  async updateDestination(id: string, body: Record<string, unknown>) {
    nonemptyUpdate(body);
    const current =
      body.time_zone_offset === undefined ? await this.getDestination(id) : undefined;
    return this.resource(
      'patch',
      `/destinations/${identifier(id)}`,
      destination,
      {
        ...body,
        time_zone_offset:
          body.time_zone_offset === '+0'
            ? '0'
            : (body.time_zone_offset ?? current?.time_zone_offset)
      },
      id
    );
  }
  async deleteDestination(id: string) {
    await this.request('delete', `/destinations/${identifier(id)}`);
  }
  async listUsers() {
    return this.paginate('/users', user);
  }
  async getUser(id: string) {
    return this.resource('get', `/users/${identifier(id)}`, user, undefined, id);
  }
  async getCurrentUser() {
    const current = await this.getAccount();
    if (!current.user_id)
      throw createApiServiceError(
        'This API key belongs to a system key, not a user. Use get_account for account identity or provide userId from list_users.'
      );
    return this.getUser(current.user_id);
  }
  async inviteUser(body: Record<string, unknown>) {
    if (!z.string().email().safeParse(body.email).success)
      throw createApiServiceError('Provide a valid user email.');
    requiredText(body.given_name, 'givenName for the invited user');
    requiredText(body.family_name, 'familyName for the invited user');
    return this.resource('post', '/users', user, body);
  }
  async updateUser(id: string, body: Record<string, unknown>) {
    nonemptyUpdate(body);
    return this.resource('patch', `/users/${identifier(id)}`, user, body, id);
  }
  async deleteUser(id: string) {
    await this.request('delete', `/users/${identifier(id)}`);
  }
  async listTeams() {
    return this.paginate('/teams', team);
  }
  async getTeam(id: string) {
    return this.resource('get', `/teams/${identifier(id)}`, team, undefined, id);
  }
  async createTeam(body: Record<string, unknown>) {
    requiredText(body.name, 'a team name');
    return this.resource('post', '/teams', team, body);
  }
  async updateTeam(id: string, body: Record<string, unknown>) {
    nonemptyUpdate(body);
    return this.resource('patch', `/teams/${identifier(id)}`, team, body, id);
  }
  async deleteTeam(id: string) {
    await this.request('delete', `/teams/${identifier(id)}`);
  }
  async listTeamUsers(id: string) {
    return this.paginate(`/teams/${identifier(id)}/users`, membership);
  }
  async addUserToTeam(id: string, userId: string) {
    return parse(
      membership,
      (
        await this.request('post', `/teams/${identifier(id)}/users`, {
          user_id: requiredText(userId, 'userId from list_users')
        })
      ).data
    );
  }
  async removeUserFromTeam(id: string, userId: string) {
    await this.request('delete', `/teams/${identifier(id)}/users/${identifier(userId)}`);
  }
  async listTransformations() {
    return this.paginate('/transformations', transformation);
  }
  async getTransformation(id: string) {
    return this.resource(
      'get',
      `/transformations/${identifier(id)}`,
      transformation,
      undefined,
      id
    );
  }
  async createTransformation(body: Record<string, unknown>) {
    const config = parse(json, body.config);
    const type =
      body.type ??
      config.type ??
      (config.project_id
        ? 'DBT_CORE'
        : config.package_name || config.connection_ids
          ? 'QUICKSTART'
          : undefined);
    if (type !== 'DBT_CORE' && type !== 'QUICKSTART')
      throw createApiServiceError(
        'Provide type DBT_CORE or QUICKSTART with the current transformation config. Legacy dbt Cloud or Coalesce configuration is unsupported by this endpoint.'
      );
    return this.resource(
      'post',
      '/transformations',
      transformation,
      transformationBody(body, type, true)
    );
  }
  async updateTransformation(id: string, body: Record<string, unknown>) {
    nonemptyUpdate(body);
    const current = await this.getTransformation(id);
    const merged = {
      ...body,
      ...(body.schedule !== undefined ||
      (body.connection_ids !== undefined && current.type === 'DBT_CORE')
        ? {
            schedule: {
              ...current.schedule,
              ...(body.schedule === undefined ? {} : parse(json, body.schedule))
            }
          }
        : {})
    };
    return this.resource(
      'patch',
      `/transformations/${identifier(id)}`,
      transformation,
      transformationBody(merged, current.type, false),
      id
    );
  }
  async deleteTransformation(id: string) {
    await this.request('delete', `/transformations/${identifier(id)}`);
  }
  async runTransformation(id: string) {
    return this.request('post', `/transformations/${identifier(id)}/run`, {});
  }
  async listConnectorTypes() {
    return this.paginate('/metadata/connector-types', metadata);
  }
  async getConnectorType(id: string) {
    return this.resource(
      'get',
      `/metadata/connector-types/${identifier(id)}`,
      metadata,
      undefined,
      id
    );
  }
  async listWebhooks() {
    return this.paginate('/webhooks', webhook);
  }
  async createAccountWebhook(body: Record<string, unknown>) {
    validateWebhook(body);
    return this.resource('post', '/webhooks/account', webhook, body);
  }
  async createGroupWebhook(id: string, body: Record<string, unknown>) {
    validateWebhook(body);
    return this.resource('post', `/webhooks/group/${identifier(id)}`, webhook, body);
  }
  async getWebhook(id: string) {
    return this.resource('get', `/webhooks/${identifier(id)}`, webhook, undefined, id);
  }
  async updateWebhook(id: string, body: Record<string, unknown>) {
    nonemptyUpdate(body);
    validateWebhook(body);
    return this.resource('patch', `/webhooks/${identifier(id)}`, webhook, body, id);
  }
  async deleteWebhook(id: string) {
    await this.request('delete', `/webhooks/${identifier(id)}`);
  }
  async listRoles() {
    return this.paginate('/roles', role);
  }
}
