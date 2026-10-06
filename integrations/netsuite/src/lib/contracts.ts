import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw createApiServiceError(message, { reason: 'netsuite_contract' });
}
export function credential(value: unknown): asserts value is string {
  requireValue(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= 8192 &&
      ![...value].some(
        c =>
          c.charCodeAt(0) <= 32 ||
          c.charCodeAt(0) === 127 ||
          (c.length === 1 && c.charCodeAt(0) >= 0xd800 && c.charCodeAt(0) <= 0xdfff)
      ),
    'A nonempty, well-formed NetSuite credential without whitespace or control characters is required.'
  );
}
export function account(value: unknown) {
  requireValue(
    typeof value === 'string' &&
      /^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*$/.test(value) &&
      value.length <= 63,
    'Use the NetSuite account ID from Company Information or its account-specific domain, without a URL or path.'
  );
  return {
    realm: value.replace(/-/g, '_').toUpperCase(),
    host: value.replace(/_/g, '-').toLowerCase()
  };
}
export function recordType(value: unknown): asserts value is string {
  requireValue(
    typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,199}$/.test(value),
    'Use an exact native record type from list_record_types, without a path or query.'
  );
}
export function externalId(value: unknown) {
  requireValue(typeof value === 'string', 'An external ID string is required.');
  const id = value.startsWith('eid:') ? value.slice(4) : value;
  requireValue(
    /^[A-Za-z0-9_-]+$/.test(id) && id.length <= 1024,
    'Use an external ID value or eid:<value> containing letters, numbers, underscores or hyphens. Field-script-ID and pipe forms are not supported by this native path.'
  );
  return id;
}
export function recordId(value: unknown): asserts value is string {
  requireValue(
    typeof value === 'string' &&
      (/^-?\d+$/.test(value) || value.startsWith('eid:')) &&
      value.length <= 1028,
    'Use a native internal ID or eid:<external ID>, without a path or query.'
  );
  if (value.startsWith('eid:')) externalId(value);
}
export function sameInternalId(a: string, b: string) {
  return /^-?\d+$/.test(a) && /^-?\d+$/.test(b) ? BigInt(a) === BigInt(b) : a === b;
}
export function object(value: unknown): asserts value is Record<string, unknown> {
  requireValue(isApiErrorRecord(value), 'NetSuite must return a JSON object.');
}
export function guard(value: unknown, secrets: readonly string[]) {
  let text: string;
  try {
    text = JSON.stringify(value);
  } catch {
    requireValue(false, 'NetSuite data is not bounded JSON.');
  }
  requireValue(
    typeof text === 'string' && Buffer.byteLength(text) <= 8 * 1024 * 1024,
    'NetSuite data exceeds the supported 8 MiB JSON bound.'
  );
  const variants = new Set<string>();
  for (const secret of secrets.filter(Boolean)) {
    credential(secret);
    variants.add(secret);
    variants.add(Buffer.from(secret).toString('base64'));
    variants.add(Buffer.from(secret).toString('base64url'));
    variants.add(Buffer.from(secret).toString('hex'));
    variants.add(
      [...secret].map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join('')
    );
    let encoded = secret;
    for (let i = 0; i < 3; i++) {
      encoded = encodeURIComponent(encoded);
      variants.add(encoded);
    }
  }
  const redactor = new AuthConfigSecretRedactor(
    Object.fromEntries([...variants].map((s, i) => [String(i), s]))
  );
  const message =
    'NetSuite returned or received a reflected connection credential. Reconcile any uncertain mutation before retrying.';
  const inspect = (candidate: string, depth = 0) => {
    requireValue(
      ![...variants].some(
        v => candidate.includes(v) || candidate.includes(JSON.stringify(v).slice(1, -1))
      ),
      message
    );
    if (depth >= 3) return;
    let decoded: string | undefined;
    try {
      decoded = decodeURIComponent(candidate);
    } catch {}
    if (decoded !== undefined && decoded !== candidate) inspect(decoded, depth + 1);
    for (const part of candidate.match(/[A-Za-z0-9+/_=-]{12,}/g) ?? []) {
      const decoded = Buffer.from(part, 'base64').toString('utf8');
      if (decoded && decoded !== part) inspect(decoded, depth + 1);
      if (/^(?:[A-Fa-f0-9]{2})+$/.test(part))
        inspect(Buffer.from(part, 'hex').toString('utf8'), depth + 1);
    }
  };
  requireValue(JSON.stringify(redactor.redactEmbedded(value)) === text, message);
  inspect(text);
}
export function nativeErrorCode(value: unknown) {
  if (!isApiErrorRecord(value)) return undefined;
  const details = value['o:errorDetails'];
  const code =
    Array.isArray(details) && isApiErrorRecord(details[0])
      ? details[0]['o:errorCode']
      : value.error;
  return typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,99}$/.test(code) ? code : undefined;
}
export function upstream(error: unknown) {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  const data =
    isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
  const native = data && isApiErrorRecord(data.upstream) ? data.upstream.code : undefined;
  const code =
    typeof native === 'string' && /^[A-Z][A-Z0-9_]{0,99}$/.test(native) ? native : undefined;
  return buildApiServiceError(error, {
    providerLabel: 'NetSuite',
    parent: {},
    reason:
      'Check the account, role permissions, credentials and native record metadata. A failed or unconfirmed mutation may have financial or retained effects; reconcile before retrying.',
    extractMessage: () =>
      'The request could not be completed. Check credentials, role permissions, record metadata and concurrency limits.',
    extractStatus: () =>
      typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
        ? status
        : undefined,
    extractUpstreamCode: () => code
  });
}
export function paging(limit?: number, offset?: number) {
  const l = limit ?? 1000,
    o = offset ?? 0;
  requireValue(
    Number.isSafeInteger(l) &&
      l >= 1 &&
      l <= 1000 &&
      Number.isSafeInteger(o) &&
      o >= 0 &&
      o % l === 0,
    'Native paging requires integer limit 1–1000 and a nonnegative offset divisible by that limit (default limit 1000).'
  );
  return { limit: l, offset: o };
}
