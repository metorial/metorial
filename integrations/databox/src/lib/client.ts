import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  type columnSchema,
  count,
  paginationSchema,
  profileSchema,
  safeId,
  v1DatasetSchema,
  v1IngestionSchema,
  v1SourceSchema,
  v2DatasetSchema,
  v2IngestionSchema,
  v2SourceSchema
} from './models';

type Paging = { page?: number; pageSize?: number };
type Scope = { accountId?: number };
type Write = Scope & { idempotencyKey?: string };
export type ApiVersion = 'v1' | 'v2';
const envelopeSchema = z.object({
  requestId: z.string().min(1),
  status: z.string(),
  errors: z.array(z.unknown()).optional()
});
export class Client {
  readonly apiVersion: ApiVersion;
  private http;
  constructor(params: { token: string; apiVersion?: string }) {
    if (
      typeof params.token !== 'string' ||
      !params.token.trim() ||
      /[\r\n]/.test(params.token)
    )
      throw createApiServiceError(
        'A valid Databox API key is required. Reconnect with an API key.'
      );
    if (
      params.apiVersion !== undefined &&
      params.apiVersion !== 'v1' &&
      params.apiVersion !== 'v2'
    )
      throw createApiServiceError('Select Databox API version v1 or v2.');
    this.apiVersion = params.apiVersion ?? 'v1';
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.databox.com',
      authHeader: { name: 'x-api-key', value: params.token },
      headers: { Accept: 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Databox',
          reason: 'databox_api_error',
          parent: {},
          extractMessage: () =>
            'Check the API version, resource IDs, key permissions, IP allowlist and request limits. No request or response data is included.',
          formatMessage: ({ providerLabel, status, message }) =>
            `${providerLabel} API request failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}. ${message}`
        })
    });
  }
  private parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
    const result = schema.safeParse(value);
    if (!result.success)
      throw createApiServiceError(
        'Databox returned an unexpected response for the selected API version.'
      );
    return result.data;
  }
  private id(value: number, field: string) {
    if (!Number.isSafeInteger(value) || value <= 0)
      throw createApiServiceError(
        `${field} must be a positive safe integer. IDs above JavaScript's exact integer range are unsupported.`
      );
    return String(value);
  }
  private datasetId(value: string) {
    if (this.apiVersion === 'v1') {
      if (!z.uuid().safeParse(value).success)
        throw createApiServiceError(
          'v1 requires a dataset UUID from list_datasets or create_dataset. Do not substitute a v2 numeric ID.'
        );
      return value;
    }
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
      throw createApiServiceError(
        'v2 requires the actual positive integer dataset ID encoded as decimal text within the exact integer range. Do not reuse a v1 UUID.'
      );
    return value;
  }
  private headers(params: Write = {}): Record<string, string> {
    if (
      this.apiVersion === 'v1' &&
      (params.accountId !== undefined || params.idempotencyKey !== undefined)
    )
      throw createApiServiceError(
        'Account context and Idempotency-Key headers are supported only in v2. Omit these fields for v1.'
      );
    const result: Record<string, string> = {};
    if (params.accountId !== undefined)
      result['x-account-id'] = this.id(params.accountId, 'accountId');
    if (params.idempotencyKey !== undefined) {
      if (
        !params.idempotencyKey.trim() ||
        params.idempotencyKey !== params.idempotencyKey.trim() ||
        /[\r\n]/.test(params.idempotencyKey)
      )
        throw createApiServiceError(
          'idempotencyKey must be a nonempty header value without surrounding whitespace or line breaks.'
        );
      result['Idempotency-Key'] = params.idempotencyKey;
    }
    return result;
  }
  private paging(params: Paging = {}, rows = false) {
    const minimum = this.apiVersion === 'v1' ? 1 : 0;
    if (
      params.page !== undefined &&
      (!Number.isSafeInteger(params.page) || params.page < minimum)
    )
      throw createApiServiceError(
        `page must be a safe integer starting at ${minimum} for ${this.apiVersion}.`
      );
    const maximum = rows ? 1000 : 100;
    if (
      params.pageSize !== undefined &&
      (!Number.isSafeInteger(params.pageSize) ||
        params.pageSize < 1 ||
        (this.apiVersion === 'v2' && params.pageSize > maximum))
    )
      throw createApiServiceError(
        `pageSize must be a positive safe integer${this.apiVersion === 'v2' ? ` no greater than ${maximum}` : ''}.`
      );
    return pickDefined({ page: params.page, pageSize: params.pageSize });
  }
  private legacyUnpaged(params: Paging) {
    if (params.page !== undefined || params.pageSize !== undefined)
      throw createApiServiceError(
        'This v1 list operation is not paginated. Omit page and pageSize, or select v2.'
      );
  }
  private async request(
    method: 'get' | 'post' | 'delete',
    path: string,
    params: {
      body?: unknown;
      query?: Record<string, unknown>;
      headers?: Record<string, string>;
      processing?: boolean;
    } = {}
  ) {
    const response = await this.http.request<unknown>({
      method,
      url: path,
      data: params.body,
      params: params.query,
      headers: params.headers
    });
    const { errors, ...envelope } = this.parse(envelopeSchema, response.data);
    if (
      (errors !== undefined && errors.length > 0) ||
      (envelope.status !== 'success' &&
        !(params.processing && envelope.status === 'processing'))
    )
      throw createApiServiceError(
        'Databox did not confirm acceptance of this API request. Check the selected API version and submitted data.'
      );
    return { envelope, body: response.data };
  }
  private data(body: unknown) {
    return this.parse(
      z.object({ data: z.unknown().refine(value => value !== undefined) }),
      body
    ).data;
  }
  private source(body: unknown) {
    if (this.apiVersion === 'v1') return this.parse(v1SourceSchema, body);
    const result = this.parse(v2SourceSchema, body);
    return {
      id: result.id,
      title: result.name,
      created: result.createdAt,
      timezone: result.timezone,
      key: result.integrationKey
    };
  }
  private dataset(body: unknown) {
    if (this.apiVersion === 'v1') return this.parse(v1DatasetSchema, body);
    const result = this.parse(v2DatasetSchema, body);
    return { id: String(result.id), title: result.name, created: result.createdAt };
  }
  private pagination(value: unknown) {
    const result = this.parse(paginationSchema, value);
    if (result.page < (this.apiVersion === 'v1' ? 1 : 0))
      throw createApiServiceError(
        'Databox returned pagination from an unexpected API version.'
      );
    return result;
  }
  async validateKey() {
    return (await this.request('get', `/${this.apiVersion}/auth/validate-key`)).envelope;
  }
  async getCurrentUser() {
    // Profile discovery is version-independent and ignores account context.
    return this.parse(
      profileSchema,
      this.data((await this.request('get', '/v2/profile')).body)
    );
  }
  async listAccounts(params: Paging = {}) {
    if (this.apiVersion === 'v2')
      throw createApiServiceError(
        'list_accounts preserves the v1 organization/agency/client classification and is unavailable in v2. Use get_current_user for your organization/account identity, or a v1 connection for the legacy account roster.'
      );
    this.legacyUnpaged(params);
    const { body } = await this.request('get', '/v1/accounts');
    return this.parse(
      z.object({
        accounts: z.array(z.object({ id: safeId, name: z.string(), accountType: z.string() }))
      }),
      body
    ).accounts;
  }
  async listTimezones() {
    const path =
      this.apiVersion === 'v1' ? '/v1/accounts/timezones' : '/v2/organization/timezones';
    const { body } = await this.request('get', path);
    const key = this.apiVersion === 'v1' ? 'timezones' : 'items';
    const result = this.parse(
      z.record(z.string(), z.unknown()),
      this.apiVersion === 'v1' ? body : this.data(body)
    );
    return this.parse(z.array(z.object({ timezone: z.string() })), result[key]).map(
      item => item.timezone
    );
  }
  async listDataSources(params: Scope & Paging = {}) {
    let path = '/v2/data-sources';
    if (this.apiVersion === 'v1') {
      this.legacyUnpaged(params);
      if (params.accountId === undefined)
        throw createApiServiceError(
          'v1 source discovery requires accountId. Call list_accounts first.'
        );
      path = `/v1/accounts/${this.id(params.accountId, 'accountId')}/data-sources`;
    }
    const { body } = await this.request('get', path, {
      headers: this.apiVersion === 'v2' ? this.headers(params) : {},
      query: this.paging(params)
    });
    const result = this.parse(
      z.record(z.string(), z.unknown()),
      this.apiVersion === 'v1' ? body : this.data(body)
    );
    const items = this.parse(
      z.array(z.unknown()).nullable(),
      result[this.apiVersion === 'v1' ? 'dataSources' : 'items']
    );
    if (items === null && this.apiVersion === 'v1')
      throw createApiServiceError('Databox returned an unexpected v1 source list.');
    return {
      sources: (items ?? []).map(item => this.source(item)),
      ...(this.apiVersion === 'v2' ? { pagination: this.pagination(result.pagination) } : {})
    };
  }
  async createDataSource(params: {
    accountId?: number;
    title: string;
    timezone?: string;
    idempotencyKey?: string;
  }) {
    if (params.accountId !== undefined) this.id(params.accountId, 'accountId');
    if (this.apiVersion === 'v1' && params.idempotencyKey !== undefined)
      this.headers({ idempotencyKey: params.idempotencyKey });
    const { body } = await this.request('post', `/${this.apiVersion}/data-sources`, {
      body:
        this.apiVersion === 'v1'
          ? pickDefined({
              accountId: params.accountId,
              title: params.title,
              timezone: params.timezone ?? 'UTC'
            })
          : { name: params.title, timezone: params.timezone ?? 'Etc/UTC' },
      headers: this.apiVersion === 'v2' ? this.headers(params) : {},
      processing: this.apiVersion === 'v1'
    });
    return this.source(this.apiVersion === 'v1' ? body : this.data(body));
  }
  async deleteDataSource(dataSourceId: number, params: Scope = {}) {
    return this.mutation(
      'delete',
      `/${this.apiVersion}/data-sources/${this.id(dataSourceId, 'dataSourceId')}`,
      params,
      'Data source deletion was confirmed.'
    );
  }
  async listDatasets(dataSourceId: number, params: Scope & Paging = {}) {
    this.id(dataSourceId, 'dataSourceId');
    if (this.apiVersion === 'v1') this.legacyUnpaged(params);
    const { body } = await this.request(
      'get',
      this.apiVersion === 'v1' ? `/v1/data-sources/${dataSourceId}/datasets` : '/v2/datasets',
      {
        headers: this.headers(params),
        query: this.apiVersion === 'v2' ? { dataSourceId, ...this.paging(params) } : undefined
      }
    );
    const result = this.parse(
      z.record(z.string(), z.unknown()),
      this.apiVersion === 'v1' ? body : this.data(body)
    );
    const items = this.parse(
      z.array(z.unknown()),
      result[this.apiVersion === 'v1' ? 'datasets' : 'items']
    );
    return {
      datasets: items.map(item => this.dataset(item)),
      ...(this.apiVersion === 'v2' ? { pagination: this.pagination(result.pagination) } : {})
    };
  }
  async createDataset(
    params: Write & {
      dataSourceId: number;
      title: string;
      primaryKeys?: string[];
      columns?: z.input<typeof columnSchema>[];
    }
  ) {
    this.id(params.dataSourceId, 'dataSourceId');
    if (this.apiVersion === 'v1' && params.columns !== undefined)
      throw createApiServiceError(
        'columns is supported only in v2. v1 infers columns during ingestion.'
      );
    if (this.apiVersion === 'v2' && params.columns === undefined)
      throw createApiServiceError(
        'v2 dataset creation requires columns with each column id and dataType (datetime, number or string).'
      );
    const { body } = await this.request('post', `/${this.apiVersion}/datasets`, {
      headers: this.headers(params),
      body:
        this.apiVersion === 'v1'
          ? pickDefined({
              dataSourceId: params.dataSourceId,
              title: params.title,
              primaryKeys: params.primaryKeys
            })
          : pickDefined({
              dataSourceId: params.dataSourceId,
              name: params.title,
              primaryKey: params.primaryKeys,
              schema: params.columns
            })
    });
    return this.dataset(this.apiVersion === 'v1' ? body : this.data(body));
  }
  private async mutation(
    method: 'post' | 'delete',
    path: string,
    params: Write,
    message: string
  ) {
    const { body, envelope } = await this.request(method, path, {
      headers: this.headers(params)
    });
    this.parse(
      z.object({ message: z.string() }),
      this.apiVersion === 'v1' ? body : this.data(body)
    );
    return { ...envelope, message };
  }
  async deleteDataset(datasetId: string, params: Scope = {}) {
    return this.mutation(
      'delete',
      `/${this.apiVersion}/datasets/${this.datasetId(datasetId)}`,
      params,
      'Dataset deletion was confirmed.'
    );
  }
  async purgeDataset(datasetId: string, params: Write = {}) {
    return this.mutation(
      'post',
      `/${this.apiVersion}/datasets/${this.datasetId(datasetId)}/purge`,
      params,
      'Dataset purge was confirmed.'
    );
  }
  async ingestData(datasetId: string, records: Record<string, unknown>[], params: Write = {}) {
    const path = `/${this.apiVersion}/datasets/${this.datasetId(datasetId)}/data`;
    const maximum = this.apiVersion === 'v1' ? 100 : 500;
    if (records.length < 1 || records.length > maximum)
      throw createApiServiceError(
        `${this.apiVersion} ingestion requires between 1 and ${maximum} records in a single request.`
      );
    let serialized: string;
    try {
      if (!z.array(z.record(z.string(), z.json())).safeParse(records).success) throw 0;
      serialized = JSON.stringify({ records });
    } catch {
      throw createApiServiceError(
        'Records must contain JSON-compatible values and finite numbers. Use ISO 8601 strings for datetime columns; data is never silently coerced.'
      );
    }
    if (this.apiVersion === 'v2' && new TextEncoder().encode(serialized).length > 10_000_000)
      throw createApiServiceError(
        'v2 ingestion requests cannot exceed 10 MB. Split the data into smaller batches.'
      );
    const { body, envelope } = await this.request('post', path, {
      body: { records },
      headers: this.headers(params)
    });
    const result = this.parse(
      z.object({ ingestionId: z.uuid(), message: z.string(), status: z.string().optional() }),
      this.apiVersion === 'v1' ? body : this.data(body)
    );
    return {
      ...envelope,
      ingestionId: result.ingestionId,
      status: result.status ?? envelope.status,
      message:
        'Ingestion request accepted. Use get_ingestion_status and dataset readback to verify processing; acceptance does not confirm that every row was stored.'
    };
  }
  private ingestion(value: unknown) {
    if (this.apiVersion === 'v1') {
      const item = this.parse(v1IngestionSchema, value);
      const metrics = item.metrics?.ingestionMetrics;
      return {
        ingestionId: item.ingestionId,
        timestamp: item.timestamp,
        status: item.status,
        totalRows: metrics?.receivedRecordsCount,
        validRows:
          metrics?.appendedRecordsCount !== undefined &&
          metrics.overwrittenRecordsCount !== undefined
            ? metrics.appendedRecordsCount + metrics.overwrittenRecordsCount
            : undefined,
        invalidRows: metrics?.rejectedRecordsCount,
        appendedRows: metrics?.appendedRecordsCount,
        overwrittenRows: metrics?.overwrittenRecordsCount,
        datasetMetrics: item.metrics?.datasetMetrics
      };
    }
    const item = this.parse(v2IngestionSchema, value);
    const metrics = item.summary?.ingestion;
    return {
      ingestionId: item.id,
      timestamp: item.initiatedAt,
      status: item.status,
      totalRows: metrics?.receivedRecordCount,
      validRows:
        metrics?.appendedRecordCount !== undefined &&
        metrics.overwrittenRecordCount !== undefined
          ? metrics.appendedRecordCount + metrics.overwrittenRecordCount
          : undefined,
      invalidRows: metrics?.rejectedRecordCount,
      appendedRows: metrics?.appendedRecordCount,
      overwrittenRows: metrics?.overwrittenRecordCount,
      datasetMetrics: item.summary?.dataset,
      errorCount: item.errors == null ? undefined : item.errors.length
    };
  }
  async getIngestionDetails(datasetId: string, ingestionId: string, params: Scope = {}) {
    if (!z.uuid().safeParse(ingestionId).success)
      throw createApiServiceError(
        'ingestionId must be a UUID from ingest_data or list_ingestions.'
      );
    const { body } = await this.request(
      'get',
      `/${this.apiVersion}/datasets/${this.datasetId(datasetId)}/ingestions/${ingestionId}`,
      { headers: this.headers(params) }
    );
    const result = this.ingestion(this.apiVersion === 'v1' ? body : this.data(body));
    if (result.ingestionId !== ingestionId)
      throw createApiServiceError('Databox returned a different ingestion ID than requested.');
    return result;
  }
  async listIngestions(datasetId: string, params: Scope & Paging = {}) {
    const { body } = await this.request(
      'get',
      `/${this.apiVersion}/datasets/${this.datasetId(datasetId)}/ingestions`,
      { headers: this.headers(params), query: this.paging(params) }
    );
    const result = this.parse(
      z.record(z.string(), z.unknown()),
      this.apiVersion === 'v1' ? body : this.data(body)
    );
    const schema =
      this.apiVersion === 'v1'
        ? z.object({
            ingestionId: z.uuid(),
            timestamp: z.string(),
            status: z.string().optional()
          })
        : z.object({ id: z.uuid(), initiatedAt: z.string(), status: z.string() });
    const items = this.parse(
      z.array(schema),
      result[this.apiVersion === 'v1' ? 'ingestions' : 'items']
    );
    return {
      pagination: this.pagination(result.pagination),
      ingestions: items.map(item =>
        'id' in item
          ? { ingestionId: item.id, timestamp: item.initiatedAt, status: item.status }
          : item
      )
    };
  }
  async getDatasetData(datasetId: string, params: Scope & Paging = {}) {
    if (this.apiVersion !== 'v2')
      throw createApiServiceError(
        'Dataset row readback is available only in v2. Select v2 and discover its actual dataset ID; v1 UUIDs cannot be converted automatically.'
      );
    const { body } = await this.request(
      'get',
      `/v2/datasets/${this.datasetId(datasetId)}/data`,
      { headers: this.headers(params), query: this.paging(params, true) }
    );
    const result = this.parse(
      z.object({
        items: z.array(z.record(z.string(), z.json())),
        pagination: paginationSchema,
        schema: z
          .array(
            z.object({
              id: z.string(),
              displayName: z.string().optional(),
              dataType: z.string(),
              order: count.optional(),
              visible: z.boolean().optional()
            })
          )
          .nullable()
          .optional(),
        lastUpdatedAt: z.string().nullable().optional()
      }),
      this.data(body)
    );
    return {
      records: result.items,
      pagination: result.pagination,
      columns: result.schema,
      lastUpdatedAt: result.lastUpdatedAt
    };
  }
}
