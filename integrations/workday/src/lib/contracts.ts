import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

export type Row = Record<string, unknown>;
export type WorkdayAuth = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  baseUrl?: string;
  tenant?: string;
  authorizationUrl?: string;
};
export const reject: (message: string) => never = message => {
  throw createApiServiceError(message, { reason: 'workday_validation' });
};
export const incomplete: () => never = () => {
  throw createApiServiceError(
    'Workday returned unexpected or incomplete data. An attempted write may have completed; inspect the exact resource before retrying.',
    { reason: 'workday_response' }
  );
};
export const upstreamError = (error: unknown, operation = 'request') => {
  const value =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined);
  const status =
    typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
      ? value
      : undefined;
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Workday',
    operation,
    parent: {},
    reason: 'workday_api',
    extractMessage: () => '',
    formatMessage: () =>
      `Workday ${operation} failed${status === undefined ? '' : ` (HTTP ${status})`}. Verify the tenant, permissions and resource identity. A write may have completed; read the exact resource before retrying.`
  });
};
export const record = (value: unknown): Row =>
  isApiErrorRecord(value) ? value : incomplete();
export const string = (value: unknown, label: string): string => {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    reject(`${label} must be nonempty and contain no control characters.`);
  return value as string;
};
export const identifier = (value: unknown, label = 'Resource ID') => {
  const result = string(value, label);
  if (result.trim() !== result || result === '.' || result === '..' || /[/\\?#]/.test(result))
    reject(`${label} must be an exact identifier, without a URL or path.`);
  return result;
};
export const segment = (value: unknown, label?: string) =>
  encodeURIComponent(identifier(value, label));
export const origin = (value: unknown) => {
  const input = string(value, 'Workday service base URL');
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return reject('Use the HTTPS Workday service origin from View API Clients.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '') ||
    !/\.(?:myworkday|workday)\.com$/i.test(url.hostname)
  )
    reject(
      'Use an HTTPS workday.com or myworkday.com service origin without credentials, a port, path or query.'
    );
  return url.origin;
};
export const authEndpoint = (value: unknown, tenant: string) => {
  const input = string(value, 'Authorization endpoint');
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return reject('Copy the Workday OAuth authorization endpoint from View API Clients.');
  }
  origin(url.origin);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== `/${encodeURIComponent(tenant)}/authorize`
  )
    reject(
      'Use the provider-issued tenant authorization endpoint, ending in /tenant/authorize without a query.'
    );
  return url.toString();
};
export const positiveQuantity = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    reject('Quantity must be finite and greater than zero, in the discovered time-off units.');
  return value as number;
};
export const int = (
  value: unknown,
  label: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER
): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    reject(`${label} must be an integer from ${min} to ${max}.`);
  return value as number;
};
export const paging = (input: { limit?: number; offset?: number }) => ({
  limit: int(input.limit ?? 20, 'Limit', 1, 100),
  offset: int(input.offset ?? 0, 'Offset', 0)
});
export const date = (value: unknown) => {
  const text = string(value, 'Date');
  if (
    !z.iso.date().safeParse(text).success ||
    new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) !== text
  )
    reject('Dates must be valid YYYY-MM-DD calendar dates.');
  return text;
};
export const dates = (input: { fromDate?: string; toDate?: string }) => {
  const result = pickDefined({
    fromDate: input.fromDate === undefined ? undefined : date(input.fromDate),
    toDate: input.toDate === undefined ? undefined : date(input.toDate)
  });
  if (result.fromDate && result.toDate && result.fromDate > result.toDate)
    reject('fromDate must be on or before toDate.');
  return result;
};
export const page = (value: unknown) => {
  const body = record(value);
  if (
    !Array.isArray(body.data) ||
    typeof body.total !== 'number' ||
    !Number.isSafeInteger(body.total) ||
    body.total < body.data.length
  )
    incomplete();
  return { data: (body.data as unknown[]).map(record), total: body.total as number };
};
export const resource = (value: unknown, expected?: string): Row & { id: string } => {
  const body = record(value);
  const id = string(body.id, 'Returned resource ID');
  if (expected && expected !== 'me' && !expected.includes('=') && id !== expected)
    incomplete();
  return { ...body, id };
};
export const display = (value: unknown): string | undefined =>
  typeof value === 'string'
    ? value
    : value === undefined
      ? undefined
      : typeof record(value).descriptor === 'string'
        ? (record(value).descriptor as string)
        : undefined;
export const reference = (value: unknown) =>
  value === undefined
    ? undefined
    : pickDefined({
        id: typeof record(value).id === 'string' ? (record(value).id as string) : undefined,
        descriptor: display(value),
        href:
          typeof record(value).href === 'string' ? (record(value).href as string) : undefined
      });
export const workerIdSchema = z
  .string()
  .describe(
    'Worker ID from list_workers, or me for the connected worker. Service accounts may not have a worker identity.'
  );
export const limitSchema = z
  .number()
  .optional()
  .describe('Page size, integer 1–100 (default 20).');
export const offsetSchema = z
  .number()
  .optional()
  .describe('Zero-based page offset, integer 0 or greater (default 0).');
export const protect = (value: unknown, auth: WorkdayAuth, otherSecrets: string[] = []) => {
  const secretValues = [auth.token, auth.refreshToken, ...otherSecrets].filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );
  const redactor = new AuthConfigSecretRedactor(
    Object.fromEntries(secretValues.map((v, i) => [String(i), v]))
  );
  const check = (text: string) => {
    let decoded = text;
    for (let n = 0; n < 3; n++) {
      const next = decoded.replace(/(?:%[0-9a-f]{2})+/gi, bytes =>
        Buffer.from(
          bytes
            .split('%')
            .slice(1)
            .map(byte => Number.parseInt(byte, 16))
        ).toString('utf8')
      );
      if (next === decoded) break;
      decoded = next;
    }
    if (
      redactor.redactEmbedded(decoded) !== decoded ||
      secretValues.some(
        secret =>
          decoded.includes(Buffer.from(secret).toString('base64')) ||
          decoded.includes(Buffer.from(secret).toString('base64url'))
      )
    )
      incomplete();
  };
  const walk = (item: unknown, depth = 0): void => {
    if (depth > 50) incomplete();
    if (typeof item === 'string') check(item);
    else if (typeof item === 'number' && !Number.isFinite(item)) incomplete();
    else if (Array.isArray(item)) for (const child of item) walk(child, depth + 1);
    else if (item !== null && typeof item === 'object')
      for (const [key, child] of Object.entries(item)) {
        check(key);
        walk(child, depth + 1);
      }
  };
  walk(value);
};
