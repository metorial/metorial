import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';

export function fail(message: string): never {
  throw createApiServiceError(message, { parent: {} });
}
export function text(
  value: unknown,
  label: string,
  maximum = 4096,
  allowLines = false
): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum)
    fail(`${label} must be a nonempty string within ${maximum} characters.`);
  if (
    [...value].some(
      c =>
        (c.charCodeAt(0) < 32 && !(allowLines && [9, 10, 13].includes(c.charCodeAt(0)))) ||
        c.charCodeAt(0) === 127
    )
  )
    fail(`${label} cannot contain control characters.`);
  return value;
}
export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function jsonBody(value: unknown): string {
  let encoded: string | undefined;
  try {
    encoded = JSON.stringify(value);
  } catch {
    fail('The request must contain serializable JSON values.');
  }
  if (!encoded || Buffer.byteLength(encoded) > 1024 * 1024)
    fail('The request exceeds the local 1 MiB JSON limit. Use a smaller request.');
  return encoded;
}
export function ednString(value: string): string {
  return JSON.stringify(value);
}
function reflected(value: string, token: string, depth = 0): boolean {
  if (!token) return false;
  if (
    [
      token,
      Buffer.from(token).toString('base64'),
      Buffer.from(token).toString('base64url')
    ].some(secret => value.includes(secret))
  )
    return true;
  if (depth >= 4) return false;
  const decoded = value
    .replace(/(?:%[a-f0-9]{2})+/gi, part => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .replace(/\\u([a-f0-9]{4})/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
  if (decoded !== value && reflected(decoded, token, depth + 1)) return true;
  for (const part of value.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
    const bytes = Buffer.from(part[0], 'base64');
    const plain = bytes.toString('utf8');
    if (Buffer.from(plain).equals(bytes) && reflected(plain, token, depth + 1)) return true;
  }
  return false;
}
export function assertNoAuthenticationData(value: unknown, token: string, depth = 0): void {
  if (depth > 64) fail('The request or response exceeds the local nesting limit.');
  if (typeof value === 'string') {
    if (reflected(value, token))
      fail(
        'Authentication data appeared in request or response content. No successful result can be confirmed; inspect original write targets before retrying.'
      );
  } else if (Array.isArray(value)) {
    for (const item of value) assertNoAuthenticationData(item, token, depth + 1);
  } else if (record(value)) {
    for (const [key, item] of Object.entries(value)) {
      assertNoAuthenticationData(key, token, depth + 1);
      assertNoAuthenticationData(item, token, depth + 1);
    }
  }
}
export function privacy(value: unknown, token: string): unknown {
  if (typeof value === 'string') return reflected(value, token) ? '[redacted]' : value;
  if (Array.isArray(value)) return value.map(item => privacy(item, token));
  if (record(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        String(privacy(key, token)),
        privacy(item, token)
      ])
    );
  return value;
}
export function apiError(error: unknown, writing: boolean) {
  const status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Roam Research',
      reason: 'roam_api_failed',
      parent: {},
      extractMessage: () =>
        writing
          ? 'A write may have changed the graph, including part of a batch. Read the original target UIDs before retrying; do not blindly resend.'
          : 'The read failed. Check the backend graph token, graph name and permissions. Encrypted or local-only graphs are unsupported.',
      formatMessage: ({ message, statusLabel }) =>
        `Roam Research API request failed: ${statusLabel}${message}`
    }
  );
}
