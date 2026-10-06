import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

export type Region = 'us' | 'eu';
export type CredentialType = 'workspace' | 'personal';
export const regionFor = (auth: { region?: Region }, config?: unknown): Region => {
  const legacy = z.object({ region: z.enum(['us', 'eu']).optional() }).safeParse(config);
  return auth.region ?? (legacy.success ? legacy.data.region : undefined) ?? 'us';
};
export const apiOrigin = (region: Region) =>
  region === 'eu' ? 'https://app-eu.getcensus.com' : 'https://app.getcensus.com';
export const required = (value: string, name: string) => {
  if (!value.trim() || /[\r\n]/.test(value))
    throw createApiServiceError(`${name} must be nonempty and contain no line breaks.`);
  return value;
};
export const positiveId = (value: number, name: string) => {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw createApiServiceError(`${name} must be a positive safe integer.`);
  return value;
};
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'Activations returned an unexpected response shape; no operation is confirmed.'
    );
  return result.data;
};
const id = z.number().int().positive();
const optionalText = z.string().nullable().optional();
const count = z.number().nonnegative().nullable().optional();
const paginationSchema = z.object({
  total_records: z.number().nonnegative().optional(),
  per_page: z.number().int().positive().optional(),
  prev_page: id.nullable().optional(),
  page: id.optional(),
  next_page: id.nullable().optional(),
  last_page: z.number().int().nonnegative().optional()
});
export interface PaginationParams {
  page?: number;
  perPage?: number;
  order?: 'asc' | 'desc';
  allPages?: boolean;
}
export interface PaginationInfo {
  totalRecords?: number;
  perPage?: number;
  page?: number;
  nextPage?: number | null;
  lastPage?: number;
}
const mappingRead = z.object({
  from: z.object({ type: z.string(), data: z.unknown() }),
  to: z.string(),
  is_primary_identifier: z.boolean().optional()
});
const syncSchema = z.object({
  id,
  label: optionalText,
  status: z.string(),
  operation: z.string(),
  paused: z.boolean().optional(),
  created_at: optionalText,
  updated_at: optionalText,
  source_attributes: z.object({
    connection_id: id.optional(),
    object: z.object({
      type: z.string(),
      name: z.string().optional(),
      id: id.optional(),
      table_name: z.string().optional(),
      table_catalog: z.string().optional(),
      table_schema: z.string().optional(),
      dataset_id: id.nullable().optional()
    })
  }),
  destination_attributes: z.object({ connection_id: id, object: z.string() }),
  mappings: z.array(mappingRead),
  mode: z.record(z.string(), z.unknown()).optional(),
  schedule_frequency: z.string().optional(),
  cron_expression: optionalText,
  field_behavior: optionalText,
  failed_run_notifications_enabled: z.boolean().optional(),
  failed_record_notifications_enabled: z.boolean().optional(),
  alert_attributes: z.array(z.unknown()).optional()
});
export type Sync = ReturnType<typeof mapSync>;
const mapSync = (raw: z.infer<typeof syncSchema>) => {
  const triggers = z.record(z.string(), z.unknown()).safeParse(raw.mode?.triggers);
  const schedule = z
    .object({ frequency: z.string().optional(), cron_expression: optionalText })
    .safeParse(triggers.success ? triggers.data.schedule : undefined);
  return {
    id: raw.id,
    label: raw.label,
    status: raw.status,
    operation: raw.operation,
    paused: raw.paused,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    sourceAttributes: {
      connectionId: raw.source_attributes.connection_id,
      object: {
        type: raw.source_attributes.object.type,
        name: raw.source_attributes.object.name ?? raw.source_attributes.object.table_name,
        id: raw.source_attributes.object.id,
        tableCatalog: raw.source_attributes.object.table_catalog,
        tableSchema: raw.source_attributes.object.table_schema,
        tableName: raw.source_attributes.object.table_name
      }
    },
    destinationAttributes: {
      connectionId: raw.destination_attributes.connection_id,
      object: raw.destination_attributes.object
    },
    mappings: raw.mappings.map(m => ({
      from: {
        type: m.from.type,
        data:
          m.from.type === 'constant_value'
            ? (() => {
                const constant = parse(
                  z.object({ value: z.string(), basic_type: z.string() }),
                  m.from.data
                );
                return { value: constant.value, basicType: constant.basic_type };
              })()
            : m.from.data
      },
      to: m.to,
      isPrimaryIdentifier: m.is_primary_identifier
    })),
    scheduleFrequency:
      (schedule.success ? schedule.data.frequency : undefined) ?? raw.schedule_frequency,
    cronExpression:
      (schedule.success ? schedule.data.cron_expression : undefined) ?? raw.cron_expression,
    fieldBehavior: raw.field_behavior,
    failedRunNotificationsEnabled: raw.failed_run_notifications_enabled,
    failedRecordNotificationsEnabled: raw.failed_record_notifications_enabled,
    mode: raw.mode,
    alertAttributes: raw.alert_attributes
  };
};
const runSchema = z.object({
  id,
  sync_id: id,
  status: z.string(),
  full_sync: z.boolean().optional(),
  canceled: z.boolean().optional(),
  current_step: optionalText,
  source_record_count: count,
  records_processed: count,
  records_updated: count,
  records_failed: count,
  records_invalid: count,
  error_code: optionalText,
  created_at: optionalText,
  completed_at: optionalText
});
export type SyncRun = ReturnType<typeof mapRun>;
const mapRun = (raw: z.infer<typeof runSchema>) => ({
  id: raw.id,
  syncId: raw.sync_id,
  status: raw.status,
  fullSync: raw.full_sync,
  canceled: raw.canceled,
  currentStep: raw.current_step,
  sourceRecordCount: raw.source_record_count,
  recordsProcessed: raw.records_processed,
  recordsUpdated: raw.records_updated,
  recordsFailed: raw.records_failed,
  recordsInvalid: raw.records_invalid,
  errorCode: raw.error_code,
  // Provider diagnostic messages may contain credentials or record values.
  createdAt: raw.created_at,
  completedAt: raw.completed_at
});
const connectionSchema = z.object({
  id,
  name: z.string().optional(),
  label: optionalText,
  type: z.string().optional(),
  created_at: optionalText,
  updated_at: optionalText,
  last_test_succeeded: z.boolean().nullable().optional()
});
const mapConnection = (raw: z.infer<typeof connectionSchema>) => ({
  id: raw.id,
  name: raw.name,
  label: raw.label,
  type: raw.type,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  lastTestSucceeded: raw.last_test_succeeded
});
const webhookSchema = z.object({
  id: id.optional(),
  name: z.string(),
  endpoint: z.string(),
  description: optionalText,
  events: z.array(z.string()).optional(),
  created_at: optionalText,
  updated_at: optionalText
});
export type Webhook = ReturnType<typeof mapWebhook>;
const mapWebhook = (raw: z.infer<typeof webhookSchema>) => ({
  id: raw.id,
  name: raw.name,
  endpoint: raw.endpoint,
  description: raw.description,
  events: raw.events,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});
