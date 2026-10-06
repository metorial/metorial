import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

const functionResponse = z.object({
  status: z.enum(['success', 'error']),
  value: z.unknown().optional()
});
const exportedDocument = z
  .object({
    _id: z.string().min(1),
    _component: z.string(),
    _table: z.string().min(1),
    _ts: z.string()
  })
  .passthrough();
const snapshotResponse = z.object({
  values: z.array(exportedDocument),
  cursor: z.string().nullable(),
  snapshot: z.string(),
  hasMore: z.boolean()
});
const deltasResponse = z.object({
  values: z.array(exportedDocument.extend({ _deleted: z.boolean() })),
  cursor: z.string(),
  hasMore: z.boolean()
});
export const deploymentInfoSchema = z.object({
  kind: z.enum(['cloud', 'selfHosted']),
  teamId: z.number().optional(),
  projectId: z.number().optional(),
  id: z.number().optional(),
  deploymentType: z.enum(['dev', 'prod', 'preview', 'custom']).optional(),
  projectName: z.string().nullish(),
  projectSlug: z.string().nullish(),
  reference: z.string().nullish()
});

export const deploymentOrigin = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Provide a valid Convex deployment URL.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    url.hostname === 'api.convex.dev' ||
    url.hostname.endsWith('.convex.site')
  )
    throw createApiServiceError(
      'Use the HTTPS deployment origin (usually *.convex.cloud), not the Management API or an HTTP action URL. Local deployments may use loopback HTTP.'
    );
  return url.origin;
};

// Legacy export metadata contains i64 nanosecond timestamps. Preserve pagination
// and each exported record's _ts before decoding; application values keep their format.
const exportResponse = (raw: unknown): unknown => {
  if (typeof raw !== 'string')
    throw createApiServiceError('Convex returned an invalid export response.');
  const containers: Array<{ type: string; property?: string }> = [];
  let property: string | undefined;
  let start = 0;
  let result = '';
  try {
    for (let index = 0; index < raw.length; index++) {
      const char = raw[index];
      if (char === '"') {
        const begin = index;
        for (index++; index < raw.length; index++) {
          if (raw[index] === '\\') index++;
          else if (raw[index] === '"') break;
        }
        if (!/^\s*:/.test(raw.slice(index + 1))) continue;
        const key: unknown = JSON.parse(raw.slice(begin, index + 1));
        if (typeof key !== 'string') continue;
        property = key;
        const pagination = containers.length === 1 && (key === 'snapshot' || key === 'cursor');
        const recordTimestamp =
          containers.length === 3 &&
          containers[1]?.type === '[' &&
          containers[1]?.property === 'values' &&
          containers[2]?.type === '{' &&
          key === '_ts';
        if (!pagination && !recordTimestamp) continue;
        const match = /^\s*:\s*(-?\d+)(?=\s*[,}])/.exec(raw.slice(index + 1));
        if (!match?.[1]) continue;
        const numberStart = index + 1 + match[0].lastIndexOf(match[1]);
        result += raw.slice(start, numberStart) + JSON.stringify(match[1]);
        start = numberStart + match[1].length;
      } else if (char === '{' || char === '[') {
        containers.push({ type: char, property });
        property = undefined;
      } else if (char === '}' || char === ']') {
        containers.pop();
        property = undefined;
      } else if (char === ',') property = undefined;
    }
    return JSON.parse(result + raw.slice(start));
  } catch {
    throw createApiServiceError('Convex returned invalid export JSON.');
  }
};

const timestamp = (value: string, field: string) => {
  if (!/^\d{1,19}$/.test(value) || BigInt(value) > 9223372036854775807n)
    throw createApiServiceError(`${field} must be the decimal timestamp returned by Convex.`);
  return value;
};

