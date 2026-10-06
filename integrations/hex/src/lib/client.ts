import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

type Row = Record<string, unknown>;
export interface PaginationParams {
  limit?: number;
  after?: string;
  before?: string;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}
export interface PaginatedResponse<T> {
  values: T[];
  pagination: { after?: string; before?: string };
}
export interface HexProject {
  projectId: string;
  title: string;
  description: string | null;
  status: string | null;
  categories: string[];
  creator: { userId?: string; email: string; name?: string } | null;
  owner: { userId?: string; email: string; name?: string } | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  sharing?: {
    workspace?: string;
    publicWeb?: string;
    users?: Array<{ userId?: string; email?: string; accessLevel: string }>;
    groups?: Array<{ groupId?: string; name?: string; accessLevel: string }>;
    collections?: Array<{ collectionId?: string; name?: string; accessLevel: string }>;
  };
}
export interface HexRun {
  projectId: string;
  runId: string;
  runUrl: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  elapsedTime: number | null;
  traceId: string | null;
  projectVersion?: string;
}
export interface RunProjectParams {
  inputParams?: Row;
  dryRun?: boolean;
  updateCache?: boolean;
  updatePublishedResults?: boolean;
  useCachedSqlResults?: boolean;
  viewId?: string;
  notifications?: Array<{ type: string; target: unknown }>;
}
export interface HexUser {
  userId: string;
  name: string | null;
  email: string;
  role: string;
  lastLoginAt: string | null;
  createdAt?: string;
}
export interface HexGroup {
  groupId: string;
  name: string;
  createdAt: string;
}
export interface HexCollection {
  collectionId: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface HexDataConnection {
  dataConnectionId: string;
  name: string;
  type: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface EmbeddingParams {
  hexUserAttributes?: Record<string, string>;
  scope?: string[];
  inputParameters?: Row;
  expiresIn?: number;
  displayOptions?: {
    theme?: string;
    showPadding?: boolean;
    showHeader?: boolean;
    showEmbeddedRunButton?: boolean;
    noEmbedFooter?: boolean;
  };
  testMode?: boolean;
}
export interface Identity {
  workspaceId: string;
  userId?: string;
  name?: string | null;
  email?: string;
  role?: string;
  lastLoginAt?: string | null;
  expiresAt?: number | null;
}
export function object(value: unknown): Row {
  if (!isApiErrorRecord(value)) throw createApiServiceError('Hex returned an invalid object.');
  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value))
    throw createApiServiceError('Hex returned an invalid collection.');
  return value;
}
function string(value: unknown): string {
  if (typeof value !== 'string')
    throw createApiServiceError('Hex returned incomplete resource metadata.');
  return value;
}
function nullableString(value: unknown): string | null {
  return value === null ? null : string(value);
}
export function nonempty(value: string, label: string): string {
  if (!value.trim() || /[\r\n\0]/.test(value))
    throw createApiServiceError(`Provide a valid ${label}.`);
  return value;
}
export function uuid(value: string, label = 'resource ID'): string {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value))
    throw createApiServiceError(
      `${label} must be a Hex UUID. Use the relevant list tool to discover it.`
    );
  return value.toLowerCase();
}
export function baseUrl(value: unknown = 'https://app.hex.tech'): string {
  if (typeof value !== 'string')
    throw createApiServiceError('Provide a valid Hex deployment URL.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Provide a valid Hex deployment URL.');
  }
  if (
    url.protocol !== 'https:' ||
    !/^(?:[a-z0-9-]+\.)+hex\.tech$/i.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !['', '/'].includes(url.pathname)
  )
    throw createApiServiceError(
      'Use the HTTPS origin of your Hex deployment, such as https://app.hex.tech or https://eu.hex.tech, without a path or credentials.'
    );
  return url.origin;
}
function person(value: unknown) {
  if (value === null) return null;
  const r = object(value);
  return {
    ...pickDefined({
      userId: typeof r.id === 'string' ? r.id : undefined,
      name: typeof r.name === 'string' ? r.name : undefined
    }),
    email: string(r.email)
  };
}
function project(value: unknown, expectedId?: string): HexProject {
  const r = object(value);
  const id = uuid(string(r.id));
  if (expectedId && id !== uuid(expectedId))
    throw createApiServiceError('Hex returned a different project than requested.');
  const result: HexProject = {
    projectId: id,
    title: string(r.title),
    description: nullableString(r.description),
    status: r.status === null ? null : string(object(r.status).name),
    categories: array(r.categories).map(v => string(object(v).name)),
    creator: person(r.creator),
    owner: person(r.owner),
    createdAt: string(r.createdAt),
    updatedAt: string(r.lastEditedAt),
    publishedAt: nullableString(r.lastPublishedAt)
  };
  if (r.sharing !== undefined) {
    const sharing = object(r.sharing);
    result.sharing = {
      workspace: string(object(sharing.workspace).access),
      publicWeb: string(object(sharing.publicWeb).access),
      users: array(sharing.users).map(v => {
        const x = object(v),
          user = object(x.user);
        return {
          ...pickDefined({ userId: typeof user.id === 'string' ? user.id : undefined }),
          email: string(user.email),
          accessLevel: string(x.access)
        };
      }),
      groups: array(sharing.groups).map(v => {
        const x = object(v),
          g = object(x.group);
        return {
          ...pickDefined({ groupId: typeof g.id === 'string' ? g.id : undefined }),
          name: string(g.name),
          accessLevel: string(x.access)
        };
      }),
      collections: array(sharing.collections).map(v => {
        const x = object(v),
          c = object(x.collection);
        return {
          ...pickDefined({ collectionId: typeof c.id === 'string' ? c.id : undefined }),
          name: string(c.name),
          accessLevel: string(x.access)
        };
      })
    };
  }
  return result;
}
function group(value: unknown, expectedId?: string): HexGroup {
  const r = object(value),
    id = uuid(string(r.id));
  if (expectedId && uuid(expectedId) !== id)
    throw createApiServiceError('Hex returned a different group.');
  return { groupId: id, name: string(r.name), createdAt: string(r.createdAt) };
}
function collection(value: unknown, expectedId?: string): HexCollection {
  const r = object(value),
    id = uuid(string(r.id));
  if (expectedId && uuid(expectedId) !== id)
    throw createApiServiceError('Hex returned a different collection.');
  return {
    ...pickDefined({
      description: r.description === undefined ? undefined : nullableString(r.description),
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : undefined,
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined
    }),
    collectionId: id,
    name: string(r.name)
  };
}
function connection(value: unknown, expectedId?: string): HexDataConnection {
  const r = object(value),
    id = uuid(string(r.id));
  if (expectedId && id !== uuid(expectedId))
    throw createApiServiceError('Hex returned a different data connection.');
  return {
    ...pickDefined({
      description: r.description === undefined ? undefined : nullableString(r.description),
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : undefined,
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined
    }),
    dataConnectionId: id,
    name: string(r.name),
    type: string(r.type)
  };
}
function run(value: unknown, projectId: string, runId?: string): HexRun {
  const r = object(value);
  const actualProjectId = uuid(string(r.projectId)),
    actualRunId = uuid(string(r.runId));
  if (
    actualProjectId !== uuid(projectId) ||
    (runId !== undefined && actualRunId !== uuid(runId))
  )
    throw createApiServiceError('Hex returned a different project run.');
  if (r.elapsedTime !== null && typeof r.elapsedTime !== 'number')
    throw createApiServiceError('Hex returned invalid run timing.');
  return {
    projectId: actualProjectId,
    runId: actualRunId,
    runUrl: string(r.runUrl),
    status: string(r.status),
    startTime: nullableString(r.startTime),
    endTime: nullableString(r.endTime),
    elapsedTime: r.elapsedTime as number | null,
    traceId: nullableString(r.traceId),
    projectVersion: r.projectVersion === undefined ? undefined : string(r.projectVersion)
  };
}
function ids(values: string[], label: string, max = 100) {
  if (values.length > max || new Set(values).size !== values.length)
    throw createApiServiceError(`${label} must contain at most ${max} distinct IDs.`);
  return values.map(id => uuid(id, label));
}
function page(params: PaginationParams, max: number, order: string[]) {
  if (
    params.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > max)
  )
    throw createApiServiceError(`limit must be an integer from 1 to ${max}.`);
  if (params.after !== undefined && params.before !== undefined)
    throw createApiServiceError('Use after or before, not both.');
  if (params.sortBy !== undefined && !order.includes(params.sortBy))
    throw createApiServiceError(
      `This endpoint supports sortBy ${order.join(', ')}. The legacy sort field cannot be applied by this API.`
    );
  return pickDefined(params);
}
function pagination(value: unknown) {
  const r = object(value);
  return pickDefined({
    after: r.after == null ? undefined : string(r.after),
    before: r.before == null ? undefined : string(r.before)
  });
}
function notifications(values: NonNullable<RunProjectParams['notifications']>): Row[] {
  return values.map(({ type, target }) => {
    if (['slack_channel', 'hex_user', 'hex_group'].includes(type)) {
      const list =
        typeof target === 'string'
          ? [target]
          : Array.isArray(target) && target.every(v => typeof v === 'string')
            ? target
            : undefined;
      if (!list?.length)
        throw createApiServiceError(
          'Legacy notification targets must be a recipient ID or an array of recipient IDs.'
        );
      const key =
        type === 'slack_channel'
          ? 'slackChannelIds'
          : type === 'hex_user'
            ? 'userIds'
            : 'groupIds';
      for (const id of list)
        type === 'slack_channel'
          ? nonempty(id, 'Slack channel ID')
          : uuid(id, 'notification recipient');
      return { type: 'ALL', includeSuccessScreenshot: false, [key]: list };
    }
    if (!['SUCCESS', 'FAILURE', 'ALL'].includes(type))
      throw createApiServiceError(
        'Notification type must be SUCCESS, FAILURE, ALL, slack_channel, hex_user or hex_group.'
      );
    const r = object(target);
    const parsed = z
      .object({
        userIds: z.array(z.string()).optional(),
        groupIds: z.array(z.string()).optional(),
        slackChannelIds: z.array(z.string()).optional(),
        includeSuccessScreenshot: z.boolean().optional(),
        screenshotFormat: z.enum(['png', 'pdf']).optional(),
        subject: z.string().optional(),
        body: z.string().optional()
      })
      .safeParse(r);
    if (!parsed.success)
      throw createApiServiceError(
        'Provide documented notification recipients and options in target.'
      );
    for (const k of ['userIds', 'groupIds'] as const)
      if (parsed.data[k]) ids(parsed.data[k], k);
    if (
      ![parsed.data.userIds, parsed.data.groupIds, parsed.data.slackChannelIds].some(
        v => v?.length
      )
    )
      throw createApiServiceError('A notification needs at least one explicit recipient.');
    return pickDefined({
      ...parsed.data,
      type,
      includeSuccessScreenshot: parsed.data.includeSuccessScreenshot ?? false
    });
  });
}
export function validateSharing(data: {
  users?: Array<{ userId: string; accessLevel: string }>;
  groups?: Array<{ groupId: string; accessLevel: string }>;
  collections?: Array<{ collectionId: string; accessLevel: string }>;
  workspace?: string;
  publicWeb?: string;
}) {
  let supplied = false;
  for (const [kind, list] of [
    ['users', data.users],
    ['groups', data.groups],
    ['collections', data.collections]
  ] as const) {
    if (list !== undefined) {
      if (!list.length)
        throw createApiServiceError(
          `Provide at least one ${kind} sharing entry, or omit the field.`
        );
      supplied = true;
      ids(
        list.map(v =>
          kind === 'users'
            ? (v as { userId: string }).userId
            : kind === 'groups'
              ? (v as { groupId: string }).groupId
              : (v as { collectionId: string }).collectionId
        ),
        kind,
        25
      );
    }
  }
  if (data.workspace !== undefined || data.publicWeb !== undefined) supplied = true;
  if (!supplied) throw createApiServiceError('Provide at least one sharing change.');
}
export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  readonly origin: string;
  constructor(config: { token: string; baseUrl?: unknown }) {
    nonempty(config.token, 'Hex API token');
    this.origin = baseUrl(config.baseUrl);
    this.axios = createAuthenticatedAxios({
      baseURL: `${this.origin}/api/v1`,
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Hex',
          reason: 'hex_api_error',
          formatMessage: ({ status }) =>
            `Hex request failed${status ? ` (HTTP ${status})` : ''}. Check token scopes, deployment, resource IDs and plan access.`,
          parent: createApiServiceError('Hex upstream request failed.', {
            upstreamStatus: getApiErrorStatus(error)
          })
        })
    });
  }
  private resourceUrl(value: unknown): string {
    const href = string(value);
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      throw createApiServiceError('Hex returned an invalid run URL.');
    }
    if (
      url.origin !== this.origin ||
      url.protocol !== 'https:' ||
      url.username ||
      url.password
    )
      throw createApiServiceError('Hex returned an unexpected run URL origin.');
    return href;
  }
  private async data(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    body?: unknown,
    params?: Row,
    status = 200
  ): Promise<unknown> {
    const response = await this.axios.request<unknown>({
      method,
      url: path,
      data: body,
      params,
      paramsSerializer: { indexes: null }
    });
    if (response.status !== status)
      throw createApiServiceError(
        'Hex did not confirm the requested operation. Inspect the resource before retrying.'
      );
    const r = object(response.data);
    if ('reason' in r || ('error' in r && !('id' in r)))
      throw createApiServiceError(
        'Hex returned an API error. Inspect resource permissions and supplied values.'
      );
    return r;
  }
  private async list<T>(
    path: string,
    params: Row,
    mapper: (v: unknown) => T
  ): Promise<PaginatedResponse<T>> {
    const r = object(await this.data('GET', path, undefined, params));
    return { values: array(r.values).map(mapper), pagination: pagination(r.pagination) };
  }
  async getCurrentUser(): Promise<Identity> {
    const r = object(await this.data('GET', '/users/me')),
      org = object(r.org);
    const identity: Identity = { workspaceId: nonempty(string(org.id), 'workspace ID') };
    if (r.id !== undefined) {
      identity.userId = uuid(string(r.id));
      identity.email = string(r.email);
      identity.name = nullableString(r.name);
      identity.role = string(r.role);
      identity.lastLoginAt = nullableString(r.lastLoginDate);
    }
    if (r.token != null) {
      const exp = object(r.token).exp;
      if (exp !== null && (typeof exp !== 'number' || !Number.isFinite(exp)))
        throw createApiServiceError('Hex returned invalid token expiry metadata.');
      identity.expiresAt = exp as number | null;
    }
    return identity;
  }
  listProjects(
    params: PaginationParams & {
      includeArchived?: boolean;
      includeComponents?: boolean;
      includeTrashed?: boolean;
      includeSharing?: boolean;
      statuses?: string[];
      categories?: string[];
      creatorEmail?: string;
      ownerEmail?: string;
      collectionId?: string;
    } = {}
  ) {
    if (params.collectionId !== undefined) uuid(params.collectionId);
    return this.list(
      '/projects',
      page(params, 100, ['CREATED_AT', 'LAST_EDITED_AT', 'LAST_PUBLISHED_AT']),
      v => project(v)
    );
  }
  async getProject(id: string, includeSharing?: boolean) {
    uuid(id);
    return project(
      await this.data('GET', `/projects/${id}`, undefined, pickDefined({ includeSharing })),
      id
    );
  }
  async createProject(title: string, description?: string) {
    nonempty(title, 'project title');
    return project(
      await this.data('POST', '/projects', pickDefined({ title, description }), undefined, 201)
    );
  }
  async updateProjectStatus(id: string, status: string | null) {
    uuid(id);
    if (status !== null) nonempty(status, 'status name');
    return project(await this.data('PATCH', `/projects/${id}`, { status }), id);
  }
  async runProject(id: string, params: RunProjectParams = {}) {
    uuid(id);
    if (params.viewId !== undefined) nonempty(params.viewId, 'viewId');
    if (
      params.updateCache !== undefined &&
      (params.updatePublishedResults !== undefined || params.useCachedSqlResults !== undefined)
    )
      throw createApiServiceError(
        'Use legacy updateCache or the current cache/result options, not both.'
      );
    const r = object(
      await this.data(
        'POST',
        `/projects/${id}/runs`,
        pickDefined({
          ...params,
          notifications:
            params.notifications === undefined
              ? undefined
              : notifications(params.notifications)
        }),
        undefined,
        201
      )
    );
    const acceptedProjectId = uuid(string(r.projectId));
    if (acceptedProjectId !== uuid(id))
      throw createApiServiceError('Hex returned an unexpected run project.');
    return {
      projectId: acceptedProjectId,
      runId: uuid(string(r.runId), 'runId'),
      runUrl: this.resourceUrl(r.runUrl),
      runStatusUrl: this.resourceUrl(r.runStatusUrl),
      projectVersion: typeof r.projectVersion === 'number' ? r.projectVersion : undefined
    };
  }
  async getProjectRuns(
    id: string,
    params: { limit?: number; offset?: number; statusFilter?: string } = {}
  ) {
    uuid(id);
    page({ limit: params.limit }, 100, []);
    if (params.offset !== undefined && (!Number.isInteger(params.offset) || params.offset < 0))
      throw createApiServiceError('offset must be a non-negative integer.');
    const r = object(
      await this.data(
        'GET',
        `/projects/${id}/runs`,
        undefined,
        pickDefined({ ...params, runTriggerFilter: 'API' })
      )
    );
    return {
      runs: array(r.runs).map(v => run(v, id)),
      nextPage: r.nextPage == null ? undefined : string(r.nextPage),
      previousPage: r.previousPage == null ? undefined : string(r.previousPage)
    };
  }
  async getRunStatus(id: string, runId: string) {
    uuid(id);
    uuid(runId, 'runId');
    return run(await this.data('GET', `/projects/${id}/runs/${runId}`), id, runId);
  }
  private async acknowledgement(method: 'POST' | 'DELETE', path: string, status: number) {
    const r = await this.axios.request({ method, url: path });
    if (r.status !== status)
      throw createApiServiceError(
        'Hex did not confirm the requested operation. Inspect its current state before retrying.'
      );
    if (r.data && typeof r.data === 'object' && 'reason' in r.data)
      throw createApiServiceError('Hex rejected the requested operation.');
  }
  async cancelRun(id: string, runId: string) {
    uuid(id);
    uuid(runId);
    await this.acknowledgement('DELETE', `/projects/${id}/runs/${runId}`, 204);
  }
  private async sharing(id: string, part: string, body: Row) {
    uuid(id);
    const r = object(
      await this.data('PATCH', `/projects/${id}/sharing/${part}`, { sharing: body })
    );
    if (r.errors !== undefined && array(r.errors).length)
      throw createApiServiceError(
        'Hex rejected some sharing changes. Earlier changes may already have applied; inspect project sharing before retrying.'
      );
    return project(r.project, id);
  }
  editProjectSharingUsers(
    id: string,
    sharing: { upsert?: { users: Array<{ userId: string; accessLevel: string }> } }
  ) {
    return this.sharing(id, 'users', {
      upsert: {
        users: sharing.upsert?.users.map(v => ({
          user: { id: uuid(v.userId) },
          access: v.accessLevel
        }))
      }
    });
  }
  editProjectSharingGroups(
    id: string,
    sharing: { upsert?: { groups: Array<{ groupId: string; accessLevel: string }> } }
  ) {
    return this.sharing(id, 'groups', {
      upsert: {
        groups: sharing.upsert?.groups.map(v => ({
          group: { id: uuid(v.groupId) },
          access: v.accessLevel
        }))
      }
    });
  }
  editProjectSharingCollections(
    id: string,
    sharing: { upsert?: { collections: Array<{ collectionId: string; accessLevel: string }> } }
  ) {
    return this.sharing(id, 'collections', {
      upsert: {
        collections: sharing.upsert?.collections.map(v => ({
          collection: { id: uuid(v.collectionId) },
          access: v.accessLevel
        }))
      }
    });
  }
  editProjectSharingWorkspaceAndPublic(
    id: string,
    sharing: { workspace?: string; publicWeb?: string }
  ) {
    return this.sharing(id, 'workspaceAndPublic', pickDefined(sharing));
  }
  async createPresignedUrl(id: string, params: EmbeddingParams = {}) {
    uuid(id);
    let milliseconds: number | undefined;
    if (params.expiresIn !== undefined) {
      const decimal = params.expiresIn.toString();
      if (
        !Number.isFinite(params.expiresIn) ||
        params.expiresIn <= 0 ||
        params.expiresIn > 300 ||
        !/^\d+(?:\.\d{1,3})?$/.test(decimal)
      )
        throw createApiServiceError(
          'expiresIn uses seconds and must be greater than 0 and at most 300, with millisecond precision.'
        );
      // Convert decimal digits instead of floating multiplication: 0.029 seconds is exactly 29 ms.
      const [whole, fraction = ''] = decimal.split('.');
      milliseconds = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
    }
    if (params.displayOptions?.showHeader !== undefined)
      throw createApiServiceError(
        'The current Hex API does not document showHeader. Omit it; use showEmbeddedRunButton for the separate run-button control.'
      );
    if (
      params.displayOptions?.theme !== undefined &&
      !['light', 'dark'].includes(params.displayOptions.theme)
    )
      throw createApiServiceError('Embedding theme must be light or dark.');
    const scopes = params.scope?.map(v =>
      v === 'pdf' ? 'EXPORT_PDF' : v === 'csv' ? 'EXPORT_CSV' : v
    );
    if (scopes?.some(v => !['EXPORT_PDF', 'EXPORT_CSV'].includes(v)))
      throw createApiServiceError(
        'Embedding scopes must be EXPORT_PDF or EXPORT_CSV (legacy pdf/csv aliases are accepted).'
      );
    const { displayOptions, ...rest } = params;
    const r = object(
      await this.data(
        'POST',
        `/embedding/createPresignedUrl/${id}`,
        pickDefined({
          ...rest,
          scope: scopes,
          expiresIn: milliseconds,
          displayOptions: displayOptions
            ? pickDefined({
                theme: displayOptions.theme,
                noEmbedBasePadding:
                  displayOptions.showPadding === undefined
                    ? undefined
                    : !displayOptions.showPadding,
                showEmbeddedRunButton: displayOptions.showEmbeddedRunButton,
                noEmbedFooter: displayOptions.noEmbedFooter
              })
            : undefined
        })
      )
    );
    const url = string(r.url);
    let signed: URL;
    try {
      signed = new URL(url);
    } catch {
      throw createApiServiceError('Hex returned an invalid embedding URL.');
    }
    if (
      signed.origin !== this.origin ||
      signed.protocol !== 'https:' ||
      signed.username ||
      signed.password
    )
      throw createApiServiceError('Hex returned an unexpected embedding origin.');
    return { url };
  }
  listUsers(params: PaginationParams = {}) {
    return this.list('/users', page(params, 100, ['NAME', 'EMAIL']), v => {
      const r = object(v);
      return {
        ...pickDefined({
          createdAt: typeof r.createdAt === 'string' ? r.createdAt : undefined
        }),
        userId: uuid(string(r.id)),
        name: nullableString(r.name),
        email: string(r.email),
        role: string(r.role),
        lastLoginAt: nullableString(r.lastLoginDate)
      };
    });
  }
  async deactivateUser(id: string) {
    uuid(id);
    const result = object(await this.data('POST', `/users/${id}/deactivate`));
    if (uuid(string(object(result.user).id)) !== uuid(id))
      throw createApiServiceError(
        'Hex returned a different user after deactivation. Inspect user access before retrying.'
      );
  }
  listGroups(params: PaginationParams = {}) {
    return this.list('/groups', page(params, 500, ['CREATED_AT', 'NAME']), v => group(v));
  }
  async getGroup(id: string) {
    uuid(id);
    return group(await this.data('GET', `/groups/${id}`), id);
  }
  async createGroup(name: string, userIds?: string[]) {
    nonempty(name, 'group name');
    const users =
      userIds === undefined ? undefined : ids(userIds, 'member user IDs').map(id => ({ id }));
    const r = object(
      await this.data(
        'POST',
        '/groups',
        pickDefined({ name, members: users ? { users } : undefined }),
        undefined,
        201
      )
    );
    const id = uuid(string(r.id));
    try {
      return await this.getGroup(id);
    } catch {
      throw createApiServiceError(
        `Hex accepted group ${id}, but its metadata could not be read back. Inspect that group before retrying creation.`
      );
    }
  }
  async editGroup(
    id: string,
    params: { name?: string; addUserIds?: string[]; removeUserIds?: string[] }
  ) {
    uuid(id);
    if (params.name !== undefined) nonempty(params.name, 'group name');
    if (!params.name && !params.addUserIds?.length && !params.removeUserIds?.length)
      throw createApiServiceError('Provide at least one group change.');
    if (params.addUserIds?.some(v => params.removeUserIds?.includes(v)))
      throw createApiServiceError('Do not add and remove the same member in one update.');
    const members = pickDefined({
      add: params.addUserIds?.length
        ? { users: ids(params.addUserIds, 'addUserIds').map(id => ({ id })) }
        : undefined,
      remove: params.removeUserIds?.length
        ? { users: ids(params.removeUserIds, 'removeUserIds').map(id => ({ id })) }
        : undefined
    });
    return group(
      await this.data(
        'PATCH',
        `/groups/${id}`,
        pickDefined({
          name: params.name,
          members: Object.keys(members).length ? members : undefined
        })
      ),
      id
    );
  }
  async deleteGroup(id: string) {
    uuid(id);
    await this.acknowledgement('DELETE', `/groups/${id}`, 204);
  }
  listCollections(params: PaginationParams = {}) {
    if (params.sortDirection !== undefined)
      throw createApiServiceError(
        'The current collection API does not support sortDirection; omit it.'
      );
    return this.list('/collections', page(params, 100, ['NAME']), v => collection(v));
  }
  async getCollection(id: string) {
    uuid(id);
    return collection(await this.data('GET', `/collections/${id}`), id);
  }
  async createCollection(name: string, description?: string) {
    nonempty(name, 'collection name');
    return collection(
      await this.data(
        'POST',
        '/collections',
        pickDefined({ name, description }),
        undefined,
        201
      )
    );
  }
  async editCollection(id: string, params: { name?: string; description?: string }) {
    uuid(id);
    if (params.name !== undefined) nonempty(params.name, 'collection name');
    if (!Object.keys(pickDefined(params)).length)
      throw createApiServiceError('Provide at least one collection change.');
    return collection(await this.data('PATCH', `/collections/${id}`, pickDefined(params)), id);
  }
  listDataConnections(params: PaginationParams = {}) {
    return this.list('/data-connections', page(params, 100, ['CREATED_AT', 'NAME']), v =>
      connection(v)
    );
  }
  async getDataConnection(id: string) {
    uuid(id);
    return connection(await this.data('GET', `/data-connections/${id}`), id);
  }
  getQueriedTables(id: string, params: PaginationParams = {}) {
    uuid(id);
    return this.list(`/projects/${id}/queriedTables`, page(params, 100, []), v => {
      const r = object(v);
      return {
        dataConnectionId: uuid(string(r.dataConnectionId)),
        dataConnectionName: string(r.dataConnectionName),
        tableName: string(r.tableName)
      };
    });
  }
  async exportProject(id: string, version: 'draft' | 'latest' | number = 'draft') {
    uuid(id);
    if (typeof version === 'number' && (!Number.isSafeInteger(version) || version < 1))
      throw createApiServiceError('Numeric project versions must be positive integers.');
    const r = object(await this.data('POST', '/projects/export', { projectId: id, version }));
    const filename = string(r.filename)
      .replace(/^.*[\\/]/, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+/, 'project');
    if (!filename.endsWith('.hex.yaml'))
      throw createApiServiceError('Hex returned invalid export metadata.');
    return { filename, content: string(r.content) };
  }
}
