import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import {
  type AuthOutput,
  baseUrl,
  connection,
  executionId,
  id,
  invalid,
  type Row,
  record,
  secretFree,
  text
} from './connection';

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
}
export interface WorkflowListParams extends PaginationParams {
  active?: boolean;
  tags?: string;
  name?: string;
  projectId?: string;
  excludePinnedData?: boolean;
}
export interface ExecutionListParams extends PaginationParams {
  includeData?: boolean;
  status?: string;
  workflowId?: string;
  projectId?: string;
}
export interface UserListParams extends PaginationParams {
  includeRole?: boolean;
  projectId?: string;
}
export interface VariableListParams extends PaginationParams {
  projectId?: string;
  state?: string;
}
export interface AuditOptions {
  additionalOptions?: { daysAbandonedWorkflow?: number; categories?: string[] };
}
export interface SourceControlPullOptions {
  force?: boolean;
  autoPublish?: 'none' | 'all' | 'published';
  variables?: Record<string, string>;
}
export interface Named {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  native: Row;
}
export interface Credential extends Named {
  type: string;
}
export interface Workflow extends Named {
  createdAt: string;
  updatedAt: string;
  active: boolean;
  nodes: unknown[];
  connections: Row;
  settings: Row;
  tags?: unknown[];
}
export interface Execution {
  id: string;
  workflowId?: string;
  status: string;
  startedAt?: string;
  stoppedAt?: string;
  finished?: boolean;
  mode?: string;
  retryOf?: string;
  data?: unknown;
  native: Row;
}
export interface Variable {
  id: string;
  key: string;
  value: string;
  native: Row;
}
export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt?: string;
  native: Row;
}
export interface Version {
  workflowId: string;
  versionId: string;
  name?: string;
  nodes: unknown[];
  connections: Row;
  createdAt?: string;
  updatedAt?: string;
  native: Row;
}