const workspaceSchema = z.object({
  id,
  name: z.string(),
  organization_id: id,
  created_at: optionalText
});
const mapWorkspace = (raw: z.infer<typeof workspaceSchema>) => ({
  workspaceId: raw.id,
  name: raw.name,
  organizationId: raw.organization_id,
  createdAt: raw.created_at
});
const sourceObjectSchema = z.object({
  type: z.string(),
  id: id.optional(),
  name: z.string().optional(),
  table_catalog: z.string().optional(),
  table_schema: z.string().optional(),
  table_name: z.string().optional(),
  dataset_id: id.nullable().optional(),
  columns: z.array(z.object({ name: z.string(), type: z.string() })).optional()
});
const mapSourceObject = (raw: z.infer<typeof sourceObjectSchema>) => ({
  type: raw.type,
  objectId: raw.id,
  name: raw.name,
  tableCatalog: raw.table_catalog,
  tableSchema: raw.table_schema,
  tableName: raw.table_name,
  datasetId: raw.dataset_id,
  columns: raw.columns
});
const destinationObjectSchema = z.object({
  full_name: z.string(),
  label: z.string().optional(),
  supported_operations: z.array(z.string()).optional(),
  primary_identifier_mapping_attributes: z
    .record(
      z.string(),
      z.object({
        required: z.boolean().optional(),
        hide_destination_key: z.boolean().optional(),
        notes: optionalText
      })
    )
    .optional(),
  fields: z
    .array(
      z.object({
        full_name: z.string(),
        label: z.string().optional(),
        type: z.string().optional(),
        required_for_mapping: z.boolean().optional(),
        can_be_upsert_key: z.boolean().optional(),
        can_be_update_key: z.boolean().optional(),
        can_be_insert_key: z.boolean().optional()
      })
    )
    .optional()
});
const mapDestinationObject = (raw: z.infer<typeof destinationObjectSchema>) => ({
  fullName: raw.full_name,
  label: raw.label,
  supportedOperations: raw.supported_operations,
  primaryIdentifierRequirements: raw.primary_identifier_mapping_attributes,
  fields: raw.fields?.map(field => ({
    fullName: field.full_name,
    label: field.label,
    type: field.type,
    requiredForMapping: field.required_for_mapping,
    canBeUpsertKey: field.can_be_upsert_key,
    canBeUpdateKey: field.can_be_update_key,
    canBeInsertKey: field.can_be_insert_key
  }))
});
const datasetSchema = z.object({
  id,
  name: z.string(),
  type: z.string(),
  resource_identifier: z.string(),
  source_id: id.optional(),
  created_at: optionalText,
  updated_at: optionalText,
  cached_record_count: count,
  columns: z
    .array(
      z.object({ name: z.string(), data_type: z.string(), can_be_upsert_key: z.boolean() })
    )
    .optional()
});
const mapDataset = (raw: z.infer<typeof datasetSchema>) => ({
  datasetId: raw.id,
  name: raw.name,
  type: raw.type,
  resourceIdentifier: raw.resource_identifier,
  sourceConnectionId: raw.source_id,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  cachedRecordCount: raw.cached_record_count,
  columns: raw.columns?.map(column => ({
    name: column.name,
    dataType: column.data_type,
    canBeUpsertKey: column.can_be_upsert_key
  }))
});
export interface MappingInput {
  from: {
    type: 'column' | 'constant_value';
    data: string | { value: string; basicType: string };
  };
  to: string;
  isPrimaryIdentifier?: boolean;
}
export interface SyncWriteInput {
  label?: string;
  operation?: string;
  paused?: boolean;
  scheduleFrequency?: string;
  scheduleDay?: string;
  scheduleHour?: number;
  scheduleMinute?: number;
  cronExpression?: string;
  failedRunNotificationsEnabled?: boolean;
  failedRecordNotificationsEnabled?: boolean;
  alertAttributes?: Record<string, unknown>[];
  mappings?: MappingInput[];
  sourceAttributes?: {
    connectionId: number;
    object: {
      type: 'model' | 'table';
      name: string;
      tableCatalog?: string;
      tableSchema?: string;
      tableName?: string;
    };
  };
  destinationAttributes?: { connectionId: number; object: string };
}
const mappingsPayload = (mappings: MappingInput[]) =>
  mappings.map(m => {
    required(m.to, 'Destination field');
    let data: string | { value: string; basic_type: string };
    if (m.from.type === 'column') {
      if (typeof m.from.data !== 'string')
        throw createApiServiceError('Column mappings require a column name.');
      data = required(m.from.data, 'Source column');
    } else {
      if (
        typeof m.from.data === 'string' ||
        !['boolean', 'datetime', 'number', 'text'].includes(m.from.data.basicType)
      )
        throw createApiServiceError(
          'Constant mappings require value and a basicType of boolean, datetime, number or text.'
        );
      data = { value: m.from.data.value, basic_type: m.from.data.basicType };
    }
    return {
      from: { type: m.from.type, data },
      to: m.to,
      is_primary_identifier: m.isPrimaryIdentifier ?? false
    };
  });
