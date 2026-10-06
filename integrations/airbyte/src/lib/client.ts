import { createApiServiceError, createAuthenticatedAxios, pickDefined } from 'slates';
import { z } from 'zod';
import {
  connectionSchema,
  definitionSchema,
  destinationSchema,
  jobSchema,
  organizationSchema,
  pageSchema,
  permissionSchema,
  sourceSchema,
  streamPropertiesSchema,
  tagSchema,
  workspaceSchema
} from './models';
import type { StreamConfiguration } from './types';
import {
  airbyteError,
  apiBaseUrl,
  configurationSecrets,
  jobId,
  listQuery,
  pathId,
  requireUpdate,
  validatePermission,
  validateSchedule
} from './validation';

type ListOptions = {
  workspaceIds?: string[];
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
};
type ConnectionInput = {
  name?: string;
  sourceId?: string;
  destinationId?: string;
  namespaceDefinition?: string;
  namespaceFormat?: string;
  prefix?: string;
  nonBreakingSchemaUpdatesBehavior?: string;
  status?: string;
  dataResidency?: string;
  schedule?: { scheduleType: string; cronExpression?: string; cronTimeZone?: string };
  configurations?: { streams?: StreamConfiguration[] };
};
const notification = z
  .object({
    email: z.object({ enabled: z.boolean().optional() }).strict().optional(),
    webhook: z
      .object({ enabled: z.boolean().optional(), url: z.string().url().optional() })
      .strict()
      .optional()
  })
  .strict();
const notificationsSchema = z
  .object({
    failure: notification.optional(),
    success: notification.optional(),
    connectionUpdate: notification.optional(),
    connectionUpdateActionRequired: notification.optional(),
    syncDisabled: notification.optional(),
    syncDisabledWarning: notification.optional()
  })
  .strict();

export class Client {
  private http;
  private readonly secrets: string[];
  constructor(params: { token: string; baseUrl: string }) {
    if (!params.token.trim())
      throw createApiServiceError(
        'An Airbyte access token is required. Reconnect using application client credentials.'
      );
    this.secrets = [params.token];
    this.http = createAuthenticatedAxios({
      baseURL: apiBaseUrl(params.baseUrl),
      authHeader: { value: `Bearer ${params.token}` },
      headers: { Accept: 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      paramsSerializer: { indexes: null },
      errorAdapter: error => airbyteError(error, this.secrets)
    });
  }
  private parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
    const result = schema.safeParse(value);
    if (!result.success)
      throw createApiServiceError('Airbyte returned an invalid public API response.');
    return result.data;
  }
  private protect<T extends { configuration: Record<string, unknown> }>(value: T): T {
    return {
      ...value,
      configuration: Object.fromEntries(
        Object.keys(value.configuration).map(key => [key, '[redacted]'])
      )
    };
  }
  private remember(value: unknown) {
    this.secrets.push(...configurationSecrets(value, true));
  }
  private notifications(value?: Record<string, unknown>) {
    if (value === undefined) return undefined;
    if (!notificationsSchema.safeParse(value).success)
      throw createApiServiceError(
        'Use the public notifications format: event keys containing email.enabled and/or webhook.enabled and webhook.url.'
      );
    this.remember(value);
    return value;
  }

  async listSources(options?: ListOptions) {
    const result = this.parse(
      pageSchema(sourceSchema),
      (await this.http.get('/sources', { params: listQuery(options) })).data
    );
    return { ...result, data: result.data.map(value => this.protect(value)) };
  }
  async getSource(sourceId: string) {
    return this.protect(
      this.parse(sourceSchema, (await this.http.get(`/sources/${pathId(sourceId)}`)).data)
    );
  }
  async createSource(data: {
    name: string;
    workspaceId: string;
    sourceType?: string;
    definitionId?: string;
    configuration: Record<string, unknown>;
  }) {
    pathId(data.workspaceId);
    if (data.definitionId !== undefined) pathId(data.definitionId);
    const sourceType = data.sourceType ?? data.configuration.sourceType;
    if (
      data.definitionId !== undefined
        ? sourceType !== undefined
        : typeof sourceType !== 'string' || !sourceType.trim()
    )
      throw createApiServiceError(
        'Provide sourceType or definitionId, not both. Discover custom definition IDs with list_source_definitions.'
      );
    if (
      data.sourceType !== undefined &&
      data.configuration.sourceType !== undefined &&
      data.sourceType !== data.configuration.sourceType
    )
      throw createApiServiceError('sourceType must match configuration.sourceType.');
    const configuration =
      data.definitionId === undefined
        ? { ...data.configuration, sourceType }
        : data.configuration;
    this.remember(configuration);
    return this.protect(
      this.parse(
        sourceSchema,
        (
          await this.http.post(
            '/sources',
            pickDefined({
              name: data.name,
              workspaceId: data.workspaceId,
              definitionId: data.definitionId,
              configuration
            })
          )
        ).data
      )
    );
  }
  async updateSource(
    sourceId: string,
    data: { name?: string; configuration?: Record<string, unknown> }
  ) {
    requireUpdate(data);
    this.remember(data.configuration);
    return this.protect(
      this.parse(
        sourceSchema,
        (await this.http.patch(`/sources/${pathId(sourceId)}`, pickDefined(data))).data
      )
    );
  }
  async deleteSource(sourceId: string) {
    await this.http.delete(`/sources/${pathId(sourceId)}`);
  }

