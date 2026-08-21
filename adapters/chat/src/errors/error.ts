import { SlateError, type SlateErrorInput } from '@slates/provider';
import {
  type ChatErrorCode,
  type ChatErrorDeclaration,
  type ChatErrorTarget,
  getChatErrorDeclaration
} from './catalog';
import {
  CHAT_ERROR_BAGGAGE_KEY,
  CHAT_ERROR_ENVELOPE_VERSION,
  CHAT_ERROR_MAX_CAUSES,
  type ChatErrorCause,
  type ChatErrorDetailsInput,
  type ChatErrorInfo
} from './types';

/**
 * The slates code that means "we learned nothing from this error". When an
 * inherited classification is only this, the catalog declaration is more
 * informative and wins. Mirrors `DEFAULT_CODE` in `@slates/provider`, which is
 * not exported.
 */
let SLATE_FALLBACK_CODE = 'internal.unexpected';

let readEnvelope = (baggage: Record<string, unknown> | undefined) => {
  let candidate = baggage?.[CHAT_ERROR_BAGGAGE_KEY];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

  let envelope = candidate as Partial<ChatErrorInfo>;
  if (envelope.adapter !== 'chat' || typeof envelope.code !== 'string') return null;

  return envelope as ChatErrorInfo;
};

let flattenCause = (info: ChatErrorInfo): ChatErrorCause => {
  let { causes, ...rest } = info;
  return rest;
};

let normalizeTarget = (
  target: ChatErrorTarget | string | undefined,
  declaration: ChatErrorDeclaration
): ChatErrorTarget | undefined => {
  if (target === undefined) return undefined;
  if (typeof target !== 'string') return target;
  if (!declaration.target) return undefined;
  return { type: declaration.target, id: target };
};

/**
 * Builds the adapter envelope.
 *
 * When the wrapped error already carries an envelope, the new code becomes
 * primary and the previous envelope is pushed to the front of `causes`. Nothing
 * is dropped and no precedence rule is applied: a deliberate outer wrap such as
 * `chat.event.hydration_failed` keeps its own meaning while the specific inner
 * reason stays readable through the chain.
 */
let buildInfo = (
  code: ChatErrorCode,
  input: ChatErrorDetailsInput,
  inherited: ChatErrorInfo | null
): ChatErrorInfo => {
  let declaration = getChatErrorDeclaration(code);

  let causes = inherited
    ? [flattenCause(inherited), ...(inherited.causes ?? [])].slice(0, CHAT_ERROR_MAX_CAUSES)
    : undefined;

  let info: ChatErrorInfo = {
    adapter: 'chat',
    version: CHAT_ERROR_ENVELOPE_VERSION,
    code,
    category: declaration.category,
    retryable: input.retryable ?? declaration.retryable
  };

  let target = normalizeTarget(input.target, declaration);
  if (target) info.target = target;
  if (input.action !== undefined) info.action = input.action;
  if (input.capability !== undefined) info.capability = input.capability;
  if (input.scopes?.length) info.scopes = input.scopes;
  if (input.retryAfterMs !== undefined) info.retryAfterMs = input.retryAfterMs;
  if (input.limit !== undefined) info.limit = input.limit;
  if (input.provider !== undefined) info.provider = input.provider;
  if (causes?.length) info.causes = causes;

  return info;
};

/**
 * Slates fields for the new error.
 *
 * With no inheritable classification the catalog declaration supplies them.
 * With one, the wrapped error's own fields are kept verbatim so retry
 * semantics, upstream status and request traces survive the wrap.
 */
