import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { SlateContext } from '../context';

export interface SlateHttpTraceTextBody {
  contentType?: string;
  text: string;
  truncated?: boolean;
}

export interface SlateHttpTrace {
  startedAt: string;
  durationMs: number;
  request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: SlateHttpTraceTextBody;
  };
  response?: {
    status: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: SlateHttpTraceTextBody;
  };
  error?: {
    code?: string;
    message: string;
  };
}

interface SlateHttpTraceDraft {
  context: SlateContext<any, any, any>;
  startedAt: string;
  startedAtMs: number;
  request: SlateHttpTrace['request'];
}

type TraceAwareAxiosRequestConfig = InternalAxiosRequestConfig & {
  __slatesHttpTraceDraft?: SlateHttpTraceDraft;
};

let traceDraftsByConfig = new WeakMap<object, SlateHttpTraceDraft>();
let traceDraftsByHeaders = new WeakMap<object, SlateHttpTraceDraft>();

let TRACE_TEXT_LIMIT = 10 * 1024;
let REDACTED_VALUE = '[redacted]';
let STRUCTURED_DEPTH_LIMIT = 6;
let STRUCTURED_ENTRY_LIMIT = 50;

// Atoms that identify a header/field/param name as containing a secret.
// These are matched with token boundaries so `sig` flags `x-sig-key` but NOT `configure`,
// and `code` only flags `code`/`auth_code`/etc., never `encode`/`decoder`.
// `[-_.]?` allows compound atoms to match either with or without a separator
// (e.g. `apikey`, `api-key`, `api_key`, `api.key`).
let CORE_SECRET_KEY_ATOMS = [
  // HTTP authentication
  'authorization',
  'proxy[-_.]?authorization',
  'www[-_.]?authenticate',
  'bearer',

  // Generic tokens
  'token',
  'tokens',
  'access[-_.]?token',
  'refresh[-_.]?token',
  'id[-_.]?token',
  'auth[-_.]?token',
  'bearer[-_.]?token',
  'session[-_.]?token',
  'api[-_.]?token',
  'app[-_.]?token',
  'user[-_.]?token',
  'oauth[-_.]?token',
  'personal[-_.]?access[-_.]?token',
  'x[-_.]?auth[-_.]?token',
  'x[-_.]?access[-_.]?token',
  'x[-_.]?refresh[-_.]?token',

  // API keys
  'apikey',
  'api[-_.]?key',
  'app[-_.]?key',
  'x[-_.]?api[-_.]?key',
  'x[-_.]?app[-_.]?key',

  // OAuth client credentials
  'client[-_.]?secret',
  'client[-_.]?key',
  'consumer[-_.]?secret',
  'consumer[-_.]?key',

  // Cryptographic keys
  'private[-_.]?key',
  'privatekey',
  'secret[-_.]?key',
  'secretkey',
  'secret[-_.]?access[-_.]?key',
  'encryption[-_.]?key',
  'decryption[-_.]?key',
  'signing[-_.]?key',
  'signing[-_.]?secret',
  'master[-_.]?key',
  'master[-_.]?secret',
  'master[-_.]?password',
  'shared[-_.]?secret',
  'webhook[-_.]?secret',
  'webhook[-_.]?signing[-_.]?secret',

  // OAuth codes & PKCE
  'auth[-_.]?code',
  'authcode',
  'authorization[-_.]?code',
  'code[-_.]?verifier',
  'code[-_.]?challenge',

  // Passwords & passcodes
  'password',
  'passwd',
  'pwd',
  'passphrase',
  'pass[-_.]?phrase',
  'pin',
  'passcode',

  // Generic secret markers
  'secret',
  'secrets',
  'credential',
  'credentials',
  'creds',
  'auth',
  'x[-_.]?auth',
  'x[-_.]?auth[-_.]?key',

  // CSRF / XSRF
  'csrf',
  'xsrf',
  'csrf[-_.]?token',
  'xsrf[-_.]?token',
  'x[-_.]?csrf[-_.]?token',
  'x[-_.]?xsrf[-_.]?token',

  // JWT
  'jwt',

  // Sessions & cookies
  'session[-_.]?id',
  'sessionid',
  'sid',
  'cookie',
  'cookies',
  'set[-_.]?cookie',

  // Signatures / MAC
  'signature',
  'x[-_.]?hub[-_.]?signature',
  'x[-_.]?signature',
  'sig',
  'hmac',
  'mac',

  // Crypto artifacts
  'salt',
  'nonce',

  // Multi-factor / verification
  'otp',
  'totp',
  'mfa',
  'mfa[-_.]?code',
  '2fa',
  'two[-_.]?factor',
  'twofactor',
  'verification[-_.]?code',
  'verify[-_.]?code',
  'confirm(?:ation)?[-_.]?code',
  'sms[-_.]?code',
  'email[-_.]?code',

  // Recovery & seed phrases
  'seed[-_.]?phrase',
  'mnemonic',
  'recovery[-_.]?key',
  'recovery[-_.]?code',
  'recovery[-_.]?phrase',

  // PII / financial
  'card[-_.]?number',
  'card[-_.]?code',
  'cvv',
  'cvc',
  'ccv',
  'cc[-_.]?num(?:ber)?',
  'pan',
  'ssn',
  'social[-_.]?security',
  'license[-_.]?key'
];

