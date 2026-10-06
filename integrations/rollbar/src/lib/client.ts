import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

const optionalString = z
  .union([z.string(), z.number()])
  .nullish()
  .transform(v => (v == null ? undefined : String(v)));
const optionalNumber = z
  .number()
  .nullish()
  .transform(v => v ?? undefined);
const itemSummarySchema = z.object({
  id: z.number(),
  counter: optionalNumber,
  title: optionalString,
  status: optionalString,
  level: z.union([z.string(), z.number()]).optional(),
  level_string: optionalString
});
const itemSchema = itemSummarySchema.extend({
  counter: z.number(),
  title: z.string(),
  status: z.string(),
  level: z.union([z.string(), z.number()]),
  project_id: optionalNumber,
  environment: optionalString,
  framework: optionalString,
  total_occurrences: z.number(),
  last_occurrence_timestamp: optionalNumber,
  first_occurrence_timestamp: optionalNumber,
  unique_occurrences: optionalNumber,
  platform: optionalString,
  hash: optionalString,
  assigned_user: z.unknown().optional(),
  assigned_user_id: optionalNumber,
  last_activated_timestamp: optionalNumber,
  integrations_data: z.unknown().optional()
});
const occurrenceSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  item_id: optionalNumber,
  timestamp: optionalNumber,
  level: z.union([z.string(), z.number()]).optional(),
  level_string: optionalString,
  data: z
    .object({
      uuid: optionalString,
      level: z.union([z.string(), z.number()]).optional(),
      level_string: optionalString,
      environment: optionalString,
      framework: optionalString,
      platform: optionalString,
      language: optionalString,
      code_version: optionalString,
      server: z.unknown().optional(),
      request: z.unknown().optional(),
      person: z.unknown().optional(),
      body: z.unknown().optional(),
      custom: z.unknown().optional()
    })
    .optional()
});
const deploySchema = z.object({
  id: z.number(),
  environment: optionalString,
  revision: optionalString,
  status: optionalString,
  local_username: optionalString,
  rollbar_username: optionalString,
  comment: optionalString,
  start_time: optionalNumber,
  finish_time: optionalNumber,
  project_id: optionalNumber
});
const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: optionalString,
  account_id: optionalNumber,
  date_created: optionalNumber,
  date_modified: optionalNumber
});
const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  access_level: optionalString,
  account_id: optionalNumber
});
const userSchema = z.object({
  id: z.number(),
  username: optionalString,
  email: optionalString
});
const tokenSchema = z.object({
  name: z.string(),
  access_token: optionalString,
  public_id: optionalString,
  token_type: optionalString,
  scopes: z.array(z.string()).optional(),
  status: optionalString,
  rate_limit_window_size: optionalNumber,
  rate_limit_window_count: optionalNumber
});
const ruleSchema = z.looseObject({
  id: z.number(),
  trigger: optionalString,
  status: optionalString,
  enabled: z.boolean().optional()
});
const serviceLinkSchema = z.object({ id: z.number(), name: z.string(), template: z.string() });
const invitationSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  to_email: z.string(),
  status: z.string()
});
const jobSchema = z.looseObject({ id: z.number(), status: z.string() });
const resultSchema = z.object({
  job_id: z.number(),
  result: z.object({
    columns: z.array(z.unknown()).optional(),
    selectionColumns: z.array(z.unknown()).optional(),
    rows: z.array(z.unknown()),
    rowcount: optionalNumber,
    errors: z.array(z.unknown()).optional(),
    warnings: z.array(z.unknown()).optional()
  })
});
export type Item = z.output<typeof itemSchema>;
export type Occurrence = z.output<typeof occurrenceSchema>;
export type Deploy = z.output<typeof deploySchema>;
export type Token = z.output<typeof tokenSchema>;
export type Rule = z.output<typeof ruleSchema>;
export type RqlResult = z.output<typeof resultSchema>;
type Params = Record<string, unknown>;
type Auth = { token: string; tokenType?: 'project' | 'account'; postServerToken?: string };
export const versionEvents = ['new', 'repeated', 'reactivated', 'resolved'] as const;

