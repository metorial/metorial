import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

type Row = Record<string, unknown>;
type Params = { token: string; region: string; clientId?: string };
const BASE_URLS = {
  us: 'https://api.stitchdata.com',
  eu: 'https://api.eu-central-1.stitchdata.com'
};
export const resolveRegion = (
  authRegion: 'us' | 'eu' | undefined,
  config: Row
): 'us' | 'eu' => {
  if (authRegion) return authRegion;
  const legacy = z.enum(['us', 'eu']).safeParse(config.region);
  if (config.region !== undefined && !legacy.success)
    throw createApiServiceError(
      'The saved Stitch region is invalid. Reconnect with the correct account region.'
    );
  return legacy.success ? legacy.data : 'us';
};
const text = z.string().nullish();
const connectionSchema = z.object({
  id: z.number().int().positive(),
  type: z.string(),
  name: text,
  display_name: text,
  created_at: text,
  updated_at: text,
  paused_at: text,
  system_paused_at: text,
  stale: z.boolean().nullish(),
  stitch_client_id: z.number().int().positive().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  report_card: z.unknown().optional()
});
const streamSchema = z.object({
  stream_id: z.number().int().positive(),
  stream_name: z.string().min(1),
  tap_stream_id: z.string().optional(),
  selected: z.boolean().nullish(),
  schema: z.unknown().optional(),
  metadata: z
    .union([
      z.record(z.string(), z.unknown()),
      z.array(
        z.object({
          breadcrumb: z.array(z.string()),
          metadata: z.record(z.string(), z.unknown())
        })
      )
    ])
    .optional()
});
const emailSchema = z.object({
  id: z.number().int().positive(),
  email_address: z.string(),
  disabled_at: text,
  created_at: text
});
const hookSchema = z.object({
  id: z.number().int().positive(),
  config: z.object({ url: z.string() }),
  disabled_at: text,
  created_at: text
});
const pageSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  links: z.object({ next: z.string().optional(), previous: z.string().optional() }).optional()
});
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError('Stitch returned an unexpected response shape.');
  return result.data;
};
export const numericId = (value: number, label = 'ID') => {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw createApiServiceError(`${label} must be a positive integer.`);
  return String(value);
};
export const accountId = (value?: string) => {
  if (
    !value ||
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) <= 0
  )
    throw createApiServiceError(
      'Configure the numeric Stitch account client ID from the dashboard URL.'
    );
  return String(Number(value));
};
const segment = (value: string) => {
  if (!value.trim()) throw createApiServiceError('Provide a non-empty resource identifier.');
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('Provide a valid resource identifier.');
  }
};
const safeProperties = new Set([
  'host',
  'port',
  'database',
  'dbname',
  'schema',
  'username',
  'encryption_type',
  'ssl',
  'status',
  'frequency_in_minutes',
  'cron_expression',
  'anchor_time',
  'start_date',
  'destination_id'
]);
const sensitiveKey =
  /password|secret|token|credential|authorization|private.?key|client.?key|access.?key|connection.?string|certificate|^value$|^default$|^examples?$/i;
