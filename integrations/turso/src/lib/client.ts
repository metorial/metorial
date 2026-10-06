import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

const databaseSchema = z.object({
  Name: z.string().min(1),
  DbId: z.string().min(1),
  Hostname: z.string().min(1),
  block_reads: z.boolean().optional(),
  block_writes: z.boolean().optional(),
  allow_attach: z.boolean().optional(),
  regions: z.array(z.string()).optional(),
  primaryRegion: z.string().optional(),
  type: z.string().optional(),
  version: z.string().optional(),
  group: z.string().optional(),
  is_schema: z.boolean().optional(),
  schema: z.string().optional(),
  sleeping: z.boolean().optional(),
  delete_protection: z.boolean().optional(),
  parent: z
    .object({ id: z.string(), name: z.string(), branched_at: z.string() })
    .nullable()
    .optional()
});
const groupSchema = z.object({
  name: z.string().min(1),
  uuid: z.string().min(1),
  primary: z.string().min(1),
  locations: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
  version: z.string().optional(),
  delete_protection: z.boolean().optional()
});
const organizationSchema = z.object({
  name: z.string(),
  slug: z.string(),
  type: z.string(),
  overages: z.boolean(),
  blocked_reads: z.boolean(),
  blocked_writes: z.boolean(),
  plan_id: z.string().optional(),
  require_mfa: z.boolean().optional()
});
const memberSchema = z.object({
  username: z.string(),
  role: z.string(),
  email: z.string().optional()
});
const inviteSchema = z.object({
  email: z.string(),
  role: z.string(),
  id: z.number().optional(),
  created_at: z.string().optional()
});
const usageCounters = z.object({
  rows_read: z.number(),
  rows_written: z.number(),
  storage_bytes: z.number(),
  bytes_synced: z.number().optional()
});
const configurationSchema = z.object({
  size_limit: z.string().optional(),
  allow_attach: z.boolean().optional(),
  block_reads: z.boolean().optional(),
  block_writes: z.boolean().optional(),
  delete_protection: z.boolean().optional(),
  allowed_ips: z.array(z.string()).optional(),
  allowed_aws_vpc_ids: z.array(z.string()).optional()
});
const apiTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  organization: z.string().optional(),
  group: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  created_at: z.string().optional()
});
const userSchema = z.object({
  username: z.string().min(1),
  name: z.string().optional(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  plan: z.string().optional(),
  mfa: z.boolean().optional(),
  has_pending_invites: z.boolean().optional()
});

export type TursoDatabase = z.infer<typeof databaseSchema>;
export type TursoGroup = z.infer<typeof groupSchema>;
export type DatabaseConfiguration = z.infer<typeof configurationSchema>;
export interface CreateDatabaseParams {
  name: string;
  group: string;
  seed?: { type?: 'database' | 'dump'; name?: string; url?: string; timestamp?: string };
  size_limit?: string;
  is_schema?: boolean;
  schema?: string;
}
export interface CreateGroupParams {
  name: string;
  location: string;
  extensions?: string;
}

const safeRetryAfter = (value: unknown) =>
  typeof value === 'string' &&
  ((/^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value))) ||
    (/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(
      value
    ) &&
      Number.isFinite(Date.parse(value))))
    ? value
    : undefined;

export class Client {
  private readonly axios: ReturnType<typeof createAuthenticatedAxios>;
  private readonly token: string;
  private readonly sensitiveValues = new Set<string>();
  readonly organizationSlug?: string;

