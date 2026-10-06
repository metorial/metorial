import axios, {
  type AxiosAdapter,
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  getAdapter,
  type InternalAxiosRequestConfig
} from 'axios';
import type { AircallAuth } from './client';
import { parseNativeJson } from './contracts';

// The shared client records native adapter responses before response interceptors.
// Sanitize only known connection secrets here, while preserving its outer tracing.
export function secretGuard(auth: AircallAuth, extra: string[] = []) {
  const secrets = [auth.token, ...extra];
  if (auth.authType === 'basic') {
    const pair = Buffer.from(auth.token, 'base64').toString('utf8'),
      colon = pair.indexOf(':');
    if (colon >= 0) secrets.push(pair, pair.slice(colon + 1));
  }
  const seeds = new Set(secrets.filter(Boolean));
  for (const secret of [...seeds]) {
    const bytes = Buffer.from(secret);
    seeds.add(bytes.toString('base64'));
    seeds.add(bytes.toString('base64url'));
    seeds.add(bytes.toString('hex'));
    seeds.add(bytes.toString('hex').toUpperCase());
  }
  const variants = new Set(seeds);
  for (const secret of seeds) {
    variants.add(JSON.stringify(secret).slice(1, -1));
    const unicode = secret
      .split('')
      .map(v => `\\u${v.charCodeAt(0).toString(16).padStart(4, '0')}`)
      .join('');
    variants.add(unicode);
    variants.add(
      unicode.replace(/\\u([0-9a-f]{4})/g, (_, code: string) => `\\u${code.toUpperCase()}`)
    );
    let encoded = secret;
    for (let layer = 0; layer < 5; layer++) {
      encoded = encodeURIComponent(encoded);
      if (encoded.length <= 65536) {
        variants.add(encoded);
        variants.add(encoded.replace(/%[0-9A-F]{2}/g, v => v.toLowerCase()));
      }
    }
    let full = secret;
    for (let layer = 0; layer < 5; layer++) {
      full = [...Buffer.from(full)].map(v => `%${v.toString(16).padStart(2, '0')}`).join('');
      if (full.length > 65536) break;
      variants.add(full);
      variants.add(full.replace(/%[0-9a-f]{2}/g, v => v.toUpperCase()));
    }
  }
  const ordered = [...variants].filter(Boolean).sort((a, b) => b.length - a.length);
  const string = (value: string, depth = 0): string => {
    let safe = value;
    for (const secret of ordered) safe = safe.split(secret).join('[redacted]');
    if (depth >= 5) return safe;
    const escaped = safe.replace(/\\u([0-9a-fA-F]{4})/g, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16))
    );
    if (escaped !== safe && string(escaped, depth + 1) !== escaped) return '[redacted]';
    try {
      const decoded = decodeURIComponent(safe);
      if (decoded !== safe && string(decoded, depth + 1) !== decoded) return '[redacted]';
    } catch {
      /* Malformed percent text remains available for native receipt validation. */
    }
    const encoded = (candidate: string, encoding: 'hex' | 'base64'): string => {
      const normalized = candidate.replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Buffer.from(normalized, encoding);
      if (
        encoding === 'base64' &&
        bytes.toString('base64').replace(/=+$/, '') !== normalized.replace(/=+$/, '')
      )
        return candidate;
      let decoded: string;
      try {
        decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        return candidate;
      }
      return decoded && string(decoded, depth + 1) !== decoded ? '[redacted]' : candidate;
    };
    safe = safe.replace(/(?:[0-9a-fA-F]{2}){8,}/g, v => encoded(v, 'hex'));
    safe = safe.replace(/[A-Za-z0-9+/_-]{16,}={0,2}/g, v => encoded(v, 'base64'));
    return safe;
  };
  const visit = (value: unknown, depth = 0): unknown => {
    if (depth > 40) return '[unsupported payload]';
    if (typeof value === 'string') return string(value);
    if (Array.isArray(value)) return value.map(v => visit(v, depth + 1));
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [string(k), visit(v, depth + 1)])
      );
    return value;
  };
  return { string, visit };
}
export function protectedAdapter(auth: AircallAuth, extra: string[] = []): AxiosAdapter {
  const native = getAdapter(axios.defaults.adapter),
    guard = secretGuard(auth, extra);
  const safeConfig = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const safe = {
      method: config.method,
      baseURL: config.baseURL,
      url: config.url,
      headers: new AxiosHeaders(
        guard.visit(config.headers.toJSON()) as Record<string, string>
      ),
      data: guard.visit(config.data)
    } as InternalAxiosRequestConfig;
    const draft = (config as unknown as Record<string, unknown>).__slatesHttpTraceDraft;
    if (draft) Object.assign(safe, { __slatesHttpTraceDraft: draft });
    return safe;
  };
  const safeResponse = (
    response: AxiosResponse,
    config: InternalAxiosRequestConfig
  ): AxiosResponse => {
    let data = response.data;
    try {
      data = parseNativeJson(data);
    } catch {
      /* Keep malformed receipt text for the tool boundary, with its native status. */
    }
    return {
      status: response.status,
      statusText: guard.string(response.statusText),
      data: guard.visit(data),
      headers: new AxiosHeaders(guard.visit(response.headers) as Record<string, string>),
      config: safeConfig(config)
    };
  };
  return async config => {
    try {
      return safeResponse(await native(config), config);
    } catch (error) {
      const response =
        axios.isAxiosError(error) && error.response
          ? safeResponse(error.response, config)
          : undefined;
      throw new AxiosError(
        'Aircall request failed; check permissions and reconcile possible effects before retrying.',
        response ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK',
        safeConfig(config),
        undefined,
        response
      );
    }
  };
}
