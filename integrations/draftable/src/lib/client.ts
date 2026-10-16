import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getBase64ByteLength
} from 'slates';
import { z } from 'zod';

let DEFAULT_BASE_URL = 'https://api.draftable.com/v1';

let sideResponseSchema = z.object({
  file_type: z.string().min(1),
  source_url: z.string().nullable().optional(),
  display_name: z.string().nullable().optional()
});

let comparisonResponseSchema = z.object({
  identifier: z.string().min(1),
  left: sideResponseSchema,
  right: sideResponseSchema,
  public: z.boolean(),
  creation_time: z.iso.datetime({ offset: true }),
  expiry_time: z.string().nullable().optional(),
  ready: z.boolean(),
  ready_time: z.string().nullable().optional(),
  failed: z.boolean().nullable().optional(),
  error_message: z.string().nullable().optional()
});

let exportResponseSchema = z.object({
  identifier: z.string().min(1),
  comparison: z.string(),
  kind: z.string(),
  url: z.string().nullable().optional(),
  ready: z.boolean(),
  failed: z.boolean(),
  error_message: z.string().nullable().optional()
});

let listResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  results: z.array(comparisonResponseSchema)
});

let parseResponse = <T>(schema: z.ZodType<T>, data: unknown, resource: string): T => {
  let parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw createApiServiceError(`Draftable returned an invalid ${resource} response.`, {
      reason: 'draftable_invalid_response',
      parent: parsed.error
    });
  }
  return parsed.data;
};

export let validateIdentifier = (identifier: string) => {
  if (!/^[A-Za-z0-9._-]{1,1024}$/.test(identifier)) {
    throw createApiServiceError(
      'The identifier must contain 1 to 1024 ASCII letters, numbers, periods, underscores, or hyphens.'
    );
  }
  return identifier;
};

export let validateHttpUrl = (value: string, label: string) => {
  let parsed = z.url({ protocol: /^https?$/ }).safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError(`${label} must be a valid HTTP or HTTPS URL.`);
  }
  return parsed.data;
};

export let getBaseUrl = (baseUrl?: string) => {
  let value = baseUrl || DEFAULT_BASE_URL;
  validateHttpUrl(value, 'API base URL');
  let url = new URL(value);
  if (url.search || url.hash || url.username || url.password) {
    throw createApiServiceError(
      'The API base URL must not include credentials, query parameters, or a fragment.'
    );
  }
  return value.replace(/\/+$/, '');
};

export type ComparisonSide = {
  fileType: string;
  sourceUrl?: string;
  displayName?: string;
};

export type UploadSide = {
  fileType: string;
  contentBase64: string;
  displayName?: string;
};

let mapSide = (data: z.infer<typeof sideResponseSchema>) => ({
  fileType: data.file_type,
  sourceUrl: data.source_url,
  displayName: data.display_name
});

let mapComparison = (data: z.infer<typeof comparisonResponseSchema>) => ({
  identifier: data.identifier,
  left: mapSide(data.left),
  right: mapSide(data.right),
  isPublic: data.public,
  creationTime: data.creation_time,
  expiryTime: data.expiry_time,
  ready: data.ready,
  readyTime: data.ready_time,
  failed: data.failed,
  errorMessage: data.error_message
});

let mapExport = (data: z.infer<typeof exportResponseSchema>) => ({
  identifier: data.identifier,
  comparisonIdentifier: data.comparison,
  kind: data.kind,
  url: data.url,
  ready: data.ready,
  failed: data.failed,
  errorMessage: data.error_message
});

export type ComparisonResponse = ReturnType<typeof mapComparison>;
export type ExportResponse = ReturnType<typeof mapExport>;

export type ComparisonOptions = {
  identifier?: string;
  isPublic?: boolean;
  expiryTime?: string;
};

let comparisonOptions = (params: ComparisonOptions) => {
  let body: Record<string, string | boolean> = {};
  if (params.identifier !== undefined) {
    body.identifier = validateIdentifier(params.identifier);
  }
  if (params.isPublic !== undefined) body.public = params.isPublic;
  if (params.expiryTime !== undefined) {
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|\+00:00)$/.test(
        params.expiryTime
      ) ||
      !z.iso.datetime({ offset: true }).safeParse(params.expiryTime).success ||
      Date.parse(params.expiryTime) <= Date.now()
    ) {
      throw createApiServiceError('expiryTime must be a future UTC ISO 8601 timestamp.');
    }
    body.expiry_time = params.expiryTime;
  }
  return body;
};

