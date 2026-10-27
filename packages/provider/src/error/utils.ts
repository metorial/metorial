import { AuthConfigSecretRedactor } from '../auth/redact';
import {
  isSecretFieldName,
  redactAuthConfigSecretsInText,
  sanitizeSecretValuesInText,
  splitKeyParts
} from '../axios/trace';
import { getCurrentContext } from '../context/hook';
import { DEFAULT_CODE, DEFAULT_MESSAGES } from './defaults';
import type {
  SlateErrorInput,
  SlateErrorKind,
  SlateErrorProviderInfo,
  SlateErrorResponse,
  SlateErrorUpstreamInfo
} from './types';

export let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export let normalizeKind = (code: string, kind?: SlateErrorKind): SlateErrorKind => {
  if (kind) return kind;
  if (code.startsWith('declaration.')) return 'declaration';
  if (code.startsWith('input.')) return 'validation';
  if (code.startsWith('request.')) return 'request';
  if (code.startsWith('config.')) return 'config';
  if (code.startsWith('auth.') || code.startsWith('permission.')) return 'auth';
  if (code.startsWith('resource.')) return 'resource';
  if (code.startsWith('payment.')) return 'payment';
  if (code.startsWith('transport.')) return 'transport';
  if (code.startsWith('upstream.')) return 'upstream';
  return 'internal';
};

export let normalizeStatus = (code: string, status?: number) => {
  if (status) return status;
  if (code === 'input.invalid' || code === 'request.bad' || code === 'config.invalid')
    return 400;
  if (code === 'request.invalid_version') return 400;
  if (code === 'auth.required' || code === 'auth.invalid' || code === 'auth.expired')
    return 401;
  if (code === 'payment.required') return 402;
  if (code === 'permission.denied') return 403;
  if (code === 'resource.not_found') return 404;
  if (code === 'resource.conflict') return 409;
  if (code === 'resource.gone') return 410;
  if (code === 'request.not_acceptable') return 406;
  if (code === 'request.precondition_failed') return 412;
  if (code === 'request.rate_limited' || code === 'upstream.rate_limited') return 429;
  if (code === 'operation.not_implemented') return 501;
  if (code === 'upstream.invalid_request') return 400;
  if (code === 'upstream.timeout' || code === 'internal.timeout') return 504;
  if (code === 'upstream.unavailable') return 503;
  if (code === 'upstream.error') return 502;
  return undefined;
};

export let normalizeRetryable = (code: string, retryable?: boolean) => {
  if (typeof retryable === 'boolean') return retryable;
  return (
    code === 'request.rate_limited' ||
    code === 'upstream.rate_limited' ||
    code === 'upstream.timeout' ||
    code === 'upstream.network_error' ||
    code === 'upstream.unavailable' ||
    code === 'upstream.error' ||
    code === 'transport.invoke_failed' ||
    code === 'internal.timeout'
  );
};

export let getDefaultMessage = (code: string, message?: string): string => {
  if (message?.trim()) return message;
  return (
    DEFAULT_MESSAGES[code] ??
    DEFAULT_MESSAGES[DEFAULT_CODE] ??
    'An unexpected internal error occurred.'
  );
};

export let cleanRecord = <Value extends Record<string, unknown> | undefined>(value: Value) => {
  if (!value) return undefined;

  let entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as Value;
};

export let mergeRecords = (
  left?: Record<string, unknown>,
  right?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (!left && !right) return undefined;
  return cleanRecord({
    ...(left ?? {}),
    ...(right ?? {})
  });
};

export let mergeSlateErrorData = (
  base: SlateErrorResponse,
  override?: Partial<SlateErrorResponse>
): SlateErrorResponse => {
  if (!override) return base;

  return {
    ...base,
    ...override,
    provider: cleanRecord({
      ...(base.provider ?? {}),
      ...(override.provider ?? {})
    }) as SlateErrorProviderInfo | undefined,
    upstream: cleanRecord({
      ...(base.upstream ?? {}),
      ...(override.upstream ?? {})
    }) as SlateErrorUpstreamInfo | undefined,
    baggage: mergeRecords(base.baggage, override.baggage),
    issues: override.issues ?? base.issues,
    requestTraces: override.requestTraces ?? base.requestTraces
  };
};

export let BAGGAGE_TRUNCATED_VALUE = '[truncated]';
export let BAGGAGE_REDACTED_VALUE = '[redacted]';
export let BAGGAGE_UNSERIALIZABLE_VALUE = '[unserializable]';

