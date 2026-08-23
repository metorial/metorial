import type { SlateErrorResponse } from '@slates/provider';
import {
  type ChatErrorCategory,
  type ChatErrorCode,
  chatErrorCatalog,
  isChatErrorCodeKnown
} from './catalog';
import {
  CHAT_ERROR_BAGGAGE_KEY,
  type ChatErrorCause,
  type ChatErrorInfo,
  type ParsedChatError
} from './types';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let asCause = (value: unknown): ChatErrorCause | null => {
  if (!isRecord(value)) return null;
  if (value.adapter !== 'chat') return null;
  if (!isChatErrorCodeKnown(value.code)) return null;

  let { causes, ...rest } = value;
  return rest as unknown as ChatErrorCause;
};

/**
 * Validates an envelope read off the wire and drops anything malformed.
 *
 * Chain entries are filtered rather than trusted: a payload can arrive with a
 * partially destroyed chain (see `envelopeFromBaggage`), and surfacing a garbled
 * cause is worse than reporting none.
 */
let asEnvelope = (value: unknown): ChatErrorInfo | null => {
  let primary = asCause(value);
  if (!primary) return null;

  let rawCauses = (value as Record<string, unknown>).causes;
  let causes = Array.isArray(rawCauses)
    ? rawCauses.map(asCause).filter((cause): cause is ChatErrorCause => cause !== null)
    : [];

  return causes.length > 0 ? { ...primary, causes } : primary;
};

let envelopeFromBaggage = (baggage: unknown): ChatErrorInfo | null => {
  if (!isRecord(baggage)) return null;

  let direct = asEnvelope(baggage[CHAT_ERROR_BAGGAGE_KEY]);
  if (direct) return direct;

  // `SlateError.fromServiceError` has no `SlateError.is` guard, so passing a
  // ChatError through it re-homes the whole instance under `serviceErrorData`.
  // That path also runs through `sanitizeForBaggage`, whose depth-4 cap replaces
  // the buried `baggage.adapter` leaves with "[truncated]" — so the envelope is
  // only recoverable from the instance's own `chat` field, which sits shallow
  // enough to survive. Best effort: the primary code comes back, a long chain
  // may not. Do not route chat errors through `fromServiceError`.
  let demoted = baggage.serviceErrorData;
  if (!isRecord(demoted)) return null;

  return asEnvelope(demoted.chat) ?? envelopeFromBaggage(demoted.baggage);
};

let asSlateResponse = (value: unknown): SlateErrorResponse | null => {
  if (!isRecord(value)) return null;
  if (typeof value.code !== 'string' || typeof value.message !== 'string') return null;
  return value as unknown as SlateErrorResponse;
};

/**
 * Reads a chat error off any failure payload.
 *
 * Accepts the wire shape (a serialized `SlateErrorResponse`), a live `SlateError`
 * or `ChatError`, or an `{ error }` / `{ data }` envelope. Returns `chat: null`
 * for failures that did not come from a chat adapter — timeouts and normalized
 * provider errors reach consumers through the same channel — and `null` when the
 * value is not an error payload at all.
 */
export let parseChatError = (value: unknown): ParsedChatError | null => {
  if (!isRecord(value)) return null;

  // Live SlateError / ChatError instance.
  if (typeof (value as { toResponse?: unknown }).toResponse === 'function') {
    let response = asSlateResponse((value as { toResponse: () => unknown }).toResponse());
    if (response) {
      return { chat: envelopeFromBaggage(response.baggage), slate: response };
    }
  }

  let direct = asSlateResponse(value);
  if (direct) {
    return { chat: envelopeFromBaggage(direct.baggage), slate: direct };
  }

  for (let key of ['error', 'data', 'output'] as const) {
    let nested: unknown = (value as Record<string, unknown>)[key];
    if (nested !== undefined && nested !== value) {
      let parsed = parseChatError(nested);
      if (parsed) return parsed;
    }
  }

  return null;
};

/** The adapter envelope alone, or null when the failure is not a chat error. */
export let getChatErrorInfo = (value: unknown): ChatErrorInfo | null =>
  parseChatError(value)?.chat ?? null;

/** The primary code plus every code in the cause chain, outermost first. */
export let chatErrorCodeChain = (info: ChatErrorInfo): ChatErrorCode[] => [
  info.code,
  ...(info.causes ?? []).map(cause => cause.code)
];

export interface ChatErrorMatchOptions {
  /** Also match codes in the cause chain, not just the primary. Default false. */
  includeCauses?: boolean;
}

/**
 * True when `value` is a chat error whose code matches.
 *
 * Matches the primary code only by default. Pass `includeCauses` when a wrapper
 * such as `chat.event.hydration_failed` may be hiding the code you care about.
 */
export let isChatErrorCode = (
  value: unknown,
  code: ChatErrorCode | readonly ChatErrorCode[],
  options: ChatErrorMatchOptions = {}
) => {
  let info = getChatErrorInfo(value);
  if (!info) return false;

  let codes = Array.isArray(code) ? code : [code];
  let haystack = options.includeCauses ? chatErrorCodeChain(info) : [info.code];

  return codes.some(candidate => haystack.includes(candidate));
};

/** True when `value` is a chat error in any of `category`. */
export let isChatErrorCategory = (
  value: unknown,
  category: ChatErrorCategory | readonly ChatErrorCategory[]
) => {
  let info = getChatErrorInfo(value);
  if (!info) return false;

  let categories = Array.isArray(category) ? category : [category];
  return categories.includes(info.category);
};

/**
 * Transitive retryability: true when the error itself or anything it wrapped is
 * retryable.
 *
 * Each chain entry describes only its own classification, so this is where the
 * "a rate limit deep inside still means retry" policy lives. Use it instead of
 * reading `info.retryable` when deciding whether to requeue work.
 */
export let isChatErrorRetryable = (value: unknown) => {
  let info = getChatErrorInfo(value);
  if (!info) return false;
  return info.retryable || (info.causes ?? []).some(cause => cause.retryable);
};

/** Nearest `retryAfterMs` in the chain, outermost first. */
export let chatErrorRetryAfterMs = (value: unknown): number | undefined => {
  let info = getChatErrorInfo(value);
  if (!info) return undefined;
  if (info.retryAfterMs !== undefined) return info.retryAfterMs;
  return (info.causes ?? []).find(cause => cause.retryAfterMs !== undefined)?.retryAfterMs;
};

/** Nearest raw provider code in the chain, outermost first. */
export let chatErrorProviderCode = (value: unknown): string | undefined => {
  let info = getChatErrorInfo(value);
  if (!info) return undefined;
  if (info.provider?.code) return info.provider.code;
  return (info.causes ?? []).find(cause => cause.provider?.code)?.provider?.code;
};

/**
 * The catalog's stable, user-facing text for a code.
 *
 * Prefer this over the error's `message` when showing something to a person: the
 * wire message carries upstream detail meant for logs.
 */
export let chatErrorMessage = (code: ChatErrorCode) => chatErrorCatalog[code].message;

/** The full cause chain including the primary entry, outermost first. */
export let chatErrorChain = (info: ChatErrorInfo): ChatErrorCause[] => {
  let { causes, ...primary } = info;
  return [primary, ...(causes ?? [])];
};
