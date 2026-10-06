import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined,
  requestAxios
} from 'slates';

export const API_ORIGIN = 'https://webexapis.com';
export const API_BASE = `${API_ORIGIN}/v1`;
export function required(value: unknown, name: string): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    [...value].some(c => {
      const code = c.charCodeAt(0);
      return code < 32 || code === 127 || (c.length === 1 && code >= 0xd800 && code <= 0xdfff);
    })
  )
    throw createApiServiceError(`Provide a valid ${name}.`);
  return value;
}
export function segment(value: unknown): string {
  const id = required(value, 'resource ID');
  if (id === '.' || id === '..')
    throw createApiServiceError(
      'Use the exact resource ID returned by Webex, not a path segment.'
    );
  return encodeURIComponent(id);
}
export function protect(value: unknown, secrets: readonly string[]) {
  const patterns = secrets
    .filter(Boolean)
    .flatMap(s => [
      required(s, 'credential'),
      encodeURIComponent(s),
      Buffer.from(s).toString('base64'),
      Buffer.from(s).toString('hex')
    ]);
  const seen = new Set<object>();
  let count = 0;
  const visit = (item: unknown, depth: number): void => {
    if (++count > 50000 || depth > 30)
      throw createApiServiceError('Webex returned an oversized or deeply nested response.');
    if (typeof item === 'string') {
      const candidates = new Set([item]);
      let decodedSize = item.length;
      const add = (candidate: string) => {
        if (candidates.has(candidate)) return;
        decodedSize += candidate.length;
        if (candidates.size >= 2048 || decodedSize > 16 * 1024 * 1024)
          throw createApiServiceError('Webex returned an oversized encoded value.');
        candidates.add(candidate);
      };
      for (let pass = 0; pass < 3; pass++)
        for (const candidate of [...candidates]) {
          let decoded: string | undefined;
          try {
            decoded = decodeURIComponent(candidate);
          } catch {
            /* Not URL encoded. */
          }
          if (decoded !== undefined) add(decoded);
          add(
            candidate.replace(/\\u([a-f\d]{4})/gi, (_match, code: string) =>
              String.fromCharCode(Number.parseInt(code, 16))
            )
          );
          for (const encoded of candidate.match(/[A-Za-z0-9+/_=-]{8,}/g) ?? [])
            add(Buffer.from(encoded, 'base64').toString('utf8'));
        }
      if ([...candidates].some(candidate => patterns.some(s => candidate.includes(s))))
        throw createApiServiceError(
          'Webex returned credential-bearing data. Reconnect and retry the read; do not repeat a write without checking its outcome.'
        );
    } else if (item && typeof item === 'object' && !seen.has(item)) {
      seen.add(item);
      for (const [key, entry] of Object.entries(item)) {
        visit(key, depth + 1);
        visit(entry, depth + 1);
      }
    }
  };
  visit(value, 0);
}
export function apiError(error: unknown, operation: string) {
  return buildApiServiceError(error, {
    providerLabel: 'Webex',
    reason: 'webex_api_error',
    operation,
    parent: {},
    extractMessage: () =>
      'Check the credential, required scopes, resource access and Webex role or meeting license. Writes are not retried automatically; reconcile an uncertain outcome before repeating it.'
  });
}
export function webexHttp(token?: string, secrets: string[] = []) {
  if (token !== undefined) required(token, 'access token');
  const protectedValues = [...secrets, ...(token ? [token] : [])];
  return createAuthenticatedAxios({
    baseURL: API_BASE,
    authHeader: token ? { value: `Bearer ${token}` } : undefined,
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: 4 * 1024 * 1024,
    // Validate before the shared HTTP trace captures a provider response. No raw transport graph is retained.
    adapter: async config => {
      const url = new URL(
        config.url?.startsWith('https://') ? config.url : `${API_BASE}${config.url ?? ''}`
      );
      if (
        url.origin !== API_ORIGIN ||
        !url.pathname.startsWith('/v1/') ||
        url.username ||
        url.password ||
        url.hash
      )
        throw createApiServiceError('Only the documented Webex API origin is supported.');
      for (const [key, value] of Object.entries(pickDefined(config.params ?? {}))) {
        url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
      }
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(config.headers.toJSON()))
        if (value !== undefined && value !== null) headers[key] = String(value);
      let response: Response;
      try {
        response = await fetch(url, {
          method: config.method?.toUpperCase(),
          headers,
          body: config.data,
          redirect: 'manual',
          signal: AbortSignal.timeout(30000)
        });
      } catch {
        throw createApiServiceError(
          'Webex could not be reached. A write may have been accepted; check its outcome before repeating it.'
        );
      }
      let size = 0;
      const chunks: Uint8Array[] = [];
      try {
        if (response.body) {
          const reader = response.body.getReader();
          try {
            for (;;) {
              const next = await reader.read();
              if (next.done) break;
              size += next.value.byteLength;
              if (size > 4 * 1024 * 1024)
                throw createApiServiceError(
                  'Webex returned more than 4 MiB. Use a smaller page. A write outcome may be uncertain.'
                );
              chunks.push(next.value);
            }
          } finally {
            await reader.cancel().catch(() => undefined);
            reader.releaseLock();
          }
        }
      } catch (error) {
        throw apiError(error, 'response reading');
      }
      const text = Buffer.concat(chunks, size).toString('utf8');
      const responseHeaders: Record<string, string> = {};
      // Screen every header, including values allowed into the public protocol's HTTP traces.
      for (const [key, value] of response.headers) protect({ [key]: value }, protectedValues);
      for (const key of ['content-type', 'link', 'retry-after']) {
        const value = response.headers.get(key);
        if (value) responseHeaders[key] = value;
      }
      let data: unknown;
      if (response.status >= 200 && response.status < 300 && text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw createApiServiceError(
            'Webex returned an invalid JSON receipt. Reconcile write outcomes before repeating them.'
          );
        }
        // OAuth's expected token fields stay internal; all other responses must be credential-free.
        if (url.pathname !== '/v1/access_token') protect(data, protectedValues);
        else if (isApiErrorRecord(data)) {
          const { access_token: _access, refresh_token: _refresh, ...rest } = data;
          protect(rest, protectedValues);
        }
      } else {
        data =
          response.status === 204
            ? undefined
            : {
                message:
                  'Webex request failed. Check scopes, role, license, resource access and current file scanning state.'
              };
      }
      return {
        data,
        status: response.status,
        statusText: '',
        headers: responseHeaders,
        config
      };
    }
  });
}
export async function exchangeToken(body: Record<string, string>) {
  const api = webexHttp(
    undefined,
    [body.client_secret, body.code, body.refresh_token].filter((v): v is string => Boolean(v))
  );
  const response = await requestAxios(
    'token exchange',
    () =>
      api.post('/access_token', new URLSearchParams(body).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }),
    apiError
  );
  if (response.status !== 200)
    throw apiError({ response: { status: response.status } }, 'token exchange');
  return response.data as unknown;
}
export function pageUrl(value: string, path: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Webex returned an invalid next-page URL.');
  }
  if (
    url.origin !== API_ORIGIN ||
    url.pathname !== `/v1${path}` ||
    url.username ||
    url.password ||
    url.hash
  )
    throw createApiServiceError('Use the next-page URL for this exact Webex collection.');
  return url;
}
export function nextPage(headers: unknown, path: string) {
  const link = getResponseHeaderValue(headers, 'link');
  if (!link) return undefined;
  const matches = [...link.matchAll(/<([^>]+)>\s*;\s*rel="?next"?/g)];
  if (matches.length > 1) throw createApiServiceError('Webex returned ambiguous pagination.');
  return matches[0]
    ? pageUrl(required(matches[0][1], 'next-page URL'), path).toString()
    : undefined;
}
