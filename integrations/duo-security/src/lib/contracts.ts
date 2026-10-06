import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus
} from 'slates';
import { z } from 'zod';

export { z };
export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw createApiServiceError(message);
}
export function host(value: string) {
  const normalized = value.toLowerCase().replace(/^https?:\/\//, '');
  requireValue(
    /^api-[a-z0-9]{8}\.(?:duosecurity|duofederal)\.com$/.test(normalized),
    'Use the exact API hostname from the Duo Admin Panel, such as api-XXXXXXXX.duosecurity.com or the Federal duofederal.com equivalent, without a path, port or query.'
  );
  return normalized;
}
export function resourceId(value: unknown) {
  requireValue(
    typeof value === 'string' && /^[A-Za-z0-9]{20}$/.test(value),
    'Provide the exact 20-character Duo resource ID returned by its list tool.'
  );
  return value as string;
}
export function credential(value: string) {
  requireValue(
    value.length > 0 &&
      value.length <= 4096 &&
      [...value].every(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126),
    'Provide valid Duo API credentials without whitespace.'
  );
}
export function safeJson(value: unknown, secrets: readonly string[]) {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw createApiServiceError('Duo returned invalid data.');
  }
  requireValue(
    typeof serialized === 'string' && serialized.length <= 4 * 1024 * 1024,
    'Duo returned invalid or oversized data.'
  );
  const variants = new Set<string>();
  for (const secret of secrets.filter(Boolean)) {
    variants.add(secret);
    variants.add(
      [...secret].map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('')
    );
    let uri = secret;
    let form = secret;
    let base64 = secret;
    let base64url = secret;
    for (let depth = 0; depth < 5; depth++) {
      uri = encodeURIComponent(uri);
      form = encodeURIComponent(form).replace(/%20/g, '+');
      base64 = Buffer.from(base64).toString('base64');
      base64url = Buffer.from(base64url).toString('base64url');
      for (const variant of [uri, form, base64, base64url]) variants.add(variant);
    }
  }
  const redactor = new AuthConfigSecretRedactor({ variants: [...variants] });
  const strings = [serialized];
  const visit = (v: unknown) => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object')
      for (const [k, item] of Object.entries(v)) {
        strings.push(k);
        visit(item);
      }
  };
  visit(value);
  for (const original of strings) {
    const candidates = [original];
    for (let i = 0; i < 2; i++)
      for (const text of [...candidates]) {
        try {
          candidates.push(decodeURIComponent(text));
        } catch {
          /* Plain text need not be URI encoded. */
        }
        candidates.push(
          text.replace(/\\u([a-fA-F0-9]{4})/g, (_, n: string) =>
            String.fromCharCode(Number.parseInt(n, 16))
          )
        );
        for (const segment of text.match(/[A-Za-z0-9+/_=-]{8,16384}/g) ?? [])
          candidates.push(Buffer.from(segment, 'base64').toString('utf8'));
      }
    requireValue(
      !candidates.some(text => redactor.redactEmbedded(text) !== text),
      'Duo returned credential-bearing data; the result cannot be exposed.'
    );
  }
}
export function upstream(error: unknown, operation: string) {
  if (error instanceof ServiceError) return error;
  return buildApiServiceError(error, {
    providerLabel: 'Duo',
    operation,
    parent: {},
    reason: `Duo ${operation} failed. Verify the Admin API application type, required grant permissions, network restrictions and system clock.`,
    formatMessage: c =>
      `Duo ${operation} failed${c.status ? ` (HTTP ${c.status})` : ''}. Check API permissions, credentials and clock synchronization.`
  });
}
export const status = (error: unknown) =>
  error instanceof ServiceError ? error.data.upstreamStatus : getApiErrorStatus(error);