let buildSlateInput = (
  code: ChatErrorCode,
  input: ChatErrorDetailsInput,
  inheritedFrom: SlateError | null
): SlateErrorInput => {
  let declaration = getChatErrorDeclaration(code);
  let inherited = inheritedFrom?.data;

  // An inherited classification is only worth keeping if it says something. A
  // bare `new Error()` normalizes to the generic fallback, where the catalog is
  // strictly more informative.
  let useInherited = !!inherited && inherited.code !== SLATE_FALLBACK_CODE;

  let base: SlateErrorInput = useInherited
    ? {
        code: inherited!.code,
        message: inherited!.message,
        kind: inherited!.kind,
        retryable: inherited!.retryable,
        status: inherited!.status,
        issues: inherited!.issues,
        provider: inherited!.provider,
        upstream: inherited!.upstream,
        requestTraces: inherited!.requestTraces
      }
    : {
        code: declaration.slate,
        message: declaration.message
      };

  return {
    ...base,
    ...input.slate,
    // The wire message keeps whatever detail is available — an inherited
    // upstream string is far more useful in a log than a generic sentence.
    // Presentation is the consumer's job: the clean, stable text for any code is
    // `chatErrorCatalog[code].message`, reachable via `chatErrorMessage()`.
    message: input.message ?? input.slate?.message ?? base.message ?? declaration.message,
    issues: input.issues ?? input.slate?.issues ?? base.issues,
    baggage: {
      ...inherited?.baggage,
      ...input.baggage,
      ...input.slate?.baggage
    }
  };
};

export interface ChatErrorConstructorInput extends ChatErrorDetailsInput {
  code: ChatErrorCode;
  /** Error whose slates classification and envelope chain are inherited. */
  inheritFrom?: SlateError | null;
}

/**
 * A chat adapter error: a `SlateError` carrying an adapter envelope.
 *
 * `error.code` stays the slates code (`resource.not_found`) and `error.chat.code`
 * is the adapter code (`chat.channel.not_found`), so the slates classification is
 * never shadowed.
 *
 * `name` starts with `SlateError` because that is what
 * `SlatesProviderProtoHandlerManager` matches on when serializing a thrown error
 * onto the wire.
 */
export class ChatError extends SlateError {
  readonly chat: ChatErrorInfo;

  constructor(input: ChatErrorConstructorInput) {
    let { code, inheritFrom, ...details } = input;

    let inheritedEnvelope = inheritFrom ? readEnvelope(inheritFrom.data.baggage) : null;
    let info = buildInfo(code, details, inheritedEnvelope);
    let slateInput = buildSlateInput(code, details, inheritFrom ?? null);

    super({
      ...slateInput,
      baggage: {
        ...slateInput.baggage,
        [CHAT_ERROR_BAGGAGE_KEY]: info
      },
      cause: details.cause ?? inheritFrom ?? undefined
    });

    this.name = 'SlateError.ChatError';
    this.chat = info;
  }

  static is(error: unknown): error is ChatError {
    return error instanceof ChatError;
  }

  /** True when `error` is a `ChatError` whose primary code is one of `code`. */
  static isCode<Code extends ChatErrorCode>(
    error: unknown,
    code: Code | readonly Code[]
  ): error is ChatError {
    if (!ChatError.is(error)) return false;
    let codes = Array.isArray(code) ? code : [code];
    return codes.includes(error.chat.code as Code);
  }
}

/**
 * Raises a chat error for a condition the adapter detected itself, with slates
 * fields taken from the catalog.
 *
 * ```ts
 * throw chatError('chat.content.empty', { action: 'metorial_chat$message.send' });
 * ```
 */
export let chatError = (code: ChatErrorCode, input: ChatErrorDetailsInput = {}) =>
  new ChatError({ ...input, code });

/**
 * Wraps an existing error, keeping its slates classification and adding a chat
 * code on top.
 *
 * A `SlateError` cause keeps its code, kind, status, retry semantics, upstream
 * info and request traces; only the adapter envelope is added. Any other cause
 * is normalized first, and the catalog declaration fills in whatever the
 * normalization could not determine.
 *
 * ```ts
 * throw wrapChatError('chat.channel.not_found', error, { target: channelId });
 * ```
 */
export let wrapChatError = (
  code: ChatErrorCode,
  cause: unknown,
  input: ChatErrorDetailsInput = {}
) => {
  if (cause === undefined || cause === null) return chatError(code, input);

  // `fromUnknown` returns SlateError instances untouched, so an already-wrapped
  // chat error keeps its envelope for `buildInfo` to chain onto.
  let inheritFrom = SlateError.fromUnknown(cause);

  return new ChatError({
    ...input,
    code,
    inheritFrom,
    cause: input.cause ?? cause
  });
};