export function apiError(error: unknown, operation: string) {
  const candidate =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined);
  const status =
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 100 &&
    candidate <= 599
      ? candidate
      : undefined;
  const guidance =
    status === 401
      ? 'Reconnect with a valid unexpired API key for this instance.'
      : status === 403
        ? 'Check API-key scopes, the owning user/project permissions and licensed feature availability.'
        : status === 404
          ? 'Check the exact resource ID and whether this deployment supports the documented Public API route.'
          : status === 429
            ? 'Wait before retrying; do not blindly repeat a write.'
            : 'Check the supported request and independently inspect state before retrying.';
  const write = !operation.startsWith('read');
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'n8n',
      reason: 'n8n_api_failure',
      operation,
      parent: {},
      extractMessage: () =>
        `${guidance}${write ? ' A write may already have taken effect, including a saved workflow draft even when publication fails. External executions, history and other effects are not undone.' : ''}`
    }
  );
}
export function malformed(write = false) {
  return invalid(
    `n8n returned an incomplete or unexpected native response.${write ? ' The operation may already have taken effect. Inspect the resource before retrying; preserve unresolved state.' : ' Check the deployed API contract and permissions.'}`
  );
}
export function object(value: unknown, write = false): Row {
  if (!record(value)) throw malformed(write);
  return value;
}
const optionalText = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : text(value, 'native text', true);
function nativeId(value: unknown): string {
  return id(
    typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value,
    'native resource ID'
  );
}
function named(value: unknown): Named {
  const row = object(value);
  return {
    id: nativeId(row.id),
    name: text(row.name, 'native resource name', true),
    createdAt: optionalText(row.createdAt),
    updatedAt: optionalText(row.updatedAt),
    native: row
  };
}
function workflow(value: unknown, expected?: string): Workflow {
  const item = named(value),
    row = item.native;
  if (
    (expected !== undefined && item.id !== expected) ||
    typeof row.active !== 'boolean' ||
    !Array.isArray(row.nodes) ||
    !record(row.connections) ||
    !record(row.settings)
  )
    throw malformed();
  if (row.tags !== undefined && !Array.isArray(row.tags)) throw malformed();
  return {
    ...item,
    createdAt: text(row.createdAt, 'native creation timestamp'),
    updatedAt: text(row.updatedAt, 'native update timestamp'),
    active: row.active,
    nodes: row.nodes,
    connections: row.connections,
    settings: row.settings,
    tags: row.tags as unknown[] | undefined
  };
}
function credential(value: unknown, expected?: string): Credential {
  const item = named(value);
  if ((expected !== undefined && item.id !== expected) || 'data' in item.native)
    throw malformed();
  return { ...item, type: text(item.native.type, 'native credential type') };
}
function execution(value: unknown, expected?: string): Execution {
  const row = object(value),
    key = executionId(nativeId(row.id));
  if (expected !== undefined && key !== expected) throw malformed();
  if (row.finished !== undefined && typeof row.finished !== 'boolean') throw malformed();
  return {
    id: key,
    workflowId:
      row.workflowId === undefined || row.workflowId === null
        ? undefined
        : nativeId(row.workflowId),
    status: text(row.status, 'native execution status'),
    startedAt: optionalText(row.startedAt),
    stoppedAt: optionalText(row.stoppedAt),
    finished: row.finished as boolean | undefined,
    mode: optionalText(row.mode),
    retryOf:
      row.retryOf === undefined || row.retryOf === null ? undefined : nativeId(row.retryOf),
    data: row.data,
    native: row
  };
}
function user(value: unknown): User {
  const row = object(value);
  const oldRole = record(row.globalRole) ? row.globalRole.name : undefined;
  return {
    id: nativeId(row.id),
    email: optionalText(row.email),
    firstName: optionalText(row.firstName),
    lastName: optionalText(row.lastName),
    role: optionalText(row.role ?? oldRole),
    createdAt: optionalText(row.createdAt),
    native: row
  };
}
function variable(value: unknown): Variable {
  const row = object(value);
  return {
    id: nativeId(row.id),
    key: text(row.key, 'native variable key'),
    value: text(row.value, 'native variable value', true),
    native: row
  };
}
function query(params?: PaginationParams): Row {
  if (
    params?.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 250)
  )
    throw invalid('Use an integer page limit from 1 to 250.');
  if (params?.cursor !== undefined) text(params.cursor, 'native pagination cursor');
  return pickDefined(params ?? {});
}
function page<T>(
  value: unknown,
  map: (value: unknown) => T,
  params?: PaginationParams
): PaginatedResponse<T> {
  const row = object(value);
  if (
    !Array.isArray(row.data) ||
    (params?.limit !== undefined && row.data.length > params.limit) ||
    (row.nextCursor !== undefined &&
      row.nextCursor !== null &&
      (typeof row.nextCursor !== 'string' ||
        !row.nextCursor.length ||
        row.nextCursor === params?.cursor))
  )
    throw malformed();
  return { data: row.data.map(value => map(value)), nextCursor: optionalText(row.nextCursor) };
}
const pathId = (value: unknown, label?: string) => encodeURIComponent(id(value, label));
const executionPath = (value: unknown) => encodeURIComponent(executionId(value));
export const workflowWritable = [
  'name',
  'nodes',
  'connections',
  'settings',
  'nodeGroups',
  'staticData',
  'pinData',
  'description'
] as const;
const workflowReadonly = new Set([
  'id',
  'active',
  'activeVersionId',
  'createdAt',
  'updatedAt',
  'isArchived',
  'versionId',
  'versionCounter',
  'sourceWorkflowId',
  'triggerCount',
  'meta',
  'shared',
  'tags',
  'activeVersion',
  'usedCredentials',
  'scopes',
  'homeProject',
  'parentFolder',
  'parentFolderId'
]);

