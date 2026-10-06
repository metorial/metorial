import { Buffer } from 'node:buffer';
import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus
} from 'slates';
import type { z } from 'zod';
export type Row = Record<string, unknown>;
export function fail(message: string, reason = 'shipday_validation'): never {
  throw createApiServiceError(message, { reason, parent: {} });
}
export function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function row(value: unknown, label = 'response'): Row {
  if (!isRow(value))
    fail(
      `Shipday returned an invalid ${label}. Read current state before retrying; a write may have completed.`,
      'shipday_invalid_response'
    );
  return value;
}
export function rows(value: unknown): Row[] {
  if (!Array.isArray(value))
    fail(
      'Shipday did not return the documented list. Check permissions and current API behavior.',
      'shipday_invalid_response'
    );
  return value.map(value => row(value));
}
export function id(value: unknown, label = 'ID'): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    fail(`${label} must be an exact positive safe integer.`);
  return value;
}
export function text(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    Array.from(value).some(character => character.charCodeAt(0) < 32)
  )
    fail(`${label} is required and must not contain control characters.`);
  return value;
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    fail(
      'Shipday returned an unexpected response shape. Read current state before retrying; a write may have completed.',
      'shipday_invalid_response'
    );
  return result.data;
}
export function sanitize(value: unknown, token: string): unknown {
  if (typeof value === 'string') {
    const redactor = new AuthConfigSecretRedactor({ token });
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
    return value.replace(/\b(?:Basic|Bearer)\s+[^\s,;]+/gi, '[redacted authorization]');
  }
  if (
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return value;
  if (Array.isArray(value)) return value.map(item => sanitize(item, token));
  if (isRow(value)) {
    const result: Row = {};
    for (const [key, child] of Object.entries(value)) {
      if (
        child === undefined ||
        /^(?:password|authorization|api_?key|token|access_token|refresh_token|secret|__proto__|constructor|prototype)$/i.test(
          key
        )
      )
        continue;
      const safeKey = sanitize(key, token);
      if (typeof safeKey === 'string') result[safeKey] = sanitize(child, token);
    }
    return result;
  }
  fail(
    'Shipday returned a non-JSON value. Read current state before retrying.',
    'shipday_invalid_response'
  );
}
export function apiError(error: unknown, operation: string): never {
  if (error instanceof ServiceError) throw error;
  let status = getApiErrorStatus(error);
  if (isRow(error) && error.name === 'SlateError' && isRow(error.data)) {
    const baggage = isRow(error.data.baggage) ? error.data.baggage : undefined;
    const original =
      baggage && isRow(baggage.serviceErrorData)
        ? baggage.serviceErrorData.upstreamStatus
        : undefined;
    if (
      typeof original === 'number' &&
      Number.isInteger(original) &&
      original >= 100 &&
      original <= 599
    )
      status = original;
  }
  throw buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Shipday',
      operation,
      reason: 'shipday_api_error',
      extractMessage: () =>
        'The request could not be confirmed. Check permissions and exact resource identity; read current state before retrying a write.',
      parent: {}
    }
  );
}
export function missing(error: unknown): boolean {
  return isRow(error) && isRow(error.data) && error.data.upstreamStatus === 404;
}
export function receipt(value: unknown, expectedId?: number): Row {
  const result = row(value, 'mutation receipt');
  if (result.success !== true)
    fail(
      'Shipday did not confirm success. Read current state before retrying.',
      'shipday_unconfirmed_mutation'
    );
  if (
    expectedId !== undefined &&
    result.orderId !== undefined &&
    id(result.orderId, 'Response order ID') !== expectedId
  )
    fail(
      'Shipday returned a different order ID. Read both records before continuing.',
      'shipday_unconfirmed_mutation'
    );
  return result;
}
export function validateFields(fields: Row, existing = false) {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || (existing && value === null)) continue;
    if (
      typeof value === 'number' &&
      (!Number.isFinite(value) || value < 0) &&
      !/Latitude|Longitude/.test(key)
    )
      fail(`${key} must be a finite nonnegative number; no currency conversion is performed.`);
    if (
      /Latitude$/.test(key) &&
      (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 90)
    )
      fail(`${key} must be between -90 and 90.`);
    if (
      /Longitude$/.test(key) &&
      (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 180)
    )
      fail(`${key} must be between -180 and 180.`);
    if (
      /Date$/.test(key) &&
      (typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)
    )
      fail(`${key} must be a valid UTC date in yyyy-mm-dd format.`);
    if (
      /^(?:expectedPickupTime|expectedDeliveryTime)$/.test(key) &&
      (typeof value !== 'string' ||
        !(
          existing
            ? /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/
            : /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/
        ).test(value))
    )
      fail(`${key} must be a UTC time in hh:mm:ss format.`);
    if (key === 'totalCost' && (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value)))
      fail('totalCost must be an exact nonnegative decimal string.');
  }
}
export function items(value: unknown): Row[] {
  if (!Array.isArray(value)) fail('orderItems must be an array.');
  return value.map(item => {
    const actual = row(item, 'order item');
    text(actual.name, 'Item name');
    id(actual.quantity, 'Item quantity');
    validateFields(actual);
    const addOns = actual.addOns;
    if (
      addOns !== undefined &&
      addOns !== null &&
      typeof addOns !== 'string' &&
      (!Array.isArray(addOns) || !addOns.every(v => typeof v === 'string'))
    )
      fail('addOns must be a string or string array.');
    return { ...actual, ...(typeof addOns === 'string' ? { addOns: [addOns] } : {}) };
  });
}
export function optionalString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string')
    fail('Shipday returned an invalid text field.', 'shipday_invalid_response');
  return value;
}
export function optionalNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'number' || !Number.isFinite(value))
    fail('Shipday returned an invalid numeric field.', 'shipday_invalid_response');
  return value;
}
export function optionalBoolean(value: unknown): boolean | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'boolean')
    fail('Shipday returned an invalid boolean field.', 'shipday_invalid_response');
  return value;
}
export function measure(value: unknown): string | number | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)))
    return value;
  fail('Shipday returned an invalid tracking measurement.', 'shipday_invalid_response');
}
export function child(value: unknown): Row {
  return value === undefined || value === null ? {} : row(value);
}
