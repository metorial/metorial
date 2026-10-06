import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus
} from 'slates';
import { z } from 'zod';

export { z };
export type Row = Record<string, unknown>;
export const record = (v: unknown): v is Row =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function fail(message: string, reason = 'invalid_input', details?: Row): never {
  const error = createApiServiceError(message, { reason });
  if (details) error.data.details = details;
  throw error;
}
export function text(v: unknown, label: string): string {
  if (
    typeof v !== 'string' ||
    !v.trim() ||
    v.length > 8192 ||
    [...v].some(c => {
      const n = c.charCodeAt(0);
      return n < 32 || n === 127 || (c.length === 1 && n >= 0xd800 && n <= 0xdfff);
    })
  )
    fail(`Provide a valid ${label}.`);
  return v;
}
export function id(v: unknown, label = 'resource ID'): string {
  const s = text(v, label);
  if (s !== s.trim() || s === '.' || s === '..' || s.length > 1024)
    fail(`Use the exact ${label} returned by discovery.`);
  return s;
}
export function token(v: unknown): string {
  const s = text(v, 'Softr personal access token');
  if (/\s/.test(s))
    fail(
      'Reconnect with the exact personal access token, without a header prefix.',
      'invalid_auth'
    );
  return s;
}
export function email(v: unknown): string {
  const s = text(v, 'user email');
  if (!z.email().safeParse(s).success || s !== s.trim())
    fail('Provide the exact valid app user email address.');
  return s;
}
export function studioAccepted(receipt: { status: number; data: unknown }) {
  if (
    !Number.isInteger(receipt.status) ||
    receipt.status < 200 ||
    receipt.status >= 300 ||
    (record(receipt.data) &&
      (receipt.data.success === false || receipt.data.error !== undefined))
  )
    fail(
      'The app operation has no successful native acknowledgement. Verify its state in Softr before retrying; it may have taken effect.',
      'mutation_unverified'
    );
}
export function magicLink(value: unknown, host: string): string {
  const link = record(value) ? (value.magic_link ?? value.magicLink) : undefined;
  let s: string;
  try {
    s = text(link, 'native magic sign-in link');
  } catch {
    return fail(
      'Softr returned no usable sign-in link. Creation or link generation may have taken effect; check the exact app user before requesting another.',
      'invalid_response'
    );
  }
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return fail(
      'Softr did not return a usable native sign-in link. Check the user before requesting another link.',
      'invalid_response'
    );
  }
  if (u.protocol !== 'https:' || u.hostname !== host || u.username || u.password || u.port)
    fail(
      'The sign-in link does not belong to the selected HTTPS app. Check its authorization before requesting another link.',
      'identity_mismatch'
    );
  return s;
}
export function domain(v: unknown): string {
  const s = text(v, 'published Softr app domain');
  if (s !== s.trim() || /[\s/@:#?%\\]/.test(s) || !s.includes('.'))
    fail(
      'Use only the published app hostname, without scheme, credentials, port or path.',
      'invalid_domain'
    );
  let u: URL;
  try {
    u = new URL(`https://${s}`);
  } catch {
    return fail('Provide the exact published app hostname.', 'invalid_domain');
  }
  if (u.hostname.endsWith('.') || u.hostname !== s.toLowerCase())
    fail('Use the exact ASCII app hostname without a trailing dot.', 'invalid_domain');
  return u.hostname;
}
export type AuthOutput = { token: string; domain?: string };
export function connection(auth: AuthOutput, config: unknown = {}) {
  const legacy = record(config) ? config.domain : undefined;
  const host = auth.domain ?? legacy;
  const scoped = host === undefined ? undefined : domain(host);
  if (auth.domain !== undefined && legacy !== undefined && domain(legacy) !== scoped)
    fail(
      'Remove the conflicting stored app domain and reconnect to the intended app.',
      'domain_conflict'
    );
  return { token: token(auth.token), domain: scoped };
}
export function appConnection(auth: AuthOutput, config: unknown = {}) {
  const c = connection(auth, config);
  if (!c.domain)
    fail(
      'Reconnect with the published Softr app domain for user operations. Existing stored domain settings remain supported.',
      'missing_domain'
    );
  return { ...c, domain: c.domain };
}
export function clean<T>(value: T, secrets: readonly string[] = []): T {
  const redactor = new AuthConfigSecretRedactor(
    Object.fromEntries(secrets.filter(Boolean).map((s, i) => [`secret${i}`, s]))
  );
  const seen = new WeakSet<object>();
  let count = 0;
  const safe = (s: string) => {
    let decoded = s;
    for (let n = 0; n <= 5; n++) {
      if (redactor.redactEmbedded(decoded) !== decoded) return false;
      if (n === 5) break;
      const next = decoded.replace(/(?:%[a-f0-9]{2})+/gi, b =>
        Buffer.from(b.replaceAll('%', ''), 'hex').toString('utf8')
      );
      if (next === decoded) break;
      decoded = next;
    }
    return true;
  };
  const walk = (v: unknown, depth: number) => {
    if (++count > 100000 || depth > 40)
      fail('Data exceeds the local JSON complexity bound.', 'invalid_json');
    if (typeof v === 'string') {
      if (!safe(v))
        fail(
          'Softr reflected a configured credential. Reconcile any possible write before retrying.',
          'unsafe_response'
        );
      return;
    }
    if (v === undefined || v === null || typeof v === 'boolean') return;
    if (typeof v === 'number' && Number.isFinite(v)) return;
    if (
      typeof v !== 'object' ||
      seen.has(v) ||
      ![Object.prototype, Array.prototype, null].includes(Object.getPrototypeOf(v))
    )
      fail('Use ordinary JSON without cycles or executable properties.', 'invalid_json');
    seen.add(v);
    for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
      if (!d.enumerable) continue;
      if (!('value' in d) || !safe(k))
        fail('Data contains an unsafe property.', 'unsafe_response');
      walk(d.value, depth + 1);
    }
    seen.delete(v);
  };
  walk(value, 0);
  return value;
}
export function bytes(value: unknown): Buffer {
  clean(value);
  let s: string;
  try {
    s = JSON.stringify(value);
  } catch {
    return fail('Provide serializable JSON.', 'invalid_json');
  }
  if (!s) fail('Provide JSON data.');
  const b = Buffer.from(s);
  if (b.length > 8 * 1024 * 1024)
    fail(
      'Data exceeds the local 8 MiB request/download limit. Reduce the fields or page size.',
      'payload_too_large'
    );
  return b;
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success)
    fail(
      'Softr returned an incomplete or unexpected native receipt. Read the exact resource before retrying a possible write.',
      'invalid_response'
    );
  return r.data;
}
export function paging(offset: unknown = 0, limit: unknown = 10) {
  if (
    !Number.isSafeInteger(offset) ||
    Number(offset) < 0 ||
    !Number.isSafeInteger(limit) ||
    Number(limit) < 1 ||
    Number(limit) > 200
  )
    fail('Use a nonnegative safe integer offset and an integer limit from 1 to 200.');
  return { offset: Number(offset), limit: Number(limit) };
}
const codes = new Set([
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNKNOWN_FIELD',
  'UNAUTHORIZED',
  'QUOTA_EXCEEDED',
  'FORBIDDEN',
  'RESOURCE_NOT_FOUND',
  'CONSTRAINT_VIOLATION',
  'PAYLOAD_TOO_LARGE',
  'TOO_MANY_REQUESTS',
  'SERVICE_UNAVAILABLE'
]);
export function upstream(e: unknown, mutating: boolean) {
  if (
    e instanceof ServiceError ||
    (record(e) &&
      record(e.data) &&
      e.data.code === 'bad_request' &&
      e.data.status === 400 &&
      typeof e.data.reason === 'string')
  )
    return e;
  const status = getApiErrorStatus(e);
  const raw =
    record(e) && record(e.response) && record(e.response.data)
      ? e.response.data.errorCode
      : record(e) &&
          record(e.data) &&
          record(e.data.baggage) &&
          record(e.data.baggage.response)
        ? e.data.baggage.response.errorCode
        : undefined;
  const code = typeof raw === 'string' && codes.has(raw) ? raw : undefined;
  return buildApiServiceError(
    {
      response: {
        status:
          typeof status === 'number' &&
          Number.isInteger(status) &&
          status >= 100 &&
          status <= 599
            ? status
            : undefined,
        data: { errorCode: code }
      }
    },
    {
      providerLabel: 'Softr',
      reason: 'softr_api_error',
      parent: {},
      extractUpstreamCode: () => code,
      extractMessage: () =>
        status === 401 || status === 403
          ? 'Check the personal access token expiration, selected workspace scopes and required read/write permissions.'
          : mutating
            ? 'The request may have taken effect. Read the exact resource and reconcile retained effects before retrying; do not repeat creation or synchronization blindly.'
            : 'Check the selected workspace permissions, published app domain and exact resource IDs.'
    }
  );
}
export function absent(e: unknown) {
  return (
    record(e) &&
    record(e.data) &&
    e.data.reason === 'softr_api_error' &&
    e.data.upstreamStatus === 404 &&
    e.data.upstreamCode === 'RESOURCE_NOT_FOUND'
  );
}