// Values nested this deep (root = depth 0) are replaced with the truncated placeholder.
export let BAGGAGE_DEFAULT_MAX_DEPTH = 4;
// Upstream response bodies keep deeper structure so nested provider error details
// (GraphQL errors[].extensions.*, QuickBooks Fault.Error[].Detail, validation error
// lists) reach message extractors and telemetry.
export let BAGGAGE_RESPONSE_MAX_DEPTH = 8;
export let BAGGAGE_MAX_STRING_LENGTH = 2_000;
export let BAGGAGE_MAX_ARRAY_ITEMS = 20;
export let BAGGAGE_MAX_OBJECT_KEYS = 30;
// Upper bound for the JSON-serialized size of one sanitized value. Entries past
// the budget are dropped (and a string that crosses it is cut), so a single call
// serializes to at most this many characters plus a small fixed overhead.
export let BAGGAGE_MAX_SERIALIZED_SIZE = 16_384;

let BAGGAGE_STRING_TRUNCATION_SUFFIX = '...[truncated]';
// Keep budget cuts from producing near-empty strings.
let BAGGAGE_MIN_STRING_SLICE = 32;

// Free-text patterns are scanned over at most this many characters (the kept
// string length plus a margin), which bounds their cost on adversarial input.
let BAGGAGE_SCAN_LENGTH = BAGGAGE_MAX_STRING_LENGTH + 100;
// Literal auth-config secrets are matched over a longer prefix so a long token that
// straddles the scan boundary is still replaced before the string is cut.
let BAGGAGE_REDACTOR_SCAN_LENGTH = BAGGAGE_MAX_STRING_LENGTH * 4;
// Once fewer characters than the smallest entry (`"k":0,`) remain, stop walking keys.
let BAGGAGE_MIN_ENTRY_COST = 6;

export type SanitizeForBaggageOptions = {
  maxDepth?: number;
  maxSerializedSize?: number;
  // Replaces literal auth-config values. Defaults to the current Slate context's auth
  // config when one is available; `null` disables it.
  redactor?: AuthConfigSecretRedactor | null;
};

// Returns a redactor for the current Slate context's auth config, or undefined when
// no context is active (or it cannot be read).
export let getCurrentAuthConfigRedactor = (): AuthConfigSecretRedactor | undefined => {
  try {
    let authConfig = getCurrentContext()._getAuthConfigForRedaction();
    return authConfig ? new AuthConfigSecretRedactor(authConfig) : undefined;
  } catch {
    return undefined;
  }
};

// sanitizeErrorText keeps at most this many characters. It scans a small margin past
// the cut so a credential straddling it is still recognized before the text is cut.
export let ERROR_TEXT_MAX_LENGTH = BAGGAGE_MAX_STRING_LENGTH * 4;
let ERROR_TEXT_SCAN_MARGIN = 512;

// Free-text scrub for human-readable error text (messages, details): literal
// auth-config secrets first, then known credential formats and secret-named pairs.
// Input past ERROR_TEXT_MAX_LENGTH is cut, which also bounds the pattern cost.
// `redactor`: undefined uses the current Slate context's auth config, null skips it.
// Never throws; a failing redactor falls back to the pattern scrub alone.
export let sanitizeErrorText = (
  text: string,
  redactor?: AuthConfigSecretRedactor | null
): string => {
  let activeRedactor = redactor === undefined ? getCurrentAuthConfigRedactor() : redactor;
  let truncated = text.length > ERROR_TEXT_MAX_LENGTH;
  let scanned = truncated
    ? text.slice(0, ERROR_TEXT_MAX_LENGTH + ERROR_TEXT_SCAN_MARGIN)
    : text;

  let result = scanned;
  if (activeRedactor) {
    try {
      result = redactAuthConfigSecretsInText(result, activeRedactor);
    } catch {
      result = scanned;
    }
  }
  result = sanitizeSecretValuesInText(result);

  return truncated
    ? `${result.slice(0, ERROR_TEXT_MAX_LENGTH)}${BAGGAGE_STRING_TRUNCATION_SUFFIX}`
    : result;
};

// Numbers under these keys are themselves secrets (PINs, card data, numeric
// verification codes, numeric keys and secrets); other numeric and boolean values under
// secret-named keys (`token: true`, `session: 3`) are flags or counts and are kept.
let NUMERIC_SECRET_KEY_PATTERN =
  /(?:^|_)(?:pin|passcode|password|passwd|pwd|otp|totp|cvv|cvc|ccv|pan|ssn|card_number|card_code|cc_num(?:ber)?)(?:_|$)|(?:^|_)(?:code|secret|key)$/;

