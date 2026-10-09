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

// Teams Bot API error codes:
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/build-conversational-capability#status-codes-from-agent-conversational-apis
let TEAMS_CHAT_ERROR_CODES: Record<string, ChatErrorCode> = {
  botnotregistered: 'chat.auth.invalid',
  botdisabledbyadmin: 'chat.access.forbidden',
  botnotinconversationroster: 'chat.access.not_a_member',
  conversationblockedbyuser: 'chat.access.forbidden',
  forbiddenoperationexception: 'chat.auth.app_not_installed',
  invalidbotapihost: 'chat.access.forbidden',
  notenoughpermissions: 'chat.access.forbidden',
  activitynotfoundinconversation: 'chat.message.not_found',
  conversationnotfound: 'chat.channel.not_found',
  preconditionfailed: 'chat.provider.unavailable',
  messagesizetoobig: 'chat.content.too_long',
  throttled: 'chat.rate_limit.exceeded',
  badargument: 'chat.input.invalid',
  'bad argument': 'chat.input.invalid',
  serviceerror: 'chat.provider.unavailable'
};

let STATUS_CHAT_ERROR_CODES: Record<number, ChatErrorCode> = {
  400: 'chat.input.invalid',
  401: 'chat.auth.invalid',
  403: 'chat.access.forbidden',
  404: 'chat.channel.not_found',
  412: 'chat.provider.unavailable',
  413: 'chat.content.too_long',
  429: 'chat.rate_limit.exceeded',
  502: 'chat.provider.unavailable',
  503: 'chat.provider.unavailable',
  504: 'chat.provider.timeout'
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

export interface TeamsChatErrorContext {
  action?: string;
  channelId?: string;
  threadId?: string;
  messageId?: string;
  userId?: string;
  workspaceId?: string;
  attachmentId?: string;
  /** Overrides for codes/statuses whose meaning depends on the operation. */
  ambiguous?: Record<string, ChatErrorCode>;
}

let TARGET_FIELDS: Record<ChatErrorTargetType, keyof TeamsChatErrorContext> = {
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

let getUpstream = (
  error: unknown
): { status?: number; code?: string; retryAfterMs?: number } => {
  if (SlateError.is(error)) {
    let upstream = error.data.upstream;
    let retryAfterMs = error.data.baggage?.retryAfterMs;
    return {
      status: typeof upstream?.status === 'number' ? upstream.status : error.status,
      code: typeof upstream?.code === 'string' ? upstream.code : undefined,
      retryAfterMs: typeof retryAfterMs === 'number' ? retryAfterMs : undefined
    };
  }
  if (error instanceof ServiceError) {
    let status = error.data.upstreamStatus;
    let code = error.data.upstreamCode;
    return {
      status: typeof status === 'number' ? status : undefined,
      code: typeof code === 'string' ? code : undefined
    };
  }
  return {};
};

let resolveChatCode = (
  error: unknown,
  upstream: { status?: number; code?: string },
  context: TeamsChatErrorContext
): ChatErrorCode => {
  let code = upstream.code?.toLowerCase();
  if (code) {
    let ambiguous = context.ambiguous?.[code];
    if (ambiguous) return ambiguous;
    let mapped = TEAMS_CHAT_ERROR_CODES[code];
    if (mapped) return mapped;
  }

  if (upstream.status !== undefined) {
    let ambiguous = context.ambiguous?.[String(upstream.status)];
    if (ambiguous) return ambiguous;
    let mapped = STATUS_CHAT_ERROR_CODES[upstream.status];
    if (mapped) return mapped;
    if (upstream.status >= 500) return 'chat.provider.error';
  }

  if (SlateError.is(error)) {
    let mapped = SLATE_CHAT_ERROR_CODES[error.code];
    if (mapped) return mapped;
  }

  return 'chat.provider.error';
};

export let mapTeamsChatError = (error: unknown, context: TeamsChatErrorContext = {}) => {
  if (ChatError.is(error)) return error;

  let upstream = getUpstream(error);
  let code = resolveChatCode(error, upstream, context);
  let entity = getChatErrorTargetType(code);
  let target = entity ? context[TARGET_FIELDS[entity]] : undefined;

  let details: ChatErrorDetailsInput = {
    action: context.action,
    target: typeof target === 'string' ? target : undefined,
    provider: upstream.code ? { code: upstream.code } : undefined,
    retryAfterMs: upstream.retryAfterMs
  };

  return wrapChatError(code, error, details);
};

export let withTeamsChatErrors = async <T>(
  context: TeamsChatErrorContext,
  run: () => Promise<T>
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw mapTeamsChatError(error, context);
  }
};
