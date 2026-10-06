import { AuthConfigSecretRedactor, buildApiServiceError, createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };

export const regionSchema = z.enum(['us', 'eu', 'apac']);
export const pageInput = {
  first: z
    .number()
    .optional()
    .describe('Maximum items in this page; default 25, bounded to 100.'),
  after: z
    .string()
    .optional()
    .describe('Opaque endCursor from the previous page; pass unchanged.')
};
export const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean().optional(),
  startCursor: z.string().nullable().optional(),
  endCursor: z.string().nullable().optional()
});
export const pageOutput = { pageInfo: pageInfoSchema.optional() };
export type Page = { first?: number; after?: string };
export function own(value: unknown, key: string): unknown {
  return value && (typeof value === 'object' || typeof value === 'function')
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined;
}
export function text(value: unknown, field: string, allowEmpty = false): string {
  if (
    typeof value !== 'string' ||
    (!allowEmpty && !value.trim()) ||
    value.length > 65536 ||
    [...value].some(c => c.charCodeAt(0) === 0)
  )
    throw createApiServiceError(`Provide a valid ${field}.`, { reason: 'invalid_input' });
  return value;
}
export function id(value: unknown, field = 'resource ID'): string {
  const result = text(value, field);
  if (
    result.length > 1024 ||
    result !== result.trim() ||
    result === '.' ||
    result === '..' ||
    [...result].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw createApiServiceError(`Provide the exact ${field} from a discovery or read tool.`, {
      reason: 'invalid_id'
    });
  return result;
}
export function token(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 8192 ||
    [...value].some(c => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)
  )
    throw createApiServiceError(
      'Reconnect with a valid Tray bearer token for the selected region and credential mode.',
      { reason: 'invalid_auth' }
    );
  return value;
}
export function resolveRegion(
  authRegion?: string,
  legacyRegion?: unknown
): z.infer<typeof regionSchema> {
  const parsed = regionSchema.safeParse(authRegion ?? legacyRegion ?? 'us');
  if (
    !parsed.success ||
    (authRegion !== undefined && legacyRegion !== undefined && legacyRegion !== authRegion)
  )
    throw createApiServiceError(
      'Reconnect using the account region. Remove a conflicting legacy region setting before continuing.',
      { reason: 'invalid_region' }
    );
  return parsed.data;
}
export function page(input: Page = {}) {
  const first = input.first ?? 25;
  if (!Number.isSafeInteger(first) || first < 1 || first > 100)
    throw createApiServiceError('Provide first as an integer from 1 to 100.', {
      reason: 'invalid_pagination'
    });
  if (input.after !== undefined) id(input.after, 'pagination cursor');
  return { first, ...(input.after === undefined ? {} : { after: input.after }) };
}
export function clean(value: unknown, secrets: readonly string[] = []): unknown {
  const redactor = new AuthConfigSecretRedactor(
    Object.fromEntries(
      secrets.filter(Boolean).map((value, index) => [`secret${index}`, value])
    )
  );
  const needles = secrets
    .filter(Boolean)
    .flatMap(s => [
      s,
      encodeURIComponent(s),
      Buffer.from(s).toString('base64'),
      Buffer.from(s).toString('base64url')
    ]);
  const reflected = (s: string) => {
    let decoded = s;
    for (let round = 0; round <= 5; round++) {
      if (
        redactor.redactEmbedded(decoded) !== decoded ||
        needles.some(n => decoded.includes(n))
      )
        return true;
      if (
        (decoded.match(/[A-Za-z0-9+/_-]{16,}={0,2}/g) ?? []).some(
          c =>
            c.length <= 131072 &&
            needles.some(n => Buffer.from(c, 'base64').toString('utf8').includes(n))
        )
      )
        return true;
      if (round === 5) break;
      const next = decoded.replace(/(?:%[a-f0-9]{2})+/gi, bytes =>
        Buffer.from(bytes.replaceAll('%', ''), 'hex').toString('utf8')
      );
      if (next === decoded) break;
      decoded = next;
    }
    return false;
  };
  const seen = new WeakSet<object>();
  let count = 0;
  function walk(v: unknown, depth: number): unknown {
    if (++count > 100000 || depth > 40)
      throw createApiServiceError('Tray returned oversized or malformed data.', {
        reason: 'invalid_response'
      });
    if (typeof v === 'string') {
      if (reflected(v))
        throw createApiServiceError(
          'Tray reflected a configured credential. The operation outcome may be uncertain; read the exact resource before retrying a write.',
          { reason: 'unsafe_response' }
        );
      return v;
    }
    if (
      typeof v === 'number' &&
      (!Number.isFinite(v) || (Number.isInteger(v) && !Number.isSafeInteger(v)))
    )
      throw createApiServiceError(
        'Tray returned a numeric value that cannot be represented exactly. Use native string identifiers.',
        { reason: 'invalid_response' }
      );
    if (v === null || v === undefined || ['boolean', 'number'].includes(typeof v)) return v;
    if (typeof v !== 'object' || seen.has(v))
      throw createApiServiceError(
        'Provide ordinary JSON data without cycles or executable properties.',
        { reason: 'invalid_json' }
      );
    seen.add(v);
    const out: Record<string, unknown> | unknown[] = Array.isArray(v)
      ? []
      : Object.create(null);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
      if (!descriptor.enumerable) continue;
      if (!('value' in descriptor) || reflected(key))
        throw createApiServiceError('Tray data contains an unsafe property.', {
          reason: 'unsafe_response'
        });
      const entry = walk(descriptor.value, depth + 1);
      if (Array.isArray(out)) out.push(entry);
      else out[key] = entry;
    }
    seen.delete(v);
    return out;
  }
  return walk(value, 0);
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'Tray returned an invalid native response. Read the exact resource before retrying a write.',
      { reason: 'invalid_response' }
    );
  return parsed.data;
}
export function upstreamError(error: unknown) {
  const data = own(error, 'data') ?? own(own(error, 'error'), 'data');
  const status =
    own(own(error, 'response'), 'status') ??
    own(own(data, 'upstream'), 'status') ??
    own(data, 'upstreamStatus');
  const safeStatus =
    typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
      ? status
      : undefined;
  return buildApiServiceError(
    { response: { status: safeStatus } },
    {
      providerLabel: 'Tray',
      reason: 'tray_api_error',
      parent: {},
      extractMessage: () =>
        safeStatus === 401
          ? 'Reconnect; user tokens expire after two days.'
          : safeStatus === 403
            ? 'Check credential mode, Embedded entitlement and resource permissions.'
            : 'Verify the exact resource or external operation before retrying a write or billable call; its outcome may be uncertain.'
    }
  );
}

