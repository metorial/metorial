import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';

export const API_ROOT = 'https://api.spotify.com/v1';
export function requireLegacy(legacy: boolean | undefined, operation: string) {
  if (!legacy)
    throw createApiServiceError(
      `${operation} requires confirmed access to Spotify's legacy endpoints. Select legacy compatibility only for an application entitled to that endpoint, or omit this option.`,
      { reason: 'spotify_access_prerequisite' }
    );
}
export function identifier(value: string, user = false) {
  if (
    !value ||
    value.length > 256 ||
    (!user && !/^[A-Za-z0-9]+$/.test(value)) ||
    (user &&
      (value === '.' ||
        value === '..' ||
        [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
        /[/:\\?#,]/.test(value)))
  )
    throw createApiServiceError(
      'Supply the exact Spotify identifier, without a URL, URI, path separator or query.'
    );
  return encodeURIComponent(value);
}
export function whole(
  value: number | undefined,
  field: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER
) {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max))
    throw createApiServiceError(`${field} must be an integer from ${min} through ${max}.`);
}
export function market(value: string | undefined) {
  if (value !== undefined && !/^[A-Z]{2}$/.test(value))
    throw createApiServiceError('market must be an uppercase two-letter country code.');
  return value;
}
export function uri(value: string, types: readonly string[]) {
  const parts = value.split(':');
  if (parts.length !== 3 || parts[0] !== 'spotify' || !types.includes(parts[1]!) || !parts[2])
    throw createApiServiceError(`Use a Spotify URI for ${types.join(', ')}.`);
  identifier(parts[2]!, parts[1] === 'user');
  return value;
}
export function ids(values: string[], max: number, user = false) {
  if (!Array.isArray(values) || values.length < 1 || values.length > max)
    throw createApiServiceError(
      `Supply from 1 through ${max} identifiers; no split write is performed.`
    );
  for (const value of values) identifier(value, user);
  return values;
}
export function reflected(text: string, secrets: readonly string[]) {
  const candidates = secrets.filter(Boolean).map(secret => ({
    exact: secret.length < 8,
    values: [
      secret,
      JSON.stringify(secret).slice(1, -1),
      Buffer.from(secret).toString('hex'),
      Buffer.from(secret).toString('base64'),
      Buffer.from(secret).toString('base64url')
    ]
  }));
  let pending = [text];
  const seen = new Set(pending);
  let bytes = 0;
  for (let round = 0; round <= 4; round++) {
    const next: string[] = [];
    const add = (value: string) => {
      if (seen.has(value)) return;
      if (seen.size >= 4096)
        throw createApiServiceError('Spotify content exceeds the supported inspection bound.');
      seen.add(value);
      next.push(value);
    };
    for (const value of pending) {
      bytes += Buffer.byteLength(value);
      if (bytes > 16 * 1024 * 1024)
        throw createApiServiceError('Spotify content exceeds the supported inspection bound.');
      if (
        candidates.some(candidate =>
          candidate.values.some(secret =>
            candidate.exact ? value === secret : value.includes(secret)
          )
        )
      )
        return true;
      if (round === 4) continue;
      try {
        add(decodeURIComponent(value));
      } catch {
        add(
          value.replace(/(?:%[0-9a-f]{2})+/gi, part => {
            try {
              return decodeURIComponent(part);
            } catch {
              return part;
            }
          })
        );
      }
      add(
        value.replace(/\\u([0-9a-f]{4})/gi, (_, n: string) =>
          String.fromCharCode(Number.parseInt(n, 16))
        )
      );
      for (const part of value.match(/[A-Za-z0-9+/_-]{12,}={0,2}/g) ?? [])
        add(Buffer.from(part, 'base64').toString('utf8'));
    }
    pending = next;
    if (!pending.length) break;
  }
  return false;
}
export function protect(value: unknown, secrets: readonly string[]) {
  let nodes = 0;
  const visit = (item: unknown, depth: number): void => {
    if (++nodes > 100000 || depth > 30)
      throw createApiServiceError('Spotify content exceeds the supported inspection bound.');
    if (typeof item === 'string' && (item.length > 1024 * 1024 || reflected(item, secrets)))
      throw createApiServiceError(
        'Confidential credentials appeared in content. The result was withheld; remove credentials from request content before retrying.'
      );
    if (
      typeof item === 'number' &&
      (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item)))
    )
      throw createApiServiceError(
        'Spotify returned a number that cannot be represented faithfully.'
      );
    if (item && typeof item === 'object')
      for (const [key, child] of Object.entries(item)) {
        visit(key, depth + 1);
        visit(child, depth + 1);
      }
  };
  visit(value, 0);
}
export function spotifyError(error: unknown, write = false) {
  if (error instanceof ServiceError) return error;
  const status = getApiErrorStatus(error);
  const data = error && typeof error === 'object' && 'data' in error ? error.data : undefined;
  const response =
    data &&
    typeof data === 'object' &&
    'baggage' in data &&
    data.baggage &&
    typeof data.baggage === 'object' &&
    'response' in data.baggage
      ? data.baggage.response
      : undefined;
  const quota =
    response &&
    typeof response === 'object' &&
    'error' in response &&
    response.error &&
    typeof response.error === 'object' &&
    'code' in response.error &&
    response.error.code === 'QUOTA_EXCEEDED';
  const hint =
    status === 401
      ? 'Reconnect the intended Spotify account.'
      : status === 403
        ? 'Check granted scopes, application endpoint entitlement, allowlisted user and Premium/device prerequisites.'
        : status === 404
          ? 'Check the exact identifier and application endpoint access.'
          : status === 429
            ? quota
              ? 'The developer account quota is exhausted; wait for quota recovery. Creating another app does not provide a separate quota.'
              : 'Wait before retrying; no automatic retry was attempted.'
            : 'Check Spotify and inspect any changed state before retrying.';
  const safe = buildApiServiceError(error, {
    providerLabel: 'Spotify',
    reason: 'spotify_request',
    parent: {},
    extractMessage: () => hint,
    extractUpstreamCode: () => (quota ? 'QUOTA_EXCEEDED' : undefined)
  });
  safe.data.outcomeUncertain = write;
  if (
    response &&
    typeof response === 'object' &&
    'retryAfterSeconds' in response &&
    typeof response.retryAfterSeconds === 'number'
  )
    safe.data.retryAfterSeconds = response.retryAfterSeconds;
  return safe;
}
