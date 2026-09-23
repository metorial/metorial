import { getKsefBaseUrl, type KsefEnvironment } from './environments';
import { ksefApiError, ksefTransportError, ksefValidationError } from './errors';

export type KsefContextType = 'Nip' | 'InternalId' | 'NipVatUe' | 'PeppolId';

export type KsefAuthOutput = {
  token: string;
  expiresAt: string;
  accessTokenValidUntil: string;
  refreshToken: string;
  refreshTokenValidUntil: string;
  authenticationReference: string;
  environment: KsefEnvironment;
  contextType: KsefContextType;
  contextIdentifier: string;
};

export type KsefSessionLimits = {
  maxInvoiceSizeInMB: number;
  maxInvoiceWithAttachmentSizeInMB: number;
  maxInvoices: number;
};

export type KsefContextLimits = {
  onlineSession: KsefSessionLimits;
  batchSession: KsefSessionLimits;
  collectiveIdentifier: { maxInvoices: number };
};

type QueryValue = string | number | boolean;
export type KsefRequestOptions = {
  query?: Record<string, QueryValue | readonly QueryValue[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | undefined>;
  safeRead?: boolean;
  token?: string;
};

type KsefMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const sleep = (durationMs: number) =>
  new Promise<void>(resolve => setTimeout(resolve, durationMs));

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_READ_ATTEMPTS = 3;
const MAX_RETRY_WAIT_MS = 5_000;
const REQUEST_TIMEOUT_MS = 30_000;

function retryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

function buildUrl(baseUrl: string, path: string, query?: KsefRequestOptions['query']): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) {
    throw ksefValidationError('The KSeF request path is invalid.');
  }
  const url = new URL(`${baseUrl}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function isContextLimits(value: unknown): value is KsefContextLimits {
  if (!value || typeof value !== 'object') return false;
  const limits = value as Record<string, unknown>;
  const session = (part: unknown): part is KsefSessionLimits => {
    if (!part || typeof part !== 'object') return false;
    const fields = part as Record<string, unknown>;
    return ['maxInvoiceSizeInMB', 'maxInvoiceWithAttachmentSizeInMB', 'maxInvoices'].every(
      key => typeof fields[key] === 'number' && Number.isFinite(fields[key])
    );
  };
  return (
    session(limits.onlineSession) &&
    session(limits.batchSession) &&
    !!limits.collectiveIdentifier &&
    typeof limits.collectiveIdentifier === 'object' &&
    typeof (limits.collectiveIdentifier as Record<string, unknown>).maxInvoices === 'number'
  );
}

export class KsefClient {
  readonly baseUrl: string;

  constructor(private readonly auth: Pick<KsefAuthOutput, 'token' | 'environment'>) {
    this.baseUrl = getKsefBaseUrl(auth.environment);
  }

  downloadUrl(path: string): string {
    return buildUrl(this.baseUrl, path);
  }

  attachmentHeaders(): { Authorization: string } {
    return { Authorization: `Bearer ${this.auth.token}` };
  }

  async request<T = unknown>(
    operation: string,
    method: KsefMethod,
    path: string,
    options: KsefRequestOptions = {}
  ): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.query);
    const canRetry = method === 'GET' || options.safeRead === true;
    const attempts = canRetry ? MAX_READ_ATTEMPTS : 1;
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);

    for (let attempt = 1; attempt <= attempts; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method,
          redirect: 'error',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: {
            Accept: 'application/json',
            'X-Error-Format': 'problem-details',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(options.token === undefined && !this.auth.token
              ? {}
              : { Authorization: `Bearer ${options.token ?? this.auth.token}` }),
            ...Object.fromEntries(
              Object.entries(options.headers ?? {}).filter(
                (entry): entry is [string, string] => entry[1] !== undefined
              )
            )
          },
          body
        });
      } catch {
        if (canRetry && attempt < attempts) {
          await sleep(200 * attempt);
          continue;
        }
        throw ksefTransportError(operation);
      }

      let raw: string;
      try {
        raw = await response.text();
      } catch {
        throw ksefTransportError(operation);
      }
      let data: unknown;
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
      }

      if (response.ok) return data as T;

      if (canRetry && attempt < attempts && RETRY_STATUSES.has(response.status)) {
        const wait = retryAfterMs(response.headers.get('retry-after')) ?? 200 * attempt;
        if (wait <= MAX_RETRY_WAIT_MS) {
          await sleep(wait);
          continue;
        }
      }

      throw ksefApiError(
        {
          response: {
            status: response.status,
            statusText: response.statusText,
            data,
            headers: response.headers
          }
        },
        operation
      );
    }
    throw ksefTransportError(operation);
  }

  async getContextLimits(): Promise<KsefContextLimits> {
    const limits = await this.request<unknown>('get context limits', 'GET', '/limits/context');
    if (!isContextLimits(limits)) {
      throw ksefValidationError('KSeF returned an invalid context limits response.');
    }
    return limits;
  }
}