// Validation messages under secret-named fields (`{password: "is too short"}`,
// `{token: ["This field is required."]}`) are kept when they are clearly prose:
// three or more short words, no token-like word (20+ characters, or letters mixed
// with digits), bounded length, and validation vocabulary. Multi-word passphrases rarely use that vocabulary, so a string that is
// merely several words is still redacted.
let VALIDATION_VOCABULARY_PATTERN =
  /\b(?:required|invalid|must|blank|empty|missing|too (?:short|long|weak|common|simple)|characters?|(?:does not|doesn't|do not|don't) match|cannot be|can't be|not allowed|not valid|at least|at most|incorrect|already (?:taken|used|exists|in use)|has expired|is expired)\b/i;

let isValidationProse = (value: string) => {
  let text = value.trim();
  if (text.length > 300) return false;
  let words = text.split(/\s+/);
  if (words.length < 3) return false;
  if (words.some(word => word.length > 20 || (/[a-z]/i.test(word) && /\d/.test(word)))) {
    return false;
  }
  return VALIDATION_VOCABULARY_PATTERN.test(text);
};

let isKeptUnderSecretKey = (key: string, value: unknown) => {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number')
    return !NUMERIC_SECRET_KEY_PATTERN.test(splitKeyParts(key).join('_'));
  if (typeof value === 'string') return isValidationProse(value);
  if (Array.isArray(value)) {
    return (
      value.length > 0 &&
      value.length <= BAGGAGE_MAX_ARRAY_ITEMS &&
      value.every(item => typeof item === 'string' && isValidationProse(item))
    );
  }
  return false;
};

let jsonLength = (value: string) => JSON.stringify(value).length;

type BaggageState = {
  remaining: number;
  redactor?: AuthConfigSecretRedactor;
};

let redactLiteralSecrets = (value: string, redactor?: AuthConfigSecretRedactor) => {
  if (!redactor) return value;
  try {
    return redactAuthConfigSecretsInText(
      value.slice(0, BAGGAGE_REDACTOR_SCAN_LENGTH),
      redactor
    );
  } catch {
    return value;
  }
};

let sanitizeBaggageString = (value: string, state: BaggageState) => {
  // Redact literal auth-config secrets and known secret formats before cutting, so a
  // cut cannot split a token into a fragment the value patterns no longer recognize.
  let literalRedacted = redactLiteralSecrets(value, state.redactor);
  let text = sanitizeSecretValuesInText(literalRedacted.slice(0, BAGGAGE_SCAN_LENGTH));
  if (
    value.length > BAGGAGE_MAX_STRING_LENGTH ||
    literalRedacted.length > BAGGAGE_MAX_STRING_LENGTH ||
    text.length > BAGGAGE_MAX_STRING_LENGTH
  ) {
    text = `${text.slice(0, BAGGAGE_MAX_STRING_LENGTH)}${BAGGAGE_STRING_TRUNCATION_SUFFIX}`;
  }

  let cost = jsonLength(text);
  if (cost > state.remaining) {
    let sliceLength =
      state.remaining - BAGGAGE_STRING_TRUNCATION_SUFFIX.length - 2 - (cost - text.length);
    text =
      sliceLength >= BAGGAGE_MIN_STRING_SLICE
        ? `${text.slice(0, sliceLength)}${BAGGAGE_STRING_TRUNCATION_SUFFIX}`
        : BAGGAGE_TRUNCATED_VALUE;
    cost = jsonLength(text);
    if (cost > state.remaining && text !== BAGGAGE_TRUNCATED_VALUE) {
      text = BAGGAGE_TRUNCATED_VALUE;
      cost = jsonLength(text);
    }
  }

  state.remaining -= cost;
  return text;
};

let sanitizeBaggageValue = (
  value: unknown,
  depth: number,
  maxDepth: number,
  state: BaggageState
): unknown => {
  if (value === undefined) return value;
  if (value === null) {
    state.remaining -= 4;
    return value;
  }
  if (depth >= maxDepth) {
    state.remaining -= jsonLength(BAGGAGE_TRUNCATED_VALUE);
    return BAGGAGE_TRUNCATED_VALUE;
  }
  if (typeof value === 'string') return sanitizeBaggageString(value, state);
  if (typeof value === 'number' || typeof value === 'boolean') {
    state.remaining -= String(value).length;
    return value;
  }
  // JSON.stringify throws on bigint, so it is stored as a string.
  if (typeof value === 'bigint') return sanitizeBaggageString(value.toString(), state);
  if (Array.isArray(value)) {
    state.remaining -= 2;
    let items: unknown[] = [];
    for (let item of value.slice(0, BAGGAGE_MAX_ARRAY_ITEMS)) {
      if (state.remaining <= 0) break;
      state.remaining -= 1;
      if (item === undefined) {
        // Serialized as `null` inside arrays.
        state.remaining -= 4;
        items.push(null);
        continue;
      }
      items.push(sanitizeBaggageValue(item, depth + 1, maxDepth, state));
    }
    return items;
  }
  if (isRecord(value)) {
    state.remaining -= 2;
    let entries: [string, unknown][] = [];
    for (let key of Object.keys(value).slice(0, BAGGAGE_MAX_OBJECT_KEYS)) {
      if (state.remaining < BAGGAGE_MIN_ENTRY_COST) break;
      // Key, colon, and separator are charged up front; an entry whose key does not
      // fit is skipped so shorter later keys can still be kept.
      let keyCost = jsonLength(key) + 2;
      if (state.remaining - keyCost <= 0) continue;
      state.remaining -= keyCost;

      try {
        // Property access is per entry so one throwing getter only loses that entry.
        let entry = value[key];

        if (entry != null && isSecretFieldName(key) && !isKeptUnderSecretKey(key, entry)) {
          state.remaining -= jsonLength(BAGGAGE_REDACTED_VALUE);
          entries.push([key, BAGGAGE_REDACTED_VALUE]);
          continue;
        }

        entries.push([key, sanitizeBaggageValue(entry, depth + 1, maxDepth, state)]);
      } catch {
        state.remaining -= jsonLength(BAGGAGE_UNSERIALIZABLE_VALUE);
        entries.push([key, BAGGAGE_UNSERIALIZABLE_VALUE]);
      }
    }
    return Object.fromEntries(entries);
  }
  return sanitizeBaggageString(String(value), state);
};

// Bounds and redacts arbitrary values (upstream response bodies, service error data,
// thrown non-Error values) before they are stored in SlateError baggage, which is
// serialized to the platform. Secret-named keys are redacted at every depth, strings
// are scrubbed for credential values and (inside a Slate context) literal auth-config
// secrets; other personal data is left to platform-side redaction.
export let sanitizeForBaggage = (
  value: unknown,
  options: SanitizeForBaggageOptions = {}
): unknown => {
  try {
    return sanitizeBaggageValue(value, 0, options.maxDepth ?? BAGGAGE_DEFAULT_MAX_DEPTH, {
      remaining: options.maxSerializedSize ?? BAGGAGE_MAX_SERIALIZED_SIZE,
      redactor:
        options.redactor === null
          ? undefined
          : (options.redactor ?? getCurrentAuthConfigRedactor())
    });
  } catch {
    // Throwing getters or Proxy traps must not mask the error being mapped.
    return BAGGAGE_UNSERIALIZABLE_VALUE;
  }
};

let UPSTREAM_CODE_PATTERN = /^[\w.:-]{1,128}$/;

// upstreamCode is copied from untrusted upstream responses to the top level of the
// error, outside the baggage sanitizer, so anything not code-shaped is dropped.
export let normalizeUpstreamCode = (value: unknown): string | undefined =>
  typeof value === 'string' && UPSTREAM_CODE_PATTERN.test(value) ? value : undefined;

export let normalizeSlateErrorInput = (input: SlateErrorInput): SlateErrorResponse => {
  let code = input.code || DEFAULT_CODE;
  return {
    code,
    message: getDefaultMessage(code, input.message),
    kind: normalizeKind(code, input.kind),
    retryable: normalizeRetryable(code, input.retryable),
    status: normalizeStatus(code, input.status ?? input.upstream?.status),
    issues: input.issues,
    provider: cleanRecord(input.provider as Record<string, unknown> | undefined) as
      | SlateErrorProviderInfo
      | undefined,
    upstream: cleanRecord({
      ...input.upstream,
      status: input.upstream?.status ?? input.status
    }) as SlateErrorUpstreamInfo | undefined,
    upstreamCode:
      normalizeUpstreamCode(input.upstreamCode) ?? normalizeUpstreamCode(input.upstream?.code),
    baggage: cleanRecord(input.baggage),
    requestTraces: input.requestTraces
  };
};

export let isSlateErrorResponse = (error: unknown): error is SlateErrorResponse => {
  if (!isRecord(error)) return false;
  return typeof error.code === 'string' && typeof error.message === 'string';
};