  async listDestinations(options?: ListOptions) {
    const result = this.parse(
      pageSchema(destinationSchema),
      (await this.http.get('/destinations', { params: listQuery(options) })).data
    );
    return { ...result, data: result.data.map(value => this.protect(value)) };
  }
  async getDestination(destinationId: string) {
    return this.protect(
      this.parse(
        destinationSchema,
        (await this.http.get(`/destinations/${pathId(destinationId)}`)).data
      )
    );
  }
  async createDestination(data: {
    name: string;
    workspaceId: string;
    destinationType?: string;
    definitionId?: string;
    configuration: Record<string, unknown>;
  }) {
    pathId(data.workspaceId);
    if (data.definitionId !== undefined) pathId(data.definitionId);
    const destinationType = data.destinationType ?? data.configuration.destinationType;
    if (
      data.definitionId !== undefined
        ? destinationType !== undefined
        : typeof destinationType !== 'string' || !destinationType.trim()
    )
      throw createApiServiceError(
        'Provide destinationType or definitionId, not both. Discover custom definition IDs with list_destination_definitions.'
      );
    if (
      data.destinationType !== undefined &&
      data.configuration.destinationType !== undefined &&
      data.destinationType !== data.configuration.destinationType
    )
      throw createApiServiceError('destinationType must match configuration.destinationType.');
    const configuration =
      data.definitionId === undefined
        ? { ...data.configuration, destinationType }
        : data.configuration;
    this.remember(configuration);
    return this.protect(
      this.parse(
        destinationSchema,
        (
          await this.http.post(
            '/destinations',
            pickDefined({
              name: data.name,
              workspaceId: data.workspaceId,
              definitionId: data.definitionId,
              configuration
            })
          )
        ).data
      )
    );
  }
  async updateDestination(
    destinationId: string,
    data: { name?: string; configuration?: Record<string, unknown> }
  ) {
    requireUpdate(data);
    this.remember(data.configuration);
    return this.protect(
      this.parse(
        destinationSchema,
        (await this.http.patch(`/destinations/${pathId(destinationId)}`, pickDefined(data)))
          .data
      )
    );
  }
  async deleteDestination(destinationId: string) {
    await this.http.delete(`/destinations/${pathId(destinationId)}`);
  }

  async listConnections(options?: ListOptions) {
    return this.parse(
      pageSchema(connectionSchema),
      (await this.http.get('/connections', { params: listQuery(options) })).data
    );
  }
  async getConnection(connectionId: string) {
    return this.parse(
      connectionSchema,
      (await this.http.get(`/connections/${pathId(connectionId)}`)).data
    );
  }
  async createConnection(data: ConnectionInput & { sourceId: string; destinationId: string }) {
    pathId(data.sourceId);
    pathId(data.destinationId);
    validateSchedule(data.schedule);
    return this.parse(
      connectionSchema,
      (await this.http.post('/connections', pickDefined(data))).data
    );
  }
  async updateConnection(connectionId: string, data: ConnectionInput) {
    requireUpdate(data);
    validateSchedule(data.schedule);
    return this.parse(
      connectionSchema,
      (await this.http.patch(`/connections/${pathId(connectionId)}`, pickDefined(data))).data
    );
  }
  async deleteConnection(connectionId: string) {
    await this.http.delete(`/connections/${pathId(connectionId)}`);
  }

  async listJobs(
    options?: ListOptions & {
      connectionId?: string;
      jobType?: string;
      status?: string;
      createdAtStart?: string;
      createdAtEnd?: string;
      updatedAtStart?: string;
      updatedAtEnd?: string;
      orderBy?: string;
    }
  ) {
    if (options?.connectionId !== undefined) pathId(options.connectionId);
    return this.parse(
      pageSchema(jobSchema),
      (await this.http.get('/jobs', { params: listQuery(options) })).data
    );
  }
  async getJob(id: number) {
    return this.parse(jobSchema, (await this.http.get(`/jobs/${jobId(id)}`)).data);
  }
  async createJob(data: { connectionId: string; jobType: 'sync' | 'reset' }) {
    pathId(data.connectionId);
    return this.parse(jobSchema, (await this.http.post('/jobs', data)).data);
  }
  async cancelJob(id: number) {
    return this.parse(jobSchema, (await this.http.delete(`/jobs/${jobId(id)}`)).data);
  }