// Extra atoms that are considered secret-like specifically in URL query strings
// and x-www-form-urlencoded bodies, where a lone `code` typically carries an OAuth
// authorization code. We keep `code` out of CORE to avoid redacting `{"code": 404}`
// in structured JSON responses.
let URL_FORM_SECRET_KEY_ATOMS = [...CORE_SECRET_KEY_ATOMS, 'code'];

let buildKeyBoundaryPattern = (atoms: string[], flags: string) =>
  new RegExp(`(?:^|[^A-Za-z0-9])(?:${atoms.join('|')})(?=[^A-Za-z0-9]|$)`, flags);

let SECRET_KEY_PATTERN = buildKeyBoundaryPattern(CORE_SECRET_KEY_ATOMS, 'i');
let URL_FORM_SECRET_KEY_PATTERN = buildKeyBoundaryPattern(URL_FORM_SECRET_KEY_ATOMS, 'i');

// Explicit non-secret keys that would otherwise trip the patterns above because
// they embed a secret-sounding token (e.g. `token_type` contains `token`).
// Keys here describe the *kind* of a secret, not the secret itself.
let NON_SECRET_KEY_EXACT = new Set<string>([
  'token_type',
  'token-type',
  'tokentype',
  'token_kind',
  'token-kind',
  'tokenkind',
  'token_ttl',
  'token-ttl',
  'token_expires_in',
  'token-expires-in',
  'token_expiry',
  'signature_method',
  'signature-method',
  'signature_type',
  'signature-type',
  'signature_version',
  'signature-version',
  'auth_type',
  'auth-type',
  'auth_method',
  'auth-method',
  'authentication_type',
  'authentication-type',
  'authentication_method',
  'authentication-method',
  'grant_type',
  'grant-type',
  'password_strength',
  'password-strength',
  'password_policy',
  'password-policy',
  'key_type',
  'key-type',
  'key_name',
  'key-name',
  'key_id',
  'key-id',
  'kid'
]);

let isSecretKeyName = (name: string): boolean => {
  let normalized = name.toLowerCase();
  if (NON_SECRET_KEY_EXACT.has(normalized)) return false;
  return SECRET_KEY_PATTERN.test(normalized);
};

let isUrlFormSecretKeyName = (name: string): boolean => {
  let normalized = name.toLowerCase();
  if (NON_SECRET_KEY_EXACT.has(normalized)) return false;
  return URL_FORM_SECRET_KEY_PATTERN.test(normalized);
};

