import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import type {
  Actor,
  Connection,
  Datatank,
  DatatankTable,
  Organization,
  OrgMember,
  PaginatedResponse,
  PaginationParams,
  Pipeline,
  Process,
  QueryResult,
  Snapshot,
  Workspace
} from './types';

let snakeToCamel = (str: string): string =>
  str.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

let camelToSnake = (str: string): string =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

let invalidResponse = (label: string) =>
  createApiServiceError(`Turbot Pipes returned an invalid ${label}.`, {
    reason: 'invalid_response'
  });

export let requireRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalidResponse(label);
  return value as Record<string, unknown>;
};

let mapKeys = (obj: Record<string, unknown>, transform: (key: string) => string) =>
  Object.fromEntries(Object.entries(obj).map(([key, value]) => [transform(key), value]));

// Only API envelope keys are renamed. Configuration, arguments and query values are opaque.
let toSnake = (obj: object) => mapKeys(obj as Record<string, unknown>, camelToSnake);

let mapResource = <T>(value: unknown, idKey: string, required: string[] = []): T => {
  let source = requireRecord(value, idKey);
  let result = mapKeys(source, snakeToCamel);
  result[idKey] = source.id;
  for (let key of [idKey, ...required]) {
    if (typeof result[key] !== 'string' || !result[key])
      throw invalidResponse(`${idKey} response field ${key}`);
  }
  let stringFields = [
    'handle',
    'identityId',
    'state',
    'desiredState',
    'instanceType',
    'createdAt',
    'updatedAt',
    'plugin',
    'type',
    'credentialSource',
    'displayName',
    'email',
    'avatarUrl',
    'url',
    'status',
    'title',
    'lastProcessId',
    'workspaceId',
    'pipelineId',
    'dashboardName',
    'dashboardTitle',
    'expiresAt',
    'databaseName',
    'host'
  ];
  for (let key of stringFields) {
    if (result[key] !== undefined && typeof result[key] !== 'string')
      throw invalidResponse(`${idKey} response field ${key}`);
  }
  for (let key of ['dbVolumeSizeBytes', 'versionId']) {
    if (
      result[key] !== undefined &&
      (typeof result[key] !== 'number' || !Number.isFinite(result[key]))
    )
      throw invalidResponse(`${idKey} response field ${key}`);
  }
  return result as T;
};

let mapActor = (value: unknown) => mapResource<Actor>(value, 'id', ['handle']);
let mapWorkspace = (value: unknown) =>
  mapResource<Workspace>(value, 'workspaceId', ['handle']);
let mapConnection = (value: unknown) =>
  mapResource<Connection>(value, 'connectionId', ['handle']);
let mapOrg = (value: unknown) => mapResource<Organization>(value, 'orgId', ['handle']);
let mapPipeline = (value: unknown) => {
  let result = mapResource<Pipeline>(value, 'pipelineId');
  if (result.pipeline !== undefined && typeof result.pipeline !== 'string')
    throw invalidResponse('pipelineId response field pipeline');
  if (result.frequency !== undefined) {
    let frequency = requireRecord(result.frequency, 'pipeline frequency');
    for (let key of ['type', 'schedule']) {
      if (frequency[key] !== undefined && typeof frequency[key] !== 'string')
        throw invalidResponse(`pipeline frequency ${key}`);
    }
  }
  return result;
};
let mapProcess = (value: unknown) => mapResource<Process>(value, 'processId');
let mapSnapshot = (value: unknown) => mapResource<Snapshot>(value, 'snapshotId');
let mapDatatank = (value: unknown) => mapResource<Datatank>(value, 'datatankId', ['handle']);
let mapDatatankTable = (value: unknown) =>
  mapResource<DatatankTable>(value, 'datatankTableId', ['name']);
