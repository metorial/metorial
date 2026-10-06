import { createAuthenticatedAxios, pickDefined } from 'slates';
import { z } from 'zod';
import { getGraphqlUrl, getRestBaseUrl } from './endpoints';
import {
  authenticationSchema,
  authNodeSchema,
  authValuesSchema,
  configValuesSchema,
  connectorSchema,
  environmentSchema,
  instanceSchema,
  nativeId,
  operationSchema,
  solutionSchema,
  userSchema
} from './types';
import {
  clean,
  failure as createApiServiceError,
  id,
  own,
  type Page,
  page,
  pageInfoSchema,
  parse,
  resolveRegion,
  text,
  token,
  upstreamError
} from './validation';
export type TrayCredential = { token: string; tokenType?: 'master' | 'user'; region: string };
export function clientConfig(ctx: {
  auth: { token: string; tokenType: 'master' | 'user'; region?: string };
  config: Record<string, unknown>;
}): TrayCredential {
  return { ...ctx.auth, region: resolveRegion(ctx.auth.region, ctx.config.region) };
}
const pageFields = 'pageInfo { hasNextPage hasPreviousPage startCursor endCursor }';
const userFields = 'id name externalUserId isTestUser';
const instanceFields =
  'id name enabled created owner solution { id } solutionVersionFlags { hasNewerVersion requiresUserInputToUpdateVersion requiresSystemInputToUpdateVersion } authValues { externalId authId } configValues { externalId value }';
const solutionFields =
  'id title description tags configSlots { externalId title defaultValue } customFields { key value }';
