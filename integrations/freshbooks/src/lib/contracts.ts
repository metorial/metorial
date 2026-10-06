import { ServiceError } from '@lowerdeck/error';
import {
  type AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus
} from 'slates';
import { z } from 'zod';

export type Row = Record<string, unknown>;
export type FreshBooksAuth = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  redirectUri?: string;
};
export const ORIGIN = 'https://api.freshbooks.com';
export const scopeInput = {
  accountId: z
    .string()
    .optional()
    .describe(
      'Accounting account ID from get_identity. Existing stored account configuration remains a fallback.'
    ),
  businessId: z
    .union([z.number(), z.string()])
    .optional()
    .describe(
      'Business ID from get_identity. When accountId is selected, its exact authorized business is resolved automatically.'
    )
};
export const invalid: (message: string) => never = message => {
  throw createApiServiceError(message, { reason: 'freshbooks_validation' });
};
export const unexpected: () => never = () => {
  throw createApiServiceError(
    'FreshBooks returned unexpected response data. Write completion may be unknown; read back the exact resource before retrying.',
    { reason: 'freshbooks_response' }
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
    providerLabel: 'FreshBooks',
    reason: 'freshbooks_api_error',
    parent: {},
    extractMessage: () => 'Provider details omitted.',
    formatMessage: () =>
      `FreshBooks request failed${status === undefined ? '' : ` (HTTP ${status})`}. Check authorization and the selected account/business. Write completion may be unknown; read back before retrying.`
  });
};
export const row = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : unexpected();
export const text = (value: unknown, label: string, allowEmpty = false): string => {
  if (
    typeof value !== 'string' ||
    (!allowEmpty && value.trim().length === 0) ||
    [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    invalid(
      `${label} must be ${allowEmpty ? 'a' : 'a nonempty'} string without control characters.`
    );
  return value as string;
};
export const accountId = (value: unknown): string => {
  const result = text(value, 'accountId');
  if (!/^[A-Za-z0-9_-]+$/.test(result))
    invalid(
      'accountId contains unsupported characters. Select an exact ID from get_identity.'
    );
  return result;
};
export const integer = (value: unknown, label: string, min = 0): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min)
    invalid(`${label} must be a safe integer of at least ${min}.`);
  return value as number;
};
export const resourceId = (value: unknown, label = 'Resource ID'): number => {
  if (typeof value === 'string' && /^\d+$/.test(value)) value = Number(value);
  return integer(value, label, 1);
};
export const decimal = (value: unknown, label: string, percentage = false): string => {
  const result = text(value, label);
  const [whole = '', fraction = ''] = result.split('.');
  const significantWhole = whole.replace(/^0+/, '') || '0';
  const exceedsPercentage =
    significantWhole.length > 3 ||
    (significantWhole.length === 3 && significantWhole > '100') ||
    (significantWhole === '100' && /[1-9]/.test(fraction));
  if (
    !/^\d+(?:\.\d+)?$/.test(result) ||
    !Number.isFinite(Number(result)) ||
    (percentage && exceedsPercentage)
  )
    invalid(
      `${label} must be a finite nonnegative decimal string${percentage ? ' from 0 to 100' : ''}.`
    );
  return result;
};
// Compare decimal values without rounding when a legacy output requires a number.
export const canonicalDecimal = (value: string): string => {
  const negative = value.startsWith('-');
  const unsigned = value.replace(/^[+-]/, '');
  const [mantissa = '', power = '0'] = unsigned.toLowerCase().split('e');
  const [whole = '', fraction = ''] = mantissa.split('.');
  const digits = whole + fraction;
  const point = whole.length + Number(power);
  const expanded =
    point <= 0
      ? `0.${'0'.repeat(-point)}${digits}`
      : point >= digits.length
        ? digits + '0'.repeat(point - digits.length)
        : `${digits.slice(0, point)}.${digits.slice(point)}`;
  const [integerPart = '', fractionalPart = ''] = expanded.split('.');
  const integerText = integerPart.replace(/^0+/, '') || '0';
  const fractionText = fractionalPart.replace(/0+$/, '');
  const result = integerText + (fractionText ? `.${fractionText}` : '');
  return negative && result !== '0' ? `-${result}` : result;
};
export const currency = (value: unknown): string => {
  const result = text(value, 'currencyCode');
  if (!/^[A-Z]{3}$/.test(result))
    invalid('currencyCode must be a three-letter uppercase currency code.');
  return result;
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
export const startedAt = (value: unknown): string => {
  const result = text(value, 'startedAt');
  if (/^\d{10}$/.test(result) || /^\d{13}$/.test(result))
    return new Date(Number(result) * (result.length === 10 ? 1000 : 1)).toISOString();
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    invalid(
      'startedAt must be an ISO timestamp with time zone, or exactly 10-digit Unix seconds / 13-digit Unix milliseconds.'
    );
  date(result.slice(0, 10), 'startedAt date');
  return new Date(result).toISOString();
};
const secretKeys =
  /(?:^|[_-])(?:authorization|token|secret|password|credentials|api[_-]?key)(?:$|[_-])/i;
export const sanitize = (value: unknown, redactor: AuthConfigSecretRedactor): unknown => {
  if (typeof value === 'string' && redactor.redactEmbedded(value) !== value) unexpected();
  if (Array.isArray(value)) return value.map(item => sanitize(item, redactor));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => {
          if (redactor.redactEmbedded(key) !== key) unexpected();
          return !secretKeys.test(key);
        })
        .map(([key, item]) => [key, sanitize(item, redactor)])
    );
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
  )
    unexpected();
  return value;
};
export const parseOutput = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  const result = schema.safeParse(value);
  return result.success ? result.data : unexpected();
};
