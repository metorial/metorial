import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';

export const API_ROOT = 'https://api.epicgames.dev';
export function identifier(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== 'string' ||
    !value.length ||
    value.length > 4096 ||
    value === '.' ||
    value === '..' ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw createApiServiceError(
      `${label} must be a nonempty provider identifier without control characters.`
    );
}
export function segment(value: string, label = 'Identifier') {
  identifier(value, label);
  return encodeURIComponent(value);
}
export function identifiers(values: string[], maximum: number, label: string) {
  if (!values.length || values.length > maximum || new Set(values).size !== values.length)
    throw createApiServiceError(`${label} requires 1–${maximum} distinct identifiers.`);
  for (const value of values) identifier(value, label);
}
export function whole(value: number, minimum: number, maximum: number, label: string) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw createApiServiceError(
      `${label} must be a whole number from ${minimum} through ${maximum}.`
    );
}
export function time(value: string, label: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw createApiServiceError(`${label} must be an ISO 8601 timestamp with a timezone.`);
}
export function reflected(value: string, secrets: readonly string[]) {
  const candidates = secrets
    .filter(Boolean)
    .flatMap(secret => [
      secret,
      encodeURIComponent(secret),
      Buffer.from(secret).toString('base64'),
      Buffer.from(secret).toString('base64url'),
      Buffer.from(secret).toString('hex'),
      JSON.stringify(secret).slice(1, -1)
    ]);
  let pending = [value];
  const seen = new Set(pending);
  for (let round = 0; round <= 5; round++) {
    const next: string[] = [];
    for (const text of pending) {
      if (candidates.some(candidate => text.includes(candidate))) return true;
      const add = (item: string) => {
        if (item !== text && !seen.has(item)) {
          if (seen.size >= 512)
            throw createApiServiceError(
              'Content exceeds the supported credential inspection bound.'
            );
          seen.add(item);
          next.push(item);
        }
      };
      try {
        add(decodeURIComponent(text));
      } catch {
        /* Not URI-encoded content. */
      }
      add(
        text.replace(/\\u([0-9a-f]{4})/gi, (_, code: string) =>
          String.fromCharCode(Number.parseInt(code, 16))
        )
      );
      for (const item of text.match(/[A-Za-z0-9+/_-]{16,}={0,2}/g) ?? [])
        add(Buffer.from(item, 'base64').toString('utf8'));
      for (const item of text.match(/(?:[0-9a-f]{2}){12,}/gi) ?? [])
        add(Buffer.from(item, 'hex').toString('utf8'));
    }
    pending = next;
    if (!pending.length) break;
  }
  return pending.some(text => candidates.some(candidate => text.includes(candidate)));
}
export function protect(value: unknown, secrets: readonly string[]) {
  const seen = new Set<object>();
  let nodes = 0,
    bytes = 0;
  function visit(item: unknown, depth: number) {
    if (++nodes > 100000 || depth > 48)
      throw createApiServiceError('Content exceeds the supported inspection bound.');
    if (typeof item === 'string') {
      bytes += Buffer.byteLength(item);
      if (bytes > 8 * 1024 * 1024 || reflected(item, secrets))
        throw createApiServiceError(
          'Confidential connection credentials appeared in content. The content was withheld; remove credentials before retrying.'
        );
    }
    if (
      typeof item === 'number' &&
      (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item)))
    )
      throw createApiServiceError('A provider number cannot be represented faithfully.');
    if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item);
      for (const [key, child] of Object.entries(item)) {
        visit(key, depth + 1);
        visit(child, depth + 1);
      }
    }
  }
  visit(value, 0);
}
export function epicError(error: unknown, write = false) {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  const hint =
    status === 401
      ? 'Reconnect the intended Epic client or account.'
      : status === 403
        ? 'Check the client policy, deployment, consent and required service permissions.'
        : status === 404
          ? 'Check the exact resource and deployment identifiers.'
          : status === 429
            ? 'Wait before retrying; no automatic retry was attempted.'
            : 'Check the service and reconcile any changed state before retrying.';
  const safe = buildApiServiceError(error, {
    providerLabel: 'Epic Games',
    reason: 'epic_request',
    parent: {},
    extractMessage: () => hint
  });
  safe.data.outcomeUncertain = write;
  return safe;
}