const schedulePayload = (input: SyncWriteInput, currentMode?: Record<string, unknown>) => {
  if (
    ![
      input.scheduleFrequency,
      input.scheduleDay,
      input.scheduleHour,
      input.scheduleMinute,
      input.cronExpression
    ].some(v => v !== undefined)
  )
    return undefined;
  if (currentMode?.type === 'live')
    throw createApiServiceError(
      'Scheduled updates cannot change a live sync. Manage live mode in the provider application.'
    );
  const triggers = parse(z.record(z.string(), z.unknown()), currentMode?.triggers ?? {});
  const existing = parse(z.record(z.string(), z.unknown()), triggers.schedule ?? {});
  let day = input.scheduleDay;
  if (day !== undefined) {
    day = day[0]?.toUpperCase() + day.slice(1).toLowerCase();
    if (
      !['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(
        day
      )
    )
      throw createApiServiceError('scheduleDay must be a day of the week.');
  }
  if (
    input.scheduleHour !== undefined &&
    (!Number.isInteger(input.scheduleHour) ||
      input.scheduleHour < 0 ||
      input.scheduleHour > 24)
  )
    throw createApiServiceError('scheduleHour must be an integer between 0 and 24.');
  if (
    input.scheduleMinute !== undefined &&
    (!Number.isInteger(input.scheduleMinute) ||
      input.scheduleMinute < 0 ||
      input.scheduleMinute > 59)
  )
    throw createApiServiceError('scheduleMinute must be an integer between 0 and 59.');
  const schedule = {
    ...existing,
    ...pickDefined({
      frequency: input.scheduleFrequency,
      day,
      hour: input.scheduleHour,
      minute: input.scheduleMinute,
      cron_expression: input.cronExpression
    })
  };
  if (typeof schedule.frequency !== 'string')
    throw createApiServiceError('Provide scheduleFrequency when creating a schedule.');
  if (
    schedule.frequency === 'expression' &&
    (typeof schedule.cron_expression !== 'string' || !schedule.cron_expression.trim())
  )
    throw createApiServiceError('Expression schedules require cronExpression.');
  return { ...currentMode, type: 'triggered', triggers: { ...triggers, schedule } };
};
export const endpoint = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Webhook endpoint must be an absolute HTTPS URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password)
    throw createApiServiceError(
      'Webhook endpoint must use HTTPS without embedded credentials.'
    );
  return value;
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(config: { token: string; region?: Region; credentialType?: CredentialType }) {
    this.http = createAuthenticatedAxios({
      baseURL: `${apiOrigin(config.region ?? 'us')}/api/v1`,
      timeout: 30000,
      maxRedirects: 0,
      authHeader: { value: `Bearer ${required(config.token, 'Activations token')}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Activations',
          reason: 'upstream_failure',
          operation: 'request',
          parent: {},
          extractMessage: () => '',
          formatMessage: ({ status }) =>
            `Activations request failed${status ? ` (HTTP ${status})` : ''}. Check credential scope, region, permissions and provider availability. No retry was attempted.`
        })
    });
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    status: number,
    resultStatus?: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    const response = await this.http.request({ method, url: path, data, params });
    if (response.status !== status)
      throw createApiServiceError(
        `Activations returned unexpected HTTP ${response.status}; the operation is not confirmed.`,
        { upstreamStatus: response.status }
      );
    const body = parse(z.record(z.string(), z.unknown()), response.data);
    if (resultStatus && body.status !== resultStatus)
      throw createApiServiceError(
        'Activations did not confirm the requested operation. Inspect the provider before retrying a mutation.'
      );
    return body;
  }
  private async list<T>(path: string, schema: z.ZodType<T>, params: PaginationParams = {}) {
    if (params.page !== undefined && (!Number.isSafeInteger(params.page) || params.page < 0))
      throw createApiServiceError('page must be a nonnegative integer; 0 selects page 1.');
    if (
      params.perPage !== undefined &&
      (!Number.isInteger(params.perPage) || params.perPage < 1 || params.perPage > 100)
    )
      throw createApiServiceError('perPage must be an integer between 1 and 100.');
    const items: T[] = [],
      seen = new Set<number>();
    let page = params.page || 1;
    let pagination: PaginationInfo | undefined;
    for (let index = 0; index < 1000; index++) {
      if (seen.has(page))
        throw createApiServiceError(
          'Activations repeated a pagination page; the collection is incomplete.'
        );
      seen.add(page);
      const body = await this.request(
        'get',
        path,
        200,
        'success',
        undefined,
        pickDefined({ page, per_page: params.perPage, order: params.order })
      );
      const batch = parse(z.array(schema), body.data);
      items.push(...batch);
      const raw =
        body.pagination === undefined ? undefined : parse(paginationSchema, body.pagination);
      pagination = raw
        ? {
            totalRecords: raw.total_records,
            perPage: raw.per_page,
            page: raw.page,
            nextPage: raw.next_page,
            lastPage: raw.last_page
          }
        : undefined;
      if (!params.allPages || raw?.next_page === null) return { items, pagination };
      if (!raw || raw.next_page === undefined)
        throw createApiServiceError(
          'Activations omitted next_page; complete pagination cannot be confirmed.'
        );
      if (!batch.length || raw.next_page <= page)
        throw createApiServiceError(
          'Activations pagination did not advance; the collection is incomplete.'
        );
      page = raw.next_page;
    }
    throw createApiServiceError(
      'Activations pagination exceeded 1000 pages; use a narrower single-page request.'
    );
  }
  async getWorkspace() {
    return mapWorkspace(
      parse(workspaceSchema, (await this.request('get', '/workspace', 200, 'success')).data)
    );
  }
  async listWorkspaces(params?: PaginationParams) {
    const result = await this.list('/workspaces', workspaceSchema, params);
    return { workspaces: result.items.map(mapWorkspace), pagination: result.pagination };
  }
  async workspaceKey(workspaceId: number) {
    const body = await this.request(
      'get',
      `/workspaces/${positiveId(workspaceId, 'workspaceId')}/api_key`,
      200
    );
    return required(
      parse(z.object({ api_key: z.string() }), body).api_key,
      'Workspace API key'
    );
  }
  async listSyncs(params?: PaginationParams) {
    const result = await this.list('/syncs', syncSchema, params);
    return { syncs: result.items.map(mapSync), pagination: result.pagination };
  }
  async getSync(syncId: number): Promise<Sync> {
    const sync = mapSync(
      parse(
        syncSchema,
        (await this.request('get', `/syncs/${positiveId(syncId, 'syncId')}`, 200, 'success'))
          .data
      )
    );
    if (sync.id !== syncId)
      throw createApiServiceError('Activations returned a different sync ID.');
    return sync;
  }
  async createSync(input: SyncWriteInput): Promise<Sync> {
    if (!input.sourceAttributes || !input.destinationAttributes || !input.mappings)
      throw createApiServiceError('Source, destination and mappings are required.');
    const source = input.sourceAttributes;
    positiveId(source.connectionId, 'sourceConnectionId');
    positiveId(input.destinationAttributes.connectionId, 'destinationConnectionId');
    let sourceAttributes: Record<string, unknown>;
    if (source.object.type === 'model') {
      required(source.object.name, 'Source model name');
      const found = (
        await this.listSourceObjects(source.connectionId, { allPages: true, perPage: 100 })
      ).objects.filter(row => row.type === 'model' && row.name === source.object.name);
      if (found.length !== 1 || found[0]?.objectId === undefined)
        throw createApiServiceError(
          'The source model name must resolve uniquely in the specified source. Call list_source_objects to discover it.'
        );
      sourceAttributes = {
        object: { type: 'model', id: found[0].objectId, name: source.object.name }
      };
    } else {
      const tableName = required(
        source.object.tableName ?? source.object.name,
        'Source table name'
      );
      let catalog = source.object.tableCatalog,
        schema = source.object.tableSchema;
      if (catalog === undefined || schema === undefined) {
        const found = (
          await this.listSourceObjects(source.connectionId, { allPages: true, perPage: 100 })
        ).objects.filter(
          row =>
            row.type === 'table' &&
            row.tableName === tableName &&
            (catalog === undefined || row.tableCatalog === catalog) &&
            (schema === undefined || row.tableSchema === schema)
        );
        if (
          found.length !== 1 ||
          found[0]?.tableCatalog === undefined ||
          found[0]?.tableSchema === undefined
        )
          throw createApiServiceError(
            'The table must resolve uniquely with a catalog and schema. Call list_source_objects and provide tableCatalog/tableSchema.'
          );
        catalog ??= found[0].tableCatalog;
        schema ??= found[0].tableSchema;
      }
      sourceAttributes = {
        connection_id: source.connectionId,
        object: {
          type: 'table',
          table_name: tableName,
          table_catalog: catalog,
          table_schema: schema
        }
      };
    }
    const payload = {
      ...this.syncPayload(input),
      source_attributes: sourceAttributes,
      destination_attributes: {
        connection_id: input.destinationAttributes.connectionId,
        object: required(input.destinationAttributes.object, 'Destination object')
      }
    };
    const body = await this.request('post', '/syncs', 201, 'created', payload);
    const syncId = parse(z.object({ sync_id: id }), body.data).sync_id;
    try {
      return await this.getSync(syncId);
    } catch {
      throw createApiServiceError(
        `Sync ${syncId} was created, but its configuration readback failed. Inspect this ID before retrying; no second sync was created.`
      );
    }
  }
  private syncPayload(input: SyncWriteInput, mode?: Record<string, unknown>) {
    return pickDefined({
      label: input.label,
      operation: input.operation,
      paused: input.paused,
      mappings: input.mappings === undefined ? undefined : mappingsPayload(input.mappings),
      mode: schedulePayload(input, mode),
      alert_attributes: input.alertAttributes,
      failed_run_notifications_enabled: input.failedRunNotificationsEnabled,
      failed_record_notifications_enabled: input.failedRecordNotificationsEnabled
    });
  }
  async updateSync(syncId: number, input: SyncWriteInput): Promise<Sync> {
    const needsMode = [
      input.scheduleFrequency,
      input.scheduleDay,
      input.scheduleHour,
      input.scheduleMinute,
      input.cronExpression
    ].some(v => v !== undefined);
    const current = needsMode ? await this.getSync(syncId) : undefined;
    const payload = this.syncPayload(input, current?.mode);
    if (!Object.keys(payload).length)
      throw createApiServiceError('Provide at least one sync field to update.');
    const body = await this.request(
      'patch',
      `/syncs/${positiveId(syncId, 'syncId')}`,
      200,
      'updated',
      payload
    );
    const sync = mapSync(parse(syncSchema, body.data));
    if (sync.id !== syncId)
      throw createApiServiceError('Activations returned a different sync ID.');
    return sync;
  }
  async deleteSync(syncId: number) {
    await this.request('delete', `/syncs/${positiveId(syncId, 'syncId')}`, 200, 'deleted');
  }
  async triggerSync(syncId: number, forceFullSync?: boolean) {
    const body = await this.request(
      'post',
      `/syncs/${positiveId(syncId, 'syncId')}/trigger`,
      200,
      'success',
      undefined,
      pickDefined({ force_full_sync: forceFullSync })
    );
    return { syncRunId: parse(z.object({ sync_run_id: id }), body.data).sync_run_id };
  }
  async listSyncRuns(syncId: number, params?: PaginationParams) {
    const result = await this.list(
      `/syncs/${positiveId(syncId, 'syncId')}/sync_runs`,
      runSchema,
      params
    );
    if (result.items.some(row => row.sync_id !== syncId))
      throw createApiServiceError('Activations returned a run for another sync.');
    return { syncRuns: result.items.map(mapRun), pagination: result.pagination };
  }
  async getSyncRun(syncRunId: number) {
    const run = mapRun(
      parse(
        runSchema,
        (
          await this.request(
            'get',
            `/sync_runs/${positiveId(syncRunId, 'syncRunId')}`,
            200,
            'success'
          )
        ).data
      )
    );
    if (run.id !== syncRunId)
      throw createApiServiceError('Activations returned a different run ID.');
    return run;
  }
  async cancelSyncRun(syncRunId: number) {
    await this.request(
      'post',
      `/sync_runs/${positiveId(syncRunId, 'syncRunId')}/cancel`,
      200,
      'cancelled'
    );
  }
  async listSources(params?: PaginationParams) {
    const result = await this.list('/sources', connectionSchema, params);
    return { sources: result.items.map(mapConnection), pagination: result.pagination };
  }
  async listDestinations(params?: PaginationParams) {
    const result = await this.list('/destinations', connectionSchema, params);
    return { destinations: result.items.map(mapConnection), pagination: result.pagination };
  }
  async listSourceObjects(sourceId: number, params?: PaginationParams) {
    const result = await this.list(
      `/sources/${positiveId(sourceId, 'sourceConnectionId')}/objects`,
      sourceObjectSchema,
      params
    );
    return { objects: result.items.map(mapSourceObject), pagination: result.pagination };
  }
  async listDestinationObjects(destinationId: number, params?: PaginationParams) {
    const result = await this.list(
      `/destinations/${positiveId(destinationId, 'destinationConnectionId')}/objects`,
      destinationObjectSchema,
      params
    );
    return { objects: result.items.map(mapDestinationObject), pagination: result.pagination };
  }
  async listSqlDatasets(params?: PaginationParams) {
    const result = await this.list('/datasets', datasetSchema, params);
    return { datasets: result.items.map(mapDataset), pagination: result.pagination };
  }
  async listWebhooks(): Promise<Webhook[]> {
    return parse(
      z.array(webhookSchema.extend({ id })),
      (await this.request('get', '/webhooks', 200, 'success')).data
    ).map(mapWebhook);
  }
  async getWebhook(webhookId: number) {
    const raw = parse(
      webhookSchema.extend({ id }),
      (
        await this.request(
          'get',
          `/webhooks/${positiveId(webhookId, 'webhookId')}`,
          200,
          'success'
        )
      ).data
    );
    if (raw.id !== webhookId)
      throw createApiServiceError('Activations returned a different webhook ID.');
    return mapWebhook(raw);
  }
  async createWebhook(input: {
    name: string;
    endpoint: string;
    description?: string;
    events?: string[];
  }) {
    const body = await this.request(
      'post',
      '/webhooks',
      201,
      'created',
      pickDefined({
        ...input,
        name: required(input.name, 'Webhook name'),
        endpoint: endpoint(input.endpoint)
      })
    );
    return mapWebhook(parse(webhookSchema.extend({ id }), body.data));
  }
  async updateWebhook(
    webhookId: number,
    input: { name?: string; endpoint?: string; description?: string; events?: string[] }
  ) {
    if (!Object.values(input).some(v => v !== undefined))
      throw createApiServiceError('Provide at least one webhook field to update.');
    const current = await this.getWebhook(webhookId);
    const payload = pickDefined({
      name: input.name ?? current.name,
      endpoint: input.endpoint ?? current.endpoint,
      description: input.description ?? current.description ?? undefined,
      events: input.events ?? current.events
    });
    required(input.name ?? current.name, 'Webhook name');
    endpoint(input.endpoint ?? current.endpoint);
    const body = await this.request(
      'patch',
      `/webhooks/${webhookId}`,
      200,
      'updated',
      payload
    );
    const updated = mapWebhook(parse(webhookSchema, body.data));
    if (updated.id !== undefined && updated.id !== webhookId)
      throw createApiServiceError('Activations returned a different webhook ID.');
    return { ...updated, id: webhookId };
  }
  async deleteWebhook(webhookId: number) {
    await this.request(
      'delete',
      `/webhooks/${positiveId(webhookId, 'webhookId')}`,
      200,
      'deleted'
    );
  }
  // Historical record-access API; absent from the current published Workspace V1 reference.
  async listDatasets() {
    const body = await this.request('get', '/entities', 200, 'success');
    return parse(
      z.array(z.object({ id, name: z.string(), library_id: id.optional() })),
      body.data
    ).map(row => ({ id: row.id, name: row.name, libraryId: row.library_id }));
  }
  async getDatasetRecord(datasetId: number, recordId: string) {
    const body = await this.request(
      'get',
      `/entities/${positiveId(datasetId, 'datasetId')}/record`,
      200,
      'success',
      undefined,
      { record_id: required(recordId, 'recordId') }
    );
    return parse(z.record(z.string(), z.unknown()), body.data);
  }
}
export const workspaceClient = async (ctx: {
  auth: { token: string; region?: Region; credentialType?: CredentialType };
  config?: unknown;
  input: { workspaceId?: number };
}) => {
  const region = regionFor(ctx.auth, ctx.config);
  const client = new Client({ token: ctx.auth.token, region });
  if (ctx.auth.credentialType === 'personal') {
    if (ctx.input.workspaceId === undefined)
      throw createApiServiceError(
        'workspaceId is required with a personal token. Call list_workspaces; workspace-key access requires an organization admin or workspace owner.'
      );
    const key = await client.workspaceKey(ctx.input.workspaceId);
    const scoped = new Client({ token: key, region });
    const workspace = await scoped.getWorkspace();
    if (workspace.workspaceId !== ctx.input.workspaceId)
      throw createApiServiceError(
        'The resolved key belongs to another workspace; no operation was attempted.'
      );
    return scoped;
  }
  if (ctx.input.workspaceId !== undefined) {
    const workspace = await client.getWorkspace();
    if (workspace.workspaceId !== positiveId(ctx.input.workspaceId, 'workspaceId'))
      throw createApiServiceError(
        'workspaceId differs from the workspace authenticated by this key.'
      );
  }
  return client;
};
