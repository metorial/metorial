import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { fail } from './contracts';

export const apiHosts = ['https://api.bitwarden.com', 'https://api.bitwarden.eu'] as const;
export const identityHosts = [
  'https://identity.bitwarden.com',
  'https://identity.bitwarden.eu'
] as const;
export function token(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.trim() !== value ||
    Array.from(value).some(c => c.charCodeAt(0) < 33 || c.charCodeAt(0) === 127)
  )
    fail('Reconnect with a valid organization API credential.');
  try {
    encodeURIComponent(value as string);
  } catch {
    fail('The organization credential contains malformed Unicode; reconnect.');
  }
  return value as string;
}
export function guard(value: unknown, secrets: string[]) {
  const seen = new Set<object>();
  function visit(item: unknown): void {
    if (typeof item === 'string') {
      let decoded = item;
      for (let depth = 0; depth < 5; depth++) {
        for (const secret of secrets) {
          if (
            decoded.includes(secret) ||
            decoded.includes(Buffer.from(secret).toString('base64')) ||
            decoded.includes(Buffer.from(secret).toString('base64url'))
          )
            fail(
              'Bitwarden data reflected an authentication credential; the request or response was refused.'
            );
          for (const chunk of decoded.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g))
            if (Buffer.from(chunk[0], 'base64').toString().includes(secret))
              fail(
                'Bitwarden data reflected an authentication credential; the request or response was refused.'
              );
        }
        const next = decoded
          .replace(/(?:%[0-9a-f]{2})+/gi, part =>
            Buffer.from(part.replaceAll('%', ''), 'hex').toString('utf8')
          )
          .replace(/\\u([0-9a-f]{4})/gi, (_match, hex: string) =>
            String.fromCharCode(Number.parseInt(hex, 16))
          );
        if (next === decoded) break;
        decoded = next;
      }
    } else if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item);
      for (const [key, child] of Object.entries(item)) {
        visit(key);
        visit(child);
      }
    }
  }
  visit(value);
}
export function http(baseURL: string, secrets: string[], bearer?: string) {
  if (![...apiHosts, ...identityHosts].includes(baseURL as (typeof apiHosts)[number]))
    fail('Use a documented US or EU Bitwarden cloud host.');
  return createAuthenticatedAxios({
    baseURL,
    timeout: 30000,
    maxRedirects: 0,
    ...(bearer ? { authHeader: { value: `Bearer ${token(bearer)}` } } : {}),
    // The shared adapter captures traces before response interceptors. This bounded
    // native transport screens configured credential reflections before that capture.
    adapter: async config => {
      const url = new URL(`${baseURL}${config.url ?? ''}`);
      if (url.origin !== baseURL || url.hash || url.username || url.password)
        fail('The Bitwarden request host or path is invalid.');
      for (const [key, value] of Object.entries(config.params ?? {}))
        if (value !== undefined) url.searchParams.set(key, String(value));
      guard(config.params, secrets);
      if (typeof config.data === 'string' && !url.pathname.endsWith('/connect/token'))
        guard(config.data, secrets);
      let response: Response;
      try {
        response = await fetch(url, {
          method: (config.method ?? 'get').toUpperCase(),
          headers: config.headers.toJSON() as Record<string, string>,
          ...(config.data !== undefined ? { body: config.data } : {}),
          redirect: 'manual',
          signal: AbortSignal.timeout(30000)
        });
      } catch {
        throw createApiServiceError(
          'Bitwarden could not be reached. A write may have an uncertain outcome; verify before retrying.',
          { reason: 'bitwarden_transport' }
        );
      }
      if (response.status !== 200) {
        await response.body?.cancel();
        throw buildApiServiceError(
          { response: { status: response.status } },
          {
            providerLabel: 'Bitwarden',
            reason: 'bitwarden_api',
            operation: 'organization request',
            parent: {},
            extractMessage: () =>
              'The provider refused the request. Check organization credentials, permissions, edition and exact resource state.'
          }
        );
      }
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        if (reader) {
          for (;;) {
            const part = await reader.read();
            if (part.done) break;
            length += part.value.byteLength;
            if (length > 4 * 1024 * 1024) {
              await reader.cancel();
              fail(
                'Bitwarden response exceeds the bounded 4 MiB limit. Narrow the event date range.'
              );
            }
            chunks.push(part.value);
          }
        }
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        throw createApiServiceError(
          'Bitwarden response could not be read. Reconcile any write before retrying.',
          { reason: 'bitwarden_transport' }
        );
      }
      const body = Buffer.concat(chunks).toString('utf8');
      const headers = Object.fromEntries(response.headers.entries());
      guard(headers, secrets);
      guard(body, secrets);
      let data: unknown = body;
      if (body) {
        try {
          data = JSON.parse(body);
        } catch {
          fail('Bitwarden returned invalid JSON; reconcile any write before retrying.');
        }
      }
      guard(data, secrets);
      return { data, status: response.status, statusText: 'OK', headers, config };
    }
  });
}
