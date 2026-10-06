import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus
} from 'slates';
export type Row = Record<string, unknown>;
export type BambooAuth = {
  token: string;
  companyDomain: string;
  isApiKey?: boolean;
  basicAuthorization?: string;
  refreshToken?: string;
  expiresAt?: string;
  redirectUri?: string;
};
export const invalid: (message: string) => never = message => {
  throw createApiServiceError(message, { reason: 'bamboohr_validation' });
};
export const unexpected: () => never = () => {
  throw createApiServiceError(
    'BambooHR returned incomplete or unexpected data. Write completion may be unknown; read back the exact resource before retrying.',
    { reason: 'bamboohr_response' }
  );
};
export const safeApiError = (error: unknown) => {
  const value =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined);
  const status =
    typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
      ? value
      : undefined;
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'BambooHR',
    reason: 'bamboohr_api_error',
    parent: {},
    extractMessage: () => 'Provider details omitted.',
    formatMessage: () =>
      `BambooHR request failed${status === undefined ? '' : ` (HTTP ${status})`}. Check permissions, company and exact resource identity. Write completion may be unknown; read back before retrying.`
  });
};
export const row = (value: unknown): Row =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Row)
    : unexpected();
export const records = (value: unknown): Row[] =>
  Array.isArray(value) ? value.map(row) : unexpected();
export const collection = (value: unknown): Row[] => {
  if (Array.isArray(value)) return records(value);
  return Object.entries(row(value)).map(([key, item]) => {
    const record = row(item);
    if (responseId(record.id) !== key) unexpected();
    return record;
  });
};
export const text = (value: unknown, label: string, allowEmpty = false): string => {
  if (
    typeof value !== 'string' ||
    (!allowEmpty && !value.trim()) ||
    [...value].some(character => {
      const code = character.charCodeAt(0);
      return (
        code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127
      );
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
export const isApiKeyAuth = (auth: BambooAuth): boolean => {
  if (typeof auth.isApiKey === 'boolean') return auth.isApiKey;
  // Legacy OAuth output always stored expiresAt; legacy API-key output did not.
  if (
    auth.isApiKey === undefined &&
    typeof auth.expiresAt === 'string' &&
    Number.isFinite(Date.parse(auth.expiresAt)) &&
    auth.basicAuthorization === undefined
  )
    return false;
  return invalid('Authentication mode is missing or invalid. Reconnect the BambooHR account.');
};
export const domain = (value: unknown): string => {
  const result = text(value, 'Company subdomain');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(result))
    invalid(
      'Company subdomain must contain only letters, numbers and internal hyphens; enter the subdomain, without a URL or path.'
    );
  return result.toLowerCase();
};
export const id = (value: unknown, label = 'Resource ID', allowSelf = false): string => {
  const result = text(value, label);
  if (!(allowSelf ? /^(?:0|[1-9]\d*)$/ : /^[1-9]\d*$/).test(result))
    invalid(
      `${label} must be a positive internal numeric ID${allowSelf ? ', or 0 for the caller' : ''}.`
    );
  return result;
};
export const responseId = (value: unknown): string => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
    return String(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) return value;
  return unexpected();
};
export const numericId = (value: unknown, label = 'Resource ID'): number => {
  const result = Number(id(value, label));
  if (!Number.isSafeInteger(result))
    invalid(`${label} exceeds the provider's supported integer range.`);
  return result;
};
export const integer = (value: unknown, label: string, min: number, max: number): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    invalid(`${label} must be an integer from ${min} to ${max}.`);
  return value as number;
};
export const amount = (
  value: unknown,
  label: string,
  max = Number.MAX_SAFE_INTEGER
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max)
    invalid(`${label} must be a finite nonnegative number no greater than ${max}.`);
  return value as number;
};
// Expand the shortest round-trippable numeric representation into provider decimal notation.
export const decimalAmount = (value: number, label: string): string => {
  const canonical = String(amount(value, label));
  if (!canonical.includes('e')) return canonical;
  const [coefficient, exponentText] = canonical.split('e');
  const [whole, fraction = ''] = (coefficient ?? '').split('.');
  const digits = (whole ?? '') + fraction;
  const point = (whole ?? '').length + Number(exponentText);
  return point <= 0
    ? `0.${'0'.repeat(-point)}${digits}`
    : point >= digits.length
      ? digits + '0'.repeat(point - digits.length)
      : `${digits.slice(0, point)}.${digits.slice(point)}`;
};
export const date = (value: unknown, label: string): string => {
  const result = text(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result
  )
    invalid(`${label} must be a valid YYYY-MM-DD date.`);
  return result;
};
export const dateRange = (start: string, end: string) => {
  date(start, 'Start date');
  date(end, 'End date');
  if (start > end) invalid('End date must be on or after start date.');
};
export const fieldNames = (value: string[]): string[] => {
  if (value.length > 400) invalid('At most 400 employee fields may be requested.');
  for (const field of value)
    if (!/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/.test(field))
      invalid('Field names must be exact IDs from get_account_fields.');
  return value;
};
export const tableName = (value: string): string => {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value))
    invalid('Table name must be an exact alias from get_account_metadata.');
  return value;
};
export const inputData = (value: Row): Row => {
  const walk = (item: unknown, depth: number): void => {
    if (depth > 20) invalid('Field data is nested too deeply.');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    if (Array.isArray(item)) {
      for (const child of item) walk(child, depth + 1);
      return;
    }
    if (item && typeof item === 'object') {
      for (const [key, child] of Object.entries(item)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key))
          invalid('Field data contains an unsupported key.');
        walk(child, depth + 1);
      }
      return;
    }
    invalid('Field data must contain only JSON values.');
  };
  if (!Object.keys(value).length) invalid('Supply at least one field to write.');
  walk(value, 0);
  return value;
};
export const privateData = (value: unknown, auth: BambooAuth): unknown => {
  const redactor = new AuthConfigSecretRedactor({
    token: auth.token,
    refreshToken: auth.refreshToken,
    basicAuthorization: auth.basicAuthorization,
    encodedApiKey: auth.isApiKey
      ? Buffer.from(`${auth.token}:x`).toString('base64')
      : undefined
  });
  const walk = (item: unknown, depth: number): unknown => {
    if (depth > 30) unexpected();
    if (typeof item === 'string') {
      if (redactor.redactEmbedded(item) !== item || item.includes('$$MT$secret$authConfig$'))
        unexpected();
      return item;
    }
    if (
      item === null ||
      typeof item === 'boolean' ||
      (typeof item === 'number' && Number.isFinite(item))
    )
      return item;
    if (Array.isArray(item)) return item.map(child => walk(child, depth + 1));
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item).map(([key, child]) => {
          if (
            redactor.redactEmbedded(key) !== key ||
            key.includes('$$MT$secret$authConfig$') ||
            ['__proto__', 'constructor', 'prototype'].includes(key) ||
            /^(?:access_token|refresh_token|authorization|api[_-]?key|client_secret|password)$/i.test(
              key
            )
          )
            unexpected();
          return [key, walk(child, depth + 1)];
        })
      );
    return unexpected();
  };
  return walk(value, 0);
};
