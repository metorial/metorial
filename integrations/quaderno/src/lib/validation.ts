import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';
import { z } from 'zod';
export type Row = Record<string, unknown>;
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'quaderno_input' });
export const responseError = () =>
  createApiServiceError('Quaderno returned an incomplete or invalid response.', {
    reason: 'quaderno_response'
  });
export const idInput = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const textInput = z.string().trim().min(1).max(10000);
export const countryInput = z
  .string()
  .regex(/^[A-Z]{2}$/)
  .describe('Two-letter ISO country code, uppercase.');
export const currencyInput = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .describe('Three-letter currency code, uppercase.');
export const decimalInput = z
  .string()
  .regex(/^-?\d+(?:\.\d+)?$/)
  .max(30)
  .describe('Decimal amount in currency major units; for example 9.99.');
export const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('Calendar date, YYYY-MM-DD.');
export const safeInteger = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
export const pageInput = {
  page: safeInteger
    .positive()
    .optional()
    .describe(
      'Compatibility input: only page 1 is supported. Continue with createdBefore or nextPage.'
    ),
  createdBefore: idInput
    .optional()
    .describe(
      'Cursor ID from the last record on the previous page; preserve the same filters.'
    ),
  limit: safeInteger
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum records in this page, 1 to 100; default 25.'),
  nextPage: z
    .string()
    .url()
    .optional()
    .describe(
      'Next-page URL returned by the same list tool and account. Do not combine with other inputs.'
    )
};
export const pageOutput = {
  hasMore: z.boolean().optional(),
  nextPage: z.string().optional(),
  nextCursor: z.string().optional()
};
export function required(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || /[\r\n\0]/.test(value))
    throw invalid(`${label} is required.`);
  return value.trim();
}
export function routeId(value: string) {
  if (!idInput.safeParse(value).success)
    throw invalid('Use a resource ID returned by Quaderno.');
  return encodeURIComponent(value.trim());
}
export function date(value: string) {
  if (
    !dateInput.safeParse(value).success ||
    !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  )
    throw invalid('Use a real calendar date in YYYY-MM-DD format.');
  return value;
}
export function decimal(value: string): number {
  if (!decimalInput.safeParse(value).success)
    throw invalid('Use a decimal amount in currency major units.');
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER)
    throw invalid('The amount is outside the supported decimal range.');
  // Reject values that would change when serialized as JSON numbers. Do not round money locally.
  const canonical = value
    .replace(/^(-?)0+(?=\d)/, '$1')
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
  if (String(number) !== (number === 0 ? canonical.replace(/^-/, '') : canonical))
    throw invalid(
      'The amount cannot be represented without changing its decimal value. Use a smaller amount or fewer fractional digits.'
    );
  return number;
}
export function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw responseError();
  return value as Row;
}
export function records(value: unknown): Row[] {
  if (!Array.isArray(value)) throw responseError();
  return value.map(object);
}
export function resource(value: unknown): Row {
  const record = object(value);
  if (
    !(
      (typeof record.id === 'string' && idInput.safeParse(record.id).success) ||
      (typeof record.id === 'number' && Number.isSafeInteger(record.id) && record.id >= 0)
    )
  )
    throw responseError();
  return record;
}
export function resourceId(value: unknown): string {
  return String(resource({ id: value }).id);
}
export function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw responseError();
  return value;
}
export function amountValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) return value;
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Math.abs(value) <= Number.MAX_SAFE_INTEGER
  )
    return String(value);
  throw responseError();
}
export function integerValue(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (!safeInteger.safeParse(value).success) throw responseError();
  return value as number;
}
export function nonempty(data: Row) {
  if (!Object.values(data).some(v => v !== undefined))
    throw invalid('Provide at least one field to update.');
}
export function reject(input: Row, fields: readonly string[], message: string) {
  if (fields.some(field => input[field] !== undefined)) throw invalid(message);
}
export function safeResponse(value: unknown, secrets: readonly string[]): unknown {
  const redact = (s: string) =>
    secrets.filter(Boolean).reduce((out, secret) => out.split(secret).join('[redacted]'), s);
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map(v => safeResponse(v, secrets));
  if (value && typeof value === 'object') {
    const result: Row = {};
    for (const [key, item] of Object.entries(value)) {
      if (
        /token|authorization|client_secret|password|credential|publishable_key/i.test(key) ||
        ['__proto__', 'constructor', 'prototype'].includes(key)
      )
        continue;
      result[redact(key)] = safeResponse(item, secrets);
    }
    return result;
  }
  return value;
}
export function apiFailure(error: unknown, mutation = false): never {
  const raw = getApiErrorStatus(error);
  const status =
    typeof raw === 'number' && Number.isInteger(raw) && raw >= 100 && raw <= 599
      ? raw
      : undefined;
  const message =
    status === 401
      ? 'Quaderno authentication or permission check failed. Reconnect and check the connection scope.'
      : status === 403
        ? 'Quaderno denied this action. Check account access and OAuth write permissions.'
        : status === 404
          ? 'Quaderno could not find this resource or route in the selected account.'
          : status === 405 || status === 410
            ? 'Quaderno does not support this operation for the selected resource or API version. Check the current API and compatibility limitations.'
            : status === 429
              ? 'Quaderno rate limit reached. Wait before trying again.'
              : mutation && (status === undefined || status >= 500)
                ? 'Quaderno did not confirm the change. Read the resource and check account history before retrying; automatic retries may create duplicate records.'
                : 'Quaderno rejected the request. Check resource IDs, supported fields, dates and account settings.';
  throw buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Quaderno',
    extractMessage: () => message,
    reason: 'quaderno_api',
    parent: {}
  });
}

export function numericId(value: string): number {
  const result = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(result) || result < 0)
    throw invalid('The current API requires a numeric resource ID returned by Quaderno.');
  return result;
}
export function isoUnix(value: number): string {
  if (!Number.isSafeInteger(value) || Math.abs(value) > 8640000000000) throw responseError();
  return new Date(value * 1000).toISOString();
}