// Patterns that identify well-known secret values regardless of the surrounding key.
// Keeps low false-positive risk by matching formats that are unlikely to occur otherwise.
let KNOWN_SECRET_VALUE_PATTERNS: RegExp[] = [
  // JSON Web Tokens (header.payload.signature)
  /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g,
  // AWS access key IDs
  /\b(?:AKIA|ASIA|AGPA|AIDA|ANPA|ANVA|AROA|APKA|ASCA)[A-Z0-9]{16}\b/g,
  // GitHub tokens (PAT / OAuth / server-to-server / user-to-server / refresh)
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g,
  // Slack tokens
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
  // Stripe secret / public / restricted keys
  /\b(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]{16,}\b/g,
  // OpenAI API keys
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  // Anthropic API keys
  /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  // Google API keys
  /\bAIza[A-Za-z0-9_-]{35}\b/g,
  // SendGrid API keys
  /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
  // Twilio API keys
  /\bSK[0-9a-fA-F]{32}\b/g,
  // PEM-encoded private keys (multi-line)
  /-----BEGIN[A-Z ]*PRIVATE KEY-----[\s\S]*?-----END[A-Z ]*PRIVATE KEY-----/g,
  // SSH private keys (OpenSSH format)
  /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g
];

// HTTP authentication schemes in free text, e.g. "Authorization: Bearer eyJ..."
let HTTP_AUTH_SCHEME_PATTERN =
  /\b(bearer|basic|digest|token|negotiate|apikey)\s+([A-Za-z0-9_\-.~+/=]{4,})/gi;

// Generic `key=value` scan; the key is filtered via isUrlFormSecretKeyName at replace time
// so we can apply a deny-list for compound keys like `token_type` or `grant_type`.
let GENERIC_KEY_VALUE_PATTERN =
  /(?<![A-Za-z0-9])([A-Za-z0-9][A-Za-z0-9_\-.]*)(\s*=\s*)([^&#\s;]+)/g;

// Generic `"key": "value"` scan; the key is filtered via isSecretKeyName at replace time.
let GENERIC_JSON_KEY_VALUE_PATTERN =
  /"([^"\\]*(?:\\.[^"\\]*)*)"(\s*:\s*)"([^"\\]*(?:\\.[^"\\]*)*)"/g;

let SAFE_HEADER_NAMES = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'connection',
  'content-encoding',
  'content-language',
  'content-length',
  'content-type',
  'date',
  'etag',
  'expires',
  'if-modified-since',
  'if-none-match',
  'keep-alive',
  'last-modified',
  'location',
  'origin',
  'pragma',
  'referer',
  'referrer-policy',
  'request-id',
  'retry-after',
  'server',
  'transfer-encoding',
  'user-agent',
  'vary',
  'via',
  'x-correlation-id',
  'x-powered-by',
  'x-request-id',
  'x-slates-provider',
  'x-trace-id'
]);

let SAFE_HEADER_PREFIXES = ['ratelimit-', 'x-ratelimit-'];

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let isObjectLike = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;

let normalizeContentType = (value: string | undefined) =>
  value?.split(';')[0]?.trim().toLowerCase() || undefined;

let isTextContentType = (contentType?: string) =>
  !contentType ||
  /(^text\/)|json|xml|html|javascript|graphql|x-www-form-urlencoded|svg/.test(contentType);

let isSafeHeaderName = (name: string) => {
  let normalized = name.toLowerCase();
  if (isSecretKeyName(normalized)) return false;
  if (SAFE_HEADER_NAMES.has(normalized)) return true;
  return SAFE_HEADER_PREFIXES.some(prefix => normalized.startsWith(prefix));
};

let truncateText = (text: string) => {
  if (text.length <= TRACE_TEXT_LIMIT) {
    return { text, truncated: false };
  }

  return {
    text: `${text.slice(0, TRACE_TEXT_LIMIT)}...[truncated]`,
    truncated: true
  };
};

let sanitizeFreeText = (text: string) => {
  if (!text) return text;

  let result = text;

  result = result.replace(
    HTTP_AUTH_SCHEME_PATTERN,
    (_match, scheme: string) => `${scheme} ${REDACTED_VALUE}`
  );

  for (let pattern of KNOWN_SECRET_VALUE_PATTERNS) {
    result = result.replace(pattern, REDACTED_VALUE);
  }

  result = result.replace(
    GENERIC_KEY_VALUE_PATTERN,
    (match, key: string, equals: string, _value: string) =>
      isUrlFormSecretKeyName(key) ? `${key}${equals}${REDACTED_VALUE}` : match
  );

  result = result.replace(
    GENERIC_JSON_KEY_VALUE_PATTERN,
    (match, key: string, colon: string, _value: string) =>
      isSecretKeyName(key) ? `"${key}"${colon}"${REDACTED_VALUE}"` : match
  );

  return result;
};

let sanitizeScalar = (value: string) => truncateText(sanitizeFreeText(value));

let redactStructuredValue = (value: unknown, depth = 0): unknown => {
  if (value == null) return value;
  if (depth >= STRUCTURED_DEPTH_LIMIT) return '[truncated]';

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return typeof value === 'string' ? sanitizeFreeText(value) : value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, STRUCTURED_ENTRY_LIMIT)
      .map(entry => redactStructuredValue(entry, depth + 1));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, STRUCTURED_ENTRY_LIMIT)
        .map(([key, entry]) => [
          key,
          isSecretKeyName(key) ? REDACTED_VALUE : redactStructuredValue(entry, depth + 1)
        ])
    );
  }

  return String(value);
};

