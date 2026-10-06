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
    'Vonage returned an incomplete or mismatched receipt. Inspect the exact resource and billing before retrying an uncertain write.',
    { reason: 'invalid_response' }
  );
export function adapt(error: unknown) {
  if (error instanceof ServiceError) return error;
  let status: unknown;
  try {
    status = getApiErrorStatus(error);
  } catch {
    status = undefined;
  }
  const code =
    typeof status === 'number'
      ? status
      : typeof status === 'string' && /^[1-5][0-9]{2}$/.test(status)
        ? Number(status)
        : undefined;
  const safeStatus =
    code !== undefined && Number.isInteger(code) && code >= 100 && code <= 599
      ? code
      : undefined;
  return buildApiServiceError(
    { response: { status: safeStatus } },
    {
      providerLabel: 'Vonage',
      operation: 'request',
      reason: 'vonage_api',
      parent: {},
      extractMessage: () =>
        safeStatus === 401
          ? 'Check the API key and secret or the exact application ID and RSA private key.'
          : safeStatus === 403
            ? 'Check account permissions, product provisioning, regional restrictions and plan prerequisites.'
            : safeStatus === 429
              ? 'Wait before retrying. Check any uncertain write or charge first.'
              : 'The request failed. Inspect any uncertain message, call, resource or financial effect before retrying.'
    }
  );
}
export function record(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw incomplete();
  return value as Row;
}
export function text(
  value: unknown,
  label = 'value',
  maximum = 4096,
  multiline = false
): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maximum ||
    Array.from(value).some(c => {
      const code = c.charCodeAt(0);
      return (code < 32 && !(multiline && [9, 10, 13].includes(code))) || code === 127;
    })
  )
    throw invalid(`Provide a nonblank ${label} within the documented limit.`);
  return value;
}
export function id(value: unknown): string {
  return text(value, 'exact resource ID', 128);
}
export function integer(
  value: unknown,
  label: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER
): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw invalid(`Provide ${label} as an integer from ${min} to ${max}.`);
  return value;
}
export function phone(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{6,14}$/.test(value))
    throw invalid('Provide a phone number in E.164 format without a leading + or 00.');
  return value;
}
export function country(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Z]{2}$/.test(value))
    throw invalid('Provide an uppercase two-letter ISO country code.');
  return value;
}
export function url(value: unknown): string {
  const supplied = text(value, 'public HTTP or HTTPS URL', 4096);
  let parsed: URL;
  try {
    parsed = new URL(supplied);
  } catch {
    throw invalid('Provide a public HTTP or HTTPS URL.');
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    supplied.includes('\\')
  )
    throw invalid(
      'Provide an HTTP or HTTPS URL without credentials, fragment or backslashes.'
    );
  return supplied;
}
export function json(value: unknown): string {
  let serialized: string | undefined;
  const visited = new Set<object>();
  let nodes = 0;
  const inspect = (item: unknown, depth = 0): void => {
    if (
      ++nodes > 50000 ||
      depth > 50 ||
      typeof item === 'function' ||
      typeof item === 'symbol' ||
      typeof item === 'bigint' ||
      (typeof item === 'number' && !Number.isFinite(item))
    )
      throw invalid('Provide bounded finite JSON.');
    if (!item || typeof item !== 'object') return;
    if (
      visited.has(item) ||
      ![Object.prototype, Array.prototype, null].includes(Object.getPrototypeOf(item))
    )
      throw invalid('Provide plain JSON without cycles.');
    visited.add(item);
    for (const key of Reflect.ownKeys(item)) {
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (typeof key !== 'string' || !descriptor || !('value' in descriptor))
        throw invalid('Provide plain JSON without getters or symbols.');
      inspect(descriptor.value, depth + 1);
    }
    visited.delete(item);
  };
  inspect(value);
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw invalid('Provide bounded finite JSON.');
  }
  if (!serialized || Buffer.byteLength(serialized) > 4 * 1024 * 1024)
    throw invalid('JSON content must not exceed 4 MiB.');
  return serialized;
}
// Bounded decoding supplements the shared literal redactor for provider reflection.
export function protect(value: unknown, secrets: string[]) {
  json(value);
  const credentials = Object.fromEntries(
    secrets.filter(Boolean).map((secret, index) => [`secret${index}`, secret])
  );
  const redactor = new AuthConfigSecretRedactor(credentials);
  const inspectText = (supplied: string) => {
    const queue = [{ value: supplied, depth: 0 }],
      seen = new Set<string>();
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]!;
      if (seen.has(current.value)) continue;
      if (seen.size > 4096) throw incomplete();
      seen.add(current.value);
      if (redactor.redactEmbedded(current.value) !== current.value)
        throw createApiServiceError(
          'A credential was reflected in request or response content. No safe result can be returned; inspect any uncertain write before retrying.',
          { reason: 'credential_reflection' }
        );
      if (current.depth >= 3) continue;
      const add = (decoded: string) => {
        if (decoded !== current.value)
          queue.push({ value: decoded, depth: current.depth + 1 });
      };
      add(
        current.value.replace(/\\+u([a-f0-9]{4})/gi, (_, hex: string) =>
          String.fromCharCode(Number.parseInt(hex, 16))
        )
      );
      add(
        current.value.replace(/(?:%[a-f0-9]{2})+/gi, part =>
          Buffer.from(part.replaceAll('%', ''), 'hex').toString('utf8')
        )
      );
      for (const match of current.value.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
        const bytes = Buffer.from(match[0], 'base64url'),
          decoded = bytes.toString('utf8');
        if (Buffer.from(decoded).equals(bytes)) add(decoded);
        if (/^(?:[a-f0-9]{2}){4,}$/i.test(match[0])) {
          const hexBytes = Buffer.from(match[0], 'hex'),
            hexText = hexBytes.toString('utf8');
          if (Buffer.from(hexText).equals(hexBytes)) add(hexText);
        }
      }
    }
  };
  const inspect = (item: unknown): void => {
    if (typeof item === 'string') inspectText(item);
    else if (item && typeof item === 'object')
      for (const [key, child] of Object.entries(item)) {
        inspectText(key);
        inspect(child);
      }
  };
  inspect(value);
}
export function upstreamStatus(code: string | number) {
  const safeCode = String(code);
  if (!/^[0-9]{1,4}$/.test(safeCode)) throw incomplete();
  throw createApiServiceError(
    `Vonage rejected the request with native status ${safeCode}. Check product setup, billing and any partially accepted effect before retrying.`,
    { reason: 'vonage_native_status', upstreamCode: safeCode }
  );
}
