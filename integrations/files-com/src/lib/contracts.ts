import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import comparison from './path-comparison.json';

export type Row = Record<string, unknown>;
export type Connection = { token: string; subdomain?: string; baseUrl?: string };
export const reject: (message: string) => never = message => {
  throw createApiServiceError(message, { reason: 'filescom_validation' });
};
export const incomplete: () => never = () => {
  throw createApiServiceError(
    'Files.com returned incomplete or inconsistent data. A write may have completed; inspect the exact resource before retrying.',
    { reason: 'filescom_response' }
  );
};
export const row = (value: unknown): Row => (isApiErrorRecord(value) ? value : incomplete());
export const text = (value: unknown): string =>
  typeof value === 'string' && value.length > 0 ? value : incomplete();
export const optionalText = (value: unknown): string | undefined =>
  value === undefined || value === null
    ? undefined
    : typeof value === 'string'
      ? value
      : incomplete();
export const nativePath = (value: unknown): string =>
  typeof value === 'string' ? value : incomplete();
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
    reject('Provide an integer identifier or count in the documented range.');
  return value as number;
};
export const nativeId = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) incomplete();
  return value as number;
};
export const nativeCount = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) incomplete();
  return value as number;
};
export const stringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) incomplete();
  return value as string[];
};
export const serviceOrigin = (subdomain?: string) => {
  if (subdomain === undefined || subdomain === '') return 'https://app.files.com';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain))
    reject('Enter only the Files.com site subdomain, without a URL, path or port.');
  return `https://${subdomain.toLowerCase()}.files.com`;
};
export const boundOrigin = (baseUrl: string) => {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return reject('Reconnect with the Files.com site subdomain.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.files\.com$/i.test(url.hostname)
  )
    reject('The stored Files.com site origin is invalid. Reconnect the account.');
  return url.origin;
};
export const filePath = (value: unknown, allowRoot = false): string => {
  if (typeof value !== 'string') reject('Provide a Files.com path.');
  const path = (value as string).replace(/^\/+|\/+$/g, '');
  if (
    (!path && !allowRoot) ||
    path.length > 5000 ||
    path.includes('\\') ||
    path.includes('\0') ||
    path.split('/').some(part => part === '.' || part === '..' || (!part && path !== ''))
  )
    reject(
      'Use an exact slash-delimited Files.com path without dot segments. Root is supported only for reads and folder-scoped rules.'
    );
  try {
    encodeURIComponent(path);
  } catch {
    reject('Provide a path containing valid Unicode text.');
  }
  return path;
};
// Provider comparison map version 1 / MySQL 8.4.5 utf8mb4_0900_ai_ci.
// https://github.com/Files-com/files-sdk-javascript/blob/master/shared/path_comparison.json
const pathMapping: Record<string, string> = comparison.mapping;
export const pathKey = (value: unknown): string =>
  Array.from(
    filePath(value, true),
    scalar =>
      pathMapping[scalar.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')] ?? scalar
  ).join('');
export const boundPath = (actual: unknown, expected: string): void => {
  if (typeof actual !== 'string' || pathKey(actual) !== pathKey(expected)) incomplete();
};
export const encodedPath = (value: unknown, root = false) =>
  encodeURIComponent(filePath(value, root));
export const protect = (value: unknown, token: string): void => {
  const redactor = new AuthConfigSecretRedactor({ token });
  const seen = new Set<unknown>();
  const walk = (item: unknown): void => {
    if (typeof item === 'string') {
      let current = item;
      for (let depth = 0; depth < 4; depth++) {
        if (
          redactor.redactEmbedded(current) !== current ||
          current.includes(Buffer.from(token).toString('base64'))
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
        walk(key);
        walk(nested);
      }
    }
  };
  walk(value);
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
    providerLabel: 'Files.com',
    parent: {},
    reason: 'filescom_api',
    extractMessage: () => '',
    formatMessage: () =>
      `Files.com request failed${status === undefined ? '' : ` (HTTP ${status})`}. Check the site, key permissions and exact resource. A write may have completed; inspect it before retrying.`
  });
};
export const signedTarget = (value: unknown, token: string): string => {
  protect(value, token);
  let url: URL;
  try {
    url = new URL(text(value));
  } catch {
    return incomplete();
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !url.hostname ||
    /^(?:localhost|127\.|\[|0\.)/i.test(url.hostname)
  )
    incomplete();
  return url.toString();
};
export const MAX_BYTES = 10 * 1024 * 1024;