  async listWorkspaces(options?: ListOptions) {
    return this.parse(
      pageSchema(workspaceSchema),
      (await this.http.get('/workspaces', { params: listQuery(options) })).data
    );
  }
  async getWorkspace(workspaceId: string) {
    return this.parse(
      workspaceSchema,
      (await this.http.get(`/workspaces/${pathId(workspaceId)}`)).data
    );
  }
  async createWorkspace(data: {
    name: string;
    organizationId?: string;
    notifications?: Record<string, unknown>;
  }) {
    if (data.organizationId !== undefined) pathId(data.organizationId);
    return this.parse(
      workspaceSchema,
      (
        await this.http.post(
          '/workspaces',
          pickDefined({ ...data, notifications: this.notifications(data.notifications) })
        )
      ).data
    );
  }
  async updateWorkspace(
    workspaceId: string,
    data: { name?: string; notifications?: Record<string, unknown> }
  ) {
    requireUpdate(data);
    return this.parse(
      workspaceSchema,
      (
        await this.http.patch(
          `/workspaces/${pathId(workspaceId)}`,
          pickDefined({ ...data, notifications: this.notifications(data.notifications) })
        )
      ).data
    );
  }
  async deleteWorkspace(workspaceId: string) {
    await this.http.delete(`/workspaces/${pathId(workspaceId)}`);
  }
  async listOrganizations() {
    return this.parse(
      pageSchema(organizationSchema),
      (await this.http.get('/organizations')).data
    );
  }
  async listDefinitions(workspaceId: string, kind: 'sources' | 'destinations') {
    return this.parse(
      pageSchema(definitionSchema),
      (await this.http.get(`/workspaces/${pathId(workspaceId)}/definitions/${kind}`)).data
    );
  }

  async listPermissions(options?: { userId?: string; organizationId?: string }) {
    if (options?.userId !== undefined) pathId(options.userId);
    if (options?.organizationId !== undefined) pathId(options.organizationId);
    return this.parse(
      pageSchema(permissionSchema),
      (await this.http.get('/permissions', { params: options })).data
    );
  }
  async getPermission(permissionId: string) {
    return this.parse(
      permissionSchema,
      (await this.http.get(`/permissions/${pathId(permissionId)}`)).data
    );
  }
  async createPermission(data: {
    permissionType: string;
    userId: string;
    workspaceId?: string;
    organizationId?: string;
  }) {
    validatePermission(data);
    pathId(data.userId);
    if (data.workspaceId !== undefined) pathId(data.workspaceId);
    if (data.organizationId !== undefined) pathId(data.organizationId);
    return this.parse(
      permissionSchema,
      (await this.http.post('/permissions', pickDefined(data))).data
    );
  }
  async deletePermission(permissionId: string) {
    await this.http.delete(`/permissions/${pathId(permissionId)}`);
  }

  async getStreamProperties(
    sourceId: string,
    options?: { destinationId?: string; ignoreCache?: boolean }
  ) {
    pathId(sourceId);
    if (options?.destinationId !== undefined) pathId(options.destinationId);
    return this.parse(
      z.array(streamPropertiesSchema),
      (await this.http.get('/streams', { params: pickDefined({ sourceId, ...options }) })).data
    );
  }
  async listTags(options?: { workspaceIds?: string[] }) {
    return this.parse(
      pageSchema(tagSchema),
      (await this.http.get('/tags', { params: listQuery(options) })).data
    );
  }
  async getTag(tagId: string) {
    return this.parse(tagSchema, (await this.http.get(`/tags/${pathId(tagId)}`)).data);
  }
  async createTag(data: { name: string; color: string; workspaceId: string }) {
    pathId(data.workspaceId);
    return this.parse(tagSchema, (await this.http.post('/tags', data)).data);
  }
  async updateTag(tagId: string, data: { name?: string; color?: string }) {
    requireUpdate(data);
    const existing =
      data.name === undefined || data.color === undefined
        ? await this.getTag(tagId)
        : undefined;
    return this.parse(
      tagSchema,
      (
        await this.http.patch(`/tags/${pathId(tagId)}`, {
          name: data.name ?? existing?.name,
          color: data.color ?? existing?.color
        })
      ).data
    );
  }
  async deleteTag(tagId: string) {
    await this.http.delete(`/tags/${pathId(tagId)}`);
  }
}