export class Client {
  private baseUrl: string;
  private token: string;

  constructor(config: { token: string; baseUrl?: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A Draftable API token is required.');
    this.token = config.token;
    this.baseUrl = getBaseUrl(config.baseUrl);
  }

  private getAxios() {
    return createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: { value: `Token ${this.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Draftable',
          reason: 'draftable_api_error',
          extractResponse: (cause, helpers) => helpers.getResponseWithBody(cause)
        })
    });
  }

  async createComparison(
    params: ComparisonOptions & { left: ComparisonSide; right: ComparisonSide }
  ): Promise<ComparisonResponse> {
    let side = (value: ComparisonSide) => ({
      file_type: value.fileType,
      source_url: validateHttpUrl(value.sourceUrl ?? '', 'Document source URL'),
      ...(value.displayName !== undefined ? { display_name: value.displayName } : {})
    });
    let body = {
      ...comparisonOptions(params),
      left: side(params.left),
      right: side(params.right)
    };
    let response = await this.getAxios().post('/comparisons', body);
    return mapComparison(parseResponse(comparisonResponseSchema, response.data, 'comparison'));
  }

  async createComparisonFromFiles(
    params: ComparisonOptions & { left: UploadSide; right: UploadSide }
  ): Promise<ComparisonResponse> {
    let body = new FormData();
    for (let [key, value] of Object.entries(comparisonOptions(params))) {
      body.append(key, String(value));
    }
    for (let key of ['left', 'right'] as const) {
      let side = params[key];
      let content = side.contentBase64.replace(/\s/g, '');
      if (
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content) ||
        getBase64ByteLength(content) === 0
      ) {
        throw createApiServiceError(
          `${key}.contentBase64 must contain non-empty base64 file data.`
        );
      }
      body.append(`${key}.file_type`, side.fileType);
      if (side.displayName !== undefined) body.append(`${key}.display_name`, side.displayName);
      body.append(
        `${key}.file`,
        new Blob([Buffer.from(content, 'base64')], { type: 'application/octet-stream' }),
        `${key}.${side.fileType}`
      );
    }
    let response = await this.getAxios().post('/comparisons', body, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return mapComparison(parseResponse(comparisonResponseSchema, response.data, 'comparison'));
  }

  async getComparison(identifier: string): Promise<ComparisonResponse> {
    let response = await this.getAxios().get(
      `/comparisons/${encodeURIComponent(validateIdentifier(identifier))}`
    );
    return mapComparison(parseResponse(comparisonResponseSchema, response.data, 'comparison'));
  }

  async listComparisons(params?: { limit?: number; offset?: number }) {
    if (params?.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 0)) {
      throw createApiServiceError(
        'limit must be a non-negative integer. Draftable returns at most 300 comparisons per page.'
      );
    }
    if (
      params?.offset !== undefined &&
      (!Number.isInteger(params.offset) || params.offset < 0)
    ) {
      throw createApiServiceError('offset must be a non-negative integer.');
    }
    let response = await this.getAxios().get('/comparisons', { params });
    let data = parseResponse(listResponseSchema, response.data, 'comparison list');
    return { count: data.count, results: data.results.map(mapComparison) };
  }

  async deleteComparison(identifier: string): Promise<void> {
    await this.getAxios().delete(
      `/comparisons/${encodeURIComponent(validateIdentifier(identifier))}`
    );
  }

  async getChangeDetails(comparisonIdentifier: string): Promise<Record<string, unknown>> {
    let response = await this.getAxios().get(
      `/comparisons/${encodeURIComponent(validateIdentifier(comparisonIdentifier))}/change-details`
    );
    return parseResponse(z.record(z.string(), z.unknown()), response.data, 'change details');
  }

  async createExport(params: {
    comparisonIdentifier: string;
    kind: string;
    includeCoverPage?: boolean;
  }): Promise<ExportResponse> {
    let body = {
      comparison: validateIdentifier(params.comparisonIdentifier),
      kind: params.kind,
      ...(params.includeCoverPage !== undefined
        ? { include_cover_page: params.includeCoverPage }
        : {})
    };
    let response = await this.getAxios().post('/exports', body);
    return mapExport(parseResponse(exportResponseSchema, response.data, 'export'));
  }

  async getExport(exportIdentifier: string): Promise<ExportResponse> {
    let response = await this.getAxios().get(
      `/exports/${encodeURIComponent(validateIdentifier(exportIdentifier))}`
    );
    return mapExport(parseResponse(exportResponseSchema, response.data, 'export'));
  }
}
