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
 * Bot API failures carry no stable string code: `error_code` is the HTTP status and
 * `description` is the human-readable reason. Classify by description fragment,
 * most specific first. https://core.telegram.org/bots/api#making-requests
 */
let DESCRIPTION_CODES: [RegExp, ChatErrorCode][] = [
  [/message thread not found/i, 'chat.thread.not_found'],
  [
    /message to (edit|delete|react|reply|forward|copy|pin) not found/i,
    'chat.message.not_found'
  ],
  [/message to be replied not found/i, 'chat.message.not_found'],
  [/message not found|message_id_invalid/i, 'chat.message.not_found'],
  [/chat not found|peer_id_invalid|group chat was upgraded/i, 'chat.channel.not_found'],
  [/user not found|participant_id_invalid/i, 'chat.user.not_found'],
  [
    /wrong file identifier|invalid file_id|wrong remote file id|file_id/i,
    'chat.attachment.not_found'
  ],
  [/file is too big|request entity too large/i, 'chat.attachment.too_large'],
  [/message can't be edited|message_edit_time_expired/i, 'chat.message.not_editable'],
  [/message can't be deleted/i, 'chat.message.not_deletable'],
  [
    /message (text|caption) is too long|message is too long|caption is too long/i,
    'chat.content.too_long'
  ],
  [/message text is empty|text must be non-empty/i, 'chat.content.empty'],
  [
    /can't parse entities|unsupported start tag|can't find end tag/i,
    'chat.content.invalid_blocks'
  ],
  [/message is not modified/i, 'chat.input.invalid'],
  [/reactions_too_many|reactions_uniq_max/i, 'chat.reaction.limit_reached'],
  [/reaction_invalid|reaction_empty|reaction not allowed/i, 'chat.emoji.not_found'],
  [
    /bot was blocked by the user|bot can't initiate conversation|user is deactivated/i,
    'chat.access.dm_not_allowed'
  ],
  [
    /bot was kicked|bot is not a member|bot is not a participant|chat_write_forbidden/i,
    'chat.access.not_a_member'
  ],
  [
    /not enough rights|need administrator rights|have no rights|chat_admin_required/i,
    'chat.access.forbidden'
  ],
  [/unauthorized|invalid token/i, 'chat.auth.invalid'],
  [/too many requests|flood/i, 'chat.rate_limit.exceeded']
];

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

export interface TelegramChatErrorContext {
  action?: string;
  channelId?: string;
  threadId?: string;
  messageId?: string;
  userId?: string;
  workspaceId?: string;
  attachmentId?: string;
  emoji?: string;
}

let TARGET_FIELDS: Record<ChatErrorTargetType, keyof TelegramChatErrorContext | undefined> = {
  workspace: 'workspaceId',
  channel: 'channelId',
  thread: 'threadId',
  message: 'messageId',
  user: 'userId',
  attachment: 'attachmentId',
  reaction: 'messageId',
  modal: undefined,
  command: undefined
};

type TelegramFailure = {
  description?: string;
  status?: number;
  retryAfterSeconds?: number;
};

let readFailure = (error: unknown): TelegramFailure => {
  if (SlateError.is(error)) {
    let response = error.data.baggage?.response as
      | { description?: unknown; error_code?: unknown; parameters?: { retry_after?: unknown } }
      | undefined;
    let description =
      typeof response?.description === 'string' ? response.description : error.message;
    let retryAfter = response?.parameters?.retry_after;
    return {
      description,
      status: error.data.upstream?.status ?? error.data.status,
      retryAfterSeconds: typeof retryAfter === 'number' ? retryAfter : undefined
    };
  }

  if (error instanceof ServiceError) {
    return { description: error.message };
  }

  return {};
};

let resolveCode = (error: unknown, failure: TelegramFailure): ChatErrorCode => {
  if (failure.status === 401) return 'chat.auth.invalid';
  if (failure.status === 429) return 'chat.rate_limit.exceeded';

  if (failure.description) {
    for (let [pattern, code] of DESCRIPTION_CODES) {
      if (pattern.test(failure.description)) return code;
    }
  }

  if (SlateError.is(error)) {
    let mapped = SLATE_CHAT_ERROR_CODES[error.code];
    if (mapped) return mapped;
  }

  return 'chat.provider.error';
};

export let mapTelegramChatError = (
  error: unknown,
  context: TelegramChatErrorContext = {}
): ChatError => {
  if (ChatError.is(error)) return error;

  let failure = readFailure(error);
  let code = resolveCode(error, failure);
  let entity = getChatErrorTargetType(code);
  let field = entity ? TARGET_FIELDS[entity] : undefined;
  let target = field ? context[field] : undefined;

  let details: ChatErrorDetailsInput = {
    action: context.action,
    target: typeof target === 'string' ? target : undefined,
    provider: failure.description
      ? {
          code: failure.status === undefined ? undefined : String(failure.status),
          message: failure.description
        }
      : undefined
  };

  if (code === 'chat.rate_limit.exceeded' && failure.retryAfterSeconds !== undefined) {
    details.retryAfterMs = failure.retryAfterSeconds * 1000;
  }

  return wrapChatError(code, error, details);
};

export let withTelegramChatErrors = async <T>(
  context: TelegramChatErrorContext,
  run: () => Promise<T>
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw mapTelegramChatError(error, context);
  }
};

/** Description of a Bot API failure, for handlers that branch on a specific reason. */
export let getTelegramErrorDescription = (error: unknown) => readFailure(error).description;
