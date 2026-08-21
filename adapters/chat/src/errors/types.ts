import type { SlateErrorInput, SlateErrorIssue, SlateErrorResponse } from '@slates/provider';
import type {
  ChatErrorCategory,
  ChatErrorCode,
  ChatErrorLimit,
  ChatErrorProviderInfo,
  ChatErrorTarget
} from './catalog';

/**
 * Baggage key the adapter envelope lives under.
 *
 * The envelope rides inside `SlateError.data.baggage` because that is the only
 * part of the error that both survives `normalizeSlateErrorInput` untouched and
 * crosses the wire: `SlateError.toResponse()` serializes `data` only, so
 * `SlateError.cause` never reaches a consumer.
 */
export let CHAT_ERROR_BAGGAGE_KEY = 'adapter';

/** Current envelope version. Bumped when the shape changes incompatibly. */
export let CHAT_ERROR_ENVELOPE_VERSION = 1;

/**
 * Longest cause chain retained. Chains are naturally two or three deep; the cap
 * is a backstop against a wrap inside a retry loop growing the payload.
 */
export let CHAT_ERROR_MAX_CAUSES = 4;

/**
 * The adapter-level classification layered on top of a slates error.
 *
 * `code` is always the outermost (most recent) classification: the one the
 * wrapping call site deliberately chose. Everything it was wrapped over is kept
 * in `causes`, so neither the general nor the specific reading is ever lost.
 */
export interface ChatErrorInfo {
  adapter: 'chat';
  version: number;
  code: ChatErrorCode;
  category: ChatErrorCategory;
  retryable: boolean;
  target?: ChatErrorTarget;
  /** Tool or trigger key that failed, e.g. `metorial_chat$message.send`. */
  action?: string;
  /** Adapter capability id, set for `chat.capability.unsupported`. */
  capability?: string;
  /** OAuth scopes the operation needed, set for `chat.auth.missing_scope`. */
  scopes?: string[];
  retryAfterMs?: number;
  limit?: ChatErrorLimit;
  provider?: ChatErrorProviderInfo;
  /**
   * Classifications this error was wrapped over, outermost first, self excluded
   * and always flat. Read it when the primary code is a wrapper such as
   * `chat.event.hydration_failed` and the underlying reason matters.
   */
  causes?: ChatErrorCause[];
}

/** A `ChatErrorInfo` flattened for inclusion in another error's chain. */
export type ChatErrorCause = Omit<ChatErrorInfo, 'causes'>;

/**
 * Fields a call site may attach to a chat error. All optional: the catalog
 * declaration supplies the slates mapping and the default message.
 */
export interface ChatErrorDetailsInput {
  message?: string;
  /** A full target, or a bare id paired with the declaration's target type. */
  target?: ChatErrorTarget | string;
  action?: string;
  capability?: string;
  scopes?: string[];
  retryAfterMs?: number;
  limit?: ChatErrorLimit;
  provider?: ChatErrorProviderInfo;
  issues?: SlateErrorIssue[];
  baggage?: Record<string, unknown>;
  cause?: unknown;
  /**
   * Slates fields to force onto the error. Set this only to deliberately
   * reclassify at the slates level; by default a wrapped error keeps its own.
   */
  slate?: Partial<Omit<SlateErrorInput, 'cause'>>;
  /** Override the declaration's retryable default. */
  retryable?: boolean;
}

export interface ParsedChatError {
  /** Null when the failure did not originate from a chat adapter. */
  chat: ChatErrorInfo | null;
  slate: SlateErrorResponse;
}