let mapMember = (value: unknown): OrgMember => {
  let source = requireRecord(value, 'organization member');
  let result = mapKeys(source, snakeToCamel);
  for (let key of ['userId', 'orgId']) {
    if (typeof result[key] !== 'string' || !result[key])
      throw invalidResponse(`member ${key}`);
  }
  if (result.role !== undefined && typeof result.role !== 'string')
    throw invalidResponse('member role');
  result.handle = source.user_handle;
  if (source.user !== undefined) {
    let user = requireRecord(source.user, 'member user');
    result.displayName = user.display_name;
    result.handle = source.user_handle ?? user.handle;
  }
  for (let key of ['status', 'displayName', 'handle', 'createdAt', 'updatedAt']) {
    if (result[key] !== undefined && typeof result[key] !== 'string')
      throw invalidResponse(`member ${key}`);
  }
  return result as unknown as OrgMember;
};

let readPage = (value: unknown) => {
  let result = requireRecord(value, 'paginated response');
  if (!Array.isArray(result.items)) throw invalidResponse('paginated items');
  if (result.next_token !== undefined && typeof result.next_token !== 'string')
    throw invalidResponse('pagination cursor');
  return { items: result.items, nextToken: result.next_token as string | undefined };
};

let pagination = (params?: PaginationParams) => {
  if (
    params?.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
  ) {
    throw createApiServiceError('limit must be a whole number between 1 and 100.', {
      reason: 'invalid_input'
    });
  }
  return { limit: params?.limit, next_token: params?.nextToken };
};

let pathPart = (value: string) => {
  if (!value.trim() || value === '.' || value === '..')
    throw createApiServiceError('Resource handles and IDs must not be empty.', {
      reason: 'invalid_input'
    });
  return encodeURIComponent(value);
};