let maybeParseJson = (text: string, contentType?: string) => {
  let trimmed = text.trim();
  if (!trimmed) return null;
  if (!contentType?.includes('json') && !/^[[{]/.test(trimmed)) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

let sanitizeTextBody = (
  text: string,
  contentType?: string
): SlateHttpTraceTextBody | undefined => {
  if (!text) return undefined;

  let normalizedContentType = normalizeContentType(contentType);
  let parsedJson = maybeParseJson(text, normalizedContentType);
  let normalizedText =
    parsedJson !== null
      ? JSON.stringify(redactStructuredValue(parsedJson))
      : sanitizeFreeText(text);
  let { text: truncatedText, truncated } = truncateText(normalizedText);

  return {
    ...(normalizedContentType ? { contentType: normalizedContentType } : {}),
    text: truncatedText,
    ...(truncated ? { truncated: true } : {})
  };
};

let isBinaryLike = (value: unknown) => {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return true;
  if (value instanceof ArrayBuffer) return true;
  if (ArrayBuffer.isView(value)) return true;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (typeof FormData !== 'undefined' && value instanceof FormData) return true;
  return false;
};

let serializeTextBody = (
  value: unknown,
  contentType?: string
): SlateHttpTraceTextBody | undefined => {
  let normalizedContentType = normalizeContentType(contentType);

  if (value == null || isBinaryLike(value) || !isTextContentType(normalizedContentType)) {
    return undefined;
  }

  if (typeof value === 'string') {
    return sanitizeTextBody(value, normalizedContentType);
  }

  if (value instanceof URLSearchParams) {
    return sanitizeTextBody(value.toString(), normalizedContentType);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return sanitizeTextBody(String(value), normalizedContentType);
  }

  if (Array.isArray(value) || isRecord(value)) {
    return sanitizeTextBody(JSON.stringify(redactStructuredValue(value)), 'application/json');
  }

  return undefined;
};

let buildUrl = (baseURL: string | undefined, url: string | undefined) => {
  if (!url) return '';
  if (!baseURL) return url;

  try {
    return new URL(url, baseURL).toString();
  } catch {
    return url;
  }
};

// URLSearchParams percent-encodes `[` and `]`, which makes `[redacted]` render as
// `%5Bredacted%5D`. Undo that specific encoding so traces stay readable.
let REDACTED_ENCODED = encodeURIComponent(REDACTED_VALUE);
let decodeRedactedMarker = (value: string) =>
  REDACTED_ENCODED === REDACTED_VALUE
    ? value
    : value.split(REDACTED_ENCODED).join(REDACTED_VALUE);

let redactHashFragment = (hash: string) => {
  if (!hash?.includes('=')) return hash;
  let withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
  let redacted = withoutHash.replace(
    /(?<![A-Za-z0-9])([A-Za-z0-9][A-Za-z0-9_\-.]*)=([^&]*)/g,
    (match, key: string, _rawValue: string) =>
      isUrlFormSecretKeyName(key) ? `${key}=${REDACTED_VALUE}` : match
  );
  return redacted ? `#${redacted}` : '';
};

let sanitizeUrl = (value: string) => {
  if (!value) return value;

  try {
    let url = new URL(value);

    if (url.username || url.password) {
      url.username = '';
      url.password = '';
    }

    for (let key of Array.from(url.searchParams.keys())) {
      if (isUrlFormSecretKeyName(key)) {
        url.searchParams.set(key, REDACTED_VALUE);
      }
    }

    url.hash = redactHashFragment(url.hash);

    return decodeRedactedMarker(url.toString());
  } catch {
    return value.replace(
      /([?&]([^=&#]+)=)([^&#]+)/g,
      (_match, prefix: string, key: string, rawValue: string) =>
        isUrlFormSecretKeyName(key) ? `${prefix}${REDACTED_VALUE}` : `${prefix}${rawValue}`
    );
  }
};

let flattenHeaderValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    let normalized = value
      .map(entry => flattenHeaderValue(entry))
      .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
    return normalized.length > 0 ? normalized.join(', ') : undefined;
  }
  return undefined;
};

let headerEntries = (headers: unknown): [string, string][] => {
  if (!headers) return [];

  if (typeof (headers as { toJSON?: unknown }).toJSON === 'function') {
    let json = (headers as { toJSON(): unknown }).toJSON();
    if (isRecord(json)) {
      return Object.entries(json)
        .map(([key, value]) => {
          let flattened = flattenHeaderValue(value);
          return flattened ? ([key, flattened] as [string, string]) : null;
        })
        .filter((entry): entry is [string, string] => entry !== null);
    }
  }

  if (typeof (headers as { entries?: unknown }).entries === 'function') {
    return Array.from(
      (headers as { entries(): IterableIterator<[string, string]> }).entries()
    ).map(([key, value]) => [key, value]);
  }

  if (isRecord(headers)) {
    return Object.entries(headers)
      .map(([key, value]) => {
        let flattened = flattenHeaderValue(value);
        return flattened ? ([key, flattened] as [string, string]) : null;
      })
      .filter((entry): entry is [string, string] => entry !== null);
  }

  return [];
};

let sanitizeHeaders = (headers: unknown) => {
  let entries = headerEntries(headers)
    .map(([key, value]) => [key.toLowerCase(), sanitizeScalar(value).text] as [string, string])
    .filter(([key]) => isSafeHeaderName(key));

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
};

let getContentType = (headers: unknown) =>
  headerEntries(headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1];

let takeTraceDraft = (config: TraceAwareAxiosRequestConfig | undefined) => {
  if (!config) return undefined;

  let draft =
    config.__slatesHttpTraceDraft ??
    (isObjectLike(config) ? traceDraftsByConfig.get(config) : undefined) ??
    (isObjectLike(config.headers) ? traceDraftsByHeaders.get(config.headers) : undefined);

  if (!draft) return undefined;

  return draft;
};

let clearTraceDraft = (
  config: TraceAwareAxiosRequestConfig | undefined,
  draft: SlateHttpTraceDraft
) => {
  if (!config) return;

  if (config.__slatesHttpTraceDraft === draft) {
    config.__slatesHttpTraceDraft = undefined;
  }

  if (isObjectLike(config)) {
    traceDraftsByConfig.delete(config);
  }

  if (isObjectLike(config.headers)) {
    traceDraftsByHeaders.delete(config.headers);
  }
};

export let attachHttpTraceDraft = (
  config: InternalAxiosRequestConfig,
  context: SlateContext<any, any, any>
) => {
  let traceAwareConfig = config as TraceAwareAxiosRequestConfig;
  let contentType = getContentType(config.headers);

  traceAwareConfig.__slatesHttpTraceDraft = {
    context,
    startedAt: new Date().toISOString(),
    startedAtMs: Date.now(),
    request: {
      method: (config.method ?? 'GET').toUpperCase(),
      url: sanitizeUrl(buildUrl(config.baseURL, config.url)),
      ...(sanitizeHeaders(config.headers) ? { headers: sanitizeHeaders(config.headers) } : {}),
      ...(serializeTextBody(config.data, contentType)
        ? { body: serializeTextBody(config.data, contentType) }
        : {})
    }
  };

  if (isObjectLike(traceAwareConfig)) {
    traceDraftsByConfig.set(traceAwareConfig, traceAwareConfig.__slatesHttpTraceDraft);
  }

  if (isObjectLike(traceAwareConfig.headers)) {
    traceDraftsByHeaders.set(
      traceAwareConfig.headers,
      traceAwareConfig.__slatesHttpTraceDraft
    );
  }

  return config;
};

export let recordHttpTraceFromResponse = (response: AxiosResponse) => {
  let config = response.config as TraceAwareAxiosRequestConfig | undefined;
  let draft = takeTraceDraft(config);
  if (!draft) return response;
  clearTraceDraft(config, draft);

  let contentType = getContentType(response.headers);
  draft.context.recordHttpTrace({
    startedAt: draft.startedAt,
    durationMs: Math.max(Date.now() - draft.startedAtMs, 0),
    request: draft.request,
    response: {
      status: response.status,
      ...(response.statusText ? { statusText: response.statusText } : {}),
      ...(sanitizeHeaders(response.headers)
        ? { headers: sanitizeHeaders(response.headers) }
        : {}),
      ...(serializeTextBody(response.data, contentType)
        ? { body: serializeTextBody(response.data, contentType) }
        : {})
    }
  });

  return response;
};

export let recordHttpTraceFromError = (error: AxiosError) => {
  let config = error.config as TraceAwareAxiosRequestConfig | undefined;
  let draft = takeTraceDraft(config);
  if (!draft) return;
  clearTraceDraft(config, draft);

  let responseContentType = getContentType(error.response?.headers);
  draft.context.recordHttpTrace({
    startedAt: draft.startedAt,
    durationMs: Math.max(Date.now() - draft.startedAtMs, 0),
    request: draft.request,
    ...(error.response
      ? {
          response: {
            status: error.response.status,
            ...(error.response.statusText ? { statusText: error.response.statusText } : {}),
            ...(sanitizeHeaders(error.response.headers)
              ? { headers: sanitizeHeaders(error.response.headers) }
              : {}),
            ...(serializeTextBody(error.response.data, responseContentType)
              ? { body: serializeTextBody(error.response.data, responseContentType) }
              : {})
          }
        }
      : {}),
    error: {
      ...(error.code ? { code: error.code } : {}),
      message: error.message
    }
  });
};

// Exposed for unit tests. Not part of the public API.
export let __traceInternals = {
  sanitizeFreeText,
  sanitizeUrl,
  sanitizeHeaders,
  isSafeHeaderName,
  isSecretKeyName,
  isUrlFormSecretKeyName,
  redactStructuredValue,
  SECRET_KEY_PATTERN,
  URL_FORM_SECRET_KEY_PATTERN
};
