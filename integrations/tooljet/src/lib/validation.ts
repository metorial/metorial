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
export function fail(message: string, reason = 'invalid_input', metadata?: Row): never {
  const error = createApiServiceError(message, { reason });
  if (metadata !== undefined) error.data.details = metadata;
  throw error;
}
export function text(v: unknown, field: string): string {
  if (
    typeof v !== 'string' ||
    !v.trim() ||
    v.length > 8192 ||
    [...v].some(c => {
      const code = c.charCodeAt(0);
      return code < 32 || code === 127 || (c.length === 1 && code >= 0xd800 && code <= 0xdfff);
    })
  )
    fail(`Provide a valid ${field}.`);
  return v;
}
export function id(v: unknown, field = 'identifier'): string {
  const s = text(v, field);
  if (s !== s.trim() || s === '.' || s === '..' || s.length > 1024)
    fail(`Provide the exact ${field} from a read or discovery tool.`);
  return s;
}
export function token(v: unknown): string {
  const s = text(v, 'ToolJet access token');
  if (/\s/.test(s))
    fail(
      'Reconnect with the configured static access token, without an Authorization prefix.',
      'invalid_auth'
    );
  return s;
}
export function instance(v: unknown): string {
  const s = text(v, 'ToolJet instance URL');
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return fail(
      'Provide the explicit HTTP or HTTPS ToolJet instance URL.',
      'invalid_instance'
    );
  }
  if (
    !['http:', 'https:'].includes(u.protocol) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    /\\|%(?:2f|5c|2e)/i.test(s) ||
    /(?:^|\/)\.\.?(?:\/|$)/.test(s)
  )
    fail(
      'Use the credential-free HTTP or HTTPS instance root, including any deployment path and port, without query or fragment.',
      'invalid_instance'
    );
  return u.href.replace(/\/+$/, '');
}
export type AuthOutput = { token: string; baseUrl?: string };
export function connection(
  auth: AuthOutput,
  config: unknown = {}
): { token: string; baseUrl: string } {
  const legacy = record(config) ? config.baseUrl : undefined;
  const baseUrl = instance(auth.baseUrl ?? legacy);
  if (auth.baseUrl !== undefined && legacy !== undefined && instance(legacy) !== baseUrl)
    fail(
      'Remove the conflicting legacy instance setting and reconnect to the intended ToolJet instance.',
      'instance_conflict'
    );
  return { token: token(auth.token), baseUrl };
}
export function clean<T>(value: T, secrets: readonly string[] = []): T {
  const redactor = new AuthConfigSecretRedactor(
    Object.fromEntries(secrets.filter(Boolean).map((v, i) => [`secret${i}`, v]))
  );
  let count = 0;
  const seen = new WeakSet<object>();
  const safe = (s: string) => {
    let decoded = s;
    for (let i = 0; i <= 5; i++) {
      if (redactor.redactEmbedded(decoded) !== decoded) return false;
      if (i === 5) break;
      const next = decoded.replace(/(?:%[a-f0-9]{2})+/gi, bytes =>
        Buffer.from(bytes.replaceAll('%', ''), 'hex').toString('utf8')
      );
      if (next === decoded) break;
      decoded = next;
    }
    return true;
  };
  const walk = (v: unknown, depth: number) => {
    if (++count > 100000 || depth > 40)
      fail('ToolJet data exceeds the local JSON safety bound.', 'invalid_response');
    if (typeof v === 'string') {
      if (!safe(v))
        fail(
          'ToolJet reflected a configured credential. Read the exact resource before retrying a write.',
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
      fail(
        'Provide ordinary JSON data without cycles or executable properties.',
        'invalid_json'
      );
    seen.add(v);
    for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
      if (!d.enumerable) continue;
      if (!('value' in d) || !safe(k))
        fail('ToolJet data contains an unsafe property.', 'unsafe_response');
      walk(d.value, depth + 1);
    }
    seen.delete(v);
  };
  walk(value, 0);
  return value;
}
export function jsonBytes(value: unknown): Buffer {
  clean(value);
  let json: string;
  try {
    json = JSON.stringify(value);
  } catch {
    return fail('Provide JSON data that can be serialized.', 'invalid_json');
  }
  if (!json) fail('Provide a JSON object.', 'invalid_json');
  const bytes = Buffer.from(json);
  if (bytes.length > 8 * 1024 * 1024)
    fail(
      'JSON exceeds this integration’s local 8 MiB request/file bound. Reduce the export or import.',
      'payload_too_large'
    );
  return bytes;
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success)
    fail(
      'ToolJet returned an unexpected native response. Verify the exact resource before retrying a write.',
      'invalid_response'
    );
  return r.data;
}
export function upstream(error: unknown, mutating: boolean) {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  const safeStatus =
    typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? status
      : undefined;
  return buildApiServiceError(
    { response: { status: safeStatus } },
    {
      providerLabel: 'ToolJet',
      reason: 'tooljet_api_error',
      parent: {},
      extractMessage: () =>
        safeStatus === 401 || safeStatus === 403
          ? 'Check the configured static Basic token, ENABLE_EXTERNAL_API and Enterprise EXTERNAL_API entitlement. Workflow webhooks require their separate Bearer token.'
          : safeStatus === 451
            ? 'Activate the instance’s EXTERNAL_API license.'
            : safeStatus === 404
              ? 'Check the supported self-hosted edition, deployed version, exact resource and route; a 404 does not prove cleanup.'
              : safeStatus === 402
                ? 'Check the instance’s licensed user/seat capacity.'
                : mutating
                  ? 'The operation may have taken effect. Read the exact resource or execution before retrying; do not repeat creation or execution blindly.'
                  : 'Check the instance URL, edition, permissions and deployed API version.'
    }
  );
}
