import { createHash } from 'node:crypto';
import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

export const RETOOL_API_CONTRACT = '4.70.0';
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ITEMS = 10000;
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'retool_validation' });
const malformed = () =>
  createApiServiceError(
    'Retool returned an incomplete or unexpected response. A submitted change may already have taken effect; read the exact object before retrying.',
    { reason: 'retool_response' }
  );
export const unsupportedAppWrite = () =>
  invalid(
    'The current Retool API reference has no documented supported route for creating or editing an app definition. Create or edit the app in Retool, then use list_apps or get_app to read its metadata.'
  );

export function normalizeBaseUrl(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value !== value.trim() ||
    value.length > 2048 ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid(
      'Provide the Retool instance URL used to access your organization or Space.'
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalid('Provide a valid Retool instance URL.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['', '/'].includes(url.pathname)
  )
    throw invalid(
      'Use an HTTP or HTTPS Retool instance origin without credentials, paths, query parameters, or fragments.'
    );
  if (
    url.protocol === 'http:' &&
    (url.hostname === 'retool.com' || url.hostname.endsWith('.retool.com'))
  )
    throw invalid('Use HTTPS for a Retool-hosted instance.');
  return url.origin;
}
export function connectionFor(ctx: {
  auth: { token?: unknown; baseUrl?: unknown };
  config?: { baseUrl?: unknown };
}) {
  let token = ctx.auth.token;
  if (
    typeof token !== 'string' ||
    !token.trim() ||
    token !== token.trim() ||
    token.length > 4096 ||
    [...token].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid('Reconnect with a valid Retool API access token.');
  return {
    token,
    baseUrl: normalizeBaseUrl(
      ctx.auth.baseUrl ?? ctx.config?.baseUrl ?? 'https://api.retool.com'
    )
  };
}

// Inspect discarded fields and keys too: safe projection alone is insufficient.
export function assertNoCredentialReflection(value: unknown, token: string): void {
  let variants = [
    ...new Set([
      token,
      encodeURIComponent(token),
      JSON.stringify(token).slice(1, -1),
      Buffer.from(token).toString('base64'),
      Buffer.from(token).toString('base64url'),
      Buffer.from(token).toString('hex')
    ])
  ];
  let seen = new WeakSet<object>();
  let count = 0;
  let visit = (item: unknown, depth: number): void => {
    if (++count > 100000 || depth > 40)
      throw invalid('The Retool data is too large or deeply nested to validate safely.');
    if (typeof item === 'string') {
      if (containsCredential(item, variants))
        throw createApiServiceError(
          'Retool data contained a connection credential. The result cannot be returned safely. If this followed a write, read the exact object before retrying.',
          { reason: 'retool_credential_reflection' }
        );
      return;
    }
    if (!item || typeof item !== 'object' || seen.has(item)) return;
    seen.add(item);
    for (let key of Object.getOwnPropertyNames(item)) {
      visit(key, depth + 1);
      let descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (descriptor && 'value' in descriptor) visit(descriptor.value, depth + 1);
    }
  };
  visit(value, 0);
}

function containsCredential(value: string, variants: string[]): boolean {
  let queue = [value];
  let visited = new Set(queue);
  for (let depth = 0; depth < 6 && queue.length; depth++) {
    let next: string[] = [];
    let add = (text: string) => {
      if (!visited.has(text)) {
        if (visited.size >= 256)
          throw invalid('Retool data contains too many encoded values to validate safely.');
        visited.add(text);
        next.push(text);
      }
    };
    for (let text of queue) {
      if (variants.some(secret => secret && text.includes(secret))) return true;
      add(
        text
          .replace(/\\+u([a-f0-9]{4})/gi, (_, hex: string) =>
            String.fromCharCode(Number.parseInt(hex, 16))
          )
          .replace(/(?:%[a-f0-9]{2})+/gi, match =>
            Buffer.from(match.replaceAll('%', ''), 'hex').toString()
          )
      );
      for (let match of text.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
        if (match[0].length > 65536)
          throw invalid('An encoded Retool value exceeds the safe validation limit.');
        let bytes = Buffer.from(match[0], 'base64url');
        let decoded = bytes.toString();
        if (Buffer.from(decoded).equals(bytes)) add(decoded);
      }
    }
    queue = next;
  }
  return false;
}

const string = z.string();
const nullableString = string.nullable();
export const userSchema = z
  .object({
    id: string,
    email: string,
    first_name: nullableString,
    last_name: nullableString,
    active: z.boolean(),
    metadata: z.record(string, z.unknown()).nullable().optional(),
    user_type: nullableString.optional(),
    created_at: string.optional(),
    last_active: nullableString.optional(),
    groups: z
      .array(z.object({ id: z.number().nullable(), name: string }).passthrough())
      .optional()
  })
  .passthrough();
export const groupSchema = z
  .object({
    id: z.number().int().nonnegative().nullable(),
    legacy_id: z.number().int().nonnegative().nullable().optional(),
    name: string,
    members: z
      .array(
        z
          .object({ id: string, is_group_admin: z.boolean(), email: string.optional() })
          .passthrough()
      )
      .optional(),
    universal_app_access: string.optional(),
    universal_resource_access: string.optional(),
    universal_workflow_access: string.optional(),
    universal_query_library_access: string.optional()
  })
  .passthrough();
export const appSchema = z
  .object({
    id: string,
    name: string,
    folder_id: nullableString.optional(),
    is_mobile_app: z.boolean().optional(),
    is_multipage_app: z.boolean().optional(),
    created_at: string.optional(),
    updated_at: string.optional()
  })
  .passthrough();
export const folderSchema = z
  .object({
    id: string,
    name: string,
    parent_folder_id: nullableString.optional(),
    folder_type: string.optional(),
    is_system_folder: z.boolean().optional(),
    created_at: string.optional(),
    updated_at: string.optional()
  })
  .passthrough();
export const resourceSchema = z
  .object({
    id: string,
    display_name: string,
    type: string.optional(),
    description: nullableString.optional(),
    folder_id: nullableString.optional(),
    created_at: string.optional(),
    updated_at: string.optional()
  })
  .passthrough();
export const environmentSchema = z
  .object({
    id: string,
    name: string,
    default: z.boolean(),
    created_at: string.optional(),
    updated_at: string.optional()
  })
  .passthrough();
export const workflowSchema = z
  .object({
    id: string,
    name: string,
    folder_id: nullableString.optional(),
    is_enabled: z.boolean().optional(),
    created_at: string.optional(),
    updated_at: string.optional()
  })
  .passthrough();
const spaceSchema = z
  .object({
    id: string,
    name: string,
    domain: string,
    created_at: string.optional(),
    updated_at: string.optional()
  })
  .passthrough();
const tokenSchema = z.object({
  id: string,
  label: string,
  description: nullableString,
  last4: string,
  owner_legacy_id: z.number(),
  scopes: z.array(string),
  created_at: string,
  updated_at: string
});
export type RetoolUser = z.infer<typeof userSchema>;
export type RetoolGroup = z.infer<typeof groupSchema>;
export type RetoolApp = z.infer<typeof appSchema>;
export type RetoolFolder = z.infer<typeof folderSchema>;
export type RetoolResource = z.infer<typeof resourceSchema>;
export type RetoolWorkflow = z.infer<typeof workflowSchema>;
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  total_count: number;
  has_more: boolean;
  next_token?: string;
}
export interface SingleResponse<T> {
  success: true;
  data: T;
}
type PageInput = { limit?: number; nextToken?: string };
type MemberInput = { id: string; isGroupAdmin?: boolean };
type PermissionInput = {
  subjectType: string;
  subjectId: string;
  objectType: string;
  objectId: string;
  accessLevel: string;
};

function id(value: unknown, kind: 'user' | 'uuid' | 'folder' | 'resource'): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 512 ||
    value !== value.trim() ||
    value === '.' ||
    value === '..' ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid('Provide a valid exact object ID from its discovery tool.');
  let pattern =
    kind === 'user'
      ? /^user_[a-z0-9]+$/
      : kind === 'uuid'
        ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        : kind === 'folder'
          ? /^(app|workflow|resource|agent|library)_\d+$/
          : undefined;
  if (pattern && !pattern.test(value))
    throw invalid('Provide the native object ID returned by its discovery tool.');
  return encodeURIComponent(value);
}
function groupId(value: number) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw invalid('Use the non-negative numeric group ID from list_groups.');
  return String(value);
}
function name(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 1024)
    throw invalid('Provide a non-empty name.');
  return value;
}
function decode<T>(schema: z.ZodType<T>, data: unknown): T {
  let result = schema.safeParse(data);
  if (!result.success) throw malformed();
  return result.data;
}
function equal(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return left.length === right.length && left.every((v, i) => equal(v, right[i]));
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    let a = Object.keys(left),
      b = Object.keys(right);
    return (
      a.length === b.length &&
      a.every(
        k =>
          b.includes(k) &&
          equal((left as Record<string, unknown>)[k], (right as Record<string, unknown>)[k])
      )
    );
  }
  return false;
}
function receipt(data: Record<string, unknown>, expected: Record<string, unknown>) {
  for (let [key, value] of Object.entries(expected))
    if (value !== undefined && !equal(data[key], value)) throw malformed();
}
function paging(input: PageInput = {}) {
  if (
    input.limit !== undefined &&
    (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100)
  )
    throw invalid('limit must be an integer between 1 and 100.');
  if (input.nextToken !== undefined && (!input.nextToken || input.nextToken.length > 4096))
    throw invalid('Use a non-empty pagination token from the preceding result.');
  if (input.nextToken && input.limit === undefined)
    throw invalid('Provide the same limit when using nextToken.');
  return pickDefined({ limit: input.limit, next_token: input.nextToken });
}
function groupSettings(data: Record<string, unknown>) {
  let result: Record<string, unknown> = {};
  let fields = {
    name: 'name',
    universalAppAccess: 'universal_app_access',
    universalResourceAccess: 'universal_resource_access',
    universalWorkflowAccess: 'universal_workflow_access',
    universalQueryLibraryAccess: 'universal_query_library_access',
    userListAccess: 'user_list_access',
    auditLogAccess: 'audit_log_access',
    unpublishedReleaseAccess: 'unpublished_release_access',
    usageAnalyticsAccess: 'usage_analytics_access',
    themeAccess: 'theme_access',
    accountDetailsAccess: 'account_details_access'
  };
  for (let [key, native] of Object.entries(fields))
    if (data[key] !== undefined) result[native] = data[key];
  if (result.name !== undefined) name(result.name);
  if (['user', 'admin'].includes(String(result.universal_resource_access)))
    throw invalid(
      'Use the documented resource access level none, use, edit, or own. Legacy user/admin values have no documented equivalent.'
    );
  if (result.universal_query_library_access === 'own')
    throw invalid(
      'Query Library access supports none, use, or edit; own has no documented equivalent.'
    );
  return result;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private binding: string;
  constructor(private params: { token: string; baseUrl: string }) {
    let connection = connectionFor({ auth: params });
    this.params = connection;
    this.binding = createHash('sha256')
      .update(`${connection.baseUrl}\0${connection.token}`)
      .digest('hex');
    this.axios = createAuthenticatedAxios({
      baseURL: `${connection.baseUrl}/api/v2`,
      authHeader: { value: `Bearer ${connection.token}` },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: MAX_BYTES,
      maxBodyLength: MAX_BYTES
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    query?: Record<string, unknown>,
    empty = false
  ): Promise<unknown> {
    assertNoCredentialReflection({ path, data, query }, this.params.token);
    try {
      let response = await this.axios.request<unknown>({
        method,
        url: path,
        data,
        params: query
      });
      assertNoCredentialReflection(
        { data: response.data, headers: response.headers },
        this.params.token
      );
      if (empty) {
        if (response.status !== 204 || (response.data !== '' && response.data != null))
          throw malformed();
        return undefined;
      }
      return response.data;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw buildApiServiceError(error, {
        providerLabel: 'Retool',
        reason: 'retool_api',
        parent: {},
        extractMessage: () =>
          method === 'GET'
            ? 'The request failed. Check the instance URL, API version, token scopes, and object access.'
            : 'The request failed. A change may already have taken effect; read the exact object before retrying. Check the token scopes and API version.'
      });
    }
  }
  private async one<T>(
    schema: z.ZodType<T>,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    query?: Record<string, unknown>,
    expected?: Record<string, unknown>
  ): Promise<SingleResponse<T>> {
    let result = decode(
      z.object({ success: z.literal(true), data: schema }),
      await this.request(method, path, data, query)
    );
    if (expected) {
      if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data))
        throw malformed();
      receipt(result.data as Record<string, unknown>, expected);
    }
    return result;
  }
  private async page<T extends { id: unknown }>(
    schema: z.ZodType<T>,
    path: string,
    query?: Record<string, unknown>,
    data?: unknown
  ): Promise<PaginatedResponse<T>> {
    let result = decode(
      z.object({
        success: z.literal(true),
        data: z.array(schema).max(MAX_ITEMS),
        total_count: z.number().int().nonnegative(),
        has_more: z.boolean(),
        next_token: z.string().nullable()
      }),
      await this.request(data === undefined ? 'GET' : 'POST', path, data, query)
    );
    if (
      result.total_count < result.data.length ||
      (typeof query?.limit === 'number' && result.data.length > query.limit) ||
      (result.has_more && query?.next_token === result.next_token) ||
      new Set(result.data.map(v => v.id).filter(v => v !== null)).size !==
        result.data.filter(v => v.id !== null).length ||
      (result.has_more && !result.next_token) ||
      (!result.has_more && result.next_token !== null)
    )
      throw malformed();
    return { ...result, next_token: result.next_token ?? undefined };
  }
  private complete<T>(page: PaginatedResponse<T>) {
    if (page.has_more || page.total_count !== page.data.length)
      throw invalid(
        'Retool returned an incomplete inventory for a route without documented pagination parameters. Consult this instance’s API reference before proceeding.'
      );
    return page;
  }
  private localPage<T extends { id: unknown }>(
    page: PaginatedResponse<T>,
    route: string,
    input: PageInput = {}
  ) {
    this.complete(page);
    paging(input);
    let limit = input.limit ?? page.data.length;
    let hash = createHash('sha256')
      .update(JSON.stringify([this.binding, route, page.data]))
      .digest('hex');
    let offset = 0;
    if (input.nextToken) {
      try {
        let decoded = JSON.parse(Buffer.from(input.nextToken, 'base64url').toString());
        if (
          decoded.hash !== hash ||
          decoded.limit !== limit ||
          !Number.isInteger(decoded.offset) ||
          decoded.offset < 1 ||
          decoded.offset >= page.data.length
        )
          throw invalid(
            'The inventory or page settings changed. Restart listing without nextToken.'
          );
        offset = decoded.offset;
      } catch {
        throw invalid(
          'Use the local continuation token with the same connection and limit; restart if the inventory changed.'
        );
      }
    }
    let items = page.data.slice(offset, offset + limit);
    let more = offset + items.length < page.data.length;
    return {
      success: true as const,
      data: items,
      total_count: page.total_count,
      has_more: more,
      next_token: more
        ? Buffer.from(JSON.stringify({ hash, limit, offset: offset + items.length })).toString(
            'base64url'
          )
        : undefined
    };
  }
  async listUsers(
    options: PageInput & { email?: string; firstName?: string; lastName?: string } = {}
  ) {
    return this.page(userSchema, '/users', {
      ...paging(options),
      ...pickDefined({
        email: options.email,
        first_name: options.firstName,
        last_name: options.lastName
      })
    });
  }
  async getUser(userId: string, includeGroups?: boolean) {
    return this.one(
      userSchema,
      'GET',
      `/users/${id(userId, 'user')}`,
      undefined,
      pickDefined({ includeGroups }),
      { id: userId }
    );
  }
  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    active?: boolean;
    metadata?: Record<string, unknown>;
    userType?: string;
  }) {
    if (!z.email().safeParse(data.email).success)
      throw invalid('Provide a valid email address.');
    name(data.firstName);
    name(data.lastName);
    if (data.userType && !['default', 'mobile', 'embed'].includes(data.userType))
      throw invalid('For user creation, userType must be default, mobile, or embed.');
    let body = pickDefined({
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      active: data.active,
      metadata: data.metadata,
      user_type: data.userType
    });
    // Native creation accepts embed while the response schema names external.
    // Do not invent an equivalence or reject that documented response variant.
    return this.one(userSchema, 'POST', '/users', body, undefined, {
      ...body,
      user_type: undefined
    });
  }
  async updateUser(
    userId: string,
    operations: Array<{ op: string; path: string; value: unknown }>
  ) {
    let expected: Record<string, unknown> = { id: userId };
    for (let operation of operations) {
      if (
        operation.op !== 'replace' ||
        !['/first_name', '/last_name', '/email', '/active', '/metadata'].includes(
          operation.path
        )
      )
        throw invalid('Use the supported user update fields.');
      expected[operation.path.slice(1)] = operation.value;
    }
    return this.one(
      userSchema,
      'PATCH',
      `/users/${id(userId, 'user')}`,
      { operations },
      undefined,
      expected
    );
  }
  async deleteUser(userId: string) {
    await this.request('DELETE', `/users/${id(userId, 'user')}`, undefined, undefined, true);
  }
  async setUserAttribute(userId: string, attributeName: string, value: unknown) {
    name(attributeName);
    if (typeof value !== 'string' && value !== null)
      throw invalid(
        'Retool user attributes accept a string or null. Use the name of an existing attribute.'
      );
    let result = await this.one(
      z.object({ metadata: z.record(string, z.unknown()) }),
      'POST',
      `/users/${id(userId, 'user')}/user_attributes`,
      { name: attributeName, value }
    );
    receipt(result.data.metadata, { [attributeName]: value });
    return result;
  }
  async deleteUserAttribute(userId: string, attributeName: string) {
    name(attributeName);
    if (attributeName === '.' || attributeName === '..')
      throw invalid(
        'This attribute name cannot be addressed safely by the native deletion route. Remove its value in Retool.'
      );
    let result = await this.one(
      z.object({ metadata: z.record(string, z.unknown()) }),
      'DELETE',
      `/users/${id(userId, 'user')}/user_attributes/${encodeURIComponent(attributeName)}`
    );
    if (Object.hasOwn(result.data.metadata, attributeName)) throw malformed();
    return result;
  }
  async listGroups() {
    return this.complete(await this.page(groupSchema, '/groups'));
  }
  async getGroup(value: number, excludeDisabledUsers?: boolean) {
    let result = await this.one(
      groupSchema,
      'GET',
      `/groups/${groupId(value)}`,
      undefined,
      pickDefined({ excludeDisabledUsers })
    );
    if (
      result.data.id !== value &&
      !(result.data.id === null && result.data.legacy_id === value)
    )
      throw malformed();
    return result;
  }
  async createGroup(
    data: Record<string, unknown> & { name: string; members?: MemberInput[] }
  ) {
    let body = groupSettings(data);
    if (data.members)
      body.members = data.members.map(m => ({
        id: decodeUserId(m.id),
        is_group_admin: m.isGroupAdmin ?? false
      }));
    let result = await this.one(groupSchema, 'POST', '/groups', body, undefined, {
      ...body,
      members: undefined
    });
    if (
      data.members?.some(
        m =>
          !result.data.members?.some(
            v => v.id === m.id && v.is_group_admin === (m.isGroupAdmin ?? false)
          )
      )
    )
      throw malformed();
    return result;
  }
  async updateGroup(value: number, data: Record<string, unknown>) {
    let body = groupSettings(data);
    if (!Object.keys(body).length) return this.getGroup(value);
    let result = await this.one(
      groupSchema,
      'PATCH',
      `/groups/${groupId(value)}`,
      {
        operations: Object.entries(body).map(([key, v]) => ({
          op: 'replace',
          path: `/${key}`,
          value: v
        }))
      },
      undefined,
      body
    );
    if (
      result.data.id !== value &&
      !(result.data.id === null && result.data.legacy_id === value)
    )
      throw malformed();
    return result;
  }
  async deleteGroup(value: number) {
    await this.request('DELETE', `/groups/${groupId(value)}`, undefined, undefined, true);
  }
  async addGroupMembers(value: number, members: MemberInput[]) {
    if (!members.length || new Set(members.map(m => m.id)).size !== members.length)
      throw invalid('Provide a non-empty list of distinct user IDs.');
    let native = members.map(m => ({
      id: decodeUserId(m.id),
      is_group_admin: m.isGroupAdmin ?? false
    }));
    let result = await this.one(groupSchema, 'POST', `/groups/${groupId(value)}/members`, {
      members: native
    });
    if (
      (result.data.id !== value &&
        !(result.data.id === null && result.data.legacy_id === value)) ||
      !result.data.members ||
      native.some(
        m =>
          !result.data.members?.some(
            v => v.id === m.id && v.is_group_admin === m.is_group_admin
          )
      )
    )
      throw malformed();
    return result;
  }
  async removeGroupMember(value: number, userId: string) {
    let result = await this.one(
      groupSchema,
      'DELETE',
      `/groups/${groupId(value)}/members/${id(userId, 'user')}`
    );
    if (
      (result.data.id !== value &&
        !(result.data.id === null && result.data.legacy_id === value)) ||
      !result.data.members ||
      result.data.members.some(member => member.id === userId)
    )
      throw malformed();
    return result;
  }
  async listApps(options: PageInput = {}) {
    return this.page(appSchema, '/apps', paging(options));
  }
  async getApp(appId: string) {
    return this.one(appSchema, 'GET', `/apps/${id(appId, 'uuid')}`, undefined, undefined, {
      id: appId
    });
  }
  async deleteApp(appId: string) {
    await this.request('DELETE', `/apps/${id(appId, 'uuid')}`, undefined, undefined, true);
  }
  async listFolders(options: PageInput = {}) {
    paging(options);
    return this.localPage(await this.page(folderSchema, '/folders'), '/folders', options);
  }
  async getFolder(folderId: string) {
    return this.one(
      folderSchema,
      'GET',
      `/folders/${id(folderId, 'folder')}`,
      undefined,
      undefined,
      { id: folderId }
    );
  }
  async createFolder(data: {
    name: string;
    parentFolderId?: string | null;
    folderType?: string;
  }) {
    name(data.name);
    if (data.parentFolderId) id(data.parentFolderId, 'folder');
    let body = pickDefined({
      name: data.name,
      parent_folder_id: data.parentFolderId,
      folder_type: data.folderType ?? 'app'
    });
    return this.one(folderSchema, 'POST', '/folders', body, undefined, body);
  }
  async updateFolder(
    folderId: string,
    data: { name?: string; parentFolderId?: string | null }
  ) {
    let body = pickDefined({ name: data.name, parent_folder_id: data.parentFolderId });
    if (data.name !== undefined) name(data.name);
    if (data.parentFolderId) id(data.parentFolderId, 'folder');
    if (!Object.keys(body).length) return this.getFolder(folderId);
    return this.one(
      folderSchema,
      'PATCH',
      `/folders/${id(folderId, 'folder')}`,
      {
        operations: Object.entries(body).map(([key, value]) => ({
          op: 'replace',
          path: `/${key}`,
          value
        }))
      },
      undefined,
      { id: folderId, ...body }
    );
  }
  async deleteFolder(folderId: string) {
    await this.request(
      'DELETE',
      `/folders/${id(folderId, 'folder')}`,
      undefined,
      undefined,
      true
    );
  }
  async listSpaces() {
    return this.complete(await this.page(spaceSchema, '/spaces'));
  }
  async getSpace(spaceId: string) {
    return this.one(
      spaceSchema,
      'GET',
      `/spaces/${id(spaceId, 'uuid')}`,
      undefined,
      undefined,
      { id: spaceId }
    );
  }
  async createSpace(data: {
    name: string;
    domain: string;
    options?: Record<string, boolean | undefined>;
  }) {
    name(data.name);
    name(data.domain);
    let body = {
      name: data.name,
      domain: data.domain,
      options: pickDefined(data.options ?? {})
    };
    return this.one(spaceSchema, 'POST', '/spaces', body, undefined, {
      name: data.name,
      domain: data.domain
    });
  }
  async updateSpace(spaceId: string, data: { name?: string; domain?: string }) {
    let current = (await this.getSpace(spaceId)).data;
    let body = { name: data.name ?? current.name, domain: data.domain ?? current.domain };
    name(body.name);
    name(body.domain);
    return this.one(spaceSchema, 'PUT', `/spaces/${id(spaceId, 'uuid')}`, body, undefined, {
      id: spaceId,
      ...body
    });
  }
  async deleteSpace(spaceId: string) {
    await this.request('DELETE', `/spaces/${id(spaceId, 'uuid')}`, undefined, undefined, true);
  }
  private subject(type: string, value: string) {
    if (type === 'user') return { type, id: decodeUserId(value) };
    if (type !== 'group' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
      throw invalid('Use a user ID or a numeric group ID from the discovery tools.');
    return { type, id: Number(groupId(Number(value))) };
  }
  private object(type: string, value: string) {
    if (!['app', 'folder', 'resource', 'resource_configuration'].includes(type))
      throw invalid(
        'The documented permission mutation API supports app, folder, resource, or resource_configuration. workflow and agent mutations have no documented supported route.'
      );
    id(value, type === 'folder' ? 'folder' : type === 'resource' ? 'resource' : 'uuid');
    return { type, id: value };
  }
  async listPermissionObjects(subjectType: string, subjectId: string, objectType?: string) {
    if (
      !objectType ||
      !['app', 'folder', 'resource', 'resource_configuration'].includes(objectType)
    )
      throw invalid(
        'For objects_for_subject, provide objectType app, folder, resource, or resource_configuration.'
      );
    let schema = z.object({ id: string, type: string, access_level: string }).passthrough();
    return this.complete(
      await this.page(schema, '/permissions/listObjects', undefined, {
        subject: this.subject(subjectType, subjectId),
        object_type: objectType
      })
    );
  }
  async listPermissionSubjects(objectType: string, objectId: string) {
    if (!['app', 'folder', 'resource', 'workflow', 'agent'].includes(objectType))
      throw invalid(
        'For subjects_for_object, use app, folder, resource, workflow, or agent. resource_configuration is not supported by this read route.'
      );
    let numericReadId = ['app', 'folder'].includes(objectType) && /^\d+$/.test(objectId);
    id(
      objectId,
      numericReadId || objectType === 'resource'
        ? 'resource'
        : objectType === 'folder'
          ? 'folder'
          : 'uuid'
    );
    let entry = z.object({
      subject: z.object({ id: string, type: z.enum(['group', 'user', 'userInvite']) }),
      accessLevel: z.enum(['own', 'edit', 'use', 'none']),
      sources: z.record(string, z.unknown()).optional()
    });
    let result = await this.one(
      z.object({
        group: z.array(entry).optional(),
        user: z.array(entry).optional(),
        userInvite: z.array(entry).optional()
      }),
      'GET',
      `/permissions/accessList/${objectType}/${encodeURIComponent(objectId)}`
    );
    return {
      success: true as const,
      data: Object.values(result.data).flatMap(v => v ?? []),
      complete: ['group', 'user', 'userInvite'].every(key => Object.hasOwn(result.data, key))
    };
  }
  async grantPermission(data: PermissionInput) {
    let object = this.object(data.objectType, data.objectId);
    let result = await this.permissionMutation('/permissions/grant', {
      subject: this.subject(data.subjectType, data.subjectId),
      object,
      access_level: data.accessLevel
    });
    if (
      !result.data.some(
        v =>
          v.id === object.id && v.type === object.type && v.access_level === data.accessLevel
      )
    )
      throw malformed();
    return result;
  }
  async revokePermission(data: PermissionInput) {
    let object = this.object(data.objectType, data.objectId);
    let result = await this.permissionMutation('/permissions/revoke', {
      subject: this.subject(data.subjectType, data.subjectId),
      object
    });
    if (result.data.some(v => v.id === object.id && v.type === object.type)) throw malformed();
    return result;
  }
  private async permissionMutation(path: string, body: unknown) {
    return this.one(
      z.array(z.object({ id: string, type: string, access_level: string }).passthrough()),
      'POST',
      path,
      body
    );
  }
  async listResources(options: PageInput = {}) {
    return this.page(resourceSchema, '/resources', paging(options));
  }
  async getResource(resourceId: string) {
    return this.one(
      resourceSchema,
      'GET',
      `/resources/${id(resourceId, 'resource')}`,
      undefined,
      undefined,
      { id: resourceId }
    );
  }
  async listEnvironments() {
    return this.complete(await this.page(environmentSchema, '/environments'));
  }
  async listWorkflows(options: PageInput = {}) {
    paging(options);
    return this.localPage(
      await this.page(workflowSchema, '/workflows'),
      '/workflows',
      options
    );
  }
  async getWorkflow(workflowId: string) {
    return this.one(
      workflowSchema,
      'GET',
      `/workflows/${id(workflowId, 'uuid')}`,
      undefined,
      undefined,
      { id: workflowId }
    );
  }
  async getWorkflowRun(runId: string) {
    let result = decode(
      z
        .object({
          id: string,
          workflow_id: string,
          status: string,
          trigger_type: string,
          trigger_id: string,
          created_at: string,
          user_tasks: z.array(z.record(string, z.unknown())).optional()
        })
        .passthrough(),
      await this.request('GET', `/workflow_run/${id(runId, 'uuid')}`)
    );
    receipt(result, { id: runId });
    if (
      result.user_tasks?.some(
        t => t.workflow_run_id !== runId || t.workflow_id !== result.workflow_id
      )
    )
      throw malformed();
    return { success: true as const, data: result };
  }
  async getSourceControlConfig() {
    let result = await this.one(
      z.record(string, z.unknown()),
      'GET',
      '/source_control/config'
    );
    let config = result.data.config;
    if (
      !config ||
      typeof config !== 'object' ||
      Array.isArray(config) ||
      typeof result.data.provider !== 'string'
    )
      throw malformed();
    let safeConfig: Record<string, unknown> = {};
    for (let key of [
      'type',
      'app_id',
      'installation_id',
      'project_id',
      'region',
      'access_key_id',
      'https_username',
      'username',
      'project',
      'user',
      'use_basic_auth',
      'auth_with_default_credential_provider_chain',
      'assume_role'
    ])
      if (Object.hasOwn(config, key)) {
        let value = (config as Record<string, unknown>)[key];
        if (!['string', 'number', 'boolean'].includes(typeof value)) throw malformed();
        safeConfig[key] = value;
      }
    for (let key of ['url', 'enterprise_api_url']) {
      let value = (config as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        try {
          let url = new URL(value);
          if (
            ['https:', 'http:'].includes(url.protocol) &&
            !url.username &&
            !url.password &&
            !url.search &&
            !url.hash
          )
            safeConfig[key] = value;
        } catch {
          /* Omit an unsafe or invalid provider URL. */
        }
      }
    }
    let safe: Record<string, unknown> = { config: safeConfig };
    for (let key of ['provider', 'org', 'repo', 'default_branch', 'repo_version'])
      if (typeof result.data[key] === 'string') safe[key] = result.data[key];
    return { success: true as const, data: safe };
  }
  async getOrganization() {
    return this.one(
      z.object({
        id: string,
        request_access_enabled: z.boolean().optional(),
        ai_support_bot_disabled: z.boolean().optional(),
        retool_forms_disabled: z.boolean().optional(),
        release_management_enabled: z.boolean().optional(),
        cache_queries_per_user: z.boolean().nullable().optional(),
        workflow_run_retention_period_mins: z.number().optional(),
        app_owners_permissions_management: z.boolean().optional(),
        two_factor_auth_required: z.boolean().optional(),
        two_factor_auth_type: nullableString.optional(),
        disable_new_login_ip_notification_email: z.boolean().optional(),
        hide_environment_toggle: z.boolean().optional()
      }),
      'GET',
      '/organization/'
    );
  }
  async listAccessTokens() {
    return this.complete(await this.page(tokenSchema, '/access_tokens'));
  }
}
function decodeUserId(value: string) {
  id(value, 'user');
  return value;
}
export function validateMemberIds(value: number, members: string[]) {
  groupId(value);
  if (new Set(members).size !== members.length) throw invalid('Provide distinct user IDs.');
  for (let member of members) id(member, 'user');
}
export function clientFor(ctx: {
  auth: { token?: unknown; baseUrl?: unknown };
  config?: { baseUrl?: unknown };
  input?: unknown;
}) {
  let connection = connectionFor(ctx);
  assertNoCredentialReflection(ctx.input, connection.token);
  return new Client(connection);
}
