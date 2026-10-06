import { Buffer } from 'node:buffer';
import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus
} from 'slates';
export type Row = Record<string, unknown>;
export function fail(message: string, reason = 'recruitee_validation'): never {
  throw createApiServiceError(message, { reason, parent: {} });
}
export function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function row(value: unknown, label: string): Row {
  if (!isRow(value)) fail(`Recruitee did not return a valid ${label} object.`);
  return value;
}
export function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} is required.`);
  return value;
}
export function integer(
  value: unknown,
  label: string,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  )
    fail(`${label} must be an exact integer between ${minimum} and ${maximum}.`);
  return value;
}
export function companyId(value: unknown): string {
  let result = text(value, 'Company ID');
  if (!/^[1-9]\d*$/.test(result) || !Number.isSafeInteger(Number(result)))
    fail(
      'Company ID must be an exact positive numeric identifier. Use your company subdomain for new connections.'
    );
  return result;
}
export function subdomain(value: unknown): string {
  let result = text(value, 'Company subdomain');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(result))
    fail(
      'Enter only your company subdomain from your Recruitee sign-in or careers address, without a URL, slash, or company ID.'
    );
  return result;
}
export function list(value: unknown, key: string): Row[] {
  let result = row(value, `${key} response`)[key];
  if (!Array.isArray(result))
    fail(
      `Recruitee did not return a ${key} list. Check endpoint permissions before continuing.`
    );
  return result.map(item => row(item, key));
}
export function entity(value: unknown, key: string, expectedId?: number): Row {
  let result = row(row(value, `${key} response`)[key], key);
  let actual = integer(result.id, `${key} response ID`);
  if (expectedId !== undefined && actual !== expectedId)
    fail(`Recruitee returned a different ${key} ID. Read the record before retrying.`);
  return result;
}
export function redact(value: string, secrets: string[]): string {
  const redactor = new AuthConfigSecretRedactor({ tokens: secrets });
  let decoded = value;
  for (let depth = 0; depth <= 3; depth++) {
    if (redactor.redactEmbedded(decoded) !== decoded) return '[redacted]';
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      const next = decoded.replace(/(?:%[0-9a-f]{2})+/gi, part =>
        Buffer.from(part.replace(/%/g, ''), 'hex').toString('utf8')
      );
      if (next === decoded) break;
      decoded = next;
    }
  }
  return value.replace(/\b(?:Bearer|Basic)\s+[^\s,;]+/gi, '[redacted authorization]');
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
  if (isRow(value)) {
    let result: Row = {};
    for (let [key, child] of Object.entries(value)) {
      if (
        /^(?:authorization|password|access_token|refresh_token|api_token|token|socket_token|calendar_sync_token|client_secret|__proto__|constructor|prototype)$/i.test(
          key
        ) ||
        child === undefined
      )
        continue;
      result[redact(key, secrets)] = publicData(child, secrets);
    }
    return result;
  }
  fail(
    'Recruitee returned a value that cannot be read as JSON.',
    'recruitee_invalid_response'
  );
}
export function apiError(error: unknown, operation: string, secrets: string[]): never {
  if (error instanceof ServiceError) throw error;
  throw buildApiServiceError(
    { response: { status: getApiErrorStatus(error) } },
    {
      providerLabel: 'Recruitee',
      operation: redact(operation, secrets),
      reason: 'recruitee_api_error',
      extractMessage: () =>
        'The request could not be completed. Check company binding, permissions, resource IDs and current record state.',
      parent: {}
    }
  );
}
export function missing(error: unknown): boolean {
  return isRow(error) && isRow(error.data) && error.data.upstreamStatus === 404;
}
export function stringList(value: unknown, label: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string'))
    fail(`Recruitee returned invalid ${label}.`);
  return value;
}
export function nullableString(value: unknown, label: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') fail(`Recruitee returned invalid ${label}.`);
  return value;
}
export function json(value: unknown, label: string): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return value;
  if (Array.isArray(value)) return value.map(item => json(item, label));
  if (isRow(value)) {
    for (let [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key))
        fail(`${label} contains an unsupported property.`);
      json(child, label);
    }
    return value;
  }
  fail(`${label} must contain only JSON values.`);
}
export function url(value: unknown, label: string): string {
  let result = text(value, label),
    parsed: URL;
  try {
    parsed = new URL(result);
  } catch {
    fail(`${label} must be an absolute HTTPS URL.`);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
    fail(`${label} must be an absolute HTTPS URL without embedded credentials.`);
  return parsed.href;
}
