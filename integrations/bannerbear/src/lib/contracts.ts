import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
export type Row = Record<string, unknown>;
export type Connection = {
  token: string;
  keyType?: 'project' | 'full_master' | 'limited_master';
  projectId?: string;
};
export const reject = (message: string): never => {
  throw createApiServiceError(message, { reason: 'bannerbear_validation' });
};
export const incomplete = (): never => {
  throw createApiServiceError(
    'Bannerbear returned incomplete or inconsistent data. A request may have been accepted; inspect the exact resource before retrying.',
    { reason: 'bannerbear_response' }
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
export const nullableText = (value: unknown): string | null =>
  value === undefined || value === null ? null : text(value);
export const numeric = (
  value: unknown,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER
): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : incomplete();
export const nullableNumber = (
  value: unknown,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER
): number | null =>
  value === undefined || value === null ? null : numeric(value, minimum, maximum);
export const integer = (
  value: unknown,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER
): number => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  )
    reject('Provide an integer in the documented range.');
  return value as number;
};
export const uid = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !value ||
    Array.from(value).some(char => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127) ||
    /[/?#\\]/.test(value)
  )
    reject('Provide an exact Bannerbear resource UID, without a URL or path.');
  try {
    encodeURIComponent(value as string);
  } catch {
    reject('Provide a UID containing valid Unicode text.');
  }
  return value as string;
};
export const address = (value: unknown, httpsOnly = false): string => {
  if (typeof value !== 'string') reject('Provide an absolute media or callback URL.');
  let parsed: URL;
  try {
    parsed = new URL(value as string);
  } catch {
    return reject('Provide a valid absolute URL.');
  }
  if (
    !(httpsOnly
      ? parsed.protocol === 'https:'
      : ['https:', 'http:'].includes(parsed.protocol)) ||
    parsed.username ||
    parsed.password
  )
    reject('Use an HTTP(S) URL without embedded account credentials.');
  return value as string;
};
export const protect = (value: unknown, token: string): void => {
  const redactor = new AuthConfigSecretRedactor({ token });
  const seen = new Set<unknown>();
  const inspect = (item: unknown): void => {
    if (typeof item === 'string') {
      let current = item;
      for (let depth = 0; depth < 4; depth++) {
        if (
          redactor.redactEmbedded(current) !== current ||
          [
            Buffer.from(token).toString('base64'),
            Buffer.from(token).toString('base64url')
          ].some(variant => current.includes(variant))
        )
          incomplete();
        const next = current.replace(/(?:%[0-9a-f]{2})+/gi, bytes =>
          Buffer.from(
            bytes
              .split('%')
              .slice(1)
              .map(byte => Number.parseInt(byte, 16))
          ).toString('utf8')
        );
        if (next === current) break;
        current = next;
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
    providerLabel: 'Bannerbear',
    parent: {},
    reason: 'bannerbear_api'
  });
};
export const nativeState = (value: unknown): string => {
  const state = nonempty(value);
  if (!['pending', 'pending_approval', 'rendering', 'completed', 'failed'].includes(state))
    incomplete();
  return state;
};
export const stateMessage = (value: unknown): string =>
  nativeState(value) === 'failed'
    ? 'failed'
    : value === 'completed'
      ? 'completed'
      : `accepted (${value})`;
export const nativeStrings = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) incomplete();
  return value as string[];
};
export const modifications = (value: unknown): Row[] =>
  rows(value).map(item => {
    const { star_rating, barcode_data, qr_data, ...output } = item;
    if (typeof item.name !== 'string' || !item.name)
      reject('Every modification requires the exact template layer name.');
    if (item.font_size !== undefined || item.font_weight !== undefined)
      reject(
        'font_size and font_weight are not documented per-render V2 fields. Set them in the template editor.'
      );
    if (star_rating !== undefined) output.rating = integer(star_rating, 0, 100);
    if (barcode_data !== undefined) output.bar_code_data = barcode_data;
    if (qr_data !== undefined) output.target = qr_data;
    if (item.image_url !== undefined) address(item.image_url);
    return output;
  });
