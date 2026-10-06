import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';
export type Row = Record<string, unknown>;
export const reject = (message: string): never => {
  throw createApiServiceError(message, { reason: 'tally_validation' });
};
export const incomplete = (): never => {
  throw createApiServiceError(
    'Tally returned incomplete or inconsistent data. A write may have been accepted; inspect the exact resource before retrying.',
    { reason: 'tally_response' }
  );
};
export const row = (value: unknown): Row => (isApiErrorRecord(value) ? value : incomplete());
export const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? value.map(row) : incomplete();
export const text = (value: unknown): string =>
  typeof value === 'string' ? value : incomplete();
export const nonempty = (value: unknown): string =>
  typeof value === 'string' && value.length > 0 ? value : incomplete();
export const optionalText = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : text(value);
export const count = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : incomplete();
export const boolean = (value: unknown): boolean =>
  typeof value === 'boolean' ? value : incomplete();
export const integer = (value: unknown, min = 1, max = Number.MAX_SAFE_INTEGER): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    return reject('Provide an integer within the documented range.');
  return value;
};
export const id = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !value ||
    Array.from(value).some(char => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127) ||
    /[/?#\\]/.test(value)
  )
    return reject('Provide an exact Tally resource ID, without a URL or path.');
  try {
    encodeURIComponent(value);
  } catch {
    return reject('Provide an ID containing valid Unicode text.');
  }
  return value;
};
export const credential = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !value ||
    Array.from(value).some(char => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127)
  )
    return reject(
      'Provide a nonempty Tally credential without whitespace or control characters.'
    );
  try {
    encodeURIComponent(value);
  } catch {
    return reject('Provide a credential containing valid Unicode text.');
  }
  return value;
};
export const protect = (value: unknown, secrets: Record<string, unknown>) => {
  const redactor = new AuthConfigSecretRedactor(secrets);
  const values = Object.values(secrets).filter(
    (item): item is string => typeof item === 'string' && item.length > 0
  );
  const variants = values.flatMap(item => [
    Buffer.from(item).toString('base64'),
    Buffer.from(item).toString('base64url')
  ]);
  const seen = new Set<object>();
  const inspect = (item: unknown): void => {
    if (typeof item === 'string') {
      let decoded = item;
      for (let depth = 0; depth < 4; depth++) {
        if (
          redactor.redactEmbedded(decoded) !== decoded ||
          variants.some(secret => decoded.includes(secret))
        )
          incomplete();
        for (const candidate of decoded.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g))
          if (
            values.some(secret =>
              Buffer.from(candidate[0], 'base64').toString().includes(secret)
            )
          )
            incomplete();
        const next = decoded.replace(/(?:%[0-9a-f]{2})+/gi, bytes =>
          Buffer.from(bytes.replace(/%/g, ''), 'hex').toString('utf8')
        );
        if (next === decoded) break;
        decoded = next;
      }
    } else if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item);
      for (const [key, nested] of Object.entries(item)) {
        inspect(key);
        inspect(nested);
      }
    }
  };
  inspect(value);
};
export const upstream = (error: unknown): ReturnType<typeof createApiServiceError> => {
  const candidate =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined);
  const status =
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 100 &&
    candidate <= 599
      ? candidate
      : undefined;
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Tally',
    parent: {},
    reason: 'tally_api'
  });
};
export const timestamp = (value: unknown): string => {
  const result = text(value);
  if (!Number.isFinite(Date.parse(result))) incomplete();
  return result;
};
export const dateInput = (value: unknown): string => {
  if (typeof value !== 'string' || !z.iso.datetime({ offset: true }).safeParse(value).success)
    return reject('Provide a valid ISO 8601 date-time with a timezone.');
  return value;
};
