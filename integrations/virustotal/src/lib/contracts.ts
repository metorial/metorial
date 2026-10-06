import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';
import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';
import { z } from 'zod';

export function requireValue(value: unknown, message: string): asserts value {
  if (!value) throw createApiServiceError(message, { reason: 'virustotal_validation' });
}
export function text(value: unknown, label: string, maximum = 8192): string {
  requireValue(
    typeof value === 'string' && value.length > 0 && value.length <= maximum,
    `${label} must be nonempty text within ${maximum} characters.`
  );
  return value;
}
export function credential(value: unknown): string {
  const token = text(value, 'API key', 8192);
  requireValue(
    [...token].every(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126),
    'Reconnect with a valid VirusTotal API key without whitespace.'
  );
  return token;
}
export function opaqueId(value: unknown, label = 'Resource ID'): string {
  const id = text(value, label, 4096);
  requireValue(
    id.isWellFormed() &&
      id !== '.' &&
      id !== '..' &&
      [...id].every(c => c.charCodeAt(0) > 32 && c.charCodeAt(0) !== 127),
    `Use the exact ${label} returned by VirusTotal.`
  );
  return id;
}
export const segment = (value: unknown, label?: string) =>
  encodeURIComponent(opaqueId(value, label));
export function hash(value: unknown): string {
  const result = text(value, 'File hash', 64).toLowerCase();
  requireValue(
    /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/.test(result),
    'Use a SHA-256, SHA-1 or MD5 file hash.'
  );
  return result;
}
export function domain(value: unknown): string {
  const result = domainToASCII(text(value, 'Domain', 253))
    .toLowerCase()
    .replace(/\.$/, '');
  requireValue(
    result.length > 0 &&
      !isIP(result) &&
      result
        .split('.')
        .every(
          part =>
            part.length > 0 &&
            part.length <= 63 &&
            /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(part)
        ),
    'Use a domain name without a scheme, port or path.'
  );
  return result;
}
export function ip(value: unknown): string {
  const result = text(value, 'IP address', 45);
  requireValue(
    !result.includes('%') && isIP(result) !== 0,
    'Use a valid IPv4 or IPv6 address without a port or zone.'
  );
  return isIP(result) === 6 ? new URL(`http://[${result}]/`).hostname.slice(1, -1) : result;
}
export function webUrl(value: unknown): string {
  const result = text(value, 'URL', 16384);
  let parsed: URL | undefined;
  try {
    parsed = new URL(result);
  } catch {
    /* Report a safe input error below. */
  }
  requireValue(
    parsed &&
      ['http:', 'https:'].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password,
    'Use an HTTP or HTTPS URL without embedded credentials. Indicators may become public; use non-sensitive values.'
  );
  return result;
}
export function urlId(value: unknown): string {
  const result = text(value, 'URL identifier', 32768);
  if (/^https?:\/\//i.test(result)) return Buffer.from(webUrl(result)).toString('base64url');
  if (/^[a-fA-F0-9]{64}$/.test(result)) return result.toLowerCase();
  requireValue(
    /^[A-Za-z0-9_-]+$/.test(result) &&
      Buffer.from(result, 'base64url').toString('base64url') === result,
    'Use a URL, its SHA-256 identifier, or its unpadded URL-safe base64 identifier.'
  );
  webUrl(Buffer.from(result, 'base64url').toString('utf8'));
  return result;
}
export function resourceId(collection: string, value: unknown): string {
  if (collection === 'files') return hash(value);
  if (collection === 'urls') return urlId(value);
  if (collection === 'domains') return domain(value);
  if (collection === 'ip_addresses') return ip(value);
  throw createApiServiceError('Select file, URL, domain or IP as the resource type.');
}
export function pageLimit(value: unknown): number {
  requireValue(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 1000,
    'Page limit must be an integer from 1 to 1000; endpoint or license limits may be lower.'
  );
  return value;
}
export function actionFields(
  input: Record<string, unknown>,
  allowed: string[],
  paged = false
) {
  requireValue(
    Object.entries(input).every(
      ([key, value]) =>
        value === undefined ||
        allowed.includes(key) ||
        key === 'action' ||
        (key === 'limit' && (paged || value === 10))
    ),
    'Some fields do not apply to the selected action. Remove them before retrying.'
  );
}
export function safeJson(value: unknown, secrets: readonly string[] = []) {
  const needles = secrets
    .filter(Boolean)
    .flatMap(secret => [
      secret,
      Buffer.from(secret).toString('base64'),
      Buffer.from(secret).toString('base64url'),
      Buffer.from(secret).toString('hex')
    ]);
  let count = 0;
  const ancestors = new Set<object>();
  function visit(item: unknown, depth = 0) {
    requireValue(
      ++count <= 100000 && depth < 40,
      'VirusTotal data exceeds the supported structure bounds.'
    );
    if (typeof item === 'string') {
      requireValue(
        item.length <= 2 * 1024 * 1024,
        'VirusTotal text exceeds the supported bounds.'
      );
      let variants = [item];
      for (let round = 0; round < 3; round++) {
        const next: string[] = [];
        for (const variant of variants) {
          requireValue(
            !needles.some(secret => variant.includes(secret)),
            'VirusTotal returned credential-bearing data; the result was withheld. Reconcile possible effects before retrying.'
          );
          next.push(
            variant.replace(/%([a-f0-9]{2})/gi, (_, hex: string) =>
              String.fromCharCode(Number.parseInt(hex, 16))
            ),
            variant.replace(/\\u([a-f0-9]{4})/gi, (_, hex: string) =>
              String.fromCharCode(Number.parseInt(hex, 16))
            )
          );
          for (const encoded of variant.match(/[A-Za-z0-9+/_-]{16,}={0,2}/g) ?? [])
            if (encoded.length <= 65536)
              next.push(Buffer.from(encoded, 'base64').toString('utf8'));
        }
        variants = next;
      }
      requireValue(
        !variants.some(v => needles.some(secret => v.includes(secret))),
        'VirusTotal returned credential-bearing data; the result was withheld. Reconcile possible effects before retrying.'
      );
    } else if (typeof item === 'number') {
      requireValue(
        Number.isFinite(item) && (!Number.isInteger(item) || Number.isSafeInteger(item)),
        'VirusTotal returned an unsafe numeric value; exact data could not be verified.'
      );
    } else if (item && typeof item === 'object') {
      requireValue(
        !ancestors.has(item) &&
          (Array.isArray(item) ||
            Object.getPrototypeOf(item) === Object.prototype ||
            Object.getPrototypeOf(item) === null),
        'VirusTotal data must be bounded plain JSON.'
      );
      ancestors.add(item);
      for (const [key, child] of Object.entries(item)) {
        visit(key, depth + 1);
        visit(child, depth + 1);
      }
      ancestors.delete(item);
    } else
      requireValue(
        item === undefined || item === null || typeof item === 'boolean',
        'VirusTotal returned an unsupported value.'
      );
  }
  visit(value);
}
export function nativeJson(value: unknown): unknown {
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    const bytes =
      value instanceof ArrayBuffer
        ? Buffer.from(value)
        : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    requireValue(bytes.length <= 4 * 1024 * 1024, 'VirusTotal response exceeds 4 MiB.');
    value = bytes.toString('utf8');
  }
  if (typeof value === 'string') {
    requireValue(
      Buffer.byteLength(value) <= 4 * 1024 * 1024,
      'VirusTotal response exceeds 4 MiB.'
    );
    try {
      return JSON.parse(value);
    } catch {
      throw createApiServiceError('VirusTotal returned invalid JSON.');
    }
  }
  return value;
}
export function upstream(error: unknown, operation: string) {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  const candidate =
    error && typeof error === 'object'
      ? (error as { data?: { upstream?: { code?: unknown } } })
      : undefined;
  const code = candidate?.data?.upstream?.code;
  return buildApiServiceError(
    {
      response: {
        status:
          typeof status === 'number' && status >= 100 && status <= 599 ? status : undefined,
        data: {
          error: {
            code: typeof code === 'string' && /^[A-Za-z]{1,80}$/.test(code) ? code : undefined
          }
        }
      }
    },
    {
      providerLabel: 'VirusTotal',
      reason: 'virustotal_api_error',
      operation,
      parent: {},
      extractUpstreamCode: () =>
        typeof code === 'string' && /^[A-Za-z]{1,80}$/.test(code) ? code : undefined,
      formatMessage: () =>
        'VirusTotal could not verify this request. Check the API key, endpoint privileges and quota. Reconcile uncertain writes before retrying.'
    }
  );
}
const integer = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const stats = z.record(z.string(), integer);
export const attributesSchema = z
  .object({
    sha256: z.string().optional(),
    sha1: z.string().optional(),
    md5: z.string().optional(),
    meaningful_name: z.string().optional(),
    names: z.array(z.string()).optional(),
    size: integer.optional(),
    type_tag: z.string().optional(),
    type_description: z.string().optional(),
    reputation: z.number().int().optional(),
    total_votes: z
      .object({ harmless: integer.optional(), malicious: integer.optional() })
      .optional(),
    last_analysis_date: integer.optional(),
    last_analysis_stats: stats.optional(),
    tags: z.array(z.string()).optional(),
    first_submission_date: integer.optional(),
    times_submitted: integer.optional(),
    url: z.string().optional(),
    last_final_url: z.string().optional(),
    title: z.string().optional(),
    categories: z.record(z.string(), z.string()).optional(),
    registrar: z.string().optional(),
    creation_date: integer.optional(),
    last_update_date: integer.optional(),
    last_dns_records: z
      .array(
        z.object({
          type: z.string().optional(),
          value: z.string().optional(),
          ttl: integer.optional()
        })
      )
      .optional(),
    whois: z.string().optional(),
    popularity_ranks: z
      .record(
        z.string(),
        z.object({ rank: integer.optional(), timestamp: integer.optional() })
      )
      .optional(),
    as_owner: z.string().optional(),
    asn: integer.optional(),
    country: z.string().optional(),
    continent: z.string().optional(),
    network: z.string().optional(),
    status: z.string().optional(),
    date: integer.optional(),
    stats: stats.optional(),
    results: z
      .record(
        z.string(),
        z.object({
          category: z.string().optional(),
          engine_name: z.string().optional(),
          engine_version: z.string().nullish(),
          result: z.string().nullish(),
          method: z.string().optional(),
          engine_update: z.string().optional()
        })
      )
      .optional(),
    text: z.string().optional(),
    votes: z
      .object({
        positive: integer.optional(),
        negative: integer.optional(),
        abuse: integer.optional()
      })
      .optional(),
    verdict: z.enum(['harmless', 'malicious']).optional(),
    name: z.string().optional(),
    rules: z.string().optional(),
    enabled: z.boolean().optional(),
    limit: integer.optional(),
    modification_date: integer.optional(),
    notification_emails: z.array(z.string()).optional(),
    number_of_rules: integer.optional(),
    corpus: z.string().optional(),
    notification_email: z.string().optional(),
    num_matches: integer.optional(),
    scanned_bytes: integer.optional(),
    start_date: integer.optional(),
    finish_date: integer.optional(),
    progress: z.number().min(0).max(100).optional(),
    apikey: z.string().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    privileges: z
      .record(
        z.string(),
        z
          .object({ granted: z.boolean().optional(), expiration_date: integer.optional() })
          .passthrough()
      )
      .optional(),
    quotas: z
      .record(
        z.string(),
        z.object({ allowed: integer.optional(), used: integer.optional() }).passthrough()
      )
      .optional()
  })
  .passthrough();
export const objectSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    attributes: attributesSchema.optional(),
    links: z
      .object({ self: z.string().optional(), item: z.string().optional() })
      .passthrough()
      .optional(),
    error: z.object({ code: z.string(), message: z.string().optional() }).optional()
  })
  .passthrough();
export type NativeObject = z.infer<typeof objectSchema>;
