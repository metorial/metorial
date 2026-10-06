import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import type { z } from 'zod';

export const fail = (message: string): never => {
  throw createApiServiceError(message, { reason: 'brex_validation' });
};
export const required = (value: string | undefined, field: string) => {
  if (!value?.trim() || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
    fail(`${field} must be a nonblank value without control characters.`);
  return value!;
};
export const pathId = (value: string) => encodeURIComponent(required(value, 'Resource ID'));
export const parse = <S extends z.ZodType>(schema: S, data: unknown): z.output<S> => {
  const result = schema.safeParse(data);
  if (!result.success) fail('Brex returned an unexpected response shape.');
  return result.data!;
};
export const apiError = (error: unknown) => {
  const raw =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError && isApiErrorRecord(error.data)
      ? error.data.upstreamStatus
      : undefined);
  const status =
    typeof raw === 'number' && Number.isInteger(raw) && raw >= 100 && raw <= 599
      ? raw
      : undefined;
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Brex',
      reason: 'brex_api_error',
      extractMessage: () =>
        'Check token validity, required scopes, account role and product access.',
      parent: {}
    }
  );
};
export const integerAmount = (
  money: { amount: number; currency?: string | null },
  positive = false
) => {
  if (!Number.isSafeInteger(money.amount) || money.amount < (positive ? 1 : 0))
    fail(
      `Amount must be a ${positive ? 'positive' : 'nonnegative'} safe integer in minor units.`
    );
  const currency = money.currency ?? 'USD';
  if (!/^[A-Z]{3}$/.test(currency)) fail('Currency must be an uppercase three-letter code.');
  return { amount: money.amount, currency };
};
export const pageParams = (params: { cursor?: string; limit?: number }, maximum = 1000) => {
  if (params.cursor !== undefined) required(params.cursor, 'Cursor');
  if (
    params.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > maximum)
  )
    fail(`limit must be an integer between 1 and ${maximum}.`);
  return params;
};
export const exact = (actual: string, expected: string) => {
  if (actual !== expected) fail('Brex returned a different resource than requested.');
};
export const dateOnly = (value: string | undefined, field: string) => {
  if (
    value !== undefined &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    fail(`${field} must be a valid YYYY-MM-DD date.`);
  return value;
};

export const keyedMutation = async <T>(
  provided: string | undefined,
  secrets: (string | undefined)[],
  run: (key: string) => Promise<T>
) => {
  const key =
    provided === undefined ? crypto.randomUUID() : required(provided, 'idempotencyKey');
  if (secrets.some(secret => secret && key.includes(secret)))
    fail('idempotencyKey must not contain connection credentials.');
  try {
    return { value: await run(key), idempotencyKey: key };
  } catch (error) {
    const safe = apiError(error);
    safe.data.idempotencyKey = key;
    safe.data.operationOutcome = 'unconfirmed';
    throw safe;
  }
};
