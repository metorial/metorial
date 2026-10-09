import { ServiceError } from '@lowerdeck/error';
import {
  ChatError,
  type ChatErrorCode,
  type ChatErrorDetailsInput,
  type ChatErrorTargetType,
  getChatErrorTargetType,
  wrapChatError
} from '@slates/adapter-chat';
import { SlateError } from 'slates';

/**
 * Google API errors carry an HTTP status and a canonical `error.status`
 * (https://cloud.google.com/apis/design/errors#handling_errors). The meaning of
 * 403/404 depends on the action, so callers pass `ambiguous` overrides.
 */
let GOOGLE_STATUS_CHAT_CODES: Record<string, ChatErrorCode> = {
  UNAUTHENTICATED: 'chat.auth.invalid',
  PERMISSION_DENIED: 'chat.access.forbidden',
  NOT_FOUND: 'chat.provider.error',
  ALREADY_EXISTS: 'chat.message.duplicate',
  INVALID_ARGUMENT: 'chat.input.invalid',
  FAILED_PRECONDITION: 'chat.input.invalid',
  OUT_OF_RANGE: 'chat.input.invalid',
  RESOURCE_EXHAUSTED: 'chat.rate_limit.exceeded',
  UNAVAILABLE: 'chat.provider.unavailable',
  INTERNAL: 'chat.provider.unavailable',
  DEADLINE_EXCEEDED: 'chat.provider.timeout'
};

let HTTP_STATUS_GOOGLE_STATUS: Record<number, string> = {
  400: 'INVALID_ARGUMENT',
  401: 'UNAUTHENTICATED',
  403: 'PERMISSION_DENIED',
  404: 'NOT_FOUND',
  409: 'ALREADY_EXISTS',
  429: 'RESOURCE_EXHAUSTED',
  500: 'INTERNAL',
  503: 'UNAVAILABLE',
  504: 'DEADLINE_EXCEEDED'
};

let SLATE_CHAT_ERROR_CODES: Record<string, ChatErrorCode> = {
  'upstream.rate_limited': 'chat.rate_limit.exceeded',
  'upstream.timeout': 'chat.provider.timeout',
  'upstream.network_error': 'chat.provider.network_error',
  'upstream.unavailable': 'chat.provider.unavailable',
  'auth.invalid': 'chat.auth.invalid',
  'auth.expired': 'chat.auth.expired',
  'auth.required': 'chat.auth.invalid',
  'permission.denied': 'chat.access.forbidden'
};

export interface GoogleChatChatErrorContext {
  action?: string;
  channelId?: string;
  threadId?: string;
  messageId?: string;
  userId?: string;
  workspaceId?: string;
  attachmentId?: string;
  /** Google canonical status (NOT_FOUND, PERMISSION_DENIED, ...) to chat code. */
  ambiguous?: Record<string, ChatErrorCode>;
}

let TARGET_FIELDS: Record<ChatErrorTargetType, keyof GoogleChatChatErrorContext> = {
  workspace: 'workspaceId',
  channel: 'channelId',
  thread: 'threadId',
  message: 'messageId',
  user: 'userId',
  attachment: 'attachmentId',
  reaction: 'messageId',
  modal: 'messageId',
  command: 'messageId'
};

/** Reads `{ error: { status } }` from the upstream response, else derives it from HTTP status. */
export let getGoogleStatus = (error: unknown): string | undefined => {
  let upstreamCode: unknown;
  let upstreamStatus: unknown;
  if (error instanceof ServiceError) {
    upstreamCode = error.data.upstreamCode;
    upstreamStatus = error.data.upstreamStatus;
  } else if (SlateError.is(error)) {
    let response = (error.data.baggage as Record<string, any> | undefined)?.response;
    upstreamCode = response?.error?.status ?? error.data.upstream?.code;
    upstreamStatus = error.data.upstream?.status ?? error.data.status;
  }
  if (typeof upstreamCode === 'string' && /^[A-Z_]+$/.test(upstreamCode)) return upstreamCode;
  let status = typeof upstreamStatus === 'string' ? Number(upstreamStatus) : upstreamStatus;
  return typeof status === 'number' ? HTTP_STATUS_GOOGLE_STATUS[status] : undefined;
};

let resolveCode = (
  error: unknown,
  googleStatus: string | undefined,
  context: GoogleChatChatErrorContext
): ChatErrorCode => {
  if (googleStatus) {
    let ambiguous = context.ambiguous?.[googleStatus];
    if (ambiguous) return ambiguous;
    let mapped = GOOGLE_STATUS_CHAT_CODES[googleStatus];
    if (mapped && mapped !== 'chat.provider.error') return mapped;
  }

  if (SlateError.is(error)) {
    let mapped = SLATE_CHAT_ERROR_CODES[error.code];
    if (mapped) return mapped;
  }

  return 'chat.provider.error';
};

export let mapGoogleChatChatError = (
  error: unknown,
  context: GoogleChatChatErrorContext = {}
) => {
  if (ChatError.is(error)) return error;

  let googleStatus = getGoogleStatus(error);
  let code = resolveCode(error, googleStatus, context);
  let entity = getChatErrorTargetType(code);
  let targetId = entity ? context[TARGET_FIELDS[entity]] : undefined;

  let details: ChatErrorDetailsInput = {
    action: context.action,
    target: typeof targetId === 'string' ? targetId : undefined,
    provider: googleStatus ? { code: googleStatus } : undefined
  };

  return wrapChatError(code, error, details);
};

export let withGoogleChatChatErrors = async <T>(
  context: GoogleChatChatErrorContext,
  run: () => Promise<T>
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw mapGoogleChatChatError(error, context);
  }
};
