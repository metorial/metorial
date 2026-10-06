import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';
import { z } from 'zod';

export const orgIdInput = z
  .string()
  .optional()
  .describe(
    'Authorized organization ID. Call list_organizations to discover IDs. A connection fixed to an organization cannot target another one.'
  );
export const regions = {
  us: 'jumpcloud.com',
  eu: 'eu.jumpcloud.com',
  in: 'in.jumpcloud.com'
} as const;
export type Region = keyof typeof regions;
export function region(value: unknown): Region {
  if (value === undefined) return 'us';
  if (value !== 'us' && value !== 'eu' && value !== 'in')
    throw createApiServiceError(
      'Choose the US, EU or India region for the intended connection.'
    );
  return value;
}
export function identifier(value: unknown, label = 'Resource ID'): asserts value is string {
  if (
    typeof value !== 'string' ||
    !value.length ||
    value.length > 256 ||
    value !== value.trim() ||
    value === '.' ||
    value === '..' ||
    [...value].some(
      c => c.length === 1 && c.charCodeAt(0) >= 0xd800 && c.charCodeAt(0) <= 0xdfff
    ) ||
    /[\\/?#]/.test(value) ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw createApiServiceError(
      `${label} must be an exact nonempty identifier without path or control characters.`
    );
}
export function credential(
  value: unknown,
  label = 'Connection credential'
): asserts value is string {
  if (
    typeof value !== 'string' ||
    !value.length ||
    value.length > 16384 ||
    [...value].some(
      c => c.length === 1 && c.charCodeAt(0) >= 0xd800 && c.charCodeAt(0) <= 0xdfff
    ) ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw createApiServiceError(
      `${label} must be a nonempty credential without control characters.`
    );
}
export function whole(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string
): asserts value is number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  )
    throw createApiServiceError(
      `${label} must be a whole number from ${minimum} to ${maximum}.`
    );
}
export function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw createApiServiceError(`JumpCloud returned an invalid ${label}.`);
  return value as Record<string, unknown>;
}
export function matches(value: unknown, secrets: readonly string[]) {
  const candidates = secrets.filter(s => s.length > 0);
  const spellings = candidates.flatMap(secret => [
    secret,
    encodeURIComponent(secret),
    Buffer.from(secret).toString('base64'),
    Buffer.from(secret).toString('base64url'),
    Buffer.from(secret).toString('hex'),
    [...secret].map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join('')
  ]);
  const queue = typeof value === 'string' ? [value] : [];
  const seen = new Set<string>();
  for (let i = 0; i < queue.length && i < 64; i++) {
    const text = queue[i]!;
    if (spellings.some(secret => text.includes(secret))) return true;
    if (seen.has(text)) continue;
    seen.add(text);
    try {
      const decoded = decodeURIComponent(text);
      if (decoded !== text) queue.push(decoded);
    } catch {}
    for (const segment of text.matchAll(/[A-Za-z0-9+/_-]{12,}={0,2}/g)) {
      if (segment[0] !== text) queue.push(segment[0]);
    }
    if (/^[A-Za-z0-9+/_=-]+$/.test(text) && text.length >= 12 && text.length % 4 !== 1) {
      const decoded = Buffer.from(text, 'base64url').toString('utf8');
      if (decoded !== text) queue.push(decoded);
    }
    if (/^(?:[a-f\d]{2}){8,}$/i.test(text))
      queue.push(Buffer.from(text, 'hex').toString('utf8'));
    if (/\\u[0-9a-f]{4}/i.test(text))
      queue.push(
        text.replace(/\\u([0-9a-f]{4})/gi, (_match, code: string) =>
          String.fromCharCode(Number.parseInt(code, 16))
        )
      );
  }
  return (
    queue.length > 64 ||
    queue.slice(64).some(text => spellings.some(secret => text.includes(secret)))
  );
}
export function protect(value: unknown, secrets: readonly string[]) {
  const pending = [value];
  let count = 0;
  while (pending.length) {
    if (++count > 100_000)
      throw createApiServiceError(
        'Response exceeds the supported inspection bound; request a smaller page.'
      );
    const current = pending.pop();
    if (typeof current === 'string' && matches(current, secrets))
      throw createApiServiceError(
        'The response reflected a connection credential. Content was withheld; reconnect or investigate the provider response.'
      );
    if (current && typeof current === 'object') {
      for (const [key, child] of Object.entries(current)) {
        pending.push(key);
        pending.push(child);
      }
    }
  }
}
export function upstream(
  error: unknown,
  write = false
): ReturnType<typeof createApiServiceError> {
  const status = getApiErrorStatus(error);
  const hint =
    status === 401
      ? 'Reconnect the intended regional account.'
      : status === 403
        ? 'Check the role, organization and feature permissions.'
        : status === 404
          ? 'Check the exact resource and organization IDs.'
          : status === 429
            ? 'Wait before retrying; no automatic retry was attempted.'
            : 'Check the provider and requested parameters.';
  const normalized = buildApiServiceError(error, {
    providerLabel: 'JumpCloud',
    parent: {},
    reason: 'jumpcloud_request',
    extractMessage: () => hint
  });
  if (!write) return normalized;
  const nativeStatus = normalized.data.upstreamStatus;
  const safe = createApiServiceError(
    'The JumpCloud action may already exist, but its receipt could not be verified. Reconcile the exact resource state and do not retry blindly.',
    {
      parent: {},
      reason: 'jumpcloud_request',
      ...(typeof nativeStatus === 'number' || typeof nativeStatus === 'string'
        ? { upstreamStatus: nativeStatus }
        : {})
    }
  );
  safe.data.outcomeUncertain = true;
  return safe;
}
