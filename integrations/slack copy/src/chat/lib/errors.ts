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
import { getSlackNeededScopes } from '../../lib/errors';

let SLACK_CHAT_ERROR_CODES: Record<string, ChatErrorCode> = {
  // Auth and installation
  invalid_auth: 'chat.auth.invalid',
  not_authed: 'chat.auth.invalid',
  token_revoked: 'chat.auth.invalid',
  account_inactive: 'chat.auth.invalid',
  token_expired: 'chat.auth.expired',
  missing_scope: 'chat.auth.missing_scope',
  not_allowed_token_type: 'chat.auth.user_token_required',
  is_bot: 'chat.auth.app_not_installed',
  team_access_not_granted: 'chat.auth.app_not_installed',
  enterprise_is_restricted: 'chat.auth.app_not_installed',

  // Targets
  channel_not_found: 'chat.channel.not_found',
  message_not_found: 'chat.message.not_found',
  thread_not_found: 'chat.thread.not_found',
  user_not_found: 'chat.user.not_found',
  users_not_found: 'chat.user.not_found',
  team_not_found: 'chat.workspace.not_found',
  file_not_found: 'chat.attachment.not_found',
  file_deleted: 'chat.attachment.not_found',
  invalid_name: 'chat.emoji.not_found',

  // Access
  not_in_channel: 'chat.access.not_a_member',
  is_archived: 'chat.access.channel_archived',
  no_permission: 'chat.access.forbidden',
  restricted_action: 'chat.access.forbidden',
  ekm_access_denied: 'chat.access.forbidden',
  cannot_dm_bot: 'chat.access.dm_not_allowed',
  user_disabled: 'chat.access.dm_not_allowed',

  // Content
  no_text: 'chat.content.empty',
  msg_too_long: 'chat.content.too_long',
  too_many_attachments: 'chat.content.too_long',
  invalid_blocks: 'chat.content.invalid_blocks',
  invalid_blocks_format: 'chat.content.invalid_blocks',
  blocks_must_be_array: 'chat.content.invalid_blocks',

  // Attachments
  file_upload_error: 'chat.attachment.upload_failed',
  upload_error: 'chat.attachment.upload_failed',

  // Conflicts
  cant_update_message: 'chat.message.not_editable',
  edit_window_closed: 'chat.message.not_editable',
  cant_delete_message: 'chat.message.not_deletable',
  already_reacted: 'chat.reaction.already_exists',
  no_reaction: 'chat.reaction.not_found',
  too_many_reactions: 'chat.reaction.limit_reached',

  // Interactions
  expired_trigger_id: 'chat.interaction.trigger_expired',
  trigger_exchanged: 'chat.interaction.trigger_expired',
  invalid_trigger_id: 'chat.interaction.trigger_invalid',

  // Rate limiting and availability
  ratelimited: 'chat.rate_limit.exceeded',
  rate_limited: 'chat.rate_limit.exceeded',
  service_unavailable: 'chat.provider.unavailable',
  fatal_error: 'chat.provider.unavailable',
  internal_error: 'chat.provider.unavailable',
  request_timeout: 'chat.provider.timeout',

  // Input
  invalid_cursor: 'chat.input.cursor_invalid'
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

export interface SlackChatErrorContext {
  action?: string;
  channelId?: string;
  threadId?: string;
  messageId?: string;
  userId?: string;
  workspaceId?: string;
  attachmentId?: string;
  triggerId?: string;
  ambiguous?: Record<string, ChatErrorCode>;
  scopes?: string[];
}

/** The target id matching a code's entity, so the envelope points somewhere. */
let TARGET_FIELDS: Record<ChatErrorTargetType, keyof SlackChatErrorContext> = {
  workspace: 'workspaceId',
  channel: 'channelId',
  thread: 'threadId',
  message: 'messageId',
  user: 'userId',
  attachment: 'attachmentId',
  reaction: 'messageId',
  modal: 'triggerId',
  command: 'messageId'
};

let getSlackCode = (error: unknown): string | undefined => {
  if (error instanceof ServiceError) {
    let code = error.data.upstreamCode;
    if (typeof code === 'string' && code) return code;
  }

  if (SlateError.is(error)) {
    let code = error.data.upstream?.code;
    if (typeof code === 'string' && code) return code;
  }

  return undefined;
};

let resolveChatCode = (
  error: unknown,
  slackCode: string | undefined,
  context: SlackChatErrorContext
): ChatErrorCode => {
  if (slackCode) {
    let ambiguous = context.ambiguous?.[slackCode];
    if (ambiguous) return ambiguous;

    let mapped = SLACK_CHAT_ERROR_CODES[slackCode];
    if (mapped) return mapped;
  }

  if (SlateError.is(error)) {
    let mapped = SLATE_CHAT_ERROR_CODES[error.code];
    if (mapped) return mapped;
  }

  return 'chat.provider.error';
};

let resolveTarget = (code: ChatErrorCode, context: SlackChatErrorContext) => {
  let entity = getChatErrorTargetType(code);
  if (!entity) return undefined;

  let id = context[TARGET_FIELDS[entity]];
  return typeof id === 'string' ? id : undefined;
};

export let mapSlackChatError = (error: unknown, context: SlackChatErrorContext = {}) => {
  if (ChatError.is(error)) return error;

  let slackCode = getSlackCode(error);
  let code = resolveChatCode(error, slackCode, context);

  let details: ChatErrorDetailsInput = {
    action: context.action,
    target: resolveTarget(code, context),
    provider: slackCode ? { code: slackCode } : undefined
  };

  if (code === 'chat.auth.missing_scope') {
    let scopes = getSlackNeededScopes(error);
    details.scopes = scopes.length > 0 ? scopes : context.scopes;
  }

  return wrapChatError(code, error, details);
};

export let withSlackChatErrors = async <T>(
  context: SlackChatErrorContext,
  run: () => Promise<T>
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw mapSlackChatError(error, context);
  }
};
