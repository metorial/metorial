import { invalid } from './schemas';
export type AuthMode =
  | 'admin_api_key'
  | 'staff_access_token'
  | 'content_api_key'
  | 'legacy_admin';
export type GhostAuth = {
  token: string;
  contentApiKey?: string;
  siteUrl?: string;
  authMode?: Exclude<AuthMode, 'legacy_admin'>;
};
export function siteUrl(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value !== value.trim() ||
    value.includes('\\') ||
    Array.from(value).some(c => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)
  )
    throw invalid(
      'Provide the HTTPS Ghost Admin site URL, including its subdirectory if applicable.'
    );
  const raw = value.includes('://') ? value : `https://${value}`;
  if (raw.split('/').some(p => p === '.' || p === '..') || /%|[?#]/.test(raw))
    throw invalid(
      'The site URL cannot contain query, fragment, encoded, or traversal components.'
    );
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw invalid('Provide a valid Ghost Admin site URL.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !url.hostname.includes('.') ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.local') ||
    /^\d+(\.\d+){3}$/.test(url.hostname) ||
    url.pathname.includes('/ghost/api/') ||
    path.endsWith('/ghost')
  )
    throw invalid(
      'Use an HTTPS Ghost Admin site domain and optional site subdirectory, without credentials or an API path.'
    );
  return `${url.origin}${path}`;
}
export function connection(auth: GhostAuth, config: { adminDomain?: string } = {}) {
  const mode: AuthMode = auth.authMode ?? 'legacy_admin';
  if (
    !['admin_api_key', 'staff_access_token', 'content_api_key', 'legacy_admin'].includes(mode)
  )
    throw invalid('Reconnect with the correct Ghost credential type.');
  return {
    domain: siteUrl(auth.siteUrl ?? config.adminDomain),
    apiKey: auth.token,
    contentApiKey: auth.contentApiKey,
    mode
  };
}
