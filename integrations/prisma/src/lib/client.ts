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
import {
  backupResponse,
  connectionResponse,
  databaseResponse,
  principalResponse,
  projectResponse,
  regionResponse,
  usageResponse,
  workspaceResponse
} from './schemas';

export type Workspace = z.infer<typeof workspaceResponse>;
export type Project = z.infer<typeof projectResponse>;
export type DatabaseConnection = z.infer<typeof connectionResponse>;
export type Database = z.infer<typeof databaseResponse>;
export type DatabaseBackup = z.infer<typeof backupResponse>;
export type DatabaseUsage = z.infer<typeof usageResponse>;
export type PageOptions = { cursor?: string; limit?: number };
export type Page<T> = { data: T[]; nextCursor: string | null; hasMore: boolean };
export interface CreateProjectParams {
  name: string;
  region?: string;
  workspaceId?: string;
  createDatabase?: boolean;
}
export interface CreateDatabaseParams {
  name: string;
  region: string;
  isDefault?: boolean;
}
export interface TransferProjectParams {
  projectId: string;
  recipientAccessToken: string;
}

const required = (value: string, label: string) => {
  if (!value.trim())
    throw createApiServiceError(`${label} must not be empty.`, { reason: 'invalid_input' });
  return value;
};
const encodedId = (value: string) => {
  required(value, 'Resource ID');
  if (value === '.' || value === '..')
    throw createApiServiceError('Resource ID must not be a relative path segment.', {
      reason: 'invalid_input'
    });
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('Resource ID contains invalid characters.', {
      reason: 'invalid_input'
    });
  }
};
const decode = <T>(value: unknown, schema: z.ZodType<T>, operation: string): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(`Prisma returned an invalid response for ${operation}.`, {
      reason: 'invalid_response'
    });
  return result.data;
};
const unwrap = (value: unknown) =>
  isApiErrorRecord(value) && 'data' in value ? value.data : value;