export function failure(message: string, data: Record<string, unknown> = {}) {
  const error = createApiServiceError(message, { parent: {} });
  Object.assign(error.data, clean(data));
  return error;
}

export function guardCredentials(value: unknown, secrets: readonly string[]) {
  const visited = new WeakSet<object>();
  let count = 0;
  const walk = (item: unknown, depth: number): void => {
    if (++count > 100000 || depth > 60)
      throw failure('Credential verification graph exceeded its bounded limit.', {
        reason: 'unsafe_response'
      });
    if (typeof item === 'string') {
      clean(item, secrets);
      return;
    }
    if (!item || (typeof item !== 'object' && typeof item !== 'function') || visited.has(item))
      return;
    visited.add(item);
    if (ArrayBuffer.isView(item))
      clean(
        Buffer.from(item.buffer, item.byteOffset, item.byteLength).toString('utf8'),
        secrets
      );
    for (const key of Reflect.ownKeys(item)) {
      clean(String(key), secrets);
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (descriptor && 'value' in descriptor) walk(descriptor.value, depth + 1);
    }
    const prototype = Object.getPrototypeOf(item);
    if (prototype && prototype !== Object.prototype && prototype !== Function.prototype)
      walk(prototype, depth + 1);
  };
  walk(value, 0);
}