export function integer(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER) {
  requireValue(
    typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      value >= minimum &&
      value <= maximum,
    `Provide an integer between ${minimum} and ${maximum}.`
  );
}
export function validateInput(
  key: string,
  input: Record<string, unknown>,
  secrets: readonly string[]
) {
  safeJson(input, secrets);
  for (const [name, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (/^(userId|groupId|phoneId|adminId|resourceId)$/.test(name)) resourceId(value);
    if (/^(add|remove)(Group|Phone)Ids$/.test(name)) {
      requireValue(Array.isArray(value), 'Provide an array of exact resource IDs.');
      (value as unknown[]).forEach(resourceId);
      requireValue(
        new Set(value as string[]).size === (value as string[]).length,
        'Repeated relationship IDs are not allowed.'
      );
    }
    if (name === 'limit')
      integer(
        value,
        1,
        key === 'list_users' ? 300 : key === 'get_authentication_logs' ? 1000 : 500
      );
    if (name === 'offset' || name === 'validSecs') integer(value, 0);
    if (name === 'count') integer(value, 1, 10);
    if (typeof value === 'string')
      requireValue(
        value.isWellFormed() &&
          [...value].every(c => {
            const n = c.charCodeAt(0);
            return (
              n >= 32 || (['notes', 'description'].includes(name) && [9, 10, 13].includes(n))
            );
          }),
        'Text contains unsupported control characters.'
      );
  }
  for (const kind of ['Group', 'Phone']) {
    const a = input[`add${kind}Ids`] as string[] | undefined,
      b = input[`remove${kind}Ids`] as string[] | undefined;
    requireValue(
      !a?.some(id => b?.includes(id)),
      'The same relationship cannot be added and removed in one call.'
    );
  }
  if (key === 'list_users')
    for (const name of ['username', 'email'])
      if (input[name] !== undefined)
        requireValue(
          typeof input[name] === 'string' && (input[name] as string).trim().length > 0,
          'Provide a nonempty lookup filter or omit it.'
        );
  if (key === 'create_user') {
    requireValue(
      typeof input.username === 'string' && input.username.trim().length > 0,
      'Provide a nonempty username.'
    );
    if (input.sendEnrollment)
      requireValue(
        typeof input.email === 'string' && input.email.includes('@'),
        'Provide the enrollment email before creating the user.'
      );
  }
  if (key === 'create_admin') {
    requireValue(
      typeof input.email === 'string' && input.email.includes('@'),
      'Provide a valid administrator email.'
    );
    if (input.phone !== undefined)
      requireValue(
        (input.phone as string).trim().length > 0,
        'Omit phone or provide a nonempty number.'
      );
  }
  if (['create_group', 'create_admin'].includes(key))
    requireValue(
      typeof input.name === 'string' && input.name.trim().length > 0,
      'Provide a nonempty name.'
    );
  if (key === 'update_admin')
    requireValue(
      ['name', 'phone', 'role'].some(k => input[k] !== undefined),
      'Provide at least one administrator field to update.'
    );
  if (['get_admin_logs', 'get_telephony_logs'].includes(key))
    requireValue(
      input.maxtime === undefined && input.limit === undefined,
      'This legacy v1 log endpoint supports mintime only. Omit maxtime and limit; use the documented v2 logs API externally for bounded time ranges and pagination.'
    );
  if (key.startsWith('get_') && key.endsWith('_logs')) {
    for (const field of ['mintime', 'maxtime'])
      if (input[field] !== undefined)
        requireValue(
          typeof input[field] === 'string' &&
            /^\d+$/.test(input[field] as string) &&
            Number.isSafeInteger(Number(input[field])),
          'Provide an exact nonnegative Unix timestamp string.'
        );
  }
  if (key === 'get_authentication_logs') {
    requireValue(
      (input.mintime as string).length === 13 &&
        (input.maxtime as string).length === 13 &&
        BigInt(input.mintime as string) < BigInt(input.maxtime as string),
      'Authentication logs require increasing 13-digit Unix millisecond bounds.'
    );
    if (input.nextOffset !== undefined)
      requireValue(
        Array.isArray(input.nextOffset) &&
          input.nextOffset.length === 2 &&
          /^\d{13}$/.test(input.nextOffset[0] as string) &&
          typeof input.nextOffset[1] === 'string' &&
          /^[A-Za-z0-9-]+$/.test(input.nextOffset[1]),
        'Use the exact two-element native authentication log cursor.'
      );
  }
}