export class ConvexClient {
  private http;
  readonly origin: string;
  constructor(config: { deploymentUrl: string; token: string; authType: string }) {
    this.origin = deploymentOrigin(config.deploymentUrl);
    if (!config.token.trim()) throw createApiServiceError('A Convex credential is required.');
    if (!['deploy_key', 'oauth'].includes(config.authType))
      throw createApiServiceError('Use a Convex deploy key or OAuth application token.');
    this.http = createAuthenticatedAxios({
      baseURL: this.origin,
      timeout: 30000,
      maxRedirects: 0,
      // Deployment APIs use Convex for admin credentials of every supported type.
      authHeader: { value: `Convex ${config.token.trim()}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Convex',
          reason: 'convex_api_error',
          parent: {},
          extractMessage: () =>
            'Check deployment access, required plan and request fields. No request was automatically retried.'
        })
    });
  }
  private parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw createApiServiceError('Convex returned an invalid response.');
    return parsed.data;
  }
  private async invoke(
    kind: 'query' | 'mutation' | 'action',
    path: string,
    args: Record<string, unknown>
  ) {
    if (!path.trim() || /[\s?#\\]/.test(path) || path.split('/').includes('..'))
      throw createApiServiceError(
        'Provide a deployed function path such as module:functionName.'
      );
    const response = this.parse(
      functionResponse,
      (await this.http.post(`/api/${kind}`, { path, args, format: 'json' })).data
    );
    if (response.status === 'error')
      throw createApiServiceError(
        `Convex ${kind} execution failed. Check the function arguments and deployment logs.`,
        { reason: 'convex_function_error' }
      );
    if (!Object.hasOwn(response, 'value'))
      throw createApiServiceError(
        'Convex returned a successful function response without a value.'
      );
    return response;
  }
  query(path: string, args: Record<string, unknown> = {}) {
    return this.invoke('query', path, args);
  }
  mutation(path: string, args: Record<string, unknown> = {}) {
    return this.invoke('mutation', path, args);
  }
  action(path: string, args: Record<string, unknown> = {}) {
    return this.invoke('action', path, args);
  }
  async getDeploymentInfo() {
    const info = this.parse(
      deploymentInfoSchema,
      (await this.http.get('/api/v1/deployment_info')).data
    );
    if (
      info.kind === 'cloud' &&
      [info.teamId, info.projectId, info.id, info.deploymentType].some(
        value => value === undefined
      )
    )
      throw createApiServiceError('Convex returned incomplete cloud deployment identity.');
    return info;
  }
  async listSnapshot(
    params: { tableName?: string; cursor?: string; snapshotId?: string } = {}
  ) {
    if (params.cursor && !params.snapshotId)
      throw createApiServiceError(
        'Provide the original snapshotId when continuing snapshot pagination.'
      );
    const response = await this.http.get('/api/list_snapshot', {
      params: pickDefined({
        format: 'json',
        tableName: params.tableName,
        cursor: params.cursor || undefined,
        snapshot:
          params.snapshotId === undefined
            ? undefined
            : timestamp(params.snapshotId, 'snapshotId')
      }),
      responseType: 'text',
      transformResponse: [(data: unknown) => data]
    });
    const result = this.parse(snapshotResponse, exportResponse(response.data));
    timestamp(result.snapshot, 'snapshotId');
    for (const document of result.values) timestamp(document._ts, 'Document timestamp');
    if (
      params.snapshotId !== undefined &&
      BigInt(result.snapshot) !== BigInt(params.snapshotId)
    )
      throw createApiServiceError('Convex changed the requested snapshot timestamp.');
    if (result.hasMore && !result.cursor)
      throw createApiServiceError('Convex omitted the next snapshot cursor.');
    if (result.hasMore && result.cursor === params.cursor)
      throw createApiServiceError('Convex repeated the snapshot pagination cursor.');
    return result;
  }
  async documentDeltas(params: { cursor?: string; tableName?: string } = {}) {
    if (!params.cursor)
      throw createApiServiceError(
        'Provide cursor from a completed list_documents snapshotId or a previous change response.'
      );
    const response = await this.http.get('/api/document_deltas', {
      params: pickDefined({
        format: 'json',
        tableName: params.tableName,
        cursor: timestamp(params.cursor, 'cursor')
      }),
      responseType: 'text',
      transformResponse: [(data: unknown) => data]
    });
    const result = this.parse(deltasResponse, exportResponse(response.data));
    timestamp(result.cursor, 'cursor');
    for (const document of result.values) timestamp(document._ts, 'Document timestamp');
    if (
      BigInt(result.cursor) < BigInt(params.cursor) ||
      (result.hasMore && result.cursor === params.cursor)
    )
      throw createApiServiceError('Convex returned a change cursor that did not advance.');
    return result;
  }
  async generateUploadUrl(path?: string, args: Record<string, unknown> = {}) {
    if (!path)
      throw createApiServiceError(
        'Provide functionPath for a deployed mutation that returns ctx.storage.generateUploadUrl(). Convex has no public upload-URL generation REST endpoint.'
      );
    const result = await this.mutation(path, args);
    return this.fileUrl(result.value, true);
  }
  fileUrl(value: unknown, upload = false) {
    if (typeof value !== 'string')
      throw createApiServiceError('The Convex function must return a file URL string.');
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw createApiServiceError('The Convex function returned an invalid file URL.');
    }
    const allowedQuery = upload ? 'token' : 'component';
    const queryFields = [...url.searchParams.keys()];
    if (
      url.origin !== this.origin ||
      url.username ||
      url.password ||
      url.hash ||
      !/^\/api\/storage\/[^/]+$/.test(url.pathname) ||
      queryFields.some(key => key !== allowedQuery) ||
      url.searchParams.getAll(allowedQuery).length > 1 ||
      (upload
        ? url.pathname !== '/api/storage/upload' || !url.searchParams.get('token')
        : url.pathname === '/api/storage/upload')
    )
      throw createApiServiceError(
        'The function must return a Convex storage URL for the configured deployment.'
      );
    return url.toString();
  }
  async getEnvironmentVariables() {
    const response = this.parse(
      z.object({ environmentVariables: z.record(z.string(), z.string()) }),
      (await this.http.get('/api/v1/list_environment_variables')).data
    );
    return Object.entries(response.environmentVariables).map(([name, value]) => ({
      name,
      value
    }));
  }
  async updateEnvironmentVariables(changes: Array<{ name: string; value?: string }>) {
    if (!changes.length)
      throw createApiServiceError('Provide at least one environment variable change.');
    const names = new Set<string>();
    for (const change of changes) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(change.name) || names.has(change.name))
        throw createApiServiceError(
          'Environment variable names must be valid and unique within a request.'
        );
      names.add(change.name);
    }
    await this.http.post('/api/v1/update_environment_variables', {
      changes: changes.map(change => pickDefined(change))
    });
  }
}
