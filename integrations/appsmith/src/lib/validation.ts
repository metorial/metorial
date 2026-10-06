import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus
} from 'slates';

export type Row = Record<string, unknown>;
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
export const incomplete = () =>
  createApiServiceError(
    'Appsmith returned an incomplete or mismatched response. Inspect the exact resource before retrying a write.',
    { reason: 'invalid_response' }
  );
export const unsupportedAudit = () =>
  createApiServiceError(
    'The historical audit-log route and filters are not verified against Appsmith’s current enterprise API contract. Use Admin Settings > Others > Audit logs on a Business instance. No request was sent.',
    { reason: 'unsupported_operation' }
  );
export function adapt(error: unknown) {
  if (error instanceof ServiceError) return error;
  let status: ReturnType<typeof getApiErrorStatus>;
  try {
    status = getApiErrorStatus(error);
  } catch {
    status = undefined;
  }
  const numericStatus =
    typeof status === 'number'
      ? status
      : typeof status === 'string' && /^[1-5][0-9]{2}$/.test(status)
        ? Number(status)
        : undefined;
  status =
    numericStatus !== undefined &&
    Number.isInteger(numericStatus) &&
    numericStatus >= 100 &&
    numericStatus <= 599
      ? numericStatus
      : undefined;
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Appsmith',
      operation: 'request',
      reason: 'appsmith_api',
      parent: {},
      extractMessage: () =>
        status === 401
          ? 'Reconnect using a valid native session. Password login is unavailable on SSO-only instances.'
          : status === 403
            ? 'Check the exact instance, session, CSRF prerequisite, edition and resource permissions.'
            : status === 429
              ? 'Wait before retrying. Inspect any uncertain write first; password login can be rate limited.'
              : 'The request failed. Check the instance version and inspect any uncertain write before retrying.'
    }
  );
}
export function record(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw incomplete();
  return value as Row;
}
export function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,99}$/.test(value))
    throw invalid('Provide an exact resource ID from the appropriate discovery tool.');
  return value;
}
export function name(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > 99 ||
    Array.from(value).some(character => character.charCodeAt(0) < 32)
  )
    throw invalid('Provide a nonblank resource name of at most 99 characters.');
  return value.trim();
}
export function origin(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    value.includes('\\') ||
    Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid(
      'Provide the Appsmith instance origin, such as https://your-instance.example.'
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalid('Provide a valid Appsmith instance origin.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw invalid(
      'Use an HTTPS Appsmith origin without credentials, path, query or fragment. Localhost may use HTTP.'
    );
  return url.origin;
}
export function cookie(value: unknown, required = true): string {
  if (value === undefined || value === '') {
    if (!required) return '';
    throw invalid('Connect with Session Login before using the management API.');
  }
  if (
    typeof value !== 'string' ||
    value.length > 8192 ||
    Array.from(value).some(character => {
      const code = character.charCodeAt(0);
      return code < 33 || code > 126 || [';', ',', '"', '\\'].includes(character);
    })
  )
    throw invalid('Reconnect with a valid native session cookie value.');
  return value;
}
export function responseCookies(value: unknown): Map<string, string> {
  const result = new Map<string, string>();
  if (value === undefined) return result;
  const values = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(values) || values.some(item => typeof item !== 'string'))
    throw incomplete();
  for (const item of values) {
    const match = /^(SESSION|XSRF-TOKEN)=([^;]*)/.exec(item);
    if (!match?.[1] || !match[2]) continue;
    const parsed = cookie(match[2]);
    if (result.has(match[1]) && result.get(match[1]) !== parsed) throw incomplete();
    result.set(match[1], parsed);
  }
  return result;
}
export function json(value: unknown): string {
  const seen = new Set<object>();
  const validate = (item: unknown, depth = 0): void => {
    if (
      depth > 60 ||
      typeof item === 'bigint' ||
      typeof item === 'function' ||
      typeof item === 'symbol' ||
      (typeof item === 'number' && !Number.isFinite(item))
    )
      throw invalid('Provide finite JSON values without unsupported types.');
    if (!item || typeof item !== 'object') return;
    if (seen.has(item)) throw invalid('Provide JSON without cycles.');
    seen.add(item);
    for (const key of Reflect.ownKeys(item)) {
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (typeof key !== 'string' || !descriptor || !('value' in descriptor))
        throw invalid('Provide plain JSON without getters or symbols.');
      validate(descriptor.value, depth + 1);
    }
    seen.delete(item);
  };
  validate(value);
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw invalid('Provide a finite JSON value without cycles or unsupported values.');
  }
  if (!serialized || Buffer.byteLength(serialized, 'utf8') > 4 * 1024 * 1024)
    throw invalid('Provide JSON content no larger than 4 MiB.');
  return serialized;
}
export function protect(value: unknown, credentials: Record<string, unknown>) {
  const redactor = new AuthConfigSecretRedactor(credentials);
  const safe = (text: string) => {
    const queue = [{ text, depth: 0 }];
    const decoded = new Set<string>();
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]!;
      if (decoded.has(current.text)) continue;
      if (decoded.size >= 256) return false;
      decoded.add(current.text);
      if (redactor.redactEmbedded(current.text) !== current.text) return false;
      if (current.depth >= 5) continue;
      const add = (candidate: string) => {
        if (candidate !== current.text && !decoded.has(candidate)) {
          if (queue.length >= 512) return false;
          queue.push({ text: candidate, depth: current.depth + 1 });
        }
        return true;
      };
      if (
        !add(
          current.text.replace(/%([a-f0-9]{2})/gi, (_, byte: string) =>
            String.fromCharCode(Number.parseInt(byte, 16))
          )
        ) ||
        !add(
          current.text.replace(
            /\\u([a-f0-9]{4})|\\x([a-f0-9]{2})/gi,
            (_, unicode: string, byte: string) =>
              String.fromCharCode(Number.parseInt(unicode ?? byte, 16))
          )
        )
      )
        return false;
      for (const part of current.text.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
        if (part[0].length > 65536) continue;
        if (!add(Buffer.from(part[0], 'base64').toString('utf8'))) return false;
        if (
          /^(?:[a-f0-9]{2}){8,}$/i.test(part[0]) &&
          !add(Buffer.from(part[0], 'hex').toString('utf8'))
        )
          return false;
      }
    }
    return true;
  };
  const seen = new Set<object>();
  let entries = 0;
  const visit = (item: unknown, depth = 0): boolean => {
    if (depth > 60 || ++entries > 100000) return false;
    if (typeof item === 'string') return safe(item);
    if (!item || typeof item !== 'object') return true;
    if (seen.has(item)) return false;
    seen.add(item);
    return Reflect.ownKeys(item).every(key => {
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      return (
        typeof key === 'string' &&
        safe(key) &&
        !!descriptor &&
        'value' in descriptor &&
        visit(descriptor.value, depth + 1)
      );
    });
  };
  if (!visit(value))
    throw createApiServiceError(
      'Credential-bearing or unsafe request or response content was refused. Inspect the resource before retrying a write.',
      { reason: 'credential_reflection' }
    );
}
