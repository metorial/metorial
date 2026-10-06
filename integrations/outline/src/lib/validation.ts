import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';
import type { z } from 'zod';

export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw createApiServiceError(message, { parent: {} });
}
export function identifier(value: string, label = 'Identifier'): string {
  requireValue(
    value.length > 0 &&
      value.trim() === value &&
      ![...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127),
    `${label} must be an exact, nonempty provider identifier without whitespace or controls.`
  );
  return value;
}
export function instanceUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(identifier(value, 'Instance URL'));
  } catch {
    throw createApiServiceError(
      'Set the exact HTTPS Outline instance URL in API Token authentication.',
      { parent: {} }
    );
  }
  requireValue(
    url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      !url.pathname.split('/').some(p => p === '.' || p === '..'),
    'Use your exact HTTPS Outline instance URL, without credentials, query parameters or fragments.'
  );
  requireValue(
    !url.pathname.endsWith('/api') && !url.pathname.endsWith('/api/'),
    'Enter the instance URL without the /api suffix.'
  );
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}
export function parse<T>(schema: z.ZodType<T>, data: unknown, operation: string): T {
  const result = schema.safeParse(data);
  requireValue(
    result.success,
    `Outline returned an unsupported ${operation} response. Re-read the exact resource before retrying a write; the operation may already have taken effect.`
  );
  return result.data;
}
export function apiError(error: unknown, operation: string) {
  const status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Outline',
      operation,
      reason: 'outline_api',
      parent: {},
      extractMessage: () => '',
      formatMessage: () =>
        `Outline ${operation} was not confirmed${typeof status === 'number' ? ` (HTTP ${status})` : ''}. Check the configured instance, token permissions and server version. Inspect current state before retrying a write; failed responses do not prove no effects occurred.`
    }
  );
}
export function validateJson(value: unknown, depth = 0, seen = new Set<object>()): boolean {
  if (depth > 64) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every(v => validateJson(v, depth + 1, seen))
    : Object.getPrototypeOf(value) === Object.prototype &&
      Object.values(value).every(v => validateJson(v, depth + 1, seen));
  seen.delete(value);
  return valid;
}
export function assertNoCredential(value: unknown, token: string): void {
  const variants = [
    token,
    Buffer.from(token).toString('base64'),
    Buffer.from(token).toString('base64url')
  ];
  const inspect = (value: unknown, depth: number): void => {
    requireValue(depth <= 64, 'Outline data nesting exceeds the supported limit.');
    if (typeof value === 'string') {
      let decoded = value;
      for (let round = 0; round < 6; round++) {
        const encoded = [...decoded.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)];
        requireValue(
          !variants.some(secret => secret && decoded.includes(secret)) &&
            !encoded.some(match =>
              Buffer.from(match[0], 'base64').toString('utf8').includes(token)
            ),
          'Authentication data appeared in Outline request or response content. The operation was not confirmed; inspect current state before retrying a write.'
        );
        const next = decoded
          .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) =>
            String.fromCharCode(Number.parseInt(hex, 16))
          )
          .replace(/(?:%[0-9a-f]{2})+/gi, segment =>
            Buffer.from(segment.replace(/%/g, ''), 'hex').toString('utf8')
          );
        if (next === decoded) break;
        decoded = next;
      }
    } else if (Array.isArray(value)) {
      for (const entry of value) inspect(entry, depth + 1);
    } else if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        inspect(key, depth + 1);
        inspect(entry, depth + 1);
      }
    }
  };
  inspect(value, 0);
}
export function rejectFields(input: Record<string, unknown>, allowed: string[]): void {
  const unsupported = Object.keys(input).filter(
    k => input[k] !== undefined && !allowed.includes(k)
  );
  requireValue(
    unsupported.length === 0,
    `Fields ${unsupported.join(', ')} do not apply to this action. Remove them before retrying.`
  );
}
