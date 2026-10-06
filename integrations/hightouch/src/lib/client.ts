import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  destinationSchema,
  modelSchema,
  sourceSchema,
  syncRunSchema,
  syncSchema
} from './schemas';

type Row = Record<string, unknown>;
type PageInput = {
  limit?: number;
  offset?: number;
  orderBy?: string;
  name?: string;
  slug?: string;
  modelId?: number;
  destinationId?: number;
  runId?: number;
  after?: string;
  before?: string;
  within?: number;
};
type ModelDefinition = {
  primaryKey?: string;
  isSchema?: boolean;
  custom?: { query: string };
  dbt?: { modelId: string };
  raw?: { sql: string };
  table?: { name: string };
  visual?: { filter: string; parentId: string; label: string };
  folderId?: string;
};
type Schedule = { type: string; schedule?: Row };
function schedule(value: Schedule | undefined): Schedule | undefined {
  if (!value) return undefined;
  nonempty(value.type, 'schedule type');
  if (value.type === 'match_booster') return { type: value.type };
  if (!value.schedule)
    throw createApiServiceError('Provide the configuration for the selected schedule type.');
  object(value.schedule);
  return value;
}
function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw createApiServiceError('Hightouch returned an invalid response.');
  return value as Row;
}
export function resourceId(value: number, label = 'Resource ID'): number {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw createApiServiceError(`${label} must be a positive safe integer.`);
  return value;
}
export function nonempty(value: string, label: string, multiline = false): string {
  if (
    !value.trim() ||
    Array.from(value).some(character => {
      const code = character.charCodeAt(0);
      return code === 0 || (!multiline && (code < 32 || code === 127));
    })
  )
    throw createApiServiceError(`Provide a valid ${label}.`);
  return value;
}
function providerStringId(value: string, label: string): number {
  if (!/^[1-9]\d*$/.test(value))
    throw createApiServiceError(`${label} must contain a positive numeric ID.`);
  return resourceId(Number(value), label);
}
function queryDefinition(data: ModelDefinition): Row {
  if (
    [data.custom, data.dbt, data.raw, data.table, data.visual].filter(
      value => value !== undefined
    ).length > 1
  )
    throw createApiServiceError('Provide exactly one model query definition.');
  const value: Row = {};
  if (data.dbt) value.dbt = { modelId: providerStringId(data.dbt.modelId, 'dbt modelId') };
  if (data.visual) {
    let filter: unknown;
    try {
      filter = JSON.parse(data.visual.filter);
    } catch {
      throw createApiServiceError('visual.filter must be a JSON filter object.');
    }
    value.visual = {
      filter: object(filter),
      parentId: providerStringId(data.visual.parentId, 'visual parentId'),
      primaryLabel: data.visual.label
    };
  }
  if (data.raw) nonempty(data.raw.sql, 'SQL query', true);
  if (data.table) nonempty(data.table.name, 'table name');
  if (data.custom) nonempty(data.custom.query, 'custom query', true);
  return value;
}
function parsed<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'Hightouch returned incomplete or invalid resource data. Retry or inspect the resource in Hightouch.'
    );
  return result.data;
}
function mapped<S extends z.ZodType>(
  schema: S,
  value: unknown,
  idKey: string,
  expectedId?: number
): z.output<S> {
  const row = object(value);
  const id = resourceId(row.id as number, 'Response resource ID');
  if (expectedId !== undefined && id !== expectedId)
    throw createApiServiceError('Hightouch returned a different resource than requested.');
  resourceId(row.workspaceId as number, 'Response workspace ID');
  const output: Row = { ...row, [idKey]: id };
  if ('configuration' in row) output.configuration = {};
  if (idKey === 'modelId' && row.dbt !== undefined) {
    const dbt = object(row.dbt);
    output.dbt = {
      modelId: String(resourceId(dbt.modelId as number, 'Response dbt model ID'))
    };
  }
  return parsed(schema, output);
}
export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: { token: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token))
      throw createApiServiceError('Provide a valid Hightouch workspace API key.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.hightouch.com/api/v1',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Hightouch',
          reason: 'hightouch_api_error',
          formatMessage: ({ status }) =>
            `Hightouch request failed${status ? ` (HTTP ${status})` : ''}. Check the workspace API key, group permissions and resource state.`,
          parent: createApiServiceError('Hightouch upstream request failed.', {
            upstreamStatus: getApiErrorStatus(error)
          })
        })
    });
    this.axios.interceptors.response.use(response => {
      if (response.status === 204 && response.config.method?.toUpperCase() === 'DELETE')
        return response;
      if (response.data === 'Internal Server Error')
        throw createApiServiceError(
          'Hightouch returned an internal API error. Retry the request.'
        );
      if (response.data && typeof response.data === 'object') {
        const row = object(response.data);
        if (('message' in row && 'details' in row) || 'errors' in row)
          throw createApiServiceError(
            'Hightouch returned an API error. Check permissions and the supplied configuration.'
          );
      }
      return response;
    });
  }
  private async list<T>(path: string, params: PageInput, mapper: (row: unknown) => T) {
    const limit = params.limit ?? 100,
      offset = params.offset ?? 0;
    resourceId(limit, 'limit');
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw createApiServiceError('offset must be a non-negative safe integer.');
    if (!Number.isSafeInteger(offset + limit))
      throw createApiServiceError('Pagination offset is too large.');
    for (const key of ['modelId', 'destinationId', 'runId'] as const)
      if (params[key] !== undefined) resourceId(params[key], key);
    if (params.within !== undefined && (!Number.isFinite(params.within) || params.within < 0))
      throw createApiServiceError('within must be a non-negative number of minutes.');
    for (const key of ['after', 'before'] as const)
      if (params[key] !== undefined && !Number.isFinite(Date.parse(params[key])))
        throw createApiServiceError(`${key} must be an ISO timestamp.`);
    if (params.after && params.before && Date.parse(params.after) >= Date.parse(params.before))
      throw createApiServiceError('after must precede before.');
    const query = pickDefined({ ...params, limit, offset });
    const row = object((await this.axios.get<unknown>(path, { params: query })).data);
    if (!Array.isArray(row.data))
      throw createApiServiceError('Hightouch returned an invalid collection.');
    const data = row.data.map(mapper);
    if (row.hasMore !== undefined && typeof row.hasMore !== 'boolean')
      throw createApiServiceError('Hightouch returned invalid pagination information.');
    let hasMore: boolean;
    if (typeof row.hasMore === 'boolean') hasMore = row.hasMore;
    else {
      const next = object(
        (
          await this.axios.get<unknown>(path, {
            params: { ...query, offset: offset + data.length, limit: 1 }
          })
        ).data
      );
      if (!Array.isArray(next.data))
        throw createApiServiceError('Hightouch returned an invalid pagination probe.');
      hasMore = next.data.length > 0;
    }
    if (hasMore && !data.length)
      throw createApiServiceError(
        'Hightouch returned a non-advancing page. Retry the requested page.'
      );
    return { data, hasMore, nextOffset: hasMore ? offset + data.length : undefined };
  }
  listSources(params: PageInput = {}) {
    return this.list('/sources', params, row => mapped(sourceSchema, row, 'sourceId'));
  }
  async getSource(id: number) {
    return mapped(
      sourceSchema,
      (await this.axios.get<unknown>(`/sources/${resourceId(id)}`)).data,
      'sourceId',
      id
    );
  }
  async createSource(data: { name: string; slug: string; type: string; configuration: Row }) {
    for (const key of ['name', 'slug', 'type'] as const) nonempty(data[key], key);
    object(data.configuration);
    return mapped(
      sourceSchema,
      (await this.axios.post<unknown>('/sources', data)).data,
      'sourceId'
    );
  }
  async updateSource(id: number, data: { name?: string; configuration?: Row }) {
    this.validateUpdate(data);
    return mapped(
      sourceSchema,
      (await this.axios.patch<unknown>(`/sources/${resourceId(id)}`, pickDefined(data))).data,
      'sourceId',
      id
    );
  }
  listDestinations(params: PageInput = {}) {
    return this.list('/destinations', params, row =>
      mapped(destinationSchema, row, 'destinationId')
    );
  }
  async getDestination(id: number) {
    return mapped(
      destinationSchema,
      (await this.axios.get<unknown>(`/destinations/${resourceId(id)}`)).data,
      'destinationId',
      id
    );
  }
  async createDestination(data: {
    name: string;
    slug: string;
    type: string;
    configuration: Row;
  }) {
    for (const key of ['name', 'slug', 'type'] as const) nonempty(data[key], key);
    object(data.configuration);
    return mapped(
      destinationSchema,
      (await this.axios.post<unknown>('/destinations', data)).data,
      'destinationId'
    );
  }
  async updateDestination(id: number, data: { name?: string; configuration?: Row }) {
    this.validateUpdate(data);
    return mapped(
      destinationSchema,
      (await this.axios.patch<unknown>(`/destinations/${resourceId(id)}`, pickDefined(data)))
        .data,
      'destinationId',
      id
    );
  }
  listModels(params: PageInput = {}) {
    return this.list('/models', params, row => mapped(modelSchema, row, 'modelId'));
  }
  async getModel(id: number) {
    return mapped(
      modelSchema,
      (await this.axios.get<unknown>(`/models/${resourceId(id)}`)).data,
      'modelId',
      id
    );
  }
  async createModel(
    data: ModelDefinition & {
      name: string;
      slug: string;
      sourceId: number;
      primaryKey: string;
      queryType: string;
      isSchema: boolean;
      skipColumnQuery?: boolean;
    }
  ) {
    const { skipColumnQuery, ...body } = data;
    nonempty(data.name, 'model name');
    nonempty(data.slug, 'model slug');
    resourceId(data.sourceId, 'sourceId');
    nonempty(data.primaryKey, 'primary key');
    const branch = data.queryType === 'raw_sql' ? 'raw' : data.queryType;
    if (
      !['raw', 'table', 'dbt', 'custom', 'visual'].includes(branch) ||
      !(branch in data) ||
      data[branch as keyof typeof data] === undefined
    )
      throw createApiServiceError('Provide the query definition matching queryType.');
    const result = mapped(
      modelSchema,
      (
        await this.axios.post<unknown>(
          '/models',
          { ...body, ...queryDefinition(data) },
          { params: pickDefined({ skipColumnQuery }) }
        )
      ).data,
      'modelId'
    );
    if (result.sourceId !== data.sourceId || result.slug !== data.slug)
      throw createApiServiceError(
        'Hightouch returned a model with unexpected source or slug.'
      );
    return result;
  }
  async updateModel(id: number, data: ModelDefinition & { name?: string }) {
    this.validateUpdate(data);
    return mapped(
      modelSchema,
      (
        await this.axios.patch<unknown>(`/models/${resourceId(id)}`, {
          ...pickDefined(data),
          ...queryDefinition(data)
        })
      ).data,
      'modelId',
      id
    );
  }
  async deleteModel(id: number) {
    await this.deleteResource(`/models/${resourceId(id)}`);
  }
  listSyncs(params: PageInput = {}) {
    return this.list('/syncs', params, row => mapped(syncSchema, row, 'syncId'));
  }
  async getSync(id: number) {
    return mapped(
      syncSchema,
      (await this.axios.get<unknown>(`/syncs/${resourceId(id)}`)).data,
      'syncId',
      id
    );
  }
  async createSync(data: {
    slug: string;
    destinationId: number;
    modelId: number;
    configuration: Row;
    disabled: boolean;
    schedule?: Schedule;
  }) {
    nonempty(data.slug, 'sync slug');
    resourceId(data.modelId, 'modelId');
    resourceId(data.destinationId, 'destinationId');
    object(data.configuration);
    const result = mapped(
      syncSchema,
      (
        await this.axios.post<unknown>('/syncs', {
          ...data,
          schedule: schedule(data.schedule) ?? null
        })
      ).data,
      'syncId'
    );
    if (
      result.modelId !== data.modelId ||
      result.destinationId !== data.destinationId ||
      result.slug !== data.slug
    )
      throw createApiServiceError('Hightouch returned a sync with unexpected relationships.');
    return result;
  }
  async updateSync(
    id: number,
    data: {
      configuration?: Row;
      disabled?: boolean;
      schedule?: Schedule;
      clearSchedule?: boolean;
    }
  ) {
    this.validateUpdate(data);
    if (data.clearSchedule && data.schedule)
      throw createApiServiceError('Provide schedule or clearSchedule, not both.');
    const { clearSchedule, ...body } = data;
    if (!clearSchedule) this.validateUpdate(body);
    return mapped(
      syncSchema,
      (
        await this.axios.patch<unknown>(
          `/syncs/${resourceId(id)}`,
          pickDefined({
            ...body,
            schedule: schedule(body.schedule),
            ...(clearSchedule ? { schedule: null } : {})
          })
        )
      ).data,
      'syncId',
      id
    );
  }
  async deleteSync(id: number) {
    await this.deleteResource(`/syncs/${resourceId(id)}`);
  }
  private async deleteResource(path: string) {
    const response = await this.axios.delete(path);
    if (response.status !== 200 && response.status !== 204)
      throw createApiServiceError(
        'Hightouch did not confirm deletion. Inspect the resource before retrying.'
      );
  }
  private validateUpdate(data: object) {
    const values = pickDefined(data);
    if (!Object.keys(values).length)
      throw createApiServiceError('Provide at least one field to update.');
    const row = object(values);
    if (typeof row.name === 'string') nonempty(row.name, 'name');
  }
  async triggerSync(id: number, options: { fullResync?: boolean; resetCDC?: boolean } = {}) {
    return parsed(
      z.object({ id: z.string().min(1) }),
      (
        await this.axios.post<unknown>(
          `/syncs/${resourceId(id)}/trigger`,
          pickDefined(options)
        )
      ).data
    );
  }
  async triggerSyncByIdOrSlug(options: {
    syncId?: string;
    syncSlug?: string;
    fullResync?: boolean;
    resetCDC?: boolean;
  }) {
    if ((options.syncId !== undefined) === (options.syncSlug !== undefined))
      throw createApiServiceError('Provide exactly one of syncId or syncSlug.');
    if (options.syncId !== undefined) providerStringId(options.syncId, 'syncId');
    if (options.syncSlug !== undefined) nonempty(options.syncSlug, 'sync slug');
    return parsed(
      z.object({ id: z.string().min(1) }),
      (await this.axios.post<unknown>('/syncs/trigger', pickDefined(options))).data
    );
  }
  async triggerSyncSequence(id: string) {
    return parsed(
      z.object({ id: z.string().min(1) }),
      (
        await this.axios.post<unknown>(
          `/sync-sequences/${encodeURIComponent(nonempty(id, 'sync sequence ID'))}/trigger`
        )
      ).data
    );
  }
  listSyncRuns(id: number, params: PageInput = {}) {
    return this.list(`/syncs/${resourceId(id)}/runs`, params, row => {
      const value = object(row);
      return parsed(syncRunSchema, {
        ...value,
        runId: resourceId(value.id as number, 'Run ID'),
        error:
          value.error == null
            ? value.error
            : 'Run error details are available in the Hightouch debugger.'
      });
    });
  }
  async getSyncSequenceRun(id: string) {
    const result = parsed(
      z.object({
        id: z.string(),
        status: z.string(),
        syncRuns: z.array(
          z.object({
            syncId: z.number(),
            syncRunId: z.number(),
            status: z.string(),
            finishedAt: z.string()
          })
        )
      }),
      (
        await this.axios.get<unknown>(
          `/sync-sequences/runs/${encodeURIComponent(nonempty(id, 'sync sequence run ID'))}`
        )
      ).data
    );
    if (result.id !== id)
      throw createApiServiceError(
        'Hightouch returned a different sequence run than requested.'
      );
    return result;
  }
}
