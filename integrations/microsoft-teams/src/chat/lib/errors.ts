import {
  type ChatErrorCode,
  type ChatErrorTargetType,
  type ChatErrorUpstream,
  createChatErrorMapper
} from '@slates/adapter-chat';

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

export interface TeamsChatErrorContext {
  action?: string;
  channelId?: string;
  threadId?: string;
  messageId?: string;
  userId?: string;
  workspaceId?: string;
  attachmentId?: string;
  /** Per-operation overrides for ambiguous codes. */
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

let resolveChatCode = (
  upstream: ChatErrorUpstream,
  context: TeamsChatErrorContext
): ChatErrorCode | undefined => {
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
  return undefined;
};

let teamsChatErrors = createChatErrorMapper<TeamsChatErrorContext>({
  targetFields: TARGET_FIELDS,
  classify: (_error, context, upstream) => ({
    code: resolveChatCode(upstream, context),
    provider: upstream.code ? { code: upstream.code } : undefined
  })
});

export let mapTeamsChatError = teamsChatErrors.map;
export let withTeamsChatErrors = teamsChatErrors.withErrors;
