import {
  type ChatErrorCode,
  type ChatErrorTargetType,
  type ChatErrorUpstream,
  chatErrorCodeForStatus,
  createChatErrorMapper
} from '@slates/adapter-chat';

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

let resolveCode = (
  upstream: ChatErrorUpstream,
  context: DiscordChatErrorContext
): ChatErrorCode | undefined => {
  if (upstream.code) {
    let ambiguous = context.ambiguous?.[upstream.code];
    if (ambiguous) return ambiguous;

    let mapped = DISCORD_CHAT_ERROR_CODES[upstream.code];
    if (mapped && mapped !== 'chat.provider.error') return mapped;
  }

  if (upstream.status === 404) return context.notFound ?? 'chat.provider.error';
  if (upstream.status === 413) return 'chat.attachment.too_large';
  return chatErrorCodeForStatus(upstream.status);
};

let discordChatErrors = createChatErrorMapper<DiscordChatErrorContext>({
  targetFields: TARGET_FIELDS,
  classify: (_error, context, upstream) => ({
    code: resolveCode(upstream, context),
    provider:
      upstream.code || upstream.message
        ? { code: upstream.code, message: upstream.message }
        : undefined
  })
});

export let mapDiscordChatError = discordChatErrors.map;
export let withDiscordChatErrors = discordChatErrors.withErrors;