let readQueryResult = (value: unknown): QueryResult => {
  let source = requireRecord(value, 'query result');
  // The provider's official Zapier implementation uses items for this exact endpoint.
  if (!Array.isArray(source.items)) throw invalidResponse('query items');
  let items = source.items.map(item => requireRecord(item, 'query row'));
  let columns: QueryResult['columns'];
  if (source.columns !== undefined) {
    if (!Array.isArray(source.columns)) throw invalidResponse('query columns');
    columns = source.columns.map(value => {
      let col = requireRecord(value, 'query column');
      if (typeof col.name !== 'string' || typeof col.data_type !== 'string')
        throw invalidResponse('query column metadata');
      return { name: col.name, dataType: col.data_type };
    });
  }
  return { items, columns, rawResult: source };
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A Turbot Pipes API token is required.', {
        reason: 'invalid_auth'
      });
    let baseUrl: URL;
    try {
      baseUrl = new URL(config.baseUrl);
    } catch {
      throw createApiServiceError('The API base URL must be an absolute HTTPS URL.', {
        reason: 'invalid_config'
      });
    }
    if (
      baseUrl.protocol !== 'https:' ||
      baseUrl.username ||
      baseUrl.password ||
      baseUrl.search ||
      baseUrl.hash
    ) {
      throw createApiServiceError(
        'The API base URL must use HTTPS without credentials, a query or a fragment.',
        { reason: 'invalid_config' }
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: baseUrl.href.replace(/\/$/, ''),
      authHeader: { value: `Bearer ${config.token}` },
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Turbot Pipes',
          reason: 'turbot_pipes_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['detail', 'title', 'message'],
          nestedKeys: ['validation_errors']
        })
    });
  }

  static fromContext(ctx: {
    auth: { token: string; baseUrl?: string };
    config: Record<string, unknown>;
  }) {
    if (
      ctx.auth.baseUrl === undefined &&
      ctx.config.baseUrl !== undefined &&
      typeof ctx.config.baseUrl !== 'string'
    )
      throw createApiServiceError('The saved API base URL must be a string.', {
        reason: 'invalid_config'
      });
    return new Client({
      token: ctx.auth.token,
      baseUrl:
        ctx.auth.baseUrl ??
        (typeof ctx.config.baseUrl === 'string'
          ? ctx.config.baseUrl
          : 'https://pipes.turbot.com/api/v0')
    });
  }

  async resolveOwner(
    ownerType: 'user' | 'org' = 'user',
    ownerHandle?: string
  ): Promise<string> {
    if (ownerHandle) return ownerHandle;
    if (ownerType === 'org')
      throw createApiServiceError(
        'ownerHandle is required for an organization. Call list_organizations to discover organization handles.',
        { reason: 'invalid_input' }
      );
    return (await this.getActor()).handle;
  }

  // ---- Actor ----

  async getActor(): Promise<Actor> {
    let response = await this.axios.get('/actor');
    return mapActor(response.data);
  }

  // ---- Workspaces ----

  async listUserWorkspaces(
    userHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Workspace>> {
    let response = await this.axios.get(`/user/${pathPart(userHandle)}/workspace`, {
      params: {
        ...pagination(params)
      }
    });
    let data = readPage(response.data);
    return {
      items: data.items.map(mapWorkspace),
      nextToken: data.nextToken
    };
  }

  async getUserWorkspace(userHandle: string, workspaceHandle: string): Promise<Workspace> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}`
    );
    return mapWorkspace(response.data);
  }

  async createUserWorkspace(
    userHandle: string,
    workspace: {
      handle: string;
      instanceType?: string;
      desiredState?: string;
    }
  ): Promise<Workspace> {
    let response = await this.axios.post(
      `/user/${pathPart(userHandle)}/workspace`,
      toSnake(workspace)
    );
    return mapWorkspace(response.data);
  }

  async updateUserWorkspace(
    userHandle: string,
    workspaceHandle: string,
    updates: {
      handle?: string;
      instanceType?: string;
      desiredState?: string;
      dbVolumeSizeBytes?: number;
    }
  ): Promise<Workspace> {
    if (
      updates.dbVolumeSizeBytes !== undefined &&
      (!Number.isSafeInteger(updates.dbVolumeSizeBytes) || updates.dbVolumeSizeBytes < 0)
    ) {
      throw createApiServiceError(
        'dbVolumeSizeBytes must be a non-negative safe whole number.',
        { reason: 'invalid_input' }
      );
    }
    let response = await this.axios.patch(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}`,
      toSnake(updates)
    );
    return mapWorkspace(response.data);
  }

  async deleteUserWorkspace(userHandle: string, workspaceHandle: string): Promise<Workspace> {
    let previous = await this.getUserWorkspace(userHandle, workspaceHandle);
    let response = await this.axios.delete(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}`
    );
    return response.status === 204 ? previous : mapWorkspace(response.data);
  }

  async listOrgWorkspaces(
    orgHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Workspace>> {
    let response = await this.axios.get(`/org/${pathPart(orgHandle)}/workspace`, {
      params: {
        ...pagination(params)
      }
    });
    let data = readPage(response.data);
    return {
      items: data.items.map(mapWorkspace),
      nextToken: data.nextToken
    };
  }

  async getOrgWorkspace(orgHandle: string, workspaceHandle: string): Promise<Workspace> {
    let response = await this.axios.get(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}`
    );
    return mapWorkspace(response.data);
  }

  async createOrgWorkspace(
    orgHandle: string,
    workspace: {
      handle: string;
      instanceType?: string;
      desiredState?: string;
    }
  ): Promise<Workspace> {
    let response = await this.axios.post(
      `/org/${pathPart(orgHandle)}/workspace`,
      toSnake(workspace)
    );
    return mapWorkspace(response.data);
  }

  async updateOrgWorkspace(
    orgHandle: string,
    workspaceHandle: string,
    updates: {
      handle?: string;
      instanceType?: string;
      desiredState?: string;
      dbVolumeSizeBytes?: number;
    }
  ): Promise<Workspace> {
    if (
      updates.dbVolumeSizeBytes !== undefined &&
      (!Number.isSafeInteger(updates.dbVolumeSizeBytes) || updates.dbVolumeSizeBytes < 0)
    ) {
      throw createApiServiceError(
        'dbVolumeSizeBytes must be a non-negative safe whole number.',
        { reason: 'invalid_input' }
      );
    }
    let response = await this.axios.patch(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}`,
      toSnake(updates)
    );
    return mapWorkspace(response.data);
  }

  async deleteOrgWorkspace(orgHandle: string, workspaceHandle: string): Promise<Workspace> {
    let previous = await this.getOrgWorkspace(orgHandle, workspaceHandle);
    let response = await this.axios.delete(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}`
    );
    return response.status === 204 ? previous : mapWorkspace(response.data);
  }

  // ---- Query ----

  async executeQuery(
    userHandle: string,
    workspaceHandle: string,
    sql: string
  ): Promise<QueryResult> {
    let response = await this.axios.post(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/query`,
      new URLSearchParams({ sql }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return readQueryResult(response.data);
  }

  async executeOrgQuery(
    orgHandle: string,
    workspaceHandle: string,
    sql: string
  ): Promise<QueryResult> {
    let response = await this.axios.post(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}/query`,
      new URLSearchParams({ sql }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return readQueryResult(response.data);
  }

  // ---- Connections ----

  async listUserConnections(
    userHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Connection>> {
    let response = await this.axios.get(`/user/${pathPart(userHandle)}/connection`, {
      params: {
        ...pagination(params)
      }
    });
    let data = readPage(response.data);
    return {
      items: data.items.map(mapConnection),
      nextToken: data.nextToken
    };
  }

  async getUserConnection(userHandle: string, connectionHandle: string): Promise<Connection> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/connection/${pathPart(connectionHandle)}`
    );
    return mapConnection(response.data);
  }

  async createUserConnection(
    userHandle: string,
    connection: {
      handle: string;
      plugin: string;
      config?: Record<string, unknown>;
    }
  ): Promise<Connection> {
    let response = await this.axios.post(
      `/user/${pathPart(userHandle)}/connection`,
      toSnake(connection)
    );
    return mapConnection(response.data);
  }

  async updateUserConnection(
    userHandle: string,
    connectionHandle: string,
    updates: {
      handle?: string;
      config?: Record<string, unknown>;
    }
  ): Promise<Connection> {
    let response = await this.axios.patch(
      `/user/${pathPart(userHandle)}/connection/${pathPart(connectionHandle)}`,
      toSnake(updates)
    );
    return mapConnection(response.data);
  }

  async deleteUserConnection(
    userHandle: string,
    connectionHandle: string
  ): Promise<Connection> {
    let previous = await this.getUserConnection(userHandle, connectionHandle);
    let response = await this.axios.delete(
      `/user/${pathPart(userHandle)}/connection/${pathPart(connectionHandle)}`
    );
    return response.status === 204 ? previous : mapConnection(response.data);
  }

  async testUserConnection(userHandle: string, connectionHandle: string): Promise<unknown> {
    let response = await this.axios.post(
      `/user/${pathPart(userHandle)}/connection/${pathPart(connectionHandle)}/test`
    );
    return response.data;
  }

  async listOrgConnections(
    orgHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Connection>> {
    let response = await this.axios.get(`/org/${pathPart(orgHandle)}/connection`, {
      params: {
        ...pagination(params)
      }
    });
    let data = readPage(response.data);
    return {
      items: data.items.map(mapConnection),
      nextToken: data.nextToken
    };
  }

  async getOrgConnection(orgHandle: string, connectionHandle: string): Promise<Connection> {
    let response = await this.axios.get(
      `/org/${pathPart(orgHandle)}/connection/${pathPart(connectionHandle)}`
    );
    return mapConnection(response.data);
  }

  async createOrgConnection(
    orgHandle: string,
    connection: {
      handle: string;
      plugin: string;
      config?: Record<string, unknown>;
    }
  ): Promise<Connection> {
    let response = await this.axios.post(
      `/org/${pathPart(orgHandle)}/connection`,
      toSnake(connection)
    );
    return mapConnection(response.data);
  }

  async updateOrgConnection(
    orgHandle: string,
    connectionHandle: string,
    updates: {
      handle?: string;
      config?: Record<string, unknown>;
    }
  ): Promise<Connection> {
    let response = await this.axios.patch(
      `/org/${pathPart(orgHandle)}/connection/${pathPart(connectionHandle)}`,
      toSnake(updates)
    );
    return mapConnection(response.data);
  }

  async deleteOrgConnection(orgHandle: string, connectionHandle: string): Promise<Connection> {
    let previous = await this.getOrgConnection(orgHandle, connectionHandle);
    let response = await this.axios.delete(
      `/org/${pathPart(orgHandle)}/connection/${pathPart(connectionHandle)}`
    );
    return response.status === 204 ? previous : mapConnection(response.data);
  }

  // ---- Organizations ----

  async listOrgs(params?: PaginationParams): Promise<PaginatedResponse<Organization>> {
    let response = await this.axios.get('/actor/org', {
      params: {
        ...pagination(params)
      }
    });
    let data = readPage(response.data);
    return {
      items: data.items.map(item =>
        mapOrg(requireRecord(item, 'organization membership').org)
      ),
      nextToken: data.nextToken
    };
  }

  async getOrg(orgHandle: string): Promise<Organization> {
    let response = await this.axios.get(`/org/${pathPart(orgHandle)}`);
    return mapOrg(response.data);
  }

  async createOrg(org: { handle: string; displayName?: string }): Promise<Organization> {
    let response = await this.axios.post('/org', toSnake(org));
    return mapOrg(response.data);
  }

  async updateOrg(
    orgHandle: string,
    updates: { handle?: string; displayName?: string }
  ): Promise<Organization> {
    let response = await this.axios.patch(`/org/${pathPart(orgHandle)}`, toSnake(updates));
    return mapOrg(response.data);
  }

  async deleteOrg(orgHandle: string): Promise<Organization> {
    let previous = await this.getOrg(orgHandle);
    let response = await this.axios.delete(`/org/${pathPart(orgHandle)}`);
    return response.status === 204 ? previous : mapOrg(response.data);
  }

  async listOrgMembers(
    orgHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<OrgMember>> {
    let response = await this.axios.get(`/org/${pathPart(orgHandle)}/member`, {
      params: {
        ...pagination(params)
      }
    });
    let data = readPage(response.data);
    return {
      items: data.items.map(mapMember),
      nextToken: data.nextToken
    };
  }

  async addOrgMember(
    orgHandle: string,
    member: { handle: string; role: string }
  ): Promise<OrgMember> {
    let response = await this.axios.post(
      `/org/${pathPart(orgHandle)}/member`,
      toSnake(member)
    );
    return mapMember(response.data);
  }

  async updateOrgMember(
    orgHandle: string,
    userHandle: string,
    updates: { role: string }
  ): Promise<OrgMember> {
    let response = await this.axios.patch(
      `/org/${pathPart(orgHandle)}/member/${pathPart(userHandle)}`,
      toSnake(updates)
    );
    return mapMember(response.data);
  }

  async removeOrgMember(orgHandle: string, userHandle: string): Promise<OrgMember> {
    let response = await this.axios.delete(
      `/org/${pathPart(orgHandle)}/member/${pathPart(userHandle)}`
    );
    return mapMember(response.data);
  }

  // ---- Pipelines ----

  async listUserPipelines(
    userHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Pipeline>> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/pipeline`,
      {
        params: {
          ...pagination(params),
          where: params?.where
        }
      }
    );
    let data = readPage(response.data);
    return {
      items: data.items.map(mapPipeline),
      nextToken: data.nextToken
    };
  }

  async getUserPipeline(
    userHandle: string,
    workspaceHandle: string,
    pipelineId: string
  ): Promise<Pipeline> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/pipeline/${pathPart(pipelineId)}`
    );
    return mapPipeline(response.data);
  }

  async runPipelineCommand(
    userHandle: string,
    workspaceHandle: string,
    pipelineId: string,
    command: { command: string; args?: Record<string, unknown> }
  ): Promise<unknown> {
    if (command.command !== 'run')
      throw createApiServiceError('The supported pipeline command is "run".', {
        reason: 'invalid_input'
      });
    let response = await this.axios.post(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/pipeline/${pathPart(pipelineId)}/command`,
      toSnake(command)
    );
    return response.data;
  }

  async listOrgPipelines(
    orgHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Pipeline>> {
    let response = await this.axios.get(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}/pipeline`,
      {
        params: {
          ...pagination(params),
          where: params?.where
        }
      }
    );
    let data = readPage(response.data);
    return {
      items: data.items.map(mapPipeline),
      nextToken: data.nextToken
    };
  }

  // ---- Processes ----

  async listUserProcesses(
    userHandle: string,
    workspaceHandle: string,
    params?: PaginationParams & { where?: string }
  ): Promise<PaginatedResponse<Process>> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/process`,
      {
        params: {
          ...pagination(params),
          where: params?.where
        }
      }
    );
    let data = readPage(response.data);
    return {
      items: data.items.map(mapProcess),
      nextToken: data.nextToken
    };
  }

  async getUserProcess(
    userHandle: string,
    workspaceHandle: string,
    processId: string
  ): Promise<Process> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/process/${pathPart(processId)}`
    );
    return mapProcess(response.data);
  }

  async listOrgProcesses(
    orgHandle: string,
    workspaceHandle: string,
    params?: PaginationParams & { where?: string }
  ): Promise<PaginatedResponse<Process>> {
    let response = await this.axios.get(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}/process`,
      {
        params: {
          ...pagination(params),
          where: params?.where
        }
      }
    );
    let data = readPage(response.data);
    return {
      items: data.items.map(mapProcess),
      nextToken: data.nextToken
    };
  }

  // ---- Snapshots ----

  async listSnapshots(
    userHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Snapshot>> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/snapshot`,
      {
        params: {
          ...pagination(params),
          where: params?.where
        }
      }
    );
    let data = readPage(response.data);
    return {
      items: data.items.map(mapSnapshot),
      nextToken: data.nextToken
    };
  }

  async getSnapshot(
    userHandle: string,
    workspaceHandle: string,
    snapshotId: string
  ): Promise<Snapshot> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/snapshot/${pathPart(snapshotId)}`
    );
    return mapSnapshot(response.data);
  }

  async listOrgSnapshots(
    orgHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Snapshot>> {
    let response = await this.axios.get(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}/snapshot`,
      {
        params: {
          ...pagination(params),
          where: params?.where
        }
      }
    );
    let data = readPage(response.data);
    return {
      items: data.items.map(mapSnapshot),
      nextToken: data.nextToken
    };
  }

  // ---- Datatanks ----

  async listDatatanks(
    userHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Datatank>> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/datatank`,
      {
        params: {
          ...pagination(params)
        }
      }
    );
    let data = readPage(response.data);
    return {
      items: data.items.map(mapDatatank),
      nextToken: data.nextToken
    };
  }

  async getDatatank(
    userHandle: string,
    workspaceHandle: string,
    datatankHandle: string
  ): Promise<Datatank> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/datatank/${pathPart(datatankHandle)}`
    );
    return mapDatatank(response.data);
  }

  async listDatatankTables(
    userHandle: string,
    workspaceHandle: string,
    datatankHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<DatatankTable>> {
    let response = await this.axios.get(
      `/user/${pathPart(userHandle)}/workspace/${pathPart(workspaceHandle)}/datatank/${pathPart(datatankHandle)}/table`,
      {
        params: {
          ...pagination(params)
        }
      }
    );
    let data = readPage(response.data);
    return {
      items: data.items.map(mapDatatankTable),
      nextToken: data.nextToken
    };
  }

  // ---- Actor workspaces (all accessible workspaces) ----

  async listActorWorkspaces(params?: PaginationParams): Promise<PaginatedResponse<Workspace>> {
    let response = await this.axios.get('/actor/workspace', {
      params: {
        ...pagination(params)
      }
    });
    let data = readPage(response.data);
    return {
      items: data.items.map(item => {
        let summary = requireRecord(item, 'actor workspace');
        let workspace =
          summary.workspace === undefined
            ? summary
            : requireRecord(summary.workspace, 'workspace');
        return mapWorkspace({
          ...summary,
          ...workspace,
          id: summary.workspace_id ?? workspace.id
        });
      }),
      nextToken: data.nextToken
    };
  }
  async getOrgPipeline(
    orgHandle: string,
    workspaceHandle: string,
    pipelineId: string
  ): Promise<Pipeline> {
    let response = await this.axios.get(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}/pipeline/${pathPart(pipelineId)}`
    );
    return mapPipeline(response.data);
  }

  async runOrgPipelineCommand(
    orgHandle: string,
    workspaceHandle: string,
    pipelineId: string,
    command: { command: string; args?: Record<string, unknown> }
  ): Promise<unknown> {
    if (command.command !== 'run')
      throw createApiServiceError('The supported pipeline command is "run".', {
        reason: 'invalid_input'
      });
    let response = await this.axios.post(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}/pipeline/${pathPart(pipelineId)}/command`,
      toSnake(command)
    );
    return response.data;
  }

  async getOrgProcess(
    orgHandle: string,
    workspaceHandle: string,
    processId: string
  ): Promise<Process> {
    let response = await this.axios.get(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}/process/${pathPart(processId)}`
    );
    return mapProcess(response.data);
  }

  async getOrgSnapshot(
    orgHandle: string,
    workspaceHandle: string,
    snapshotId: string
  ): Promise<Snapshot> {
    let response = await this.axios.get(
      `/org/${pathPart(orgHandle)}/workspace/${pathPart(workspaceHandle)}/snapshot/${pathPart(snapshotId)}`
    );
    return mapSnapshot(response.data);
  }

  async testOrgConnection(orgHandle: string, connectionHandle: string): Promise<unknown> {
    let response = await this.axios.post(
      `/org/${pathPart(orgHandle)}/connection/${pathPart(connectionHandle)}/test`
    );
    return response.data;
  }

  async listWorkspaceSchemas(
    ownerType: 'user' | 'org',
    ownerHandle: string,
    workspaceHandle: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get(
      `/${ownerType}/${pathPart(ownerHandle)}/workspace/${pathPart(workspaceHandle)}/schema`,
      { params: pagination(params) }
    );
    let page = readPage(response.data);
    return {
      items: page.items.map(item => {
        let schema = requireRecord(item, 'workspace schema');
        if (typeof schema.id !== 'string' || typeof schema.name !== 'string')
          throw invalidResponse('workspace schema identity');
        return schema;
      }),
      nextToken: page.nextToken
    };
  }

  async listWorkspaceTables(
    ownerType: 'user' | 'org',
    ownerHandle: string,
    workspaceHandle: string,
    schemaName: string
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await this.axios.get(
      `/${ownerType}/${pathPart(ownerHandle)}/workspace/${pathPart(workspaceHandle)}/schema/${pathPart(schemaName)}/table`
    );
    let page = readPage(response.data);
    return {
      items: page.items.map(item => {
        let table = requireRecord(item, 'workspace table');
        if (typeof table.name !== 'string' || !Array.isArray(table.columns))
          throw invalidResponse('workspace table metadata');
        for (let value of table.columns) {
          let column = requireRecord(value, 'table column');
          if (typeof column.name !== 'string' || typeof column.data_type !== 'string')
            throw invalidResponse('table column metadata');
        }
        return table;
      }),
      nextToken: page.nextToken
    };
  }
}