const scrub = (value: unknown, token: string): unknown => {
  if (typeof value === 'string') {
    if ((token && value.includes(token)) || /(?:ac_|at_)[A-Za-z0-9_-]{12,}/.test(value))
      return '[redacted]';
    return value.replace(/https?:\/\/[^\s"'<>]+/gi, match => {
      try {
        const url = new URL(match);
        url.username = '';
        url.password = '';
        url.search = '';
        url.hash = '';
        return url.toString();
      } catch {
        return '[redacted]';
      }
    });
  }
  if (Array.isArray(value)) return value.map(item => scrub(item, token));
  if (isApiErrorRecord(value))
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key === 'is_credential' || !sensitiveKey.test(key))
        .map(([key, item]) => [key, scrub(item, token)])
    );
  return value;
};
const apiError = (error: unknown) => {
  const status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Stitch',
      reason: 'stitch_api_error',
      extractMessage: () =>
        status === 401 || status === 403
          ? 'Check the account region, credential type, source/account scope and plan access.'
          : status === 429
            ? 'Wait before retrying. Job endpoints share a limit of 30 requests per 10 minutes.'
            : 'Check resource IDs, request configuration and provider API availability.'
    }
  );
};
const createClient = (params: Params, authenticated = true) => {
  if (!Object.hasOwn(BASE_URLS, params.region))
    throw createApiServiceError('Choose the us or eu Stitch region.');
  if (authenticated && !params.token.trim())
    throw createApiServiceError('Provide a Stitch access token.');
  return createAuthenticatedAxios({
    baseURL: BASE_URLS[params.region as keyof typeof BASE_URLS],
    ...(authenticated ? { authHeader: { value: `Bearer ${params.token}` } } : {}),
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: 2 * 1024 * 1024,
    maxBodyLength: 20 * 1024 * 1024,
    errorAdapter: apiError
  });
};
const checkBody = (value: unknown) => {
  if (
    isApiErrorRecord(value) &&
    ((value.error !== undefined && value.error !== null && value.error !== false) ||
      (typeof value.status === 'string' && /^(error|not found|failed)$/i.test(value.status)))
  )
    throw createApiServiceError(
      isApiErrorRecord(value.error) && value.error.type === 'already_running'
        ? 'A replication job is already running; no new job was created.'
        : 'Stitch rejected the operation. Check the request configuration.',
      {
        upstreamCode:
          isApiErrorRecord(value.error) && value.error.type === 'already_running'
            ? 'already_running'
            : undefined
      }
    );
  return value;
};
export class StitchConnectClient {
  private axios: ReturnType<typeof createClient>;
  constructor(private params: Params) {
    if (params.token.startsWith('at_'))
      throw createApiServiceError(
        'Account management requires a Connect account token from Account Settings, not an Import source token.'
      );
    this.axios = createClient(params);
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: unknown,
    query?: Row
  ) {
    return checkBody(
      (await this.axios.request<unknown>({ method, url, data, params: query })).data
    );
  }
  private connection(value: unknown) {
    const item = parse(connectionSchema, scrub(value, this.params.token));
    return {
      ...item,
      properties:
        item.properties === undefined
          ? undefined
          : Object.fromEntries(
              Object.entries(item.properties)
                .filter(
                  ([key, value]) =>
                    safeProperties.has(key) &&
                    (typeof value === 'string' ||
                      typeof value === 'boolean' ||
                      typeof value === 'number' ||
                      value === null)
                )
                .map(([key, value]) => [key, scrub(value, this.params.token)])
            ),
      report_card: scrub(item.report_card, this.params.token)
    };
  }
  async listSources() {
    return parse(z.array(z.unknown()), await this.request('GET', '/v4/sources')).map(item =>
      this.connection(item)
    );
  }
  async getSource(id: number) {
    return this.connection(
      await this.request('GET', `/v4/sources/${numericId(id, 'Source ID')}`)
    );
  }
  async createSource(body: { type: string; display_name: string; properties?: Row }) {
    if (!body.type.trim() || !body.display_name.trim())
      throw createApiServiceError('Provide a source type and display name.');
    return this.connection(await this.request('POST', '/v4/sources', body));
  }
  async updateSource(id: number, body: Row) {
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one source change.');
    return this.connection(
      await this.request('PUT', `/v4/sources/${numericId(id, 'Source ID')}`, body)
    );
  }
  async deleteSource(id: number) {
    return parse(
      connectionSchema.extend({ id: z.literal(id), deleted_at: z.string().min(1) }),
      await this.request('DELETE', `/v4/sources/${numericId(id, 'Source ID')}`)
    );
  }
  async getLastConnectionCheck(id: number) {
    return scrub(
      parse(
        z
          .object({
            name: z.string().min(1),
            mode: z.literal('check'),
            status: z.enum(['running', 'succeeded', 'failed']),
            error: z.boolean()
          })
          .passthrough(),
        (
          await this.axios.get<unknown>(
            `/v4/sources/${numericId(id, 'Source ID')}/last-connection-check`
          )
        ).data
      ),
      this.params.token
    );
  }
  private types(value: unknown) {
    return parse(
      z.array(z.record(z.string(), z.unknown())),
      scrub(
        Array.isArray(value)
          ? value
          : isApiErrorRecord(value)
            ? Object.values(value)
            : undefined,
        this.params.token
      )
    );
  }
  async listSourceTypes() {
    return this.types(await this.request('GET', '/v4/source-types'));
  }
  async getSourceType(type: string) {
    return parse(
      z.record(z.string(), z.unknown()),
      scrub(await this.request('GET', `/v4/source-types/${segment(type)}`), this.params.token)
    );
  }
  async listDestinations() {
    return parse(z.array(z.unknown()), await this.request('GET', '/v4/destinations')).map(
      item => this.connection(item)
    );
  }
  async createDestination(body: {
    type: string;
    properties: Row;
    name?: string;
    ignore_unmapped_sources?: boolean;
  }) {
    return this.connection(await this.request('POST', '/v4/destinations', body));
  }
  async updateDestination(id: number, body: Row) {
    if (body.name !== undefined)
      throw createApiServiceError(
        'The documented destination update API cannot rename destinations. Change the name in the Stitch dashboard.'
      );
    if (!isApiErrorRecord(body.properties))
      throw createApiServiceError('Provide destination connection properties to update.');
    return this.connection(
      await this.request('PUT', `/v4/destinations/${numericId(id, 'Destination ID')}`, body)
    );
  }
  async deleteDestination(id: number) {
    return parse(
      z.union([z.object({}).strict(), z.literal(''), z.null(), z.undefined()]),
      await this.request('DELETE', `/v4/destinations/${numericId(id, 'Destination ID')}`)
    );
  }
  async listDestinationTypes() {
    return this.types(await this.request('GET', '/v4/destination-types'));
  }
  async getDestinationType(type: string) {
    return parse(
      z.record(z.string(), z.unknown()),
      scrub(
        await this.request('GET', `/v4/destination-types/${segment(type)}`),
        this.params.token
      )
    );
  }
  async listStreams(id: number) {
    return parse(
      z.array(streamSchema),
      scrub(
        await this.request('GET', `/v4/sources/${numericId(id, 'Source ID')}/streams`),
        this.params.token
      )
    );
  }
  async getStream(sourceId: number, streamId: number) {
    numericId(streamId, 'Stream ID');
    const listed = (await this.listStreams(sourceId)).find(
      item => item.stream_id === streamId
    );
    if (!listed)
      throw createApiServiceError('The requested stream does not belong to this source.');
    const detail = parse(
      z.object({
        schema: z.unknown().refine(value => value !== undefined),
        metadata: streamSchema.shape.metadata
      }),
      await this.request(
        'GET',
        `/v4/sources/${numericId(sourceId, 'Source ID')}/streams/${streamId}`
      )
    );
    let schema: unknown = detail.schema;
    if (typeof schema === 'string') {
      try {
        schema = JSON.parse(schema);
      } catch {
        throw createApiServiceError('Stitch returned an invalid stream JSON schema.');
      }
    }
    return {
      ...listed,
      schema: scrub(schema, this.params.token),
      metadata:
        detail.metadata === undefined
          ? listed.metadata
          : scrub(detail.metadata, this.params.token)
    };
  }
  async updateStreamMetadata(
    id: number,
    streams: Array<{
      tap_stream_id: string;
      metadata: Array<{ breadcrumb: string[]; metadata: Row }>;
    }>
  ) {
    if (!streams.length) throw createApiServiceError('Provide at least one stream update.');
    if (
      streams.some(
        stream =>
          !stream.tap_stream_id.trim() ||
          !stream.metadata.length ||
          stream.metadata.some(
            item =>
              !Object.keys(item.metadata).length || item.breadcrumb.some(part => !part.trim())
          )
      )
    )
      throw createApiServiceError(
        'Provide a non-empty stream identifier and at least one metadata change per stream.'
      );
    return parse(
      z.object({ status: z.literal(200) }),
      await this.request('PUT', `/v4/sources/${numericId(id, 'Source ID')}/streams/metadata`, {
        streams
      })
    );
  }
  async startReplication(id: number) {
    return parse(
      z.object({ job_name: z.string().min(1) }),
      await this.request('POST', `/v4/sources/${numericId(id, 'Source ID')}/sync`)
    );
  }
  async stopReplication(id: number) {
    return parse(
      z.object({ status: z.literal(200) }),
      await this.request('DELETE', `/v4/sources/${numericId(id, 'Source ID')}/sync`)
    );
  }
  private async jobs(kind: 'extractions' | 'loads', page?: number) {
    if (page !== undefined) numericId(page, 'Page');
    return parse(
      pageSchema,
      scrub(
        await this.request(
          'GET',
          `/v4/${accountId(this.params.clientId)}/${kind}`,
          undefined,
          page === undefined ? undefined : { page }
        ),
        this.params.token
      )
    );
  }
  async listExtractions(page?: number) {
    return this.jobs('extractions', page);
  }
  async listLoads(page?: number) {
    return this.jobs('loads', page);
  }
  async getExtractionLogs(jobName: string) {
    const clientId = accountId(this.params.clientId);
    const response = await this.axios.get<unknown>(
      `/v4/${clientId}/extractions/${segment(jobName)}`,
      { validateStatus: status => status === 302 }
    );
    const location: unknown = response.headers.location;
    if (typeof location !== 'string')
      throw createApiServiceError('Stitch did not provide a log download location.');
    let url: URL;
    try {
      url = new URL(location);
    } catch {
      throw createApiServiceError('Stitch returned an invalid log download location.');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !/^(?:[a-z0-9.-]+\.)?s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i.test(url.hostname)
    )
      throw createApiServiceError(
        'Stitch returned a log location outside the documented Amazon S3 hosts.'
      );
    const stamp = url.searchParams.get('X-Amz-Date'),
      seconds = url.searchParams.get('X-Amz-Expires'),
      legacy = url.searchParams.get('Expires');
    let expiry = Number.NaN;
    if (stamp && /^\d{8}T\d{6}Z$/.test(stamp) && seconds && /^\d+$/.test(seconds))
      expiry =
        Date.parse(
          `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`
        ) +
        Number(seconds) * 1000;
    else if (legacy && /^\d+$/.test(legacy)) expiry = Number(legacy) * 1000;
    if (!Number.isFinite(new Date(expiry).getTime()) || expiry <= Date.now())
      throw createApiServiceError(
        'Stitch returned a log link without a valid future expiry. Request the logs again.'
      );
    return {
      url: url.toString(),
      expiresAt: new Date(expiry).toISOString(),
      clientId,
      mimeType: url.pathname.endsWith('.gz') ? 'application/gzip' : 'text/plain'
    };
  }
  async listCustomEmails() {
    return parse(
      z.array(emailSchema),
      await this.request('GET', '/notifications/public/v1/api/custom-emails')
    );
  }
  async createCustomEmail(email: string) {
    if (!z.email().safeParse(email).success)
      throw createApiServiceError('Provide a valid notification email address.');
    return parse(
      emailSchema,
      await this.request('POST', '/notifications/public/v1/api/custom-emails', {
        email_address: email
      })
    );
  }
  async updateCustomEmail(id: number, disabled: boolean) {
    return parse(
      z.object({ disabled_at: disabled ? z.string().min(1) : z.null() }),
      await this.request(
        'PUT',
        `/notifications/public/v1/api/custom-emails/${numericId(id, 'Email ID')}`,
        { disabled_at: disabled ? new Date().toISOString() : null }
      )
    );
  }
  async deleteCustomEmail(id: number) {
    return parse(
      z.tuple([z.literal(1)]),
      await this.request(
        'DELETE',
        `/notifications/public/v1/api/custom-emails/${numericId(id, 'Email ID')}`
      )
    );
  }
  async listHooks() {
    return parse(
      z.object({ post_load: z.array(hookSchema) }),
      await this.request('GET', '/notifications/public/v1/api/hooks')
    ).post_load;
  }
  async createHook(url: string, destinationId?: number) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw createApiServiceError('Provide a valid HTTP or HTTPS webhook URL.');
    }
    if (!['https:', 'http:'].includes(parsed.protocol))
      throw createApiServiceError('Provide an HTTP or HTTPS webhook URL.');
    if (destinationId === undefined) {
      const destinations = await this.listDestinations();
      if (destinations.length !== 1)
        throw createApiServiceError(
          'Provide destinationId when the account does not have exactly one destination.'
        );
      destinationId = destinations[0]!.id;
    }
    return parse(
      hookSchema,
      await this.request('POST', '/notifications/public/v1/api/hooks', {
        type: 'post_load',
        destination_id: Number(numericId(destinationId, 'Destination ID')),
        config: { url }
      })
    );
  }
  async updateHook(id: number, disabled: boolean) {
    return parse(
      hookSchema.extend({ disabled_at: disabled ? z.string().min(1) : z.null() }),
      await this.request(
        'PUT',
        `/notifications/public/v1/api/hooks/${numericId(id, 'Hook ID')}`,
        { enable: !disabled }
      )
    );
  }
  async deleteHook(id: number) {
    return parse(
      z.null(),
      await this.request(
        'DELETE',
        `/notifications/public/v1/api/hooks/${numericId(id, 'Hook ID')}`
      )
    );
  }
}
export class StitchImportClient {
  private axios: ReturnType<typeof createClient>;
  constructor(
    private params: Params,
    authenticated = true
  ) {
    if (authenticated && params.token.startsWith('ac_'))
      throw createApiServiceError(
        'Data import requires an Import source token from Integration Settings. Supply importToken alongside the Connect account token.'
      );
    this.axios = createClient(params, authenticated);
  }
  async getStatus() {
    return parse(
      z.object({ name: z.string(), status: z.string(), reason: text }),
      (await this.axios.get<unknown>('/v2/import/status')).data
    );
  }
  private async submit(path: string, body: unknown) {
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > 20 * 1024 * 1024)
      throw createApiServiceError('The Import API request exceeds 20 MB.');
    const result = parse(
      z.object({ status: z.string(), message: text }),
      scrub(checkBody((await this.axios.post<unknown>(path, body)).data), this.params.token)
    );
    if (!/^(OK|Accepted)$/i.test(result.status))
      throw createApiServiceError('Stitch did not accept the import request.');
    return result;
  }
  async pushBatch(body: {
    table_name: string;
    schema: Row;
    messages: Array<{ action: string; sequence: number; data: Row }>;
    key_names?: string[];
  }) {
    if (!body.messages.length || body.messages.length > 20000)
      throw createApiServiceError('Send between 1 and 20,000 records per batch.');
    return this.submit('/v2/import/batch', body);
  }
  async validatePush(
    records: Array<{
      client_id: number;
      table_name: string;
      sequence: number;
      action: string;
      key_names?: string[];
      data: Row;
    }>
  ) {
    if (!records.length || records.length > 20000)
      throw createApiServiceError('Validate between 1 and 20,000 records per request.');
    const result = await this.submit('/v2/import/validate', records);
    if (result.status.toUpperCase() !== 'OK')
      throw createApiServiceError(
        'Stitch accepted the validation request but did not confirm validity. Retry validation before importing data.'
      );
    return result;
  }
}