const quote = (value: string) => JSON.stringify(value);
function instanceOutput(node: z.infer<typeof instanceSchema>) {
  return {
    solutionInstanceId: node.id,
    name: node.name,
    enabled: node.enabled,
    created: node.created,
    owner: node.owner,
    solutionId: node.solution?.id,
    hasNewerVersion: node.solutionVersionFlags.hasNewerVersion,
    requiresUserInputToUpdateVersion:
      node.solutionVersionFlags.requiresUserInputToUpdateVersion,
    requiresSystemInputToUpdateVersion:
      node.solutionVersionFlags.requiresSystemInputToUpdateVersion,
    authValues: node.authValues,
    configValues: node.configValues
  };
}
function solutionOutput(node: z.infer<typeof solutionSchema>) {
  return {
    solutionId: node.id,
    title: node.title,
    description: node.description ?? undefined,
    tags: node.tags,
    configSlots: node.configSlots,
    customFields: node.customFields
  };
}
class HttpClient {
  protected http: ReturnType<typeof createAuthenticatedAxios>;
  protected secrets: string[];
  protected credential: TrayCredential;
  constructor(credential: TrayCredential, graphql: boolean) {
    const bearer = token(credential.token);
    resolveRegion(credential.region);
    if (
      credential.tokenType !== undefined &&
      !['master', 'user'].includes(credential.tokenType)
    )
      throw createApiServiceError('Reconnect using the correct Tray credential mode.', {
        reason: 'invalid_auth'
      });
    this.credential = credential;
    this.secrets = [bearer];
    this.http = createAuthenticatedAxios({
      baseURL: graphql ? getGraphqlUrl(credential.region) : getRestBaseUrl(credential.region),
      authHeader: { value: `Bearer ${bearer}` },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024,
      errorAdapter: upstreamError
    });
  }
  protected requireMode(mode: 'master' | 'user') {
    if (this.credential.tokenType !== mode)
      throw createApiServiceError(
        `This operation requires a ${mode} token in the matching region. Reconnect using ${mode === 'master' ? 'Master Token' : 'User Token'}.`,
        { reason: 'unsupported_credential_mode' }
      );
  }
  protected async request(
    method: 'get' | 'post' | 'delete',
    path: string,
    data?: unknown,
    responseSecrets: readonly string[] = this.secrets
  ) {
    const safeInput = clean(data, this.secrets);
    const response = await this.http.request<unknown>({ method, url: path, data: safeInput });
    clean(response.headers, responseSecrets);
    if (
      !Number.isInteger(response.status) ||
      response.status < 200 ||
      response.status >= 300 ||
      response.status === 202
    )
      throw createApiServiceError(
        'Tray has not confirmed the operation. Verify its current state before retrying a write or billable call.',
        { reason: 'unconfirmed_operation', upstreamStatus: response.status }
      );
    return clean(response.data, responseSecrets);
  }
}
export class TrayGraphqlClient extends HttpClient {
  constructor(credential: TrayCredential) {
    super(credential, true);
  }
  private async graphql(
    query: string,
    variables: Record<string, unknown> = {},
    responseSecrets?: readonly string[]
  ) {
    const envelope = parse(
      z.object({
        data: z.record(z.string(), z.unknown()).nullish(),
        errors: z.array(z.unknown()).optional()
      }),
      await this.request('post', '', { query, variables }, responseSecrets)
    );
    if (envelope.errors?.length || !envelope.data) {
      const receipt = own(envelope.data, 'createExternalUser');
      const userId = own(receipt, 'userId');
      const authId = own(own(envelope.data, 'createUserAuthentication'), 'authenticationId');
      const instanceId = own(
        own(own(envelope.data, 'createSolutionInstance'), 'solutionInstance'),
        'id'
      );
      throw createApiServiceError(
        'Tray returned GraphQL errors or incomplete data. Check credential mode, permissions and Embedded entitlement; a mutation may already have taken effect. Read the exact resource before retrying.',
        {
          reason: 'tray_graphql_error',
          ...(nativeId.safeParse(userId).success ? { userId } : {}),
          ...(nativeId.safeParse(authId).success ? { authenticationId: authId } : {}),
          ...(nativeId.safeParse(instanceId).success ? { solutionInstanceId: instanceId } : {})
        }
      );
    }
    return envelope.data;
  }
  private connection<T>(schema: z.ZodType<T>, value: unknown, input: Page) {
    const result = parse(
      z.object({
        edges: z.array(z.object({ node: schema, cursor: z.string().optional() })),
        pageInfo: pageInfoSchema
      }),
      value
    );
    const size = page(input).first;
    if (
      result.edges.length > size ||
      (result.pageInfo.hasNextPage &&
        (!result.pageInfo.endCursor ||
          result.pageInfo.endCursor === input.after ||
          result.edges.length === 0))
    )
      throw createApiServiceError(
        'Tray returned an incomplete or stalled page. Use a fresh discovery query before acting on the collection.',
        { reason: 'incomplete_pagination' }
      );
    return { items: result.edges.map(edge => edge.node), pageInfo: result.pageInfo };
  }
  private async find<T extends { id: string }>(
    target: string,
    get: (input: Page) => Promise<{ items: T[]; pageInfo: z.infer<typeof pageInfoSchema> }>
  ): Promise<T | undefined> {
    id(target);
    let after: string | undefined;
    const seen = new Set<string>(),
      ids = new Set<string>();
    for (let count = 0; count < 100; count++) {
      const result = await get({ first: 100, after });
      for (const node of result.items) {
        if (ids.has(node.id))
          throw createApiServiceError('Tray returned duplicate resource identifiers.', {
            reason: 'incomplete_pagination'
          });
        ids.add(node.id);
      }
      const matches = result.items.filter(node => node.id === target);
      if (matches.length === 1) return matches[0];
      if (!result.pageInfo.hasNextPage) return undefined;
      const cursor = result.pageInfo.endCursor;
      if (!cursor || seen.has(cursor))
        throw createApiServiceError('Tray returned a repeated pagination cursor.', {
          reason: 'incomplete_pagination'
        });
      seen.add(cursor);
      after = cursor;
    }
    throw createApiServiceError(
      'Tray discovery exceeded the bounded page limit; narrow the collection before retrying.',
      { reason: 'pagination_limit' }
    );
  }
  async listUsers(
    criteria: { externalUserId?: string; userId?: string } = {},
    input: Page = {}
  ) {
    this.requireMode('master');
    const queryPage = page(input);
    const filter = pickDefined({
      externalUserId:
        criteria.externalUserId === undefined
          ? undefined
          : text(criteria.externalUserId, 'externalUserId'),
      userId: criteria.userId === undefined ? undefined : id(criteria.userId, 'userId')
    });
    const criterion = Object.entries(filter)
      .map(([key, value]) => `${key}: ${quote(String(value))}`)
      .join(', ');
    const result = await this.graphql(
      `query ListUsers { users(first: ${queryPage.first}${queryPage.after === undefined ? '' : `, after: ${quote(queryPage.after)}`}${criterion ? `, criteria: { ${criterion} }` : ''}) { edges { node { ${userFields} } cursor } ${pageFields} } }`
    );
    return this.connection(userSchema, result.users, input);
  }
  async getUser(userId: string) {
    const target = id(userId, 'userId');
    const found = await this.find(target, p => this.listUsers({ userId: target }, p));
    if (!found)
      throw createApiServiceError(
        'The exact external user is not visible to this master token.',
        { reason: 'resource_not_found', userId: target }
      );
    return found;
  }
  async createExternalUser(input: {
    name: string;
    externalUserId: string;
    isTestUser?: boolean;
  }) {
    this.requireMode('master');
    text(input.name, 'name');
    text(input.externalUserId, 'externalUserId');
    const existing = await this.listUsers(
      { externalUserId: input.externalUserId },
      { first: 100 }
    );
    if (existing.items.length || existing.pageInfo.hasNextPage)
      throw createApiServiceError(
        'An external user already exists or its uniqueness could not be verified. Discover and reuse that user; do not blindly create another.',
        { reason: 'existing_user' }
      );
    const result = await this.graphql(
      'mutation CreateUser($name: String!, $externalUserId: String!, $isTestUser: Boolean) { createExternalUser(input: { name: $name, externalUserId: $externalUserId, isTestUser: $isTestUser }) { userId } }',
      pickDefined(input)
    );
    const receipt = parse(z.object({ userId: nativeId }), result.createExternalUser);
    try {
      const native = await this.getUser(receipt.userId);
      if (
        native.name !== input.name ||
        native.externalUserId !== input.externalUserId ||
        (input.isTestUser !== undefined && native.isTestUser !== input.isTestUser)
      )
        throw createApiServiceError('Tray returned a different created user.', {
          reason: 'resource_mismatch'
        });
    } catch {
      throw createApiServiceError(
        'Tray accepted user creation but the exact user could not be verified. Read this user before retrying creation.',
        { reason: 'creation_unverified', userId: receipt.userId }
      );
    }
    return receipt;
  }
  async deleteExternalUser(userId: string) {
    this.requireMode('master');
    const target = id(userId, 'userId');
    await this.getUser(target);
    const result = await this.graphql(
      'mutation DeleteUser($userId: ID!) { removeExternalUser(input: { userId: $userId }) { clientMutationId } }',
      { userId: target }
    );
    parse(z.object({ clientMutationId: z.string().nullable() }), result.removeExternalUser);
    const remaining = await this.find(target, p => this.listUsers({ userId: target }, p));
    if (remaining)
      throw createApiServiceError(
        'Tray still returns the user after removal; retained instances and effects require reconciliation.',
        { reason: 'deletion_unverified', userId: target }
      );
  }
  async authorize(userId: string) {
    this.requireMode('master');
    const target = id(userId, 'userId');
    await this.getUser(target);
    const result = await this.graphql(
      'mutation Authorize($userId: ID!) { authorize(input: { userId: $userId }) { accessToken } }',
      { userId: target }
    );
    const receipt = parse(z.object({ accessToken: z.string() }), result.authorize);
    token(receipt.accessToken);
    return receipt;
  }
  async listSolutions(input: Page = {}) {
    this.requireMode('master');
    const p = page(input);
    const result = await this.graphql(
      `query ListSolutions { viewer { solutions(first: ${p.first}${p.after === undefined ? '' : `, after: ${quote(p.after)}`}) { edges { node { ${solutionFields} } cursor } ${pageFields} } } }`
    );
    const resultPage = this.connection(solutionSchema, own(result.viewer, 'solutions'), input);
    return { items: resultPage.items.map(solutionOutput), pageInfo: resultPage.pageInfo };
  }
  async getSolution(solutionId: string) {
    const target = id(solutionId, 'solutionId');
    const native = await this.find(target, async p => {
      const result = await this.listSolutions(p);
      return {
        items: result.items.map(s => ({ ...s, id: s.solutionId })),
        pageInfo: result.pageInfo
      };
    });
    if (!native)
      throw createApiServiceError('The exact solution is not visible to this master token.', {
        reason: 'resource_not_found',
        solutionId: target
      });
    return native;
  }
  async listSolutionInstances(input: Page & { owner?: string; solutionId?: string } = {}) {
    const p = page(input);
    const criterion = [
      input.owner === undefined ? '' : `owner: ${quote(id(input.owner, 'owner'))}`,
      input.solutionId === undefined
        ? ''
        : `solutionId: ${quote(id(input.solutionId, 'solutionId'))}`
    ]
      .filter(Boolean)
      .join(', ');
    const result = await this.graphql(
      `query ListInstances { viewer { solutionInstances(first: ${p.first}${p.after === undefined ? '' : `, after: ${quote(p.after)}`}${criterion ? `, criteria: { ${criterion} }` : ''}) { edges { node { ${instanceFields} } cursor } ${pageFields} } } }`
    );
    const resultPage = this.connection(
      instanceSchema,
      own(result.viewer, 'solutionInstances'),
      input
    );
    return { items: resultPage.items.map(instanceOutput), pageInfo: resultPage.pageInfo };
  }
  async getSolutionInstance(solutionInstanceId: string) {
    const target = id(solutionInstanceId, 'solutionInstanceId');
    const native = await this.find(target, async p => {
      const result = await this.listSolutionInstances(p);
      return {
        items: result.items.map(s => ({ ...s, id: s.solutionInstanceId })),
        pageInfo: result.pageInfo
      };
    });
    if (!native)
      throw createApiServiceError(
        'The exact solution instance is not visible to this credential.',
        { reason: 'resource_not_found', solutionInstanceId: target }
      );
    return native;
  }
  async createSolutionInstance(input: {
    solutionId: string;
    instanceName: string;
    authValues?: z.infer<typeof authValuesSchema>;
    configValues?: z.infer<typeof configValuesSchema>;
  }) {
    this.requireMode('user');
    id(input.solutionId, 'solutionId');
    text(input.instanceName, 'instanceName');
    if (input.authValues !== undefined) parse(authValuesSchema, input.authValues);
    if (input.configValues !== undefined) parse(configValuesSchema, input.configValues);
    const result = await this.graphql(
      'mutation CreateInstance($solutionId: ID!, $instanceName: String!, $configValues: [ConfigValue!], $authValues: [AuthValue!]) { createSolutionInstance(input: { solutionId: $solutionId, instanceName: $instanceName, configValues: $configValues, authValues: $authValues }) { solutionInstance { id name enabled created } } }',
      pickDefined(input)
    );
    const receipt = parse(
      z.object({
        solutionInstance: z.object({
          id: nativeId,
          name: z.string(),
          enabled: z.boolean(),
          created: z.string()
        })
      }),
      result.createSolutionInstance
    ).solutionInstance;
    try {
      const native = await this.getSolutionInstance(receipt.id);
      if (
        native.name !== input.instanceName ||
        native.enabled ||
        (native.solutionId !== undefined && native.solutionId !== input.solutionId) ||
        (input.authValues !== undefined &&
          !slotsApplied(native.authValues, input.authValues)) ||
        (input.configValues !== undefined &&
          !slotsApplied(native.configValues, input.configValues))
      )
        throw createApiServiceError(
          'The created instance differs from the requested disabled instance.',
          { reason: 'resource_mismatch' }
        );
      return native;
    } catch {
      throw createApiServiceError(
        'Tray accepted instance creation but disabled state and exact identity could not be verified. Read the instance before retrying; execution or deployment effects may remain.',
        { reason: 'creation_unverified', solutionInstanceId: receipt.id }
      );
    }
  }
  async updateSolutionInstance(input: {
    solutionInstanceId: string;
    instanceName?: string;
    enabled?: boolean;
    authValues?: z.infer<typeof authValuesSchema>;
    configValues?: z.infer<typeof configValuesSchema>;
  }) {
    this.requireMode('user');
    const target = id(input.solutionInstanceId, 'solutionInstanceId');
    if (Object.keys(pickDefined(input)).length === 1)
      throw createApiServiceError('Provide at least one instance field to update.', {
        reason: 'empty_update'
      });
    if (input.instanceName !== undefined) text(input.instanceName, 'instanceName');
    if (input.authValues !== undefined) parse(authValuesSchema, input.authValues);
    if (input.configValues !== undefined) parse(configValuesSchema, input.configValues);
    await this.getSolutionInstance(target);
    const result = await this.graphql(
      'mutation UpdateInstance($solutionInstanceId: ID!, $instanceName: String, $enabled: Boolean, $configValues: [ConfigValue!], $authValues: [AuthValue!]) { updateSolutionInstance(input: { solutionInstanceId: $solutionInstanceId, instanceName: $instanceName, enabled: $enabled, configValues: $configValues, authValues: $authValues }) { solutionInstance { id name enabled created } } }',
      pickDefined(input)
    );
    const receipt = parse(
      z.object({ solutionInstance: z.object({ id: nativeId }) }),
      result.updateSolutionInstance
    ).solutionInstance;
    if (receipt.id !== target)
      throw createApiServiceError(
        'Tray returned a different updated instance. Read the requested instance before retrying.',
        { reason: 'resource_mismatch', solutionInstanceId: target }
      );
    const native = await this.getSolutionInstance(target);
    if (
      (input.instanceName !== undefined && native.name !== input.instanceName) ||
      (input.enabled !== undefined && native.enabled !== input.enabled) ||
      (input.authValues !== undefined && !slotsEqual(native.authValues, input.authValues)) ||
      (input.configValues !== undefined &&
        !slotsEqual(native.configValues, input.configValues))
    )
      throw createApiServiceError(
        'Tray has not confirmed the requested instance changes; execution effects may already have occurred.',
        { reason: 'update_unverified', solutionInstanceId: target }
      );
    return native;
  }
  async removeSolutionInstance(solutionInstanceId: string) {
    this.requireMode('user');
    const target = id(solutionInstanceId, 'solutionInstanceId');
    await this.getSolutionInstance(target);
    const result = await this.graphql(
      'mutation DeleteInstance($solutionInstanceId: ID!) { removeSolutionInstance(input: { solutionInstanceId: $solutionInstanceId }) { clientMutationId } }',
      { solutionInstanceId: target }
    );
    parse(
      z.object({ clientMutationId: z.string().nullable() }),
      result.removeSolutionInstance
    );
    const remaining = await this.find(target, async p => {
      const result = await this.listSolutionInstances(p);
      return {
        items: result.items.map(s => ({ ...s, id: s.solutionInstanceId })),
        pageInfo: result.pageInfo
      };
    });
    if (remaining)
      throw createApiServiceError(
        'Tray still returns the instance after removal. Do not assume deployment effects have been undone.',
        { reason: 'deletion_unverified', solutionInstanceId: target }
      );
  }
  async upgradeSolutionInstance(
    solutionInstanceId: string,
    values: {
      configValues?: z.infer<typeof configValuesSchema>;
      authValues?: z.infer<typeof authValuesSchema>;
    } = {}
  ) {
    this.requireMode('user');
    const target = id(solutionInstanceId, 'solutionInstanceId');
    const before = await this.getSolutionInstance(target);
    if (
      (before.requiresUserInputToUpdateVersion || before.requiresSystemInputToUpdateVersion) &&
      values.configValues === undefined &&
      values.authValues === undefined
    )
      throw createApiServiceError(
        'This version requires additional slot values. Read the solution instance and provide its documented configuration or authentication values before upgrading.',
        { reason: 'upgrade_requires_input' }
      );
    if (values.configValues !== undefined) parse(configValuesSchema, values.configValues);
    if (values.authValues !== undefined) parse(authValuesSchema, values.authValues);
    const result = await this.graphql(
      'mutation UpgradeInstance($solutionInstanceId: ID!, $configValues: [ConfigValue!], $authValues: [AuthValue!]) { upgradeSolutionInstance(input: { solutionInstanceId: $solutionInstanceId, configValues: $configValues, authValues: $authValues }) { solutionInstance { id } } }',
      pickDefined({ solutionInstanceId: target, ...values })
    );
    const receipt = parse(
      z.object({ solutionInstance: z.object({ id: nativeId }) }),
      result.upgradeSolutionInstance
    ).solutionInstance;
    if (receipt.id !== target)
      throw createApiServiceError('Tray returned a different upgraded instance.', {
        reason: 'resource_mismatch',
        solutionInstanceId: target
      });
    const native = await this.getSolutionInstance(target);
    if (native.hasNewerVersion)
      throw createApiServiceError(
        'Tray accepted the upgrade but still reports a newer version; reconcile required slot values before retrying.',
        { reason: 'upgrade_unverified', solutionInstanceId: target }
      );
    return { solutionInstanceId: target };
  }
  async listAuthentications(input: Page = {}) {
    const p = page(input);
    const result = await this.graphql(
      `query ListAuthentications { viewer { authentications(first: ${p.first}${p.after === undefined ? '' : `, after: ${quote(p.after)}`}) { edges { node { id name service { id name title version } } cursor } ${pageFields} } } }`
    );
    const native = this.connection(
      authNodeSchema,
      own(result.viewer, 'authentications'),
      input
    );
    const rest = new TrayRestClient(this.credential);
    const items: {
      authenticationId: string;
      name: string;
      serviceId: string;
      serviceName: string;
      serviceTitle: string;
      serviceEnvironmentId: string;
    }[] = [];
    for (const a of native.items) {
      const metadata = await rest.getAuthentication(a.id);
      items.push({
        authenticationId: a.id,
        name: a.name,
        serviceId: a.service.id,
        serviceName: a.service.name,
        serviceTitle: a.service.title,
        serviceEnvironmentId: metadata.serviceEnvironmentId
      });
    }
    return { items, pageInfo: native.pageInfo };
  }
  async createUserAuthentication(input: {
    name: string;
    serviceId: string;
    serviceEnvironmentId: string;
    data: Record<string, unknown>;
    scopes?: string[];
    hidden?: boolean;
  }) {
    text(input.name, 'name');
    id(input.serviceId, 'serviceId');
    id(input.serviceEnvironmentId, 'serviceEnvironmentId');
    const safeData = clean(input.data, this.secrets);
    const json = JSON.stringify(safeData);
    const importedSecrets: string[] = [];
    const collect = (v: unknown): void => {
      if (typeof v === 'string' && v) importedSecrets.push(v);
      else if (v && typeof v === 'object') for (const item of Object.values(v)) collect(item);
    };
    collect(safeData);
    const result = await this.graphql(
      'mutation CreateAuthentication($name: String!, $serviceId: String!, $serviceEnvironmentId: String!, $data: Json!, $scopes: [String!], $hidden: Boolean!) { createUserAuthentication(input: { name: $name, serviceId: $serviceId, serviceEnvironmentId: $serviceEnvironmentId, data: $data, scopes: $scopes, hidden: $hidden }) { authenticationId } }',
      {
        name: input.name,
        serviceId: input.serviceId,
        serviceEnvironmentId: input.serviceEnvironmentId,
        data: json,
        scopes: input.scopes ?? [],
        hidden: input.hidden ?? false
      },
      [...this.secrets, ...importedSecrets]
    );
    const receipt = parse(
      z.object({ authenticationId: nativeId }),
      result.createUserAuthentication
    );
    try {
      const metadata = await new TrayRestClient(this.credential).getAuthentication(
        receipt.authenticationId
      );
      if (
        metadata.name !== input.name ||
        metadata.serviceEnvironmentId !== input.serviceEnvironmentId
      )
        throw createApiServiceError('Tray returned a different authentication.', {
          reason: 'resource_mismatch'
        });
    } catch {
      throw createApiServiceError(
        'Tray accepted authentication creation but its exact metadata could not be verified. Read the authentication before retrying; imported credentials may remain.',
        { reason: 'creation_unverified', authenticationId: receipt.authenticationId }
      );
    }
    return receipt;
  }
}
function slotsEqual(
  a: readonly { externalId: string }[],
  b: readonly { externalId: string }[]
) {
  const order = (rows: readonly { externalId: string }[]) =>
    rows
      .map(row =>
        Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))
      )
      .sort((x, y) => String(x.externalId).localeCompare(String(y.externalId)));
  return JSON.stringify(order(a)) === JSON.stringify(order(b));
}
function slotsApplied(
  actual: readonly { externalId: string }[],
  requested: readonly { externalId: string }[]
) {
  const keys = new Set(requested.map(value => value.externalId));
  return slotsEqual(
    actual.filter(value => keys.has(value.externalId)),
    requested
  );
}
export class TrayRestClient extends HttpClient {
  constructor(credential: TrayCredential) {
    super(credential, false);
  }
  private async elements<T>(schema: z.ZodType<T>, path: string) {
    const result = parse(
      z.object({ elements: z.array(schema), pageInfo: pageInfoSchema.optional() }),
      await this.request('get', path)
    );
    if (result.pageInfo?.hasNextPage)
      throw createApiServiceError(
        'Tray returned an incomplete REST catalog; no documented cursor is available for this catalog. Contact Tray support before using it to configure a write.',
        { reason: 'incomplete_pagination' }
      );
    return result.elements;
  }
  async listConnectors() {
    return (await this.elements(connectorSchema, '/core/v1/connectors')).map(c => ({
      connectorName: c.name,
      version: c.version,
      title: c.title,
      description: c.description,
      serviceId: c.service?.id,
      serviceName: c.service?.name,
      serviceVersion: c.service?.version
    }));
  }
  async getConnectorOperations(connectorName: string, version: string) {
    const path = `/core/v1/connectors/${encodeURIComponent(id(connectorName, 'connectorName'))}/versions/${encodeURIComponent(id(version, 'connector version'))}/operations`;
    return (await this.elements(operationSchema, path)).map(o => ({
      operationName: o.name,
      title: o.title,
      description: o.description,
      inputSchema: o.inputSchema,
      outputSchema: o.outputSchema,
      hasDynamicOutput: o.hasDynamicOutput,
      authScopes: o.authScopes
    }));
  }
  async getServiceEnvironments(connectorName: string, version: string) {
    const matches = (await this.listConnectors()).filter(
      c =>
        c.connectorName === id(connectorName, 'connectorName') &&
        c.version === id(version, 'connector version')
    );
    const connector = matches[0];
    if (
      matches.length !== 1 ||
      !connector?.serviceId ||
      !connector.serviceName ||
      connector.serviceVersion === undefined
    )
      throw createApiServiceError(
        'Discover one exact connector version and its native service mapping using List Connectors.',
        { reason: 'service_mapping_unavailable' }
      );
    const environments = await this.elements(
      environmentSchema,
      `/core/v1/services/${encodeURIComponent(connector.serviceName)}/versions/${connector.serviceVersion}/environments`
    );
    return environments.map(e => ({
      serviceEnvironmentId: e.id,
      title: e.title,
      scopes: e.scopes,
      userData: e.userDataSchema,
      credentials: e.credentialsSchema,
      authenticationType: e.authenticationType,
      serviceId: connector.serviceId,
      serviceName: connector.serviceName,
      serviceVersion: connector.serviceVersion
    }));
  }
  async callConnector(
    connectorName: string,
    version: string,
    operation: string,
    authId: string,
    operationInput: Record<string, unknown>
  ) {
    this.requireMode('user');
    const target = id(authId, 'authId');
    const authentication = await this.getAuthentication(target);
    const environments = await this.getServiceEnvironments(connectorName, version);
    const operations = await this.getConnectorOperations(connectorName, version);
    if (
      !environments.some(
        e => e.serviceEnvironmentId === authentication.serviceEnvironmentId
      ) ||
      !operations.some(o => o.operationName === operation)
    )
      throw createApiServiceError(
        'Discover an exact operation and authentication belonging to this connector service before making a billable call.',
        { reason: 'connector_binding_mismatch' }
      );
    const result = parse(
      z
        .object({ outcome: z.enum(['success', 'error']), output: z.unknown() })
        .refine(v => Object.hasOwn(v, 'output')),
      await this.request(
        'post',
        `/core/v1/connectors/${encodeURIComponent(id(connectorName, 'connectorName'))}/versions/${encodeURIComponent(id(version, 'connector version'))}/call`,
        {
          operation: id(operation, 'operationName'),
          authId: target,
          input: clean(operationInput, this.secrets)
        }
      )
    );
    if (result.outcome !== 'success')
      throw createApiServiceError(
        'The third-party connector reported an error. The call is billable and may have produced external effects; verify the service before retrying.',
        { reason: 'connector_operation_failed', outcome: result.outcome }
      );
    return result;
  }
  async getAuthentication(authenticationId: string, includeCredentials = false) {
    if (includeCredentials)
      throw createApiServiceError(
        'This integration reads authentication metadata only; use the provider’s authorized credential administration flow for sensitive data.',
        { reason: 'unsupported_sensitive_read' }
      );
    const target = id(authenticationId, 'authenticationId');
    const result = parse(
      authenticationSchema,
      await this.request('get', `/core/v1/authentications/${encodeURIComponent(target)}`)
    );
    if (result.id !== target)
      throw createApiServiceError('Tray returned a different authentication ID.', {
        reason: 'resource_mismatch'
      });
    return {
      authenticationId: result.id,
      name: result.name,
      serviceEnvironmentId: result.serviceEnvironmentId,
      scopes: result.scopes
    };
  }
  async deleteAuthentication(authenticationId: string) {
    const target = id(authenticationId, 'authenticationId');
    await this.getAuthentication(target);
    await this.request('delete', `/core/v1/authentications/${encodeURIComponent(target)}`);
    try {
      await this.getAuthentication(target);
    } catch (error) {
      const record = own(error, 'error');
      const data = own(record, 'data') ?? own(error, 'data');
      if (own(data, 'upstreamStatus') === 404) return;
      throw createApiServiceError(
        'Tray accepted removal but authentication absence could not be verified. Read the exact ID before retrying.',
        { reason: 'deletion_unverified', authenticationId: target }
      );
    }
    throw createApiServiceError('Tray still returns the authentication after deletion.', {
      reason: 'deletion_unverified',
      authenticationId: target
    });
  }
}