export const mapConnection = (connection: DatabaseConnection) => {
  const direct = connection.directConnection ?? connection.ppgDirectConnection;
  const directEndpoint = connection.endpoints?.direct;
  const connectionString =
    connection.connectionString ??
    connection.endpoints?.pooled?.connectionString ??
    directEndpoint?.connectionString ??
    connection.endpoints?.accelerate?.connectionString;
  let url: URL | undefined;
  if (directEndpoint?.connectionString) {
    try {
      url = new URL(directEndpoint.connectionString);
    } catch {
      /* Non-URL endpoints have no separate parsed credentials. */
    }
  }
  const decodeCredential = (value: string | undefined) => {
    if (!value) return undefined;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  return {
    connectionId: connection.id,
    connectionName: connection.name,
    connectionString,
    directHost: directEndpoint?.host ?? direct?.host ?? connection.host ?? undefined,
    directPort: directEndpoint?.port ?? direct?.port,
    directUser: direct?.user ?? connection.user ?? decodeCredential(url?.username),
    directPassword:
      direct?.pass ?? direct?.password ?? connection.pass ?? decodeCredential(url?.password),
    endpoints: connection.endpoints
  };
};
export const mapDatabase = (database: Database) => ({
  databaseId: database.id,
  databaseName: database.name,
  region: typeof database.region === 'string' ? database.region : database.region?.id,
  status: database.status,
  createdAt: database.createdAt,
  isDefault: database.isDefault,
  connectionString:
    database.connectionString ??
    (database.connections?.[0]
      ? mapConnection(database.connections[0]).connectionString
      : database.apiKeys?.[0]
        ? mapConnection(database.apiKeys[0]).connectionString
        : undefined),
  projectId: database.project?.id,
  projectName: database.project?.name
});

export class PrismaClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(private token: string) {
    required(token, 'Prisma access token');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.prisma.io/v1',
      authHeader: { value: `Bearer ${token}` },
      timeout: 30000,
      maxRedirects: 0,
      validateStatus: () => true
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, unknown>
  ): Promise<unknown> {
    const operation = `${method} ${path}`;
    const redact = (message: string) => {
      let safe = message.split(this.token).join('[redacted]');
      if (typeof body?.recipientAccessToken === 'string' && body.recipientAccessToken)
        safe = safe.split(body.recipientAccessToken).join('[redacted]');
      return safe.replace(
        /(?:postgres(?:ql)?|prisma\+postgres):\/\/[^\s"']+/gi,
        '[redacted connection]'
      );
    };
    const adapt = (error: unknown) =>
      buildApiServiceError(error, {
        parent: {},
        providerLabel: 'Prisma',
        reason: 'prisma_api_error',
        operation,
        extractMessage: (failure, helpers) =>
          redact(
            helpers.extractMessage(failure, {
              nestedKeys: ['error', 'errors'],
              detailKeys: ['message', 'hint', 'detail', 'error_description']
            })
          ),
        extractUpstreamCode: (_failure, response) =>
          isApiErrorRecord(response?.data) &&
          isApiErrorRecord(response.data.error) &&
          typeof response.data.error.code === 'string'
            ? redact(response.data.error.code)
            : undefined
      });
    return requestAxiosData(
      operation,
      async () => {
        const response = await this.http.request<unknown>({
          method,
          url: path,
          data: body,
          params: query
        });
        if (response.status < 200 || response.status >= 300) {
          const error = adapt({ response });
          const retryAfter = getResponseHeaderValue(response.headers, 'retry-after');
          if (retryAfter) error.data.retryAfter = retryAfter;
          throw error;
        }
        if (method === 'DELETE' && response.status !== 204)
          throw createApiServiceError('Prisma did not confirm deletion with HTTP 204.', {
            reason: 'invalid_response',
            upstreamStatus: response.status
          });
        if (path.endsWith('/transfer') && response.status !== 204)
          throw createApiServiceError('Prisma did not confirm the transfer with HTTP 204.', {
            reason: 'invalid_response',
            upstreamStatus: response.status
          });
        return response;
      },
      adapt
    );
  }
  private async get<T>(path: string, schema: z.ZodType<T>, id?: string): Promise<T> {
    const result = decode(unwrap(await this.request('GET', path)), schema, path);
    if (id !== undefined && (!isApiErrorRecord(result) || result.id !== id))
      throw createApiServiceError('Prisma returned a different resource than requested.', {
        reason: 'invalid_response'
      });
    return result;
  }
  private async list<T>(
    path: string,
    schema: z.ZodType<T>,
    options: PageOptions = {},
    filters: Record<string, unknown> = {}
  ): Promise<Page<T>> {
    if (
      options.limit !== undefined &&
      (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100)
    )
      throw createApiServiceError('Page size must be an integer from 1 to 100.', {
        reason: 'invalid_input'
      });
    if (options.cursor !== undefined) required(options.cursor, 'Cursor');
    const onePage = options.cursor !== undefined || options.limit !== undefined;
    const data: T[] = [];
    const seen = new Set<string>();
    let cursor = options.cursor;
    for (let page = 0; page < 100; page++) {
      const response = await this.request(
        'GET',
        path,
        undefined,
        pickDefined({ ...filters, cursor, limit: options.limit ?? 100 })
      );
      data.push(...decode(unwrap(response), z.array(schema), path));
      const pagination = isApiErrorRecord(response) ? response.pagination : undefined;
      const parsed = Array.isArray(response)
        ? { nextCursor: null, hasMore: false }
        : decode(
            pagination,
            z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }),
            path
          );
      if (
        parsed.hasMore &&
        (!parsed.nextCursor || seen.has(parsed.nextCursor) || parsed.nextCursor === cursor)
      )
        throw createApiServiceError('Prisma returned an invalid continuation cursor.', {
          reason: 'invalid_response'
        });
      if (onePage || !parsed.hasMore) return { data, ...parsed };
      cursor = parsed.nextCursor ?? undefined;
      if (cursor) seen.add(cursor);
    }
    throw createApiServiceError(
      'Prisma returned more than 100 pages. Use limit and cursor to retrieve smaller pages.',
      { reason: 'pagination_limit' }
    );
  }
  getCurrentUser() {
    return this.get('/me', principalResponse);
  }
  async listRegions() {
    return decode(
      unwrap(await this.request('GET', '/regions/postgres')),
      z.array(regionResponse),
      'list regions'
    );
  }
  listWorkspaces(options?: PageOptions) {
    return this.list('/workspaces', workspaceResponse, options);
  }
  listProjects(options?: PageOptions) {
    return this.list('/projects', projectResponse, options);
  }
  async createProject(params: CreateProjectParams): Promise<Project> {
    required(params.name, 'Project name');
    return decode(
      unwrap(
        await this.request(
          'POST',
          '/projects',
          pickDefined({
            name: params.name,
            region: params.region,
            workspaceId: params.workspaceId,
            createDatabase: params.createDatabase
          })
        )
      ),
      projectResponse,
      'create project'
    );
  }
  createProjectInWorkspace(workspaceId: string, params: CreateProjectParams) {
    return this.createProject({
      ...params,
      workspaceId: required(workspaceId, 'Workspace ID'),
      createDatabase: params.createDatabase ?? false
    });
  }
  getProject(projectId: string) {
    return this.get(`/projects/${encodedId(projectId)}`, projectResponse, projectId);
  }
  deleteProject(projectId: string) {
    return this.request('DELETE', `/projects/${encodedId(projectId)}`).then(() => undefined);
  }
  async transferProject(params: TransferProjectParams) {
    await this.request('POST', `/projects/${encodedId(params.projectId)}/transfer`, {
      recipientAccessToken: required(params.recipientAccessToken, 'Recipient access token')
    });
  }
  listDatabases(options?: PageOptions, projectId?: string) {
    return this.list(
      '/databases',
      databaseResponse,
      options,
      projectId ? { projectId: required(projectId, 'Project ID') } : {}
    );
  }
  listProjectDatabases(projectId: string, options?: PageOptions) {
    return this.list(`/projects/${encodedId(projectId)}/databases`, databaseResponse, options);
  }
  getDatabase(databaseId: string) {
    return this.get(`/databases/${encodedId(databaseId)}`, databaseResponse, databaseId);
  }
  async createDatabase(projectId: string, params: CreateDatabaseParams) {
    required(params.name, 'Database name');
    required(params.region, 'Database region');
    return decode(
      unwrap(
        await this.request(
          'POST',
          `/projects/${encodedId(projectId)}/databases`,
          pickDefined({ ...params })
        )
      ),
      databaseResponse,
      'create database'
    );
  }
  deleteDatabase(databaseId: string) {
    return this.request('DELETE', `/databases/${encodedId(databaseId)}`).then(() => undefined);
  }
  listConnections(databaseId: string, options?: PageOptions) {
    return this.list(
      `/databases/${encodedId(databaseId)}/connections`,
      connectionResponse,
      options
    );
  }
  async createConnection(databaseId: string, name = 'Database connection') {
    required(name, 'Connection name');
    if (name.length < 3 || name.length > 65)
      throw createApiServiceError('Connection name must contain 3 to 65 characters.', {
        reason: 'invalid_input'
      });
    return decode(
      unwrap(
        await this.request('POST', `/databases/${encodedId(databaseId)}/connections`, { name })
      ),
      connectionResponse,
      'create connection'
    );
  }
  getConnection(connectionId: string) {
    return this.get(
      `/connections/${encodedId(connectionId)}`,
      connectionResponse,
      connectionId
    );
  }
  deleteConnection(connectionId: string) {
    return this.request('DELETE', `/connections/${encodedId(connectionId)}`).then(
      () => undefined
    );
  }
  async listBackups(databaseId: string, limit?: number) {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100))
      throw createApiServiceError('Backup limit must be an integer from 1 to 100.', {
        reason: 'invalid_input'
      });
    const response = await this.request(
      'GET',
      `/databases/${encodedId(databaseId)}/backups`,
      undefined,
      pickDefined({ limit })
    );
    const data = decode(unwrap(response), z.array(backupResponse), 'list backups');
    const envelope = decode(
      response,
      z.object({
        meta: z.object({ backupRetentionDays: z.number() }),
        pagination: z.object({ hasMore: z.boolean(), limit: z.number().nullable() })
      }),
      'backup metadata'
    );
    return { data, ...envelope };
  }
  async getDatabaseUsage(
    databaseId: string,
    dates: { startDate?: string; endDate?: string } = {}
  ) {
    for (const value of [dates.startDate, dates.endDate])
      if (value !== undefined && !z.iso.datetime({ offset: true }).safeParse(value).success)
        throw createApiServiceError('Usage dates must be ISO 8601 timestamps.', {
          reason: 'invalid_input'
        });
    if (
      dates.startDate &&
      dates.endDate &&
      Date.parse(dates.startDate) > Date.parse(dates.endDate)
    )
      throw createApiServiceError('Usage startDate must not be later than endDate.', {
        reason: 'invalid_input'
      });
    return decode(
      await this.request(
        'GET',
        `/databases/${encodedId(databaseId)}/usage`,
        undefined,
        pickDefined(dates)
      ),
      usageResponse,
      'database usage'
    );
  }
}