export class Client {
  readonly saved: Required<AuthOutput>;
  private readonly axios;
  constructor(params: { baseUrl: string; token: string }) {
    this.saved = connection(params);
    this.axios = createAuthenticatedAxios({
      baseURL: baseUrl(params.baseUrl),
      authHeader: { name: 'X-N8N-API-KEY', value: this.saved.token },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024,
      errorAdapter: error => apiError(error, 'request')
    });
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    data?: unknown,
    params?: Row,
    statuses = [200]
  ) {
    if (!secretFree({ baseUrl: this.saved.baseUrl, path, data, params }, [this.saved.token]))
      throw invalid(
        'Request data contains connection credentials or cannot be inspected safely. No request was sent.'
      );
    let response: { status: number; data: unknown };
    try {
      response = await this.axios.request({ method, url: path, data, params });
    } catch (error) {
      throw apiError(
        error,
        `${method === 'get' || path === '/audit' ? 'read' : 'write'} ${path.split('/')[1] ?? 'resource'}`
      );
    }
    if (!statuses.includes(response.status)) throw malformed(method !== 'get');
    if (!secretFree(response.data, [this.saved.token]))
      throw invalid(
        'n8n reflected connection credentials. The response cannot be exposed; a write may already have taken effect. Inspect state before retrying.'
      );
    return response.data;
  }
  async discover(
    params: { include?: 'schemas'; resource?: string; operation?: string } = {}
  ): Promise<Row> {
    for (const value of [params.resource, params.operation])
      if (value !== undefined) text(value, 'discovery filter');
    const row = object(await this.request('get', '/discover', undefined, pickDefined(params)));
    const data = object(row.data);
    if (
      !Array.isArray(data.scopes) ||
      data.scopes.some(value => typeof value !== 'string') ||
      !record(data.resources) ||
      !record(data.filters) ||
      typeof data.specUrl !== 'string'
    )
      throw malformed();
    return data;
  }
  async listWorkflows(params?: WorkflowListParams): Promise<PaginatedResponse<Workflow>> {
    if (params?.projectId !== undefined) id(params.projectId, 'project ID');
    return page(
      await this.request('get', '/workflows', undefined, query(params)),
      value => workflow(value),
      params
    );
  }
  async getWorkflow(workflowId: string, excludePinnedData?: boolean): Promise<Workflow> {
    return workflow(
      await this.request(
        'get',
        `/workflows/${pathId(workflowId)}`,
        undefined,
        pickDefined({ excludePinnedData })
      ),
      workflowId
    );
  }
  async createWorkflow(body: Row): Promise<Workflow> {
    text(body.name, 'workflow name');
    if (
      !Array.isArray(body.nodes) ||
      !record(body.connections) ||
      (body.settings !== undefined && !record(body.settings))
    )
      throw invalid(
        'Workflow nodes must be an array and connections/settings must be JSON objects.'
      );
    const result = workflow(
      await this.request(
        'post',
        '/workflows',
        { ...body, settings: body.settings ?? {} },
        undefined,
        [200, 201]
      )
    );
    if (result.active) throw malformed(true);
    return result;
  }
  async updateWorkflow(
    workflowId: string,
    changes: Row,
    options: { expectedVersionId?: string; publishIfActive?: boolean } = {}
  ): Promise<Workflow> {
    if (Object.keys(changes).length === 0)
      throw invalid('Provide at least one workflow definition field to update.');
    const current = await this.getWorkflow(workflowId);
    if (
      options.expectedVersionId !== undefined &&
      text(options.expectedVersionId, 'expected version ID') !== current.native.versionId
    )
      throw invalid(
        'The workflow version changed. Read it again before applying your update.'
      );
    const unknown = Object.keys(current.native).filter(
      key => !new Set<string>(workflowWritable).has(key) && !workflowReadonly.has(key)
    );
    if (unknown.length)
      throw invalid(
        'This workflow contains fields outside the verified replacement contract. Use the native API schema to preserve all deployment-specific state; no update was sent.'
      );
    const body: Row = {};
    for (const key of workflowWritable)
      if (
        current.native[key] !== undefined &&
        !(key === 'description' && current.native[key] === null)
      )
        body[key] = current.native[key];
    Object.assign(body, changes);
    if (
      typeof body.name !== 'string' ||
      !Array.isArray(body.nodes) ||
      !record(body.connections) ||
      !record(body.settings)
    )
      throw invalid(
        'The complete workflow replacement requires name, nodes, connections and settings.'
      );
    return workflow(
      await this.request(
        'put',
        `/workflows/${pathId(workflowId)}`,
        body,
        pickDefined({ publishIfActive: options.publishIfActive })
      ),
      workflowId
    );
  }
  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.request(
      'delete',
      `/workflows/${pathId(workflowId)}`,
      undefined,
      undefined,
      [200, 204]
    );
  }
  async activateWorkflow(
    workflowId: string,
    options: { versionId?: string; name?: string; description?: string } = {}
  ): Promise<Workflow> {
    if (options.versionId !== undefined) id(options.versionId, 'version ID');
    const activated = workflow(
      await this.request(
        'post',
        `/workflows/${pathId(workflowId)}/activate`,
        pickDefined(options)
      ),
      workflowId
    );
    if (
      options.versionId !== undefined &&
      (!activated.active || activated.native.activeVersionId !== options.versionId)
    )
      throw malformed(true);
    return activated;
  }
  async deactivateWorkflow(workflowId: string): Promise<Workflow> {
    return workflow(
      await this.request('post', `/workflows/${pathId(workflowId)}/deactivate`),
      workflowId
    );
  }
  async getWorkflowVersion(workflowId: string, versionId: string): Promise<Version> {
    let raw: unknown;
    try {
      raw = await this.request(
        'get',
        `/workflows/${pathId(workflowId)}/versions/${pathId(versionId, 'version ID')}`
      );
    } catch (error) {
      if (!(error instanceof ServiceError) || error.data.upstreamStatus !== 404) throw error;
      raw = await this.request(
        'get',
        `/workflows/${pathId(workflowId)}/${pathId(versionId, 'version ID')}`
      );
    }
    const row = object(raw);
    if (
      row.workflowId !== workflowId ||
      row.versionId !== versionId ||
      !Array.isArray(row.nodes) ||
      !record(row.connections)
    )
      throw malformed();
    return {
      workflowId,
      versionId,
      name: optionalText(row.name),
      nodes: row.nodes,
      connections: row.connections,
      createdAt: optionalText(row.createdAt),
      updatedAt: optionalText(row.updatedAt),
      native: row
    };
  }
  async transferWorkflow(workflowId: string, destinationProjectId: string): Promise<void> {
    await this.request(
      'put',
      `/workflows/${pathId(workflowId)}/transfer`,
      { destinationProjectId: id(destinationProjectId, 'destination project ID') },
      undefined,
      [204]
    );
  }
  async getWorkflowTags(workflowId: string): Promise<Named[]> {
    const value = await this.request('get', `/workflows/${pathId(workflowId)}/tags`);
    if (!Array.isArray(value)) throw malformed();
    return value.map(named);
  }
  async updateWorkflowTags(workflowId: string, tagIds: string[]): Promise<Named[]> {
    const body = tagIds.map(value => ({ id: id(value, 'tag ID') }));
    const value = await this.request('put', `/workflows/${pathId(workflowId)}/tags`, body);
    if (!Array.isArray(value)) throw malformed(true);
    return value.map(named);
  }
  async listExecutions(params?: ExecutionListParams): Promise<PaginatedResponse<Execution>> {
    if (params?.workflowId !== undefined) id(params.workflowId, 'workflow ID');
    if (params?.projectId !== undefined) id(params.projectId, 'project ID');
    return page(
      await this.request('get', '/executions', undefined, query(params)),
      execution,
      params
    );
  }
  async getExecution(key: string, includeData?: boolean): Promise<Execution> {
    return execution(
      await this.request(
        'get',
        `/executions/${executionPath(key)}`,
        undefined,
        pickDefined({ includeData })
      ),
      key
    );
  }
  async deleteExecution(key: string): Promise<void> {
    await this.request(
      'delete',
      `/executions/${executionPath(key)}`,
      undefined,
      undefined,
      [200, 204]
    );
  }
  async retryExecution(key: string, loadWorkflow?: boolean): Promise<Execution> {
    const result = execution(
      await this.request(
        'post',
        `/executions/${executionPath(key)}/retry`,
        pickDefined({ loadWorkflow })
      )
    );
    if (result.id === key || (result.retryOf !== undefined && result.retryOf !== key))
      throw malformed(true);
    return result;
  }
  async stopExecution(key: string): Promise<Row> {
    const result = object(
      await this.request('post', `/executions/${executionPath(key)}/stop`),
      true
    );
    if (typeof result.status !== 'string') throw malformed(true);
    return result;
  }
  async listCredentials(params?: PaginationParams): Promise<PaginatedResponse<Credential>> {
    return page(
      await this.request('get', '/credentials', undefined, query(params)),
      value => credential(value),
      params
    );
  }
  async getCredential(key: string): Promise<Credential> {
    return credential(await this.request('get', `/credentials/${pathId(key)}`), key);
  }
  async createCredential(body: {
    name: string;
    type: string;
    data: Row;
    id?: string;
    projectId?: string;
  }): Promise<Credential> {
    text(body.name, 'credential name');
    id(body.type, 'credential type');
    if (body.id !== undefined && !/^[A-Za-z0-9_-]{1,16}$/.test(body.id))
      throw invalid(
        'Use an unused credential ID of 1–16 letters, digits, underscores or hyphens.'
      );
    if (body.projectId !== undefined) id(body.projectId, 'project ID');
    return credential(await this.request('post', '/credentials', pickDefined(body)), body.id);
  }
  async deleteCredential(key: string): Promise<void> {
    await this.request(
      'delete',
      `/credentials/${pathId(key)}`,
      undefined,
      undefined,
      [200, 204]
    );
  }
  async getCredentialSchema(type: string): Promise<Row> {
    return object(
      await this.request('get', `/credentials/schema/${pathId(type, 'credential type')}`)
    );
  }
  async transferCredential(key: string, destinationProjectId: string): Promise<void> {
    await this.request(
      'put',
      `/credentials/${pathId(key)}/transfer`,
      { destinationProjectId: id(destinationProjectId, 'destination project ID') },
      undefined,
      [204]
    );
  }
  async listUsers(params?: UserListParams): Promise<PaginatedResponse<User>> {
    if (params?.projectId !== undefined) id(params.projectId, 'project ID');
    return page(await this.request('get', '/users', undefined, query(params)), user, params);
  }
  async getUser(key: string, includeRole?: boolean): Promise<User> {
    const result = user(
      await this.request(
        'get',
        `/users/${pathId(key, 'user ID')}`,
        undefined,
        pickDefined({ includeRole })
      )
    );
    if (result.id !== key && result.email !== key) throw malformed();
    return result;
  }
  async listTags(params?: PaginationParams): Promise<PaginatedResponse<Named>> {
    return page(await this.request('get', '/tags', undefined, query(params)), named, params);
  }
  async getTag(key: string): Promise<Named> {
    const result = named(await this.request('get', `/tags/${pathId(key)}`));
    if (result.id !== key) throw malformed();
    return result;
  }
  async createTag(name: string): Promise<Named> {
    return named(
      await this.request(
        'post',
        '/tags',
        { name: text(name, 'tag name') },
        undefined,
        [201, 200]
      )
    );
  }
  async updateTag(key: string, name: string): Promise<Named> {
    const result = named(
      await this.request('put', `/tags/${pathId(key)}`, { name: text(name, 'tag name') })
    );
    if (result.id !== key) throw malformed(true);
    return result;
  }
  async deleteTag(key: string): Promise<void> {
    await this.request('delete', `/tags/${pathId(key)}`, undefined, undefined, [200, 204]);
  }
  async listVariables(params?: VariableListParams): Promise<PaginatedResponse<Variable>> {
    return page(
      await this.request('get', '/variables', undefined, query(params)),
      variable,
      params
    );
  }
  async createVariable(body: {
    key: string;
    value: string;
    projectId?: string;
  }): Promise<void> {
    text(body.key, 'variable key');
    text(body.value, 'variable value', true);
    if (
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(body.key) ||
      body.key.length > 50 ||
      body.value.length > 1000
    )
      throw invalid(
        'Use a variable key of at most 50 letters/digits/underscores starting with a letter or underscore, and a value of at most 1000 characters.'
      );
    if (body.projectId !== undefined) id(body.projectId, 'project ID');
    await this.request('post', '/variables', pickDefined(body), undefined, [201]);
  }
  async updateVariable(
    key: string,
    body: { key: string; value: string; projectId?: string | null }
  ): Promise<void> {
    text(body.key, 'variable key');
    text(body.value, 'variable value', true);
    if (!/^[A-Za-z0-9_]+$/.test(body.key) || body.key.length > 50 || body.value.length > 1000)
      throw invalid(
        'Use a variable key of at most 50 letters/digits/underscores and a value of at most 1000 characters.'
      );
    await this.request(
      'put',
      `/variables/${pathId(key)}`,
      pickDefined(body),
      undefined,
      [204]
    );
  }
  async deleteVariable(key: string): Promise<void> {
    await this.request('delete', `/variables/${pathId(key)}`, undefined, undefined, [204]);
  }
  async listProjects(params?: PaginationParams): Promise<PaginatedResponse<Named>> {
    return page(
      await this.request('get', '/projects', undefined, query(params)),
      named,
      params
    );
  }
  async createProject(name: string, key?: string): Promise<Named> {
    if (key !== undefined && id(key, 'project ID').length > 36)
      throw invalid('Use a project ID of at most 36 characters.');
    if (text(name, 'project name').length > 255)
      throw invalid('Use a project name of at most 255 characters.');
    return named(
      await this.request(
        'post',
        '/projects',
        pickDefined({ name: text(name, 'project name'), id: key }),
        undefined,
        [201]
      )
    );
  }
  async updateProject(key: string, body: Row): Promise<void> {
    if (text(body.name, 'project name').length > 255)
      throw invalid('Use a project name of at most 255 characters.');
    await this.request('put', `/projects/${pathId(key)}`, body, undefined, [204]);
  }
  async deleteProject(key: string): Promise<void> {
    await this.request('delete', `/projects/${pathId(key)}`, undefined, undefined, [204]);
  }
  async listProjectMembers(
    key: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<User>> {
    return page(
      await this.request('get', `/projects/${pathId(key)}/users`, undefined, query(params)),
      user,
      params
    );
  }
  async addProjectMembers(
    key: string,
    relations: { userId: string; role: string }[]
  ): Promise<void> {
    if (!relations.length) throw invalid('Provide at least one project member.');
    const body = relations.map(value => ({
      userId: id(value.userId, 'user ID'),
      role: text(value.role, 'project role')
    }));
    await this.request(
      'post',
      `/projects/${pathId(key)}/users`,
      { relations: body },
      undefined,
      [201]
    );
  }
  async removeProjectMember(key: string, userId: string): Promise<void> {
    await this.request(
      'delete',
      `/projects/${pathId(key)}/users/${pathId(userId, 'user ID')}`,
      undefined,
      undefined,
      [204]
    );
  }
  async sourceControlPull(options: SourceControlPullOptions = {}): Promise<unknown[]> {
    if (options.variables !== undefined)
      throw invalid(
        'Variable overrides are not part of the verified Public API pull contract. Apply them explicitly with manage_variables or use your deployment-specific native contract before pulling. No pull was sent.'
      );
    const result = await this.request(
      'post',
      '/source-control/pull',
      pickDefined({ force: options.force, autoPublish: options.autoPublish })
    );
    if (!Array.isArray(result)) throw malformed(true);
    return result;
  }
  async generateAudit(options: AuditOptions = {}): Promise<Row> {
    const additional = options.additionalOptions;
    if (
      additional?.categories?.some(
        value =>
          !['credentials', 'database', 'nodes', 'filesystem', 'instance'].includes(value)
      ) ||
      (additional?.daysAbandonedWorkflow !== undefined &&
        (!Number.isInteger(additional.daysAbandonedWorkflow) ||
          additional.daysAbandonedWorkflow < 0))
    )
      throw invalid(
        'Use the documented audit categories and a nonnegative integer day threshold.'
      );
    return object(await this.request('post', '/audit', options));
  }
}
export function clientFor(ctx: { auth: AuthOutput; config?: unknown }): Client {
  return new Client(connection(ctx.auth, ctx.config));
}
