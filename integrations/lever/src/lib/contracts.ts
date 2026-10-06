import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { z } from 'zod';

export type Row = Record<string, unknown>;
export type Resource = Row & { id: string };
export type LeverAuth = {
  token: string;
  environment?: 'production' | 'sandbox';
  isApiKey?: boolean;
  basicAuthorization?: string;
  refreshToken?: string;
  expiresAt?: string;
};
export const invalid: (message: string) => never = message => {
  throw createApiServiceError(message, { reason: 'lever_validation' });
};
export const unexpected: () => never = () => {
  throw createApiServiceError(
    'Lever returned incomplete or unexpected data. Write completion may be unknown; read the exact resource before retrying.',
    { reason: 'lever_response' }
  );
};
export const safeApiError = (error: unknown, operation = 'request') => {
  const value =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined);
  const status =
    typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
      ? value
      : undefined;
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Lever',
    operation,
    reason: 'lever_api_error',
    parent: {},
    extractMessage: () => '',
    formatMessage: () =>
      `Lever ${operation} failed${status === undefined ? '' : ` (HTTP ${status})`}. Check the connection, permissions, environment and resource identity. Write completion may be unknown; read back before retrying.`
  });
};
export const row = (value: unknown): Row =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Row)
    : unexpected();
export const text = (value: unknown, label: string, allowEmpty = false): string => {
  if (
    typeof value !== 'string' ||
    (!allowEmpty && !value.trim()) ||
    [...value].some(c => {
      const n = c.charCodeAt(0);
      return n === 0 || n === 127 || (n < 32 && n !== 9 && n !== 10 && n !== 13);
    })
  )
    invalid(
      `${label} must be ${allowEmpty ? 'a' : 'a nonempty'} string without unsupported control characters.`
    );
  return value as string;
};
export const credential = (value: unknown, label: string): string => {
  const result = text(value, label);
  if (/\s/.test(result)) invalid(`${label} must not contain whitespace.`);
  return result;
};
export const id = (value: unknown, label = 'Resource ID'): string => {
  const result = text(value, label);
  if (result === '.' || result === '..' || /[\s/?#\\]/.test(result))
    invalid(`${label} must be an exact resource identifier, without a URL or path.`);
  return result;
};
export const pathId = (value: unknown, label?: string) => encodeURIComponent(id(value, label));
export const integer = (
  value: unknown,
  label: string,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    invalid(`${label} must be an integer from ${min} to ${max}.`);
  return value as number;
};
export const timestamp = (value: unknown, label: string): number => {
  const result = text(value, label);
  if (
    !z.iso.datetime({ offset: true }).safeParse(result).success ||
    !Number.isFinite(Date.parse(result))
  )
    invalid(`${label} must be a valid ISO 8601 timestamp with a timezone.`);
  return Date.parse(result);
};
export const stringList = (value: unknown, label: string, identifiers = false): string[] => {
  if (!Array.isArray(value)) invalid(`${label} must be an array.`);
  return (value as unknown[]).map(item => (identifiers ? id(item, label) : text(item, label)));
};
export const resource = (envelope: unknown, expectedId?: string): Resource => {
  let value = row(envelope).data;
  // The interview write example documents a nested single-element collection.
  if (
    value &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    Array.isArray(row(value).data)
  )
    value = row(value).data;
  if (Array.isArray(value)) {
    if (value.length !== 1) unexpected();
    value = value[0];
  }
  const data = row(value);
  const received = id(data.id, 'Returned resource ID');
  if (expectedId !== undefined && received !== expectedId) unexpected();
  return { ...data, id: received };
};
export const page = (envelope: unknown) => {
  const result = row(envelope);
  if (!Array.isArray(result.data)) unexpected();
  const data = result.data.map(row);
  if (result.hasNext !== undefined && typeof result.hasNext !== 'boolean') unexpected();
  if (result.hasNext === undefined && result.next !== undefined && result.next !== null)
    unexpected();
  const hasNext = result.hasNext === true;
  const next =
    result.next === undefined || result.next === null
      ? undefined
      : text(result.next, 'Returned pagination cursor');
  if (hasNext && !next) unexpected();
  return { data, hasNext, ...(next === undefined ? {} : { next }) };
};
export const pagination = (input: { limit?: number; offset?: string }): Row =>
  pickDefined({
    limit: input.limit === undefined ? undefined : integer(input.limit, 'Page limit', 1, 100),
    offset: input.offset === undefined ? undefined : text(input.offset, 'Pagination cursor')
  });
export const writable = (value: Row, keys: readonly string[]): Row =>
  pickDefined(Object.fromEntries(keys.map(key => [key, value[key]])));
export const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item
  );
export const ensureNoSecrets = (value: unknown, auth: LeverAuth): void => {
  const secrets = pickDefined({
    token: auth.token,
    refreshToken: auth.refreshToken,
    basicAuthorization: auth.basicAuthorization,
    basicPayload:
      auth.isApiKey === true ? Buffer.from(`${auth.token}:`).toString('base64') : undefined
  });
  const redactor = new AuthConfigSecretRedactor(secrets);
  const strings = (item: unknown): void => {
    if (typeof item === 'string') {
      let decoded = item;
      for (let count = 0; count < 3; count++) {
        if (redactor.redactEmbedded(decoded) !== decoded) unexpected();
        try {
          const next = decodeURIComponent(decoded);
          if (next === decoded) break;
          decoded = next;
        } catch {
          break;
        }
      }
    } else if (Array.isArray(item)) item.forEach(strings);
    else if (item && typeof item === 'object')
      for (const [key, nested] of Object.entries(item)) {
        strings(key);
        strings(nested);
      }
  };
  strings(value);
};
export const baseUrl = (auth: LeverAuth): string => {
  if (
    auth.environment !== undefined &&
    auth.environment !== 'production' &&
    auth.environment !== 'sandbox'
  )
    invalid('Stored Lever environment is invalid. Reconnect the account.');
  return auth.environment === 'sandbox'
    ? 'https://api.sandbox.lever.co/v1'
    : 'https://api.lever.co/v1';
};
export const authorization = (auth: LeverAuth): string => {
  const token = credential(auth.token, 'Stored credential');
  if (auth.isApiKey === true) {
    const expected = `Basic ${Buffer.from(`${token}:`).toString('base64')}`;
    if (auth.basicAuthorization !== expected)
      invalid('Stored API-key authorization is incomplete. Reconnect the Lever account.');
    return expected;
  }
  if (auth.isApiKey !== undefined && auth.isApiKey !== false)
    invalid('Stored authentication mode is invalid. Reconnect the Lever account.');
  // Unmarked historical OAuth output used Bearer. Historical API-key connections must reconnect.
  return `Bearer ${token}`;
};
export const band = (value: unknown): Row => {
  const data = row(value);
  for (const key of ['min', 'max'])
    if (
      data[key] !== undefined &&
      (typeof data[key] !== 'number' ||
        !Number.isFinite(data[key]) ||
        (data[key] as number) < 0)
    )
      invalid('Compensation bounds must be finite nonnegative numbers.');
  if (typeof data.min === 'number' && typeof data.max === 'number' && data.min > data.max)
    invalid('Compensation maximum must be at least its minimum.');
  for (const key of ['currency', 'interval'])
    if (data[key] !== undefined) text(data[key], `Compensation ${key}`);
  return data;
};
