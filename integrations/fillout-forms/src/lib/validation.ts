import { isIP } from 'node:net';
import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';
import type { z } from 'zod';

export function text(value: string, label: string): string {
  if (
    !value ||
    value.trim() !== value ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw createApiServiceError(
      `${label} must be nonempty and contain no surrounding whitespace or control characters.`,
      { parent: {} }
    );
  return value;
}
export function id(value: string, label: string): string {
  text(value, label);
  if (value === '.' || value === '..')
    throw createApiServiceError(
      `${label} must be an exact identifier from list_forms or list_submissions.`,
      { parent: {} }
    );
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError(
      `${label} contains invalid Unicode. Use the exact provider identifier.`,
      { parent: {} }
    );
  }
}
export function httpsUrl(value: string, originOnly = false): URL {
  let url: URL;
  try {
    url = new URL(text(value, 'URL'));
  } catch {
    throw createApiServiceError(
      'Use an absolute HTTPS URL from the Fillout dashboard or exact submission.',
      { parent: {} }
    );
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    !host.includes('.') ||
    isIP(host.replace(/^\[|\]$/g, '')) ||
    /(?:^|\.)(?:localhost|local|internal|invalid|test|example)$/.test(host) ||
    (originOnly && (url.search || !['', '/'].includes(url.pathname)))
  )
    throw createApiServiceError(
      'Use a public HTTPS API origin from the Fillout dashboard, or a public HTTPS document URL from the exact submission. Credentials, fragments and local addresses are unsupported.',
      { parent: {} }
    );
  return url;
}
export function baseUrl(value?: string): string {
  return httpsUrl(value ?? 'https://api.fillout.com', true).origin;
}
export function date(value: string | undefined, label: string): void {
  if (value === undefined) return;
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(
      value
    );
  const calendar = new Date(0);
  if (parts) calendar.setUTCFullYear(Number(parts[1]), Number(parts[2]), 0);
  if (
    !parts ||
    Number(parts[2]) < 1 ||
    Number(parts[2]) > 12 ||
    Number(parts[3]) < 1 ||
    Number(parts[3]) > calendar.getUTCDate() ||
    Number(parts[4]) > 23 ||
    Number(parts[5]) > 59 ||
    Number(parts[6]) > 59 ||
    !Number.isFinite(Date.parse(value))
  )
    throw createApiServiceError(
      `${label} must be a valid ISO 8601 timestamp with a timezone.`,
      { parent: {} }
    );
}
export function apiError(error: unknown, operation: string) {
  const status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Fillout',
      operation,
      reason: 'fillout_api',
      parent: {},
      extractMessage: () => '',
      formatMessage: () =>
        `Fillout ${operation} was not confirmed${typeof status === 'number' ? ` (HTTP ${status})` : ''}. Check the API origin, credentials and access. For writes, inspect submissions before retrying; a failed response does not prove no changes occurred.`
    }
  );
}
export function parse<T>(schema: z.ZodType<T>, value: unknown, operation: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      `Fillout returned an unsupported ${operation} response. Re-read the exact resource; do not retry a write blindly.`,
      { reason: 'fillout_response', parent: {} }
    );
  return parsed.data;
}
export function privacy(value: unknown, secrets: string[]): unknown {
  const variants = secrets
    .filter(Boolean)
    .flatMap(secret => [
      secret,
      Buffer.from(secret).toString('base64'),
      Buffer.from(secret).toString('base64url')
    ]);
  const clean = (value: string) => {
    let decoded = value;
    for (let i = 0; i < 4; i++) {
      if (variants.some(secret => decoded.includes(secret))) return '[redacted]';
      const next = decoded
        .replace(/\\u([a-f0-9]{4})/gi, (_, hex: string) =>
          String.fromCharCode(Number.parseInt(hex, 16))
        )
        .replace(/(?:%[0-9a-f]{2})+/gi, segment =>
          Buffer.from(segment.replace(/%/g, ''), 'hex').toString('utf8')
        );
      if (next === decoded) break;
      decoded = next;
    }
    if (variants.some(secret => decoded.includes(secret))) return '[redacted]';
    return value;
  };
  const visit = (v: unknown, depth: number): unknown => {
    if (depth > 64)
      throw createApiServiceError('Fillout response nesting exceeds the supported limit.', {
        parent: {}
      });
    if (typeof v === 'string') return clean(v);
    if (Array.isArray(v)) return v.map(child => visit(child, depth + 1));
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v).map(([key, child]) => [clean(key), visit(child, depth + 1)])
      );
    return v;
  };
  return visit(value, 0);
}
export function jsonValue(value: unknown, depth = 0, seen = new Set<object>()): boolean {
  if (depth > 64) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (value && typeof value === 'object') {
    if (seen.has(value)) return false;
    seen.add(value);
    const valid = Array.isArray(value)
      ? value.every(child => jsonValue(child, depth + 1, seen))
      : Object.getPrototypeOf(value) === Object.prototype &&
        Object.values(value).every(child => jsonValue(child, depth + 1, seen));
    seen.delete(value);
    return valid;
  }
  return false;
}
