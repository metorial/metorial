import { AuthConfigSecretRedactor, createApiServiceError, getApiErrorStatus } from 'slates';
import { invalid, malformed } from './schemas';
export function tokenValue(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 16384 ||
    [...value].some(
      c =>
        (c.codePointAt(0) ?? 0) <= 32 ||
        c.charCodeAt(0) === 127 ||
        ((c.codePointAt(0) ?? 0) >= 0xd800 && (c.codePointAt(0) ?? 0) <= 0xdfff)
    )
  )
    throw invalid(
      'Supply a valid Nango Environment API key and reconnect. Account API keys cannot access environment tools.'
    );
  return value;
}
export function baseUrl(value: unknown): string {
  if (typeof value !== 'string' || !value || value.trim() !== value || value.includes('\\'))
    throw invalid('Use the exact HTTPS origin of Nango Cloud or your Nango instance.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalid('Use a valid Nango instance URL.');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  )
    throw invalid(
      'Use the exact HTTPS origin of your Nango instance, without credentials, paths, query or fragments. HTTP is allowed only for legacy local loopback development.'
    );
  return url.origin;
}
export function resolveBase(
  auth: { baseUrl?: string },
  config?: Record<string, unknown> | null
) {
  return baseUrl(auth.baseUrl ?? config?.baseUrl ?? 'https://api.nango.dev');
}
export function nativeStatus(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : undefined;
}
export function serviceFailure(error: unknown) {
  let status: number | undefined;
  try {
    status = nativeStatus(getApiErrorStatus(error));
  } catch {
    // Untrusted transport getters must not replace the safe service failure.
  }
  return createApiServiceError(
    'Nango request failed' +
      (status ? ' (HTTP ' + status + ')' : '') +
      '. ' +
      (status === 401
        ? 'Check the Environment API key and bound instance; reconnect if needed.'
        : status === 403
          ? 'Check Environment API key scopes and exact integration/connection access.'
          : status === 404
            ? 'Check the exact resource ID and instance access.'
            : status === 429
              ? 'Wait for the provider rate limit before retrying.'
              : 'Read the exact resource or native sync state before retrying; a previous operation may already have taken effect.'),
    { reason: 'upstream_error', upstreamStatus: status }
  );
}
const safeCredentialMetadata = new Set([
  'auth_mode',
  'auth_type',
  'token_type',
  'token_url',
  'token_endpoint',
  'token_expires_at',
  'expires_at',
  'expires_in',
  'scope',
  'scopes',
  'client_id'
]);
const sensitiveKey = (key: string) =>
  !safeCredentialMetadata.has(key.toLowerCase()) && secretName.test(key);
const secretName =
  /(?:^|[^a-z0-9])(?:credentials?|secrets?|auth|authorization|tokens?|access[-_.]?token|refresh[-_.]?token|session[-_.]?token|api[-_.]?key|client[-_.]?secret|private[-_.]?key|password|oauth[-_.]?token|oauth[-_.]?token[-_.]?secret|cookie)(?:$|[^a-z0-9])/i;
export function containsSecretField(value: unknown): boolean {
  let nodes = 0;
  const visit = (item: unknown, depth: number): boolean => {
    if (++nodes > 100000 || depth > 64)
      throw invalid('The JSON value exceeds the supported size or nesting limit.');
    if (Array.isArray(item)) return item.some(child => visit(child, depth + 1));
    if (item && typeof item === 'object')
      return Object.entries(item).some(
        ([key, child]) => sensitiveKey(key) || visit(child, depth + 1)
      );
    return false;
  };
  return visit(value, 0);
}
export function importedSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(importedSecrets);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'type' && !safeCredentialMetadata.has(key.toLowerCase()))
        .map(([key, child]) => [key, importedSecrets(child)])
    );
  return value;
}
export function payloadSize(value: unknown) {
  let encoded: string | undefined;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw invalid('Supply serializable JSON.');
  }
  if (encoded && Buffer.byteLength(encoded) > 1024 * 1024)
    throw invalid('Request JSON exceeds the local 1 MiB limit.');
}
export function safePayload(value: unknown) {
  if (containsSecretField(value))
    throw invalid(
      'Do not submit provider credentials through general data, metadata, action or proxy fields. Use a trusted Nango backend or Connect UI for credentials.'
    );
  payloadSize(value);
}
export function publicData(value: unknown, secrets: Record<string, unknown>): unknown {
  const redactor = new AuthConfigSecretRedactor(secrets);
  let nodes = 0;
  const visit = (item: unknown, depth: number): unknown => {
    if (++nodes > 100000 || depth > 64) throw malformed();
    if (typeof item === 'string') {
      let decoded = item;
      for (let round = 0; round <= 5; round++) {
        if (redactor.redactEmbedded(decoded) !== decoded) return '[redacted]';
        for (const match of decoded.matchAll(/[A-Za-z0-9+/_-]{12,}={0,2}/g))
          if (
            redactor.redactEmbedded(Buffer.from(match[0], 'base64').toString('utf8')) !==
            Buffer.from(match[0], 'base64').toString('utf8')
          )
            return '[redacted]';
        if (round === 5) break;
        const next = decoded
          .replace(/\\+u([a-f0-9]{4})/gi, (_, hex: string) =>
            String.fromCharCode(Number.parseInt(hex, 16))
          )
          .replace(/(?:%[a-f0-9]{2})+/gi, bytes =>
            Buffer.from(bytes.replaceAll('%', ''), 'hex').toString('utf8')
          );
        if (next === decoded) break;
        decoded = next;
      }
      return item;
    }
    if (Array.isArray(item)) return item.map(child => visit(child, depth + 1));
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item).map(([key, child]) => [
          String(visit(key, depth + 1)),
          sensitiveKey(key) ? '[redacted]' : visit(child, depth + 1)
        ])
      );
    return item;
  };
  return visit(value, 0);
}
export function encodedId(value: string) {
  if (value === '.' || value === '..')
    throw invalid('Use an exact resource ID rather than a path segment.');
  return encodeURIComponent(value);
}
