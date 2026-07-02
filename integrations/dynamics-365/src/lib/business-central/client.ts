import { createAuthenticatedAxios, getResponseHeaderValue } from 'slates';
import { businessCentralApiError, businessCentralValidationError } from './errors';

export type BusinessCentralClientConfig = {
  token: string;
  tenantId?: string;
  environmentName?: string;
};

export type ODataListResponse<T> = {
  value?: T[];
  '@odata.nextLink'?: string;
  [key: string]: unknown;
};

export type DownloadedFile = {
  contentBase64: string;
  mimeType: string;
  size: number;
};

let BUSINESS_CENTRAL_BASE_URL = 'https://api.businesscentral.dynamics.com/v2.0';
let DEFAULT_ENVIRONMENT = 'production';
let RETRYABLE_STATUSES = new Set([408, 429, 503, 504]);
let RETRYABLE_ERROR_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EAI_AGAIN']);

let sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let serializeParams = (params: Record<string, unknown>) => {
  let search = new URLSearchParams();

  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      let joined = value
        .filter(item => item !== undefined && item !== null && item !== '')
        .join(',');
      if (joined) search.append(key, joined);
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

let normalizeSegment = (value: string | undefined, fallback?: string) => {
  let normalized = value?.trim() || fallback;
  if (!normalized) return undefined;

  if (normalized.includes('/')) {
    throw businessCentralValidationError('Business Central URL segments cannot contain "/".');
  }

  return encodeURIComponent(normalized);
};

export let getBusinessCentralBaseUrl = (config: {
  tenantId?: string;
  environmentName?: string;
}) => {
  let environment = normalizeSegment(config.environmentName, DEFAULT_ENVIRONMENT);
  let tenant = normalizeSegment(config.tenantId);
  let environmentPath = tenant ? `${tenant}/${environment}` : environment;

  return `${BUSINESS_CENTRAL_BASE_URL}/${environmentPath}/api/v2.0`;
};

export let businessCentralEntityPath = (collection: string, id: string) =>
  `${collection}(${encodeURIComponent(id)})`;

let getResponseStatus = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }

  let response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
};

let getErrorCode = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  let code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
};

let retryAfterMs = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }

  let response = (error as { response?: { headers?: Record<string, unknown> } }).response;
  let raw =
    response?.headers?.['retry-after'] ??
    response?.headers?.['Retry-After'] ??
    response?.headers?.['x-ms-retry-after-ms'];

  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined;

  let text = String(raw).trim();
  let seconds = Number(text);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  let dateMs = Date.parse(text);
  return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : undefined;
};

let isRetryableError = (error: unknown) => {
  let status = getResponseStatus(error);
  if (status !== undefined) return RETRYABLE_STATUSES.has(status);

  let code = getErrorCode(error);
  return code ? RETRYABLE_ERROR_CODES.has(code) : false;
};

let normalizeArrayBuffer = (value: unknown) => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === 'string') return Buffer.from(value, 'binary');

  throw businessCentralValidationError(
    'Business Central file download returned an unsupported response body.'
  );
};

export class BusinessCentralClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: BusinessCentralClientConfig) {
    this.http = createAuthenticatedAxios({
      baseURL: getBusinessCentralBaseUrl(config),
      authHeader: { value: `Bearer ${config.token}` },
      headers: {
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      },
      paramsSerializer: { serialize: serializeParams }
    });
  }

  private async withRetry<T>(operation: string, run: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await run();
      } catch (error) {
        lastError = error;

        if (!isRetryableError(error) || attempt === 2) {
          throw businessCentralApiError(error, operation);
        }

        await sleep(retryAfterMs(error) ?? 500 * 2 ** attempt);
      }
    }

    throw businessCentralApiError(lastError, operation);
  }

  getData<T>(operation: string, path: string, params?: Record<string, unknown>) {
    return this.withRetry(operation, async () => {
      let response = await this.http.get(path, { params });
      return response.data as T;
    });
  }

  async getList<T>(
    operation: string,
    path: string,
    params?: Record<string, unknown>
  ): Promise<ODataListResponse<T>> {
    let data = await this.getData<ODataListResponse<T>>(operation, path, params);
    if (!data || typeof data !== 'object' || !Array.isArray(data.value)) {
      throw businessCentralValidationError(
        `Business Central ${operation} did not return an OData value list.`
      );
    }

    return data;
  }

  async downloadFile(
    operation: string,
    path: string,
    params?: {
      acceptLanguage?: string;
    }
  ): Promise<DownloadedFile> {
    let response = await this.withRetry(operation, () =>
      this.http.get(path, {
        responseType: 'arraybuffer',
        headers: {
          Accept: 'application/pdf',
          ...(params?.acceptLanguage ? { 'Accept-Language': params.acceptLanguage } : {})
        }
      })
    );
    let buffer = normalizeArrayBuffer(response.data);

    return {
      contentBase64: buffer.toString('base64'),
      mimeType: getResponseHeaderValue(response.headers, 'content-type') ?? 'application/pdf',
      size: buffer.byteLength
    };
  }
}
