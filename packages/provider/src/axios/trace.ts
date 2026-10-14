import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX,
  AuthConfigSecretRedactor
} from '../auth/redact';
import type { SlatePublicContext } from '../context';

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
  context: SlatePublicContext<any>;
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
  // HubSpot legacy API key query param
  'hapikey',
  'access[-_.]?key',

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
  'sessid',
  'jsessionid',
  'phpsessid',
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

export let isSecretKeyName = (name: string): boolean => {
  let normalized = name.toLowerCase();
  if (NON_SECRET_KEY_EXACT.has(normalized)) return false;
  return SECRET_KEY_PATTERN.test(normalized);
};

// Whole query/form names that carry a credential only in URLs: Google's `?key=AIza...`.
// Matched exactly so compound names such as `sort_key` or `partition_key` stay visible.
let URL_FORM_EXACT_SECRET_KEYS = new Set(['key']);

let isUrlFormSecretKeyName = (name: string): boolean => {
  let normalized = name.toLowerCase();
  if (NON_SECRET_KEY_EXACT.has(normalized)) return false;
  if (URL_FORM_EXACT_SECRET_KEYS.has(normalized)) return true;
  return URL_FORM_SECRET_KEY_PATTERN.test(normalized);
};

let splitCamelCase = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2');

// `githubToken` -> ['github', 'token'], `ASP.NET_SessionId` -> ['asp', 'net', 'session', 'id'].
export let splitKeyParts = (key: string) =>
  splitCamelCase(key)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

// A compound key ending in one of these describes a secret (its count, expiry, URL,
// type, error, ...) rather than holding it: `tokenCount`, `sessionTimeout`,
// `authError`, `signatureValid`, `authorizationUrl`, `token_type`, `tokenExpiresAt`.
let NON_SECRET_KEY_SUFFIXES = new Set([
  'count',
  'limit',
  'timeout',
  'expired',
  'expires',
  'expiry',
  'at',
  'valid',
  'url',
  'uri',
  'error',
  'type',
  'id',
  'ids',
  'name'
]);

// Pagination cursors, not credentials.
let NON_SECRET_FIELD_KEYS = new Set([
  'page_token',
  'next_page_token',
  'prev_page_token',
  'previous_page_token',
  'next_token',
  'continuation_token'
]);

// `<qualifier>_id` keys that are credentials despite the `id` suffix: session IDs
// (`sessionId`, `user_session_ids`, `ASP.NET_SessionId`) and `secret_id`.
let SECRET_ID_QUALIFIERS = new Set(['session', 'sess', 'secret']);

/**
 * Split-camelCase-aware secret field classifier shared by error baggage, auth-config
 * path checks, and the prose `key: value` scan. Matches camelCase keys
 * (`githubToken`, `apiSecret`, `accessKey`) and bare `session` keys, but not keys that
 * describe a secret (`tokenCount`, `token_type`) or pagination cursors (`pageToken`).
 */
export let isSecretFieldName = (key: string): boolean => {
  let parts = splitKeyParts(key);
  if (parts.length === 0) return false;
  let normalized = parts.join('_');
  if (NON_SECRET_FIELD_KEYS.has(normalized)) return false;

  let last = parts[parts.length - 1] ?? '';
  if (parts.length > 1 && NON_SECRET_KEY_SUFFIXES.has(last)) {
    return (
      (last === 'id' || last === 'ids') &&
      SECRET_ID_QUALIFIERS.has(parts[parts.length - 2] ?? '')
    );
  }

  return isSecretKeyName(key) || isSecretKeyName(normalized) || parts.includes('session');
};

// Auth-config fields named for the credential's role rather than its kind:
// `subscriptionKey`, `writeKey`, `integrationKey`, `provisioningHash`.
let AUTH_CONFIG_CREDENTIAL_SUFFIXES = new Set(['key', 'keys', 'hash']);

// `tokenHeader: 'authorization'` names a header; it does not hold a credential.
let HEADER_NAME_VALUE_PATTERN = /^[A-Za-z]+(?:-[A-Za-z]+)*$/;

/**
 * Whether an auth-config value at `path` (e.g. `oauth.accessToken`, `apiKeys.0`) is a
 * credential worth replacing in diagnostics. Only secret-named fields qualify: auth
 * configs also hold account IDs, emails, subdomains, scopes, and token types, and
 * replacing those wherever they appear destroys useful context. Field names are chosen
 * by integration authors and describe credentials consistently (`token`, `apiKey`,
 * `clientSecret`, `password`, `*Key`), while an entropy fallback would also hit
 * high-entropy non-secrets such as `clientId`, `tenantId`, or `cloudId`.
 */
