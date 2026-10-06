import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';
import { z } from 'zod';
import { monetaryFields, validateMonetaryNumber } from './money';
export type RecordData = Record<string, unknown>;
export let recordSchema = z.record(z.string(), z.unknown());
export let idSchema = z
  .string()
  .describe('Remote resource ID, discovered by the corresponding list or identity tool.');
export let pageSchema = z
  .number()
  .optional()
  .describe('Positive integer page number; defaults to 1.');
export let pageSizeSchema = z
  .number()
  .optional()
  .describe('Positive integer page size, at most 100.');
export let paginationOutput = {
  totalCount: z.number().optional(),
  currentPage: z.number().optional(),
  totalPages: z.number().optional(),
  hasMore: z.boolean().optional()
};
export function fail(message: string): never {
  throw createApiServiceError(message, { reason: 'remote_validation' });
}
export function isRecord(value: unknown): value is RecordData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function record(value: unknown, label: string): RecordData {
  if (!isRecord(value)) fail(`Remote did not return a valid ${label} object.`);
  return value;
}
export function required(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} is required.`);
  return value;
}
export function id(value: unknown, label = 'Resource ID'): string {
  let result = required(value, label);
  if (
    result !== result.trim() ||
    /[\s/\\?#%]/.test(result) ||
    [...result].some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    fail(`${label} must be a single Remote resource ID.`);
  return result;
}
export function integer(
  value: unknown,
  label: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  )
    fail(
      `${label} must be a safe integer between ${minimum} and ${maximum}. Monetary values use integer hundredths of a currency unit; do not send decimal amounts.`
    );
  return value;
}
export function date(value: unknown, label: string): string {
  let result = required(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result
  )
    fail(`${label} must be a real date in YYYY-MM-DD format.`);
  return result;
}
export function timestamp(value: unknown, label: string): string {
  let result = required(value, label);
  if (
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    fail(`${label} must be an ISO timestamp with a timezone.`);
  return result;
}
export function country(value: unknown): string {
  let result = required(value, 'Country code');
  if (!/^[A-Z]{3}$/.test(result))
    fail('Country code must be the three-letter code returned by list_countries.');
  return result;
}
export function currency(value: unknown): string {
  let result = required(value, 'Currency');
  if (!/^[A-Z]{3}$/.test(result)) fail('Currency must be a three-letter uppercase code.');
  return result;
}
export function rejectFields(input: RecordData, names: string[], message: string) {
  if (names.some(name => input[name] !== undefined)) fail(message);
}
export function nonempty(value: RecordData, label: string): RecordData {
  if (!Object.keys(value).length) fail(`${label} must contain at least one supported field.`);
  return value;
}
export function jsonObject(value: unknown, label: string): RecordData {
  let result = record(value, label);
  function check(item: unknown): void {
    if (
      item === null ||
      typeof item === 'string' ||
      typeof item === 'boolean' ||
      (typeof item === 'number' && Number.isFinite(item))
    )
      return;
    if (Array.isArray(item)) {
      item.forEach(check);
      return;
    }
    if (isRecord(item)) {
      for (let [key, child] of Object.entries(item)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key))
          fail(`${label} contains an unsupported property.`);
        check(child);
      }
      return;
    }
    fail(`${label} must contain only JSON values.`);
  }
  check(result);
  return result;
}
export function redact(value: string, secrets: string[]): string {
  let result = value;
  for (let secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length))
    result = result.split(secret).join('[redacted]');
  return result.replace(/\b(?:Bearer|Basic)\s+[^\s,;]+/gi, '[redacted authorization]');
}
export function publicData(value: unknown, secrets: string[]): unknown {
  if (typeof value === 'string') return redact(value, secrets);
  if (
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return value;
  if (Array.isArray(value)) return value.map(item => publicData(item, secrets));
  if (isRecord(value)) {
    let result: RecordData = {};
    for (let [key, child] of Object.entries(value)) {
      if (
        /^(?:authorization|access_token|refresh_token|token|api_token|client_secret|password|__proto__|constructor|prototype)$/i.test(
          key
        ) ||
        child === undefined
      )
        continue;
      if (monetaryFields.has(key) && typeof child === 'number') validateMonetaryNumber(child);
      result[redact(key, secrets)] = publicData(child, secrets);
    }
    return result;
  }
  fail('Remote returned an unsupported response value.');
}
export function apiError(error: unknown, operation: string, secrets: string[]): never {
  if (error instanceof ServiceError) throw error;
  let status = getApiErrorStatus(error);
  let message =
    'Remote could not complete the request. Check permissions, resource IDs, and account prerequisites.';
  if (isRecord(error)) {
    let response = isRecord(error.response) ? error.response : undefined;
    let data = response && isRecord(response.data) ? response.data : undefined;
    if (typeof data?.message === 'string')
      message = redact(data.message, secrets).slice(0, 600);
  }
  throw buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Remote',
      operation: redact(operation, secrets),
      reason: 'remote_api_error',
      extractMessage: () => message,
      parent: {}
    }
  );
}
