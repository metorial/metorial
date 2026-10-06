import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus
} from 'slates';
import { z } from 'zod';

export const invalid = (message: string): never => {
  throw createApiServiceError(message, { reason: 'satismeter_validation' });
};
export const incomplete = (): never => {
  throw createApiServiceError(
    'SatisMeter returned incomplete or inconsistent data. A write may have been accepted; inspect the exact resource before retrying.',
    { reason: 'satismeter_response' }
  );
};
export const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  return result.success ? result.data : incomplete();
};
const control = (value: string) =>
  Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
export const exactId = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !value ||
    value === '.' ||
    value === '..' ||
    value.trim() !== value ||
    control(value) ||
    /[/?#\\]/.test(value)
  )
    return invalid('Provide an exact SatisMeter resource ID, without a URL or path.');
  try {
    encodeURIComponent(value);
  } catch {
    return invalid('Provide an ID containing valid Unicode text.');
  }
  return value;
};
export const credential = (value: unknown): string => {
  if (typeof value !== 'string' || !value || /\s/.test(value) || control(value))
    return invalid(
      'Provide a nonempty SatisMeter credential without whitespace or control characters.'
    );
  try {
    encodeURIComponent(value);
  } catch {
    return invalid('Provide a credential containing valid Unicode text.');
  }
  return value;
};
export const externalId = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim() || control(value))
    return invalid(
      'Provide a nonempty external user or anonymous identifier without control characters.'
    );
  try {
    encodeURIComponent(value);
  } catch {
    return invalid('Provide an identifier containing valid Unicode text.');
  }
  return value;
};
export const projectIdSchema = z
  .string()
  .optional()
  .describe(
    'Exact Project ID from the SatisMeter dashboard settings. Required for new connections; existing connections may use their saved project. Get Project verifies access.'
  );
export const resolveProject = (input: unknown, config: Record<string, unknown>): string => {
  const value = input === undefined ? config.projectId : input;
  if (value === undefined)
    return invalid(
      'Provide projectId from the SatisMeter dashboard settings. The API does not provide project discovery.'
    );
  return exactId(value);
};
export const dateRange = (start?: string, end?: string) => {
  for (const value of [start, end])
    if (value !== undefined && !z.iso.datetime({ offset: true }).safeParse(value).success)
      invalid('Provide an ISO 8601 date-time with a timezone.');
  if (start && end && Date.parse(start) > Date.parse(end))
    invalid('startDate must not be after endDate.');
};
export const protect = (value: unknown, secrets: Record<string, unknown>) => {
  const redactor = new AuthConfigSecretRedactor(secrets);
  const raw = Object.values(secrets).filter(
    (item): item is string => typeof item === 'string' && item.length > 0
  );
  const encoded = raw.flatMap(item => [
    Buffer.from(item).toString('base64'),
    Buffer.from(item).toString('base64url')
  ]);
  const seen = new Set<object>();
  const inspect = (item: unknown): void => {
    if (typeof item === 'string') {
      let decoded = item;
      for (let depth = 0; depth <= 4; depth++) {
        if (
          redactor.redactEmbedded(decoded) !== decoded ||
          encoded.some(secret => decoded.includes(secret))
        )
          incomplete();
        for (const candidate of decoded.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g))
          if (
            raw.some(secret => Buffer.from(candidate[0], 'base64').toString().includes(secret))
          )
            incomplete();
        if (depth === 4) break;
        const next = decoded.replace(/(?:%[0-9a-f]{2})+/gi, bytes =>
          Buffer.from(bytes.replaceAll('%', ''), 'hex').toString('utf8')
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
export const upstream = (error: unknown) => {
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
    providerLabel: 'SatisMeter',
    parent: {},
    reason: 'satismeter_api'
  });
};