export const validId = (value: number, label: string) => {
  if (!Number.isSafeInteger(value) || value < 1)
    throw createApiServiceError(
      `${label} must be a positive integer returned by a list or create tool.`
    );
  return value;
};
export const levelName = (level: string | number | undefined) => {
  if (typeof level === 'string') return level;
  return (
    (
      { 10: 'debug', 20: 'info', 30: 'warning', 40: 'error', 50: 'critical' } as Record<
        number,
        string
      >
    )[level ?? 0] ?? 'unknown'
  );
};
export const mapItem = (item: Item) => ({
  itemId: item.id,
  counter: item.counter,
  title: item.title,
  status: item.status,
  level: levelName(item.level_string ?? item.level),
  environment: item.environment,
  framework: item.framework,
  totalOccurrences: item.total_occurrences,
  lastOccurrenceTimestamp: item.last_occurrence_timestamp,
  firstOccurrenceTimestamp: item.first_occurrence_timestamp,
  uniqueOccurrences: item.unique_occurrences,
  platform: item.platform,
  projectId: item.project_id,
  hash: item.hash,
  assignedUser: item.assigned_user,
  assignedUserId: item.assigned_user_id,
  lastActivatedTimestamp: item.last_activated_timestamp,
  integrationsData: item.integrations_data
});
export const mapOccurrence = (occ: Occurrence) => ({
  occurrenceId: occ.id,
  itemId: occ.item_id,
  timestamp: occ.timestamp,
  level: levelName(occ.data?.level_string ?? occ.data?.level ?? occ.level_string ?? occ.level),
  environment: occ.data?.environment,
  framework: occ.data?.framework,
  platform: occ.data?.platform,
  language: occ.data?.language,
  server: occ.data?.server,
  body: occ.data?.body,
  request: occ.data?.request,
  person: occ.data?.person,
  custom: occ.data?.custom,
  codeVersion: occ.data?.code_version,
  occurrenceUuid: occ.data?.uuid
});
export const mapDeploy = (deploy: Deploy) => ({
  deployId: deploy.id,
  environment: deploy.environment,
  revision: deploy.revision,
  status: deploy.status,
  localUsername: deploy.local_username,
  rollbarUsername: deploy.rollbar_username,
  comment: deploy.comment,
  startTime: deploy.start_time,
  finishTime: deploy.finish_time,
  projectId: deploy.project_id
});
export const mapRqlResult = (data: RqlResult) => {
  const candidates = [data.result.selectionColumns, data.result.columns];
  const columns = candidates.find(
    (value): value is string[] => value?.every(column => typeof column === 'string') === true
  );
  return {
    columns,
    rows: data.result.rows,
    rowCount: data.result.rowcount ?? data.result.rows.length,
    errors: data.result.errors,
    warnings: data.result.warnings
  };
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(
    private auth: Auth,
    private projectId?: number
  ) {
    if (projectId !== undefined) validId(projectId, 'projectId');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.rollbar.com/api/1',
      authHeader: { name: 'X-Rollbar-Access-Token', value: auth.token },
      timeout: 30_000,
      maxRedirects: 0
    });
  }
  private async request<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
    params?: Params,
    options: { account?: boolean; ingestion?: boolean; direct?: boolean; empty?: boolean } = {}
  ) {
    if (options.account && this.auth.tokenType === 'project')
      throw createApiServiceError(
        'This operation requires an account access token with the appropriate read or write scope.'
      );
    if (
      !options.account &&
      !options.ingestion &&
      this.auth.tokenType === 'account' &&
      this.projectId === undefined
    )
      throw createApiServiceError(
        'Provide projectId from manage_project (action "list") when using an account access token.'
      );
    if (options.ingestion && this.auth.tokenType === 'account' && !this.auth.postServerToken)
      throw createApiServiceError(
        'Configure a separate project postServerToken with post_server_item scope to report occurrences or deploys.'
      );
    const projectId = !options.account && !options.ingestion ? this.projectId : undefined;
    const scopedParams = pickDefined({ ...params, project_id: projectId });
    const scopedBody =
      projectId !== undefined &&
      method !== 'get' &&
      body !== null &&
      typeof body === 'object' &&
      !Array.isArray(body)
        ? { ...body, project_id: projectId }
        : body;
    const data = await requestAxiosData<unknown>(
      `${method.toUpperCase()} ${path}`,
      () =>
        this.http.request({
          method,
          url: path,
          data: scopedBody,
          params: scopedParams,
          ...(options.ingestion
            ? {
                headers: {
                  'X-Rollbar-Access-Token': this.auth.postServerToken ?? this.auth.token
                }
              }
            : {})
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Rollbar',
          reason: 'rollbar_api_error',
          operation,
          extractMessage: (upstream, helpers) => {
            let message = helpers.extractMessage(upstream);
            const targetToken = isApiErrorRecord(scopedBody)
              ? scopedBody.project_access_token
              : undefined;
            for (const secret of [this.auth.token, this.auth.postServerToken, targetToken])
              if (typeof secret === 'string' && secret)
                message = message.replaceAll(secret, '[redacted]');
            return message;
          }
        })
    );
    const envelope = z
      .object({ err: z.number(), result: z.unknown().optional() })
      .safeParse(data);
    let result: unknown;
    if (envelope.success) {
      if (envelope.data.err !== 0) {
        // Token-management error payloads can contain credentials; never echo the raw payload.
        throw createApiServiceError(
          'Rollbar rejected the request. Check token scopes, project selection, identifiers and request fields.',
          {
            reason: 'rollbar_api_error',
            upstreamCode: String(envelope.data.err)
          }
        );
      }
      result = envelope.data.result;
    } else if (options.direct) result = data;
    else if (options.empty && (data === '' || data == null)) result = undefined;
    else throw createApiServiceError('Rollbar returned an invalid API response envelope.');
    const parsed = schema.safeParse(result);
    if (!parsed.success)
      throw createApiServiceError('Rollbar returned an unexpected response shape.');
    return { result: parsed.data };
  }
  private page(params: Params = {}) {
    for (const key of ['page', 'limit', 'last_id'])
      if (params[key] !== undefined) validId(Number(params[key]), key);
    if (typeof params.limit === 'number' && params.limit > 5000)
      throw createApiServiceError('limit cannot exceed 5000.');
    return pickDefined(params);
  }
  listItems(params: {
    status?: string;
    level?: string;
    environment?: string;
    page?: number;
    ids?: string;
    query?: string;
  }) {
    return this.request(
      'get',
      '/items',
      z.object({
        items: z.array(itemSchema),
        page: optionalNumber,
        total_count: optionalNumber
      }),
      undefined,
      this.page(params)
    );
  }
  getItem(id: number) {
    return this.request('get', `/item/${validId(id, 'itemId')}`, itemSchema);
  }
  getItemByCounter(counter: number) {
    return this.request('get', '/item', itemSchema, undefined, {
      counter: validId(counter, 'counter')
    });
  }
  getItemByUuid(uuid: string) {
    if (!/^[a-fA-F0-9]{32}$/.test(uuid))
      throw createApiServiceError(
        'occurrenceUuid must contain exactly 32 hexadecimal characters.'
      );
    return this.request('get', '/item', itemSchema, undefined, { uuid });
  }
  async updateItem(
    id: number,
    data: {
      status?: string;
      level?: string;
      title?: string;
      assigned_user_id?: number | null;
      resolved_in_version?: string;
    }
  ) {
    const body = pickDefined(data);
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one item property to update.');
    if (data.title !== undefined && (!data.title.trim() || data.title.length > 255))
      throw createApiServiceError('title must contain 1 to 255 characters.');
    if (data.assigned_user_id != null) validId(data.assigned_user_id, 'assignedUserId');
    if (
      data.resolved_in_version !== undefined &&
      (data.status !== 'resolved' || data.resolved_in_version.length > 40)
    )
      throw createApiServiceError(
        'resolvedInVersion requires status "resolved" and at most 40 characters.'
      );
    return this.request('patch', `/item/${validId(id, 'itemId')}`, itemSchema, body);
  }
  listOccurrences(params: { page?: number; limit?: number; last_id?: number }) {
    return this.request(
      'get',
      '/instances',
      z.object({ instances: z.array(occurrenceSchema), page: optionalNumber }),
      undefined,
      this.page(params)
    );
  }
  listItemOccurrences(
    id: number,
    params: { page?: number; limit?: number; last_id?: number }
  ) {
    return this.request(
      'get',
      `/item/${validId(id, 'itemId')}/instances`,
      z.object({ instances: z.array(occurrenceSchema), page: optionalNumber }),
      undefined,
      this.page(params)
    );
  }
  private occurrencePath(id: string) {
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1)
      throw createApiServiceError(
        'occurrenceId must be a positive numeric ID from list_occurrences, not an ingestion UUID.'
      );
    return `/instance/${encodeURIComponent(id)}`;
  }
  getOccurrence(id: string) {
    return this.request('get', this.occurrencePath(id), occurrenceSchema);
  }
  deleteOccurrence(id: string) {
    return this.request('delete', this.occurrencePath(id), z.unknown(), undefined, undefined, {
      empty: true
    });
  }
  createOccurrence(data: {
    environment: string;
    message: string;
    level?: string;
    fingerprint?: string;
    uuid: string;
    codeVersion?: string;
  }) {
    if (!data.environment.trim() || !data.message.trim())
      throw createApiServiceError('environment and message must be nonempty.');
    if (data.codeVersion !== undefined && data.codeVersion.length > 40)
      throw createApiServiceError('codeVersion cannot exceed 40 characters.');
    if (!/^[a-fA-F0-9]{32}$/.test(data.uuid))
      throw createApiServiceError(
        'occurrenceUuid must contain exactly 32 hexadecimal characters.'
      );
    return this.request(
      'post',
      '/item/',
      z.object({ uuid: z.string() }),
      {
        data: pickDefined({
          environment: data.environment,
          body: { message: { body: data.message } },
          level: data.level ?? 'error',
          fingerprint: data.fingerprint,
          uuid: data.uuid,
          code_version: data.codeVersion,
          platform: 'server'
        })
      },
      undefined,
      { ingestion: true }
    );
  }
  async createDeploy(data: {
    environment: string;
    revision: string;
    rollbar_username?: string;
    local_username?: string;
    comment?: string;
    status?: string;
  }) {
    if (!data.environment.trim() || !data.revision.trim())
      throw createApiServiceError('environment and revision must be nonempty.');
    const schema = z.union([
      z.object({ deploy_id: z.number() }),
      z.object({ id: z.number() }),
      z.object({ data: z.object({ deploy_id: z.number() }) })
    ]);
    const response = await this.request(
      'post',
      '/deploy',
      schema,
      pickDefined(data),
      undefined,
      { ingestion: true, direct: true }
    );
    const id =
      'data' in response.result
        ? response.result.data.deploy_id
        : 'deploy_id' in response.result
          ? response.result.deploy_id
          : response.result.id;
    return { result: { id, deploy_id: id, ...data, status: data.status ?? 'succeeded' } };
  }
  async listDeploys(params: { page?: number; environment?: string; limit?: number }) {
    const response = await this.request(
      'get',
      '/deploys',
      z.object({ deploys: z.array(deploySchema), page: optionalNumber }),
      undefined,
      this.page({ page: params.page, limit: params.limit })
    );
    const sourceCount = response.result.deploys.length;
    return {
      result: {
        ...response.result,
        sourceCount,
        deploys:
          params.environment === undefined
            ? response.result.deploys
            : response.result.deploys.filter(
                deploy => deploy.environment === params.environment
              )
      }
    };
  }
  getDeploy(id: number) {
    return this.request('get', `/deploy/${validId(id, 'deployId')}`, deploySchema);
  }
  listProjects() {
    return this.request('get', '/projects', z.array(projectSchema), undefined, undefined, {
      account: true
    });
  }
  getProject(id: number) {
    return this.request(
      'get',
      `/project/${validId(id, 'projectId')}`,
      projectSchema,
      undefined,
      undefined,
      { account: true }
    );
  }
  createProject(data: { name: string }) {
    if (!/^[A-Za-z][A-Za-z0-9 _.,-]{0,31}$/.test(data.name))
      throw createApiServiceError(
        'Project names must start with a letter, contain only letters, numbers, spaces, underscores, hyphens, periods or commas, and have at most 32 characters.'
      );
    return this.request('post', '/projects', projectSchema, data, undefined, {
      account: true,
      direct: true
    });
  }
  deleteProject(id: number) {
    return this.request(
      'delete',
      `/project/${validId(id, 'projectId')}`,
      z.unknown(),
      undefined,
      undefined,
      { account: true, empty: true }
    );
  }
  listProjectAccessTokens(id: number) {
    return this.request(
      'get',
      `/project/${validId(id, 'projectId')}/access_tokens`,
      z.array(tokenSchema),
      undefined,
      undefined,
      { account: true }
    );
  }
  createProjectAccessToken(
    id: number,
    data: {
      name: string;
      scopes: string[];
      rate_limit_window_size?: number;
      rate_limit_window_count?: number;
    }
  ) {
    if (!data.name.trim() || !data.scopes.length)
      throw createApiServiceError('Provide a nonempty name and at least one scope.');
    if (
      data.scopes.some(scope => scope.startsWith('post_')) &&
      data.scopes.some(scope => scope === 'read' || scope === 'write')
    )
      throw createApiServiceError(
        'Use separate ingestion and read/write tokens; post_server_item and post_client_item cannot be combined with read or write.'
      );
    for (const key of ['rate_limit_window_size', 'rate_limit_window_count'] as const)
      if (data[key] !== undefined) validId(data[key], key);
    return this.request(
      'post',
      `/project/${validId(id, 'projectId')}/access_tokens`,
      tokenSchema,
      pickDefined({ ...data, token_type: 'v2' }),
      undefined,
      { account: true }
    );
  }
  async updateProjectAccessToken(
    id: number,
    identifier: { public_id?: string; project_access_token?: string },
    data: { rate_limit_window_size?: number; rate_limit_window_count?: number }
  ) {
    if (!Object.keys(pickDefined(data)).length)
      throw createApiServiceError('Provide at least one rate-limit setting to update.');
    for (const key of ['rate_limit_window_size', 'rate_limit_window_count'] as const)
      if (data[key] !== undefined && (!Number.isSafeInteger(data[key]) || data[key] < 0))
        throw createApiServiceError(`${key} must be a nonnegative integer.`);
    await this.request(
      'patch',
      `/project/${validId(id, 'projectId')}/access_token`,
      z.unknown(),
      pickDefined({ ...identifier, ...data }),
      undefined,
      { account: true }
    );
    const tokens = (await this.listProjectAccessTokens(id)).result;
    const token = tokens.find(t =>
      identifier.public_id
        ? t.public_id === identifier.public_id
        : t.access_token === identifier.project_access_token
    );
    if (!token)
      throw createApiServiceError(
        'The token update was accepted but could not be read back. Use tokenPublicId for encrypted access tokens.'
      );
    return { result: token };
  }
  deleteProjectAccessToken(
    id: number,
    identifier: { public_id?: string; project_access_token?: string }
  ) {
    return this.request(
      'delete',
      `/project/${validId(id, 'projectId')}/access_token`,
      z.unknown(),
      pickDefined(identifier),
      undefined,
      { account: true, empty: true }
    );
  }
  listTeams() {
    return this.request('get', '/teams', z.array(teamSchema), undefined, undefined, {
      account: true
    });
  }
  getTeam(id: number) {
    return this.request(
      'get',
      `/team/${validId(id, 'teamId')}`,
      teamSchema,
      undefined,
      undefined,
      { account: true }
    );
  }
  createTeam(data: { name: string; access_level?: string }) {
    if (!data.name.trim() || data.name.length > 32)
      throw createApiServiceError('Team names must contain 1 to 32 characters.');
    return this.request(
      'post',
      '/teams',
      teamSchema,
      { ...data, access_level: data.access_level ?? 'standard' },
      undefined,
      { account: true }
    );
  }
  deleteTeam(id: number) {
    return this.request(
      'delete',
      `/team/${validId(id, 'teamId')}`,
      z.unknown(),
      undefined,
      undefined,
      { account: true, empty: true }
    );
  }
  listTeamMembers(id: number, page?: number) {
    return this.request(
      'get',
      `/team/${validId(id, 'teamId')}/users`,
      z.array(userSchema),
      undefined,
      this.page({ page }),
      { account: true }
    );
  }
  addUserToTeam(id: number, userId: number) {
    return this.request(
      'put',
      `/team/${validId(id, 'teamId')}/user/${validId(userId, 'userId')}`,
      z.unknown(),
      {},
      undefined,
      { account: true, empty: true }
    );
  }
  removeUserFromTeam(id: number, userId: number) {
    return this.request(
      'delete',
      `/team/${validId(id, 'teamId')}/user/${validId(userId, 'userId')}`,
      z.unknown(),
      undefined,
      undefined,
      { account: true, empty: true }
    );
  }
  inviteUserToTeam(id: number, email: string) {
    if (!z.email().safeParse(email).success)
      throw createApiServiceError('Provide a valid invitation email address.');
    return this.request(
      'post',
      `/team/${validId(id, 'teamId')}/invites`,
      invitationSchema,
      { email },
      undefined,
      { account: true }
    );
  }
  getInvitation(id: number) {
    return this.request(
      'get',
      `/invite/${validId(id, 'invitationId')}`,
      invitationSchema,
      undefined,
      undefined,
      { account: true }
    );
  }
  listTeamInvitations(id: number, page?: number) {
    return this.request(
      'get',
      `/team/${validId(id, 'teamId')}/invites`,
      z.array(invitationSchema),
      undefined,
      this.page({ page }),
      { account: true }
    );
  }
  cancelInvitation(id: number) {
    return this.request(
      'delete',
      `/invite/${validId(id, 'invitationId')}`,
      z.unknown(),
      undefined,
      undefined,
      { account: true, empty: true }
    );
  }
  listTeamProjects(id: number) {
    return this.request(
      'get',
      `/team/${validId(id, 'teamId')}/projects`,
      z.array(z.object({ team_id: z.number(), project_id: z.number() })),
      undefined,
      undefined,
      { account: true }
    );
  }
  addProjectToTeam(id: number, projectId: number) {
    return this.request(
      'put',
      `/team/${validId(id, 'teamId')}/project/${validId(projectId, 'projectId')}`,
      z.unknown(),
      {},
      undefined,
      { account: true, empty: true }
    );
  }
  removeProjectFromTeam(id: number, projectId: number) {
    return this.request(
      'delete',
      `/team/${validId(id, 'teamId')}/project/${validId(projectId, 'projectId')}`,
      z.unknown(),
      undefined,
      undefined,
      { account: true, empty: true }
    );
  }
  async listUsers(email?: string) {
    const response = await this.request(
      'get',
      '/users',
      z.union([z.array(userSchema), z.object({ users: z.array(userSchema) })]),
      undefined,
      pickDefined({ email }),
      { account: true }
    );
    return {
      result: {
        users: Array.isArray(response.result) ? response.result : response.result.users
      }
    };
  }
  createRqlJob(query: string, params: { force_refresh?: boolean }) {
    if (!query.trim()) throw createApiServiceError('queryString must be nonempty.');
    return this.request(
      'post',
      '/rql/jobs/',
      jobSchema,
      pickDefined({ query_string: query, ...params })
    );
  }
  getRqlJob(id: number) {
    return this.request('get', `/rql/job/${validId(id, 'jobId')}`, jobSchema);
  }
  listRqlJobs(page?: number) {
    return this.request(
      'get',
      '/rql/jobs/',
      z.array(jobSchema),
      undefined,
      this.page({ page })
    );
  }
  getRqlJobResult(id: number) {
    return this.request('get', `/rql/job/${validId(id, 'jobId')}/result`, resultSchema);
  }
  cancelRqlJob(id: number) {
    return this.request('post', `/rql/job/${validId(id, 'jobId')}/cancel`, jobSchema, {});
  }
  getTopActiveItems(params: { hours?: number; environment?: string }) {
    if (
      params.hours !== undefined &&
      (!Number.isSafeInteger(params.hours) || params.hours < 1 || params.hours > 168)
    )
      throw createApiServiceError('hours must be an integer between 1 and 168.');
    return this.request(
      'get',
      '/reports/top_active_items',
      z.array(z.object({ item: itemSummarySchema, counts: z.array(z.number()) })),
      undefined,
      pickDefined({ hours: params.hours, environments: params.environment })
    );
  }
  getOccurrenceCounts(params: {
    item_id?: number;
    environment?: string;
    bucket_size?: string;
  }) {
    if (params.item_id !== undefined) validId(params.item_id, 'itemId');
    return this.request(
      'get',
      '/reports/occurrence_counts',
      z.array(z.tuple([z.number(), z.number()])),
      undefined,
      pickDefined({
        item_id: params.item_id,
        environments: params.environment,
        bucket_size: params.bucket_size
      })
    );
  }
  getActivatedCounts(params: { environment?: string; bucket_size?: string }) {
    if (params.bucket_size !== undefined && params.bucket_size !== '86400')
      throw createApiServiceError(
        'activatedCounts supports only daily bucketSize "86400". Use occurrenceCounts for minute or hour buckets.'
      );
    return this.request(
      'get',
      '/reports/activated_counts',
      z.array(z.tuple([z.number(), z.number()])),
      undefined,
      pickDefined({ environments: params.environment, bucket_size: params.bucket_size })
    );
  }
  listEnvironments(params: { page?: number; limit?: number }) {
    return this.request(
      'get',
      '/environments',
      z.object({
        page: optionalNumber,
        environments: z.array(
          z.object({
            environment: z.string(),
            visible: z.union([z.boolean(), z.number()]).optional()
          })
        )
      }),
      undefined,
      this.page(params)
    );
  }
  listNotificationRules(channel: string) {
    return this.request('get', `/notifications/${channel}/rules`, z.array(ruleSchema));
  }
  async createNotificationRule(channel: string, data: Record<string, unknown>) {
    const response = await this.request(
      'post',
      `/notifications/${channel}${channel === 'pagerduty' ? '' : '/rules'}`,
      z.array(ruleSchema),
      [data]
    );
    const rule = response.result[0];
    if (!rule)
      throw createApiServiceError(
        'Rollbar did not return the newly created notification rule.'
      );
    return { result: rule };
  }
  getNotificationRule(channel: string, id: number) {
    return this.request(
      'get',
      `/notifications/${channel}/rule/${validId(id, 'ruleId')}`,
      ruleSchema
    );
  }
  updateNotificationRule(channel: string, id: number, data: Record<string, unknown>) {
    return this.request(
      'put',
      `/notifications/${channel}/rule/${validId(id, 'ruleId')}`,
      ruleSchema,
      data
    );
  }
  deleteNotificationRule(channel: string, id: number) {
    return this.request(
      'delete',
      `/notifications/${channel}/rule/${validId(id, 'ruleId')}`,
      z.unknown(),
      undefined,
      undefined,
      { empty: true }
    );
  }
  private versionPath(version: string) {
    if (!version.trim()) throw createApiServiceError('version must be nonempty.');
    if (version === '.' || version === '..')
      throw createApiServiceError('version must not be a relative path segment.');
    try {
      return `/versions/${encodeURIComponent(version)}`;
    } catch {
      throw createApiServiceError('version contains invalid Unicode.');
    }
  }
  getVersion(version: string, environment?: string) {
    const path = this.versionPath(version);
    if (!environment?.trim())
      throw createApiServiceError(
        'environment is required. Use list_environments to discover its name.'
      );
    return this.request('get', path, z.record(z.string(), z.unknown()), undefined, {
      environment
    });
  }
  listVersionItems(
    version: string,
    params: { environment?: string; event?: string; page?: number }
  ) {
    const path = this.versionPath(version);
    if (!params.environment?.trim() || !versionEvents.some(event => event === params.event))
      throw createApiServiceError(
        'Version items require environment and event: new, repeated, reactivated or resolved.'
      );
    return this.request(
      'get',
      `${path}/items`,
      z.array(itemSummarySchema),
      undefined,
      this.page(params)
    );
  }
  listServiceLinks() {
    return this.request('get', '/service_links', z.array(serviceLinkSchema));
  }
  createServiceLink(data: { name: string; template: string }) {
    if (!data.name.trim() || !data.template.trim())
      throw createApiServiceError('name and template must be nonempty.');
    return this.request('post', '/service_links', serviceLinkSchema, data);
  }
  async updateServiceLink(id: number, data: { name?: string; template?: string }) {
    if (!Object.keys(pickDefined(data)).length)
      throw createApiServiceError('Provide name or template to update.');
    const existing = (
      await this.request(
        'get',
        `/service_links/${validId(id, 'serviceLinkId')}`,
        serviceLinkSchema
      )
    ).result;
    const body = {
      name: data.name ?? existing.name,
      template: data.template ?? existing.template
    };
    if (!body.name.trim() || !body.template.trim())
      throw createApiServiceError('name and template must be nonempty.');
    return this.request('put', `/service_links/${id}`, serviceLinkSchema, body);
  }
  deleteServiceLink(id: number) {
    return this.request(
      'delete',
      `/service_links/${validId(id, 'serviceLinkId')}`,
      z.unknown(),
      undefined,
      undefined,
      { empty: true }
    );
  }
}

export const createClient = (ctx: { auth: Auth; input: Record<string, unknown> }) =>
  new Client(
    ctx.auth,
    typeof ctx.input.projectId === 'number' ? ctx.input.projectId : undefined
  );
