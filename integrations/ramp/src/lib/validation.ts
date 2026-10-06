import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';
import { z } from 'zod';

export type RampRecord = Record<string, unknown>;
export const recordSchema = z.record(z.string(), z.unknown());
export const environments = ['production', 'sandbox'] as const;
export type Environment = (typeof environments)[number];
export const bases: Record<Environment, string> = {
  production: 'https://api.ramp.com/developer/v1',
  sandbox: 'https://demo-api.ramp.com/developer/v1'
};
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'ramp_validation' });
export function environment(value: unknown): Environment {
  if (value === undefined) return 'production';
  if (value === 'production' || value === 'sandbox') return value;
  throw invalid('Choose the production or sandbox Ramp environment.');
}
export function required(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || /[\r\n\0]/.test(value))
    throw invalid(`${field} must be a nonblank string.`);
  return value;
}
export function id(value: unknown, field = 'Resource ID'): string {
  let text = required(value, field);
  if (/[/?#\\]/.test(text) || text === '.' || text === '..')
    throw invalid(`${field} must be one resource identifier.`);
  return encodeURIComponent(text);
}
export function date(
  value: string | undefined,
  field: string,
  dateOnly = false
): string | undefined {
  if (value === undefined) return undefined;
  let pattern = dateOnly
    ? /^\d{4}-\d{2}-\d{2}$/
    : /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?)?$/;
  let parsed = Date.parse(utcDate(value));
  if (
    !pattern.test(value) ||
    !Number.isFinite(parsed) ||
    new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !==
      value.slice(0, 10)
  )
    throw invalid(
      `${field} must be a valid ${dateOnly ? 'YYYY-MM-DD date' : 'ISO 8601 date or date-time'}.`
    );
  return value;
}
const utcDate = (value: string) =>
  value.includes('T') && !/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? `${value}Z` : value;
export function dateRange(from: string | undefined, to: string | undefined): void {
  if (from && to && Date.parse(utcDate(from)) > Date.parse(utcDate(to)))
    throw invalid('The start date must not be after the end date.');
}
export function integerAmount(value: number | undefined, field = 'amount'): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 0))
    throw invalid(
      `${field} must be a nonnegative safe integer in the currency's minor units.`
    );
}
export function nonemptyPatch(body: RampRecord): void {
  if (!Object.values(body).some(value => value !== undefined))
    throw invalid('Provide at least one supported field to update.');
}
export function object(value: unknown, operation = 'response'): RampRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw createApiServiceError(`Ramp ${operation} returned an invalid object.`, {
      reason: 'ramp_response'
    });
  return value as RampRecord;
}
const privateField =
  /^(?:authorization|access_?token|refresh_?token|client_?secret|token|secret|pan|cvv|card_?number|account_?number|routing_?number|invoice_?urls|receipt_?url|download_?url|upload_?url)$/i;
export function publicRecord(value: unknown, secrets: readonly string[] = []): RampRecord {
  let sensitive = secrets.filter(secret => secret.length > 0);
  let reflected = (text: string) => sensitive.some(secret => text.includes(secret));
  let seen = new Set<object>();
  function clean(item: unknown, depth: number): unknown {
    if (depth > 30)
      throw createApiServiceError('Ramp returned an excessively nested response.', {
        reason: 'ramp_response'
      });
    if (item === null || typeof item === 'boolean' || typeof item === 'string') {
      if (
        typeof item === 'string' &&
        (reflected(item) ||
          /(?:[?&](?:X-Amz-(?:Signature|Credential)|token|access_token|signature|sig)=)/i.test(
            item
          ))
      )
        return undefined;
      return item;
    }
    if (typeof item === 'number' && Number.isFinite(item)) return item;
    if (item === undefined) return undefined;
    if (typeof item !== 'object' || seen.has(item))
      throw createApiServiceError('Ramp returned an invalid JSON response.', {
        reason: 'ramp_response'
      });
    seen.add(item);
    let result: unknown;
    if (Array.isArray(item)) result = item.map(entry => clean(entry, depth + 1));
    else {
      let output: RampRecord = {};
      for (let [key, entry] of Object.entries(item))
        if (
          !privateField.test(key) &&
          !reflected(key) &&
          !['__proto__', 'constructor', 'prototype'].includes(key)
        ) {
          let safe = clean(entry, depth + 1);
          if (safe !== undefined) output[key] = safe;
        }
      result = output;
    }
    seen.delete(item);
    return result;
  }
  return object(clean(object(value), 0));
}
export function apiFailure(error: unknown, operation: string): never {
  let rawStatus = getApiErrorStatus(error);
  let status =
    typeof rawStatus === 'number' &&
    Number.isInteger(rawStatus) &&
    rawStatus >= 100 &&
    rawStatus <= 599
      ? rawStatus
      : undefined;
  throw buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Ramp',
    reason: 'ramp_api',
    operation,
    parent: {},
    extractMessage: () =>
      status === 429
        ? 'Rate limit reached. Retry after the provider permits another request.'
        : status === 401
          ? 'Authorization failed. Reconnect the Ramp account.'
          : status === 403
            ? 'The connection lacks the required scope, account permissions, or product access.'
            : 'The request could not be completed. Check its fields and account permissions.'
  });
}

export function unsupported(
  input: RampRecord,
  fields: readonly string[],
  operation: string
): void {
  let present = fields.filter(field => input[field] !== undefined);
  if (present.length)
    throw invalid(
      `${operation} does not support ${present.join(', ')}. Omit those fields or choose the compatible API/action.`
    );
}
export function taskReceipt(result: RampRecord): string {
  return required(result.id, 'Deferred task ID returned by Ramp');
}
