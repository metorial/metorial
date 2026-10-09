import { ServiceError } from '@lowerdeck/error';
import {
  ChatError,
  type ChatErrorCode,
  type ChatErrorDetailsInput,
  type ChatErrorTargetType,
  getChatErrorTargetType,
  wrapChatError
} from '@slates/adapter-chat';
import { SlateError } from '@slates/provider';

// https://docs.discord.com/developers/topics/opcodes-and-status-codes#json-json-error-codes
let DISCORD_CHAT_ERROR_CODES: Record<string, ChatErrorCode> = {
  '0': 'chat.provider.error',
  '10003': 'chat.channel.not_found',
  '10004': 'chat.workspace.not_found',
  '10008': 'chat.message.not_found',
  '10012': 'chat.interaction.response_expired',
  '10013': 'chat.user.not_found',
  '10014': 'chat.emoji.not_found',
  '10015': 'chat.interaction.response_expired',
  '10062': 'chat.interaction.response_expired',
  '10063': 'chat.command.not_found',
  '20028': 'chat.rate_limit.exceeded',
  '30010': 'chat.reaction.limit_reached',
  '40005': 'chat.attachment.too_large',
  '40060': 'chat.interaction.trigger_invalid',
  '50001': 'chat.access.forbidden',
  '50005': 'chat.message.not_editable',
  '50006': 'chat.content.empty',
  '50007': 'chat.access.dm_not_allowed',
  '50013': 'chat.access.forbidden',
  '50021': 'chat.access.forbidden',
  '50024': 'chat.access.forbidden',
  '50027': 'chat.interaction.response_expired',
  '50035': 'chat.input.invalid',
  '50083': 'chat.access.channel_archived',
  '90001': 'chat.access.forbidden',
  '160002': 'chat.access.forbidden'
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

export interface DiscordChatErrorContext {
  action?: string;
  channelId?: string;
  threadId?: string;
  messageId?: string;
  userId?: string;
  workspaceId?: string;
  attachmentId?: string;
  emoji?: string;
  command?: string;
  /** Overrides for Discord codes whose meaning depends on the operation. */
  ambiguous?: Record<string, ChatErrorCode>;
  /** Classification for a bare HTTP 404 that carried no Discord JSON code. */
  notFound?: ChatErrorCode;
}

let TARGET_FIELDS: Record<ChatErrorTargetType, keyof DiscordChatErrorContext> = {
  workspace: 'workspaceId',
  channel: 'channelId',
  thread: 'threadId',
  message: 'messageId',
  user: 'userId',
  attachment: 'attachmentId',
  reaction: 'emoji',
  modal: 'messageId',
  command: 'command'
};

let readUpstream = (error: unknown) => {
  if (SlateError.is(error)) {
    let upstream = error.data.upstream;
    let retryAfterMs = error.data.baggage?.retryAfterMs;
    return {
      code: typeof upstream?.code === 'string' ? upstream.code : undefined,
      status: upstream?.status ?? error.data.status,
      retryAfterMs: typeof retryAfterMs === 'number' ? retryAfterMs : undefined,
      message: error.message
    };
  }

  if (error instanceof ServiceError) {
    let status = error.data.upstreamStatus;
    return {
      code: undefined,
      status: typeof status === 'number' ? status : undefined,
      retryAfterMs: undefined,
      message: error.message
    };
  }

  return { code: undefined, status: undefined, retryAfterMs: undefined, message: undefined };
};

let resolveCode = (
  error: unknown,
  upstream: ReturnType<typeof readUpstream>,
  context: DiscordChatErrorContext
): ChatErrorCode => {
  if (upstream.code) {
    let ambiguous = context.ambiguous?.[upstream.code];
    if (ambiguous) return ambiguous;

    let mapped = DISCORD_CHAT_ERROR_CODES[upstream.code];
    if (mapped && mapped !== 'chat.provider.error') return mapped;
  }

  switch (upstream.status) {
    case 401:
      return 'chat.auth.invalid';
    case 403:
      return 'chat.access.forbidden';
    case 404:
      return context.notFound ?? 'chat.provider.error';
    case 413:
      return 'chat.attachment.too_large';
    case 429:
      return 'chat.rate_limit.exceeded';
  }

  if (upstream.status !== undefined && upstream.status >= 500) {
    return 'chat.provider.unavailable';
  }

  if (SlateError.is(error)) {
    let mapped = SLATE_CHAT_ERROR_CODES[error.code];
    if (mapped) return mapped;
  }

  return 'chat.provider.error';
};

let resolveTarget = (code: ChatErrorCode, context: DiscordChatErrorContext) => {
  let entity = getChatErrorTargetType(code);
  if (!entity) return undefined;

  let id = context[TARGET_FIELDS[entity]];
  return typeof id === 'string' ? id : undefined;
};

export let mapDiscordChatError = (error: unknown, context: DiscordChatErrorContext = {}) => {
  if (ChatError.is(error)) return error;

  let upstream = readUpstream(error);
  let code = resolveCode(error, upstream, context);

  let details: ChatErrorDetailsInput = {
    action: context.action,
    target: resolveTarget(code, context),
    provider:
      upstream.code || upstream.message
        ? { code: upstream.code, message: upstream.message }
        : undefined
  };

  if (code === 'chat.rate_limit.exceeded' && upstream.retryAfterMs !== undefined) {
    details.retryAfterMs = upstream.retryAfterMs;
  }

  return wrapChatError(code, error, details);
};

export let withDiscordChatErrors = async <T>(
  context: DiscordChatErrorContext,
  run: () => Promise<T>
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw mapDiscordChatError(error, context);
  }
};
