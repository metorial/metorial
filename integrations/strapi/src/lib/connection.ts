import { createApiServiceError } from 'slates';

export type ApiVersion = '4' | '5';
export type AuthOutput = {
  token: string;
  baseUrl?: string;
  apiVersion?: ApiVersion;
  authMode?: 'api_token' | 'jwt_login';
  jwtManagement?: 'legacy-support' | 'refresh';
  refreshToken?: string;
  expiresAt?: number;
  userId?: number;
  mediaOrigins?: string[];
};
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'strapi_validation', parent: {} });
export const control = (value: string) =>
  [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
export function baseUrl(value: unknown): string {
  if (typeof value !== 'string' || !value || value !== value.trim() || control(value))
    throw invalid('Provide the exact Strapi instance URL in the connection settings.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalid('Provide a valid Strapi instance URL.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    /%2f|%5c|%2e/i.test(url.pathname)
  )
    throw invalid(
      'Use an HTTPS instance URL without credentials, query or fragment; HTTP is supported only for localhost development. Preserve any deployment path prefix.'
    );
  return url.toString().replace(/\/+$/, '');
}
export function token(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value !== value.trim() ||
    /\s/.test(value) ||
    control(value) ||
    /^Bearer /i.test(value)
  )
    throw invalid(
      'Provide the raw Strapi API token or JWT without a Bearer prefix or whitespace.'
    );
  try {
    encodeURIComponent(value);
  } catch {
    throw invalid('The token must contain valid Unicode.');
  }
  return value;
}
export function version(value: unknown): ApiVersion {
  if (value === undefined) return '5';
  if (value !== '4' && value !== '5')
    throw invalid('Select Strapi API version 4 or 5 in the connection settings.');
  return value;
}
export function origins(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20)
    throw invalid('Provide at most 20 trusted media origins.');
  return value.map(item => {
    const normalized = baseUrl(item);
    const url = new URL(normalized);
    if (url.protocol !== 'https:' || url.pathname !== '/')
      throw invalid('Trusted media origins must be exact HTTPS origins without a path.');
    return url.origin;
  });
}
export function connection(auth: AuthOutput, config: Record<string, unknown> = {}) {
  const bound = baseUrl(auth.baseUrl ?? config.baseUrl);
  if (auth.baseUrl && config.baseUrl !== undefined && baseUrl(config.baseUrl) !== bound)
    throw invalid(
      'The saved connection and legacy configuration identify different Strapi instances. Restore the matching instance or reconnect before using tools.'
    );
  return {
    ...auth,
    baseUrl: bound,
    token: token(auth.token),
    apiVersion: version(auth.apiVersion ?? config.apiVersion),
    mediaOrigins: origins(auth.mediaOrigins ?? config.mediaOrigins)
  };
}
export function integer(
  value: number,
  name: string,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER
) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw invalid(`${name} must be an exact integer from ${minimum} through ${maximum}.`);
  return value;
}
export function segment(value: string, name: string) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 200)
    throw invalid(
      `${name} must be the exact API identifier, not a URL, path or query. Obtain content-type API IDs from your instance's Content-Type Builder.`
    );
  return encodeURIComponent(value);
}
export function credentialIn(value: string, secrets: string[]): boolean {
  const variants = secrets
    .filter(Boolean)
    .flatMap(secret => [
      secret,
      encodeURIComponent(secret),
      [...Buffer.from(secret)].map(byte => `%${byte.toString(16).padStart(2, '0')}`).join(''),
      [...Buffer.from(secret)]
        .map(byte => `%${byte.toString(16).padStart(2, '0').toUpperCase()}`)
        .join(''),
      Buffer.from(secret).toString('base64'),
      Buffer.from(secret).toString('base64url')
    ]);
  let decoded = value;
  for (let round = 0; round <= 4; round++) {
    if (variants.some(secret => decoded.includes(secret))) return true;
    if (round === 4) break;
    const next = decoded.replace(/(?:%[a-f0-9]{2})+/gi, bytes =>
      Buffer.from(bytes.replaceAll('%', ''), 'hex').toString('utf8')
    );
    if (next === decoded) break;
    decoded = next;
  }
  return false;
}
export function secretFree(
  value: unknown,
  secrets: string[],
  seen = new Set<object>()
): boolean {
  if (typeof value === 'string') return !credentialIn(value, secrets);
  if (!value || typeof value !== 'object') return true;
  if (seen.has(value)) return false;
  seen.add(value);
  for (const [key, item] of Object.entries(value)) {
    if (
      credentialIn(key, secrets) ||
      /^(authorization|password|jwt|refreshToken|access_token|apiToken)$/i.test(key) ||
      !secretFree(item, secrets, seen)
    )
      return false;
  }
  seen.delete(value);
  return true;
}
export const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