export let isAuthConfigSecretValue = (secret: string, path: string): boolean => {
  let segment = path
    .split('.')
    .reverse()
    .find(part => !/^\d+$/.test(part));
  if (!segment) return false;

  let parts = splitKeyParts(segment);
  let last = parts[parts.length - 1] ?? '';
  if (last === 'header' && HEADER_NAME_VALUE_PATTERN.test(secret)) return false;
  return isSecretFieldName(segment) || AUTH_CONFIG_CREDENTIAL_SUFFIXES.has(last);
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

let redactKnownSecretValues = (text: string) => {
  let result = text;
  for (let pattern of KNOWN_SECRET_VALUE_PATTERNS) {
    result = result.replace(pattern, REDACTED_VALUE);
  }
  return result;
};

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

let sanitizeFreeText = (text: string, redactor?: AuthConfigSecretRedactor) => {
  if (!text) return text;

  // Literal auth-config secret values are replaced first -- this catches secrets sitting
  // under a key name the heuristics below don't recognize as secret-like.
  let result = redactor ? redactor.redact(text, isAuthConfigSecretValue) : text;

  result = result.replace(
    HTTP_AUTH_SCHEME_PATTERN,
    (_match, scheme: string) => `${scheme} ${REDACTED_VALUE}`
  );

  result = redactKnownSecretValues(result);

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

// A credential after an auth scheme word, so messages like "Invalid token provided"
// or "Basic plan required" are left intact (see looksLikeCredential).
let PROSE_SAFE_AUTH_SCHEME_PATTERN =
  /\b(bearer|basic|digest|token|negotiate|apikey)(\s+)([A-Za-z0-9_\-.~+/=]{8,})/gi;

// A value counts as a credential when it carries a digit or token punctuation, or mixes
// case past its first character (base64 such as `dXNlcjpwYXNz`). Plain lowercase or
// Title-case words are prose. `key=value` fragments are left to the key/value scan so
// "token code=404" is not mistaken for a credential.
let looksLikeCredential = (value: string) => {
  if (/^[A-Za-z][A-Za-z0-9_\-.]*=/.test(value)) return false;
  return /[0-9_\-.~+/=]/.test(value) || (/[a-z]/.test(value) && /[A-Z]/.test(value.slice(1)));
};

// Credential header names in free text. The value runs to the closing quote when it is
// quoted, otherwise to the end of the line or the next `&`; redactCredentialHeaderValue
// decides how much of it is the credential.
let CREDENTIAL_HEADER_VALUE_PATTERN =
  /\b(proxy-authorization|authorization|x-api-key|api[-_]?key|set-cookie|cookie)(\s*[:=]\s*)(?:(["'])((?:\\.|(?!\3)[^\\\r\n])*)|([^\r\n&]*))/gi;

let AUTH_SCHEME_WORD_PATTERN = /^(?:bearer|basic|digest|token|negotiate|apikey)$/i;

let COOKIE_HEADER_NAME_PATTERN = /^(?:set-)?cookie$/i;
let AUTHORIZATION_HEADER_NAME_PATTERN = /^(?:proxy-)?authorization$/i;

// `sid=1; theme=dark`: a cookie pair followed by any chained pairs.
let COOKIE_PAIRS_PATTERN = /^[^\s;=&"',]+=[^\s;&"',]*(?:;\s*[^\s;=&"',]+=[^\s;&"',]*)*/;
let HEADER_TOKEN_PATTERN = /^[^\s&"',;]+/;
// A scheme word (`Bearer`, `OAuth`, `Bot`, `SSWS`, `Zoho-oauthtoken`, `Klaviyo-API-Key`)
// followed by its credential.
let HEADER_SCHEME_PATTERN = /^([A-Za-z][\w-]*)(\s+)([\s\S]*)$/;
// `Digest username="x", response="..."`, `AWS4-HMAC-SHA256 Credential=..., Signature=...`.
let HEADER_AUTH_PARAMS_PATTERN = /^[A-Za-z][\w-]*\s*=/;

// Header values are redacted only when they hold a credential, so prose such as
// `Authorization: missing or invalid` or `Missing cookie: please log in` stays readable.
let redactCredentialHeaderValue = (name: string, value: string) => {
  if (COOKIE_HEADER_NAME_PATTERN.test(name)) {
    let pairs = COOKIE_PAIRS_PATTERN.exec(value)?.[0];
    if (pairs) return `${REDACTED_VALUE}${value.slice(pairs.length)}`;
  }

  let scheme = HEADER_SCHEME_PATTERN.exec(value);
  if (scheme) {
    let [, word = '', space = '', rest = ''] = scheme;
    let schemePrefix = `${word}${space}`;
    if (
      AUTHORIZATION_HEADER_NAME_PATTERN.test(name) &&
      HEADER_AUTH_PARAMS_PATTERN.test(rest)
    ) {
      // Auth-param lists carry the credential in any parameter, so all of them go.
      return `${schemePrefix}${REDACTED_VALUE}`;
    }

    let credential = HEADER_TOKEN_PATTERN.exec(rest)?.[0];
    if (credential === REDACTED_VALUE) return value;
    if (
      credential &&
      (AUTH_SCHEME_WORD_PATTERN.test(word) || looksLikeCredential(credential))
    ) {
      return `${schemePrefix}${REDACTED_VALUE}${rest.slice(credential.length)}`;
    }
  }

  // No scheme: the first token is the credential itself (`X-API-Key: k1`).
  let token = HEADER_TOKEN_PATTERN.exec(value)?.[0];
  if (token && token !== REDACTED_VALUE && looksLikeCredential(token)) {
    return `${REDACTED_VALUE}${value.slice(token.length)}`;
  }
  return value;
};

// Generic `'key': 'value'` scan (Python reprs, single-quoted logs); the key is filtered
// via isSecretKeyName at replace time.
let GENERIC_SINGLE_QUOTED_KEY_VALUE_PATTERN =
  /'([^'\\]*(?:\\.[^'\\]*)*)'(\s*:\s*)'([^'\\]*(?:\\.[^'\\]*)*)'/g;

// Unquoted `key: value` in prose and JS-style object dumps: `password: Hunter2`,
// `Invalid token: ya29...`, `{ access_token: 'abc' }`. The key is the word right before
// the colon; the value is one token, optionally quoted.
let PROSE_KEY_VALUE_PATTERN =
  /(?<![A-Za-z0-9_\-.])([A-Za-z][A-Za-z0-9_\-.]*)([ \t]*:[ \t]*)(["'`]?)([^\s"'`,;&)\]}]+)/g;

// Words that describe a credential's state rather than being one (`token: expired`).
let PROSE_STATE_WORD_PATTERN =
  /^(?:required|missing|invalid|expired|revoked|empty|blank|null|undefined|none|not|is|was|has|must|should|cannot|incorrect|wrong|malformed|provided|present|absent|unknown|denied|rejected|unauthorized|forbidden|true|false|too|the|a|an)$/i;

// Lowercase snake_case words are error codes (`token: invalid_grant`), not credentials.
let PROSE_ERROR_CODE_PATTERN = /^[a-z]+(?:_[a-z]+)+$/;

let redactProseKeyValue = (
  match: string,
  key: string,
  separator: string,
  quote: string,
  value: string
) => {
  if (AUTHORIZATION_HEADER_NAME_PATTERN.test(key) || COOKIE_HEADER_NAME_PATTERN.test(key)) {
    return match;
  }
  if (value.startsWith('[') || value.startsWith(AUTH_CONFIG_SECRET_PLACEHOLDER_PREFIX)) {
    return match;
  }
  if (!isSecretFieldName(key)) return match;

  // Sentence punctuation after the value (`token: expired.`) is not part of it.
  let credential = value.replace(/[.!?:]+$/, '');
  if (!credential || PROSE_ERROR_CODE_PATTERN.test(credential)) return match;

  // A single-word key (`token`, `password`) needs a credential-shaped value; a compound
  // key (`access_token`, `sessionToken`) is specific enough that any non-state word is
  // treated as its value.
  let compoundKey = splitKeyParts(key).length > 1;
  if (
    looksLikeCredential(credential) ||
    (compoundKey && !PROSE_STATE_WORD_PATTERN.test(credential))
  ) {
    return `${key}${separator}${quote}${REDACTED_VALUE}${value.slice(credential.length)}`;
  }
  return match;
};

// Narrower than sanitizeFreeText for human-readable error text: redacts known secret
// formats, scheme credentials, credential header values, and secret-named
// `key=value` / `key: value` / `"key": "value"` / `'key': 'value'` pairs, but never a
// bare `code=` value or a prose word that merely follows "token"/"basic".
export let sanitizeSecretValuesInText = (text: string) => {
  if (!text) return text;

  let result = text.replace(
    PROSE_SAFE_AUTH_SCHEME_PATTERN,
    (match, scheme: string, space: string, value: string) =>
      looksLikeCredential(value) ? `${scheme}${space}${REDACTED_VALUE}` : match
  );

  result = result.replace(
    CREDENTIAL_HEADER_VALUE_PATTERN,
    (
      _match,
      name: string,
      separator: string,
      quote: string | undefined,
      quotedValue: string | undefined,
      plainValue: string | undefined
    ) =>
      `${name}${separator}${quote ?? ''}${redactCredentialHeaderValue(
        name,
        quote ? (quotedValue ?? '') : (plainValue ?? '')
      )}`
  );

  result = redactKnownSecretValues(result);

  result = result.replace(
    GENERIC_KEY_VALUE_PATTERN,
    (match, key: string, equals: string, value: string, offset: number, whole: string) => {
      if (!isSecretKeyName(key)) return match;
      // `Authorization=Basic [redacted]` was already handled by the scheme patterns.
      let rest = whole.slice(offset + match.length);
      if (AUTH_SCHEME_WORD_PATTERN.test(value) && /^\s+\[redacted\]/.test(rest)) return match;
      return `${key}${equals}${REDACTED_VALUE}`;
    }
  );

  result = result.replace(PROSE_KEY_VALUE_PATTERN, redactProseKeyValue);

  result = result.replace(
    GENERIC_SINGLE_QUOTED_KEY_VALUE_PATTERN,
    (match, key: string, colon: string, _value: string) =>
      isSecretKeyName(key) ? `'${key}'${colon}'${REDACTED_VALUE}'` : match
  );

  return result.replace(
    GENERIC_JSON_KEY_VALUE_PATTERN,
    (match, key: string, colon: string, _value: string) =>
      isSecretKeyName(key) ? `"${key}"${colon}"${REDACTED_VALUE}"` : match
  );
};

let sanitizeScalar = (value: string, redactor?: AuthConfigSecretRedactor) =>
  truncateText(sanitizeFreeText(value, redactor));

let redactStructuredValue = (
  value: unknown,
  depth = 0,
  redactor?: AuthConfigSecretRedactor
): unknown => {
  if (value == null) return value;
  if (depth >= STRUCTURED_DEPTH_LIMIT) return '[truncated]';

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return typeof value === 'string' ? sanitizeFreeText(value, redactor) : value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, STRUCTURED_ENTRY_LIMIT)
      .map(entry => redactStructuredValue(entry, depth + 1, redactor));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, STRUCTURED_ENTRY_LIMIT)
        .map(([key, entry]) => [
          key,
          isSecretKeyName(key)
            ? REDACTED_VALUE
            : redactStructuredValue(entry, depth + 1, redactor)
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
  contentType?: string,
  redactor?: AuthConfigSecretRedactor
): SlateHttpTraceTextBody | undefined => {
  if (!text) return undefined;

  let normalizedContentType = normalizeContentType(contentType);
  let parsedJson = maybeParseJson(text, normalizedContentType);
  let normalizedText =
    parsedJson !== null
      ? JSON.stringify(redactStructuredValue(parsedJson, 0, redactor))
      : sanitizeFreeText(text, redactor);
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
  contentType?: string,
  redactor?: AuthConfigSecretRedactor
): SlateHttpTraceTextBody | undefined => {
  let normalizedContentType = normalizeContentType(contentType);

  if (value == null || isBinaryLike(value) || !isTextContentType(normalizedContentType)) {
    return undefined;
  }

  if (typeof value === 'string') {
    return sanitizeTextBody(value, normalizedContentType, redactor);
  }

  if (value instanceof URLSearchParams) {
    return sanitizeTextBody(value.toString(), normalizedContentType, redactor);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return sanitizeTextBody(String(value), normalizedContentType, redactor);
  }

  if (Array.isArray(value) || isRecord(value)) {
    return sanitizeTextBody(
      JSON.stringify(redactStructuredValue(value, 0, redactor)),
      'application/json',
      redactor
    );
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

// A query/fragment value under a non-secret name: a literal secret-named auth-config
// value or a known credential format (`?q=sk_live_...`) is still replaced.
let redactQueryValue = (rawValue: string, redactor?: AuthConfigSecretRedactor) =>
  redactKnownSecretValues(
    redactor ? redactor.redact(rawValue, isAuthConfigSecretValue) : rawValue
  );

let redactHashFragment = (hash: string, redactor?: AuthConfigSecretRedactor) => {
  if (!hash?.includes('=')) return hash;
  let withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
  let redacted = withoutHash.replace(
    /(?<![A-Za-z0-9])([A-Za-z0-9][A-Za-z0-9_\-.]*)=([^&]*)/g,
    (match, key: string, rawValue: string) => {
      if (isUrlFormSecretKeyName(key)) return `${key}=${REDACTED_VALUE}`;
      let redactedValue = redactQueryValue(rawValue, redactor);
      return redactedValue !== rawValue ? `${key}=${redactedValue}` : match;
    }
  );
  return redacted ? `#${redacted}` : '';
};

// Redacts secret-keyed auth values embedded in URL paths (e.g. Telegram's `/bot<token>/...`).
let isEmbeddedPathSecret = (secret: string, path: string) =>
  secret.length >= 8 && isAuthConfigSecretValue(secret, path);

// Replaces secret-named auth-config values in free text: whole-value matches, plus
// values of 8+ chars embedded in longer text such as URL paths or error messages.
export let redactAuthConfigSecretsInText = (
  text: string,
  redactor: AuthConfigSecretRedactor
): string => redactor.redactEmbedded(text, isEmbeddedPathSecret, isAuthConfigSecretValue);

export let sanitizeUrl = (value: string, redactor?: AuthConfigSecretRedactor) => {
  if (!value) return value;

  try {
    let url = new URL(value);

    if (url.username || url.password) {
      url.username = '';
      url.password = '';
    }

    if (redactor) url.pathname = redactAuthConfigSecretsInText(url.pathname, redactor);

    for (let key of Array.from(url.searchParams.keys())) {
      if (isUrlFormSecretKeyName(key)) {
        url.searchParams.set(key, REDACTED_VALUE);
        continue;
      }

      // Not a secret-looking key -- still catch a literal auth-config secret value or a
      // known credential format.
      let rawValue = url.searchParams.get(key) ?? '';
      let redactedValue = redactQueryValue(rawValue, redactor);
      if (redactedValue !== rawValue) url.searchParams.set(key, redactedValue);
    }

    url.hash = redactHashFragment(url.hash, redactor);

    return decodeRedactedMarker(url.toString());
  } catch {
    let text = redactor ? redactAuthConfigSecretsInText(value, redactor) : value;
    return text.replace(
      /([?&]([^=&#]+)=)([^&#]+)/g,
      (_match, prefix: string, key: string, rawValue: string) =>
        isUrlFormSecretKeyName(key)
          ? `${prefix}${REDACTED_VALUE}`
          : `${prefix}${redactKnownSecretValues(rawValue)}`
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

let sanitizeHeaders = (headers: unknown, redactor?: AuthConfigSecretRedactor) => {
  let entries = headerEntries(headers)
    .map(
      ([key, value]) =>
        [key.toLowerCase(), sanitizeScalar(value, redactor).text] as [string, string]
    )
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
  context: SlatePublicContext<any>
) => {
  let traceAwareConfig = config as TraceAwareAxiosRequestConfig;
  let contentType = getContentType(config.headers);
  let redactor = new AuthConfigSecretRedactor(context._getAuthConfigForRedaction());

  traceAwareConfig.__slatesHttpTraceDraft = {
    context,
    startedAt: new Date().toISOString(),
    startedAtMs: Date.now(),
    request: {
      method: (config.method ?? 'GET').toUpperCase(),
      url: sanitizeUrl(buildUrl(config.baseURL, config.url), redactor),
      ...(sanitizeHeaders(config.headers, redactor)
        ? { headers: sanitizeHeaders(config.headers, redactor) }
        : {}),
      ...(serializeTextBody(config.data, contentType, redactor)
        ? { body: serializeTextBody(config.data, contentType, redactor) }
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

  let redactor = new AuthConfigSecretRedactor(draft.context._getAuthConfigForRedaction());
  let contentType = getContentType(response.headers);
  draft.context.recordHttpTrace({
    startedAt: draft.startedAt,
    durationMs: Math.max(Date.now() - draft.startedAtMs, 0),
    request: draft.request,
    response: {
      status: response.status,
      ...(response.statusText ? { statusText: response.statusText } : {}),
      ...(sanitizeHeaders(response.headers, redactor)
        ? { headers: sanitizeHeaders(response.headers, redactor) }
        : {}),
      ...(serializeTextBody(response.data, contentType, redactor)
        ? { body: serializeTextBody(response.data, contentType, redactor) }
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

  let redactor = new AuthConfigSecretRedactor(draft.context._getAuthConfigForRedaction());
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
            ...(sanitizeHeaders(error.response.headers, redactor)
              ? { headers: sanitizeHeaders(error.response.headers, redactor) }
              : {}),
            ...(serializeTextBody(error.response.data, responseContentType, redactor)
              ? { body: serializeTextBody(error.response.data, responseContentType, redactor) }
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
  isSecretFieldName,
  isAuthConfigSecretValue,
  isUrlFormSecretKeyName,
  redactStructuredValue,
  SECRET_KEY_PATTERN,
  URL_FORM_SECRET_KEY_PATTERN
};