  constructor(config: { token: string; organizationSlug?: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A Turso Platform API token is required.');
    this.token = config.token;
    this.sensitiveValues.add(config.token);
    this.organizationSlug = config.organizationSlug;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.turso.tech',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true
    });
  }

  private segment(value: string, label: string) {
    if (!value.trim()) throw createApiServiceError(`${label} must not be empty.`);
    if (value === '.' || value === '..')
      throw createApiServiceError(`${label} must not be a dot path segment.`);
    try {
      return encodeURIComponent(value);
    } catch {
      throw createApiServiceError(`${label} must contain valid Unicode.`);
    }
  }
  private orgPath(path: string, version = 'v1') {
    if (!this.organizationSlug)
      throw createApiServiceError(
        'organizationSlug is required. Call list_organizations to discover authorized organizations.'
      );
    return `/${version}/organizations/${this.segment(this.organizationSlug, 'Organization slug')}${path}`;
  }
  private redact(value: unknown): unknown {
    if (typeof value === 'string') {
      let redacted = value;
      for (const sensitive of this.sensitiveValues)
        for (const representation of [sensitive, JSON.stringify(sensitive).slice(1, -1)])
          redacted = redacted.split(representation).join('[redacted]');
      return redacted
        .split(this.token)
        .join('[redacted]')
        .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
        .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]')
        .replace(
          /([?&](?:token|api_key|signature|sig|key|password|x-amz-signature|x-goog-signature)=)[^&\s"']+/gi,
          '$1[redacted]'
        );
    }
    if (Array.isArray(value)) return value.map(item => this.redact(item));
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          /token|jwt|authorization|password|secret|encryption_key/i.test(key)
            ? '[redacted]'
            : this.redact(item)
        ])
      );
    return value;
  }
  private async request<S extends z.ZodType>(
    operation: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    schema: S,
    options: {
      data?: unknown;
      params?: Record<string, unknown>;
      unauthenticated?: boolean;
    } = {}
  ): Promise<z.output<S>> {
    const axios = options.unauthenticated
      ? createAxios({ timeout: 30000, maxRedirects: 0, validateStatus: () => true })
      : this.axios;
    const data = await requestAxiosData(
      operation,
      async () => {
        const response = await axios.request({
          method,
          url: path,
          data: options.data,
          params: options.params
        });
        if (
          response.status < 200 ||
          response.status >= 300 ||
          (response.data &&
            typeof response.data === 'object' &&
            'error' in response.data &&
            response.data.error != null)
        ) {
          const guidance =
            response.status === 401 && !options.unauthenticated
              ? ' Use a Turso Platform API token; database/group SQL tokens cannot manage the Platform API.'
              : response.status === 403 &&
                  ['create group', 'delete group', 'transfer group'].includes(operation)
                ? ' Group-scoped Platform tokens cannot create, delete or transfer groups. Use an organization-scoped token and the required organization permissions.'
                : '';
          const error = buildApiServiceError(
            { response: { status: response.status, data: this.redact(response.data) } },
            {
              providerLabel: 'Turso',
              parent: {},
              reason: 'turso_api_error',
              operation,
              formatMessage: ({ providerLabel, operation: action, statusLabel, message }) =>
                `${providerLabel} API ${action} failed: ${statusLabel}${message}${guidance}`
            }
          );
          const retryAfter = safeRetryAfter(
            getResponseHeaderValue(response.headers, 'retry-after')
          );
          if (retryAfter) error.data.retryAfter = retryAfter;
          throw error;
        }
        return response;
      },
      (error, action) => {
        const details =
          isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
        const status =
          getApiErrorStatus(error) ??
          (typeof details?.upstreamStatus === 'number' ? details.upstreamStatus : undefined);
        const safe = createApiServiceError(
          String(
            this.redact(error instanceof Error ? error.message : `Turso API ${action} failed.`)
          ),
          { reason: 'turso_api_error', upstreamStatus: status }
        );
        const retryAfter = safeRetryAfter(details?.retryAfter);
        if (retryAfter) safe.data.retryAfter = retryAfter;
        return safe;
      }
    );
    const parsed = schema.safeParse(data);
    if (!parsed.success)
      throw createApiServiceError(`Turso API ${operation} returned an unexpected response.`, {
        reason: 'invalid_upstream_response'
      });
    return parsed.data;
  }

  listDatabases(filters?: { group?: string; parent?: string }) {
    return this.request(
      'list databases',
      'GET',
      this.orgPath('/databases'),
      z.object({ databases: z.array(databaseSchema) }),
      { params: pickDefined(filters ?? {}) }
    );
  }
  createDatabase(params: CreateDatabaseParams) {
    if (!/^[a-z0-9-]{1,64}$/.test(params.name))
      throw createApiServiceError(
        'Database name must contain 1–64 lowercase letters, numbers or dashes.'
      );
    if (params.seed?.type === 'database' && !params.seed.name?.trim())
      throw createApiServiceError('seed.name is required when copying an existing database.');
    if (params.seed?.type === 'dump') {
      let url: URL;
      try {
        url = new URL(params.seed.url ?? '');
      } catch {
        throw createApiServiceError('seed.url must be an HTTP(S) dump URL.');
      }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw createApiServiceError(
          'seed.url must be an HTTP(S) dump URL without URL credentials.'
        );
      if (params.seed.url) this.sensitiveValues.add(params.seed.url);
    }
    if (params.is_schema !== undefined && params.schema !== undefined)
      throw createApiServiceError('isSchema and schema cannot both be supplied.');
    if (params.seed?.timestamp && !Number.isFinite(Date.parse(params.seed.timestamp)))
      throw createApiServiceError('seed.timestamp must be a valid ISO 8601 timestamp.');
    return this.request(
      'create database',
      'POST',
      this.orgPath('/databases'),
      z.object({ database: databaseSchema.extend({ Name: z.literal(params.name) }) }),
      { data: pickDefined(params) }
    );
  }
  getDatabase(name: string) {
    return this.request(
      'get database',
      'GET',
      this.orgPath(`/databases/${this.segment(name, 'Database name')}`),
      z.object({ database: databaseSchema.extend({ Name: z.literal(name) }) })
    );
  }
  deleteDatabase(name: string) {
    return this.request(
      'delete database',
      'DELETE',
      this.orgPath(`/databases/${this.segment(name, 'Database name')}`),
      z.object({ database: z.literal(name) })
    );
  }
  getDatabaseConfiguration(name: string) {
    return this.request(
      'get database configuration',
      'GET',
      this.orgPath(`/databases/${this.segment(name, 'Database name')}/configuration`),
      configurationSchema
    );
  }
  updateDatabaseConfiguration(name: string, config: DatabaseConfiguration) {
    const data = pickDefined(config);
    if (!Object.keys(data).length)
      throw createApiServiceError(
        'Provide at least one database configuration field to update.'
      );
    return this.request(
      'update database configuration',
      'PATCH',
      this.orgPath(`/databases/${this.segment(name, 'Database name')}/configuration`),
      configurationSchema,
      { data }
    );
  }
  getDatabaseUsage(name: string, from?: string, to?: string) {
    return this.request(
      'get database usage',
      'GET',
      this.orgPath(`/databases/${this.segment(name, 'Database name')}/usage`),
      z.object({
        database: z.object({
          uuid: z.string(),
          instances: z.array(z.object({ uuid: z.string(), usage: usageCounters })),
          total: usageCounters.optional()
        })
      }),
      { params: pickDefined({ from, to }) }
    );
  }
  getDatabaseStats(name: string) {
    return this.request(
      'get database statistics',
      'GET',
      this.orgPath(`/databases/${this.segment(name, 'Database name')}/stats`),
      z.object({
        top_queries: z
          .array(
            z.object({ query: z.string(), rows_read: z.number(), rows_written: z.number() })
          )
          .nullable()
          .transform(queries => queries ?? [])
      })
    );
  }
  listDatabaseInstances(name: string) {
    return this.request(
      'list database instances',
      'GET',
      this.orgPath(`/databases/${this.segment(name, 'Database name')}/instances`),
      z.object({
        instances: z.array(
          z.object({
            uuid: z.string(),
            name: z.string(),
            type: z.string(),
            region: z.string(),
            hostname: z.string()
          })
        )
      })
    );
  }
  createDatabaseToken(name: string, params?: { expiration?: string; authorization?: string }) {
    return this.request(
      'create database SQL token',
      'POST',
      this.orgPath(`/databases/${this.segment(name, 'Database name')}/auth/tokens`),
      z.object({ jwt: z.string().min(1) }),
      { params: pickDefined(params ?? {}) }
    );
  }
  invalidateDatabaseTokens(name: string) {
    return this.request(
      'invalidate database SQL tokens',
      'POST',
      this.orgPath(`/databases/${this.segment(name, 'Database name')}/auth/rotate`),
      z.unknown()
    );
  }
  listGroups() {
    return this.request(
      'list groups',
      'GET',
      this.orgPath('/groups'),
      z.object({ groups: z.array(groupSchema) })
    );
  }
  createGroup(params: CreateGroupParams) {
    if (!params.name.trim() || !params.location.trim())
      throw createApiServiceError('Group name and location are required.');
    const extensions =
      params.extensions === undefined || params.extensions === 'all'
        ? params.extensions
        : params.extensions.split(',').map(value => value.trim());
    const allowed = [
      'vector',
      'vec',
      'crypto',
      'fuzzy',
      'math',
      'stats',
      'text',
      'unicode',
      'uuid',
      'regexp'
    ];
    if (Array.isArray(extensions) && extensions.some(value => !allowed.includes(value)))
      throw createApiServiceError(
        'extensions must be "all" or comma-separated supported extension names.'
      );
    return this.request(
      'create group',
      'POST',
      this.orgPath('/groups'),
      z.object({ group: groupSchema.extend({ name: z.literal(params.name) }) }),
      { data: pickDefined({ ...params, extensions }) }
    );
  }
  getGroup(name: string) {
    return this.request(
      'get group',
      'GET',
      this.orgPath(`/groups/${this.segment(name, 'Group name')}`),
      z.object({ group: groupSchema.extend({ name: z.literal(name) }) })
    );
  }
  deleteGroup(name: string) {
    return this.request(
      'delete group',
      'DELETE',
      this.orgPath(`/groups/${this.segment(name, 'Group name')}`),
      z.object({ group: groupSchema.extend({ name: z.literal(name) }) })
    );
  }
  addGroupLocation(name: string, location: string) {
    return this.request(
      'add group location',
      'POST',
      this.orgPath(
        `/groups/${this.segment(name, 'Group name')}/locations/${this.segment(location, 'Location')}`
      ),
      z.object({ group: groupSchema.extend({ name: z.literal(name) }) })
    );
  }
  async removeGroupLocation(name: string, location: string) {
    const { group } = await this.getGroup(name);
    if (group.primary === location)
      throw createApiServiceError('The primary group location cannot be removed.');
    return this.request(
      'remove group location',
      'DELETE',
      this.orgPath(
        `/groups/${this.segment(name, 'Group name')}/locations/${this.segment(location, 'Location')}`
      ),
      z.object({ group: groupSchema.extend({ name: z.literal(name) }) })
    );
  }
  createGroupToken(name: string, params?: { expiration?: string; authorization?: string }) {
    return this.request(
      'create group SQL token',
      'POST',
      this.orgPath(`/groups/${this.segment(name, 'Group name')}/auth/tokens`),
      z.object({ jwt: z.string().min(1) }),
      { params: pickDefined(params ?? {}) }
    );
  }
  invalidateGroupTokens(name: string) {
    return this.request(
      'invalidate group SQL tokens',
      'POST',
      this.orgPath(`/groups/${this.segment(name, 'Group name')}/auth/rotate`),
      z.unknown()
    );
  }
  transferGroup(name: string, target: string) {
    if (target === this.organizationSlug)
      throw createApiServiceError(
        'The target organization must differ from the source organization.'
      );
    return this.request(
      'transfer group',
      'POST',
      this.orgPath(`/groups/${this.segment(name, 'Group name')}/transfer`),
      groupSchema.extend({ name: z.literal(name) }),
      { data: { organization: this.segmentValue(target, 'Target organization') } }
    );
  }
  private segmentValue(value: string, label: string) {
    this.segment(value, label);
    return value;
  }
  unarchiveGroup(name: string) {
    return this.request(
      'unarchive group',
      'POST',
      this.orgPath(`/groups/${this.segment(name, 'Group name')}/unarchive`),
      z.object({ group: groupSchema.extend({ name: z.literal(name) }) })
    );
  }
  listLocations() {
    return this.request(
      'list locations',
      'GET',
      '/v1/locations',
      z.object({ locations: z.record(z.string(), z.string()) })
    );
  }
  getClosestRegion() {
    return this.request(
      'get closest region',
      'GET',
      'https://region.turso.io/',
      z.object({ server: z.string(), client: z.string() }),
      { unauthenticated: true }
    );
  }
  listOrganizations() {
    return this.request(
      'list organizations',
      'GET',
      '/v1/organizations',
      z.union([
        z.array(organizationSchema),
        z.object({ organizations: z.array(organizationSchema) })
      ])
    ).then(result => (Array.isArray(result) ? result : result.organizations));
  }
  getCurrentUser() {
    return this.request('get current user', 'GET', '/v1/user', z.object({ user: userSchema }));
  }
  getOrganization() {
    return this.request(
      'get organization',
      'GET',
      this.orgPath(''),
      z.union([organizationSchema, z.object({ organization: organizationSchema })])
    ).then(result => ('organization' in result ? result.organization : result));
  }
  getOrganizationUsage() {
    return this.request(
      'get organization usage',
      'GET',
      this.orgPath('/usage'),
      z.object({
        organization: z.object({
          uuid: z.string(),
          usage: usageCounters.extend({
            databases: z.number(),
            locations: z.number(),
            groups: z.number()
          })
        })
      })
    );
  }
  getOrganizationSubscription() {
    return this.request(
      'get subscription',
      'GET',
      this.orgPath('/subscription'),
      z.object({
        subscription: z.union([
          z.string(),
          z.object({
            name: z.string().optional(),
            plan: z.string().optional(),
            timeline: z.string().optional(),
            overages: z.boolean().optional()
          })
        ])
      })
    );
  }
  listInvoices() {
    return this.request(
      'list invoices',
      'GET',
      this.orgPath('/invoices'),
      z.object({
        invoices: z.array(
          z.object({
            invoice_number: z.string(),
            amount_due: z.string(),
            due_date: z.string().nullable().optional(),
            paid_at: z.string().nullable().optional(),
            payment_failed_at: z.string().nullable().optional(),
            invoice_pdf: z.string().nullable().optional()
          })
        )
      })
    );
  }
  listMembers() {
    return this.request(
      'list members',
      'GET',
      this.orgPath('/members'),
      z.object({ members: z.array(memberSchema) })
    );
  }
  addMember(username: string, role: string) {
    return this.request(
      'add member',
      'POST',
      this.orgPath('/members'),
      z.object({ member: z.literal(username), role: z.literal(role) }),
      { data: { username: this.segmentValue(username, 'Username'), role } }
    );
  }
  removeMember(username: string) {
    return this.request(
      'remove member',
      'DELETE',
      this.orgPath(`/members/${this.segment(username, 'Username')}`),
      z.object({ member: z.literal(username) })
    );
  }
  listInvites() {
    return this.request(
      'list invitations',
      'GET',
      this.orgPath('/invites', 'v2'),
      z.object({ invites: z.array(inviteSchema) })
    );
  }
  createInvite(email: string, role: string) {
    if (!z.email().safeParse(email).success)
      throw createApiServiceError('A valid email address is required for an invitation.');
    return this.request(
      'create invitation',
      'POST',
      this.orgPath('/invites', 'v2'),
      z.object({
        invited: z.object({ email: z.string(), role: z.string(), organization: z.string() })
      }),
      { data: { email, role } }
    );
  }
  deleteInvite(email: string) {
    if (!z.email().safeParse(email).success)
      throw createApiServiceError(
        'A valid email address is required to cancel an invitation.'
      );
    return this.request(
      'delete invitation',
      'DELETE',
      this.orgPath(`/invites/${this.segment(email, 'Email')}`, 'v2'),
      z.unknown()
    );
  }
  listApiTokens() {
    return this.request(
      'list API tokens',
      'GET',
      '/v1/auth/api-tokens',
      z.object({ tokens: z.array(apiTokenSchema) })
    );
  }
  createApiToken(
    name: string,
    scope?: { organization?: string; group?: string; scopes?: string[] }
  ) {
    if (scope?.group && (!scope.organization || !scope.scopes?.length))
      throw createApiServiceError(
        'Group-scoped tokens require organization, group and a nonempty scopes list.'
      );
    if (scope?.scopes && !scope.group)
      throw createApiServiceError('scopes applies only to group-scoped tokens.');
    return this.request(
      'create API token',
      'POST',
      `/v1/auth/api-tokens/${this.segment(name, 'Token name')}`,
      z.object({ id: z.string().min(1), name: z.literal(name), token: z.string().min(1) }),
      {
        data: scope && Object.keys(pickDefined(scope)).length ? pickDefined(scope) : undefined
      }
    );
  }
  revokeApiToken(name: string) {
    return this.request(
      'revoke API token',
      'DELETE',
      `/v1/auth/api-tokens/${this.segment(name, 'Token name')}`,
      z.object({ token: z.literal(name) })
    );
  }
  validateApiToken() {
    return this.request(
      'validate API token',
      'GET',
      '/v1/auth/validate',
      z.object({
        exp: z
          .number()
          .int()
          .refine(
            value =>
              value === -1 || (value >= 0 && Number.isFinite(new Date(value * 1000).getTime()))
          )
      })
    );
  }
  listAuditLogs(params?: { page?: number; pageSize?: number }) {
    for (const value of [params?.page, params?.pageSize])
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
        throw createApiServiceError('page and pageSize must be positive integers.');
    return this.request(
      'list audit logs',
      'GET',
      this.orgPath('/audit-logs'),
      z.object({
        audit_logs: z.array(
          z.object({
            code: z.string(),
            message: z.string(),
            origin: z.string(),
            author: z.string(),
            created_at: z.string(),
            data: z.record(z.string(), z.unknown()).optional()
          })
        ),
        pagination: z.object({
          page: z.number(),
          page_size: z.number(),
          total_pages: z.number(),
          total_rows: z.number()
        })
      }),
      { params: pickDefined({ page: params?.page, page_size: params?.pageSize }) }
    );
  }
}

export const clientForContext = (ctx: {
  auth: { token: string };
  config: Record<string, unknown>;
  input: Record<string, unknown>;
}) =>
  new Client({
    token: ctx.auth.token,
    organizationSlug:
      typeof ctx.input.organizationSlug === 'string'
        ? ctx.input.organizationSlug
        : typeof ctx.config.organizationSlug === 'string'
          ? ctx.config.organizationSlug
          : undefined
  });
