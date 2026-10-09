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
 * WhatsApp Cloud API error codes mapped to chat error codes.
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes
 */
let WHATSAPP_CHAT_ERROR_CODES: Record<string, ChatErrorCode> = {
  // Authorization
  '0': 'chat.auth.invalid',
  '190': 'chat.auth.expired',
  '3': 'chat.auth.missing_scope',
  '10': 'chat.auth.missing_scope',
  '131005': 'chat.auth.missing_scope',

  // Business phone number / account state
  '33': 'chat.workspace.not_found',
  '131045': 'chat.auth.app_not_installed',
  '133010': 'chat.auth.app_not_installed',
  '368': 'chat.access.forbidden',
  '130497': 'chat.access.forbidden',
  '131031': 'chat.access.forbidden',
  '131037': 'chat.access.forbidden',
  '131042': 'chat.access.forbidden',
  '131064': 'chat.access.forbidden',

  // Recipient / conversation
  '131047': 'chat.access.dm_not_allowed',
  '131026': 'chat.access.dm_not_allowed',
  '131050': 'chat.access.dm_not_allowed',
  '130403': 'chat.access.dm_not_allowed',
  '131021': 'chat.input.invalid',

  // Input
  '100': 'chat.input.invalid',
  '131008': 'chat.input.invalid',
  '131009': 'chat.input.invalid',
  '135000': 'chat.input.invalid',
  '131051': 'chat.content.unsupported_block',
  '131062': 'chat.capability.unsupported',

  // Media
  '131052': 'chat.attachment.download_failed',
  '131053': 'chat.attachment.upload_failed',

  // Throughput
  '4': 'chat.rate_limit.exceeded',
  '80007': 'chat.rate_limit.exceeded',
  '130429': 'chat.rate_limit.exceeded',
  '131048': 'chat.rate_limit.exceeded',
  '131056': 'chat.rate_limit.exceeded',

  // Availability
  '1': 'chat.provider.error',
  '131000': 'chat.provider.error',
  '2': 'chat.provider.unavailable',
  '131016': 'chat.provider.unavailable',
  '131057': 'chat.provider.unavailable',
  '133004': 'chat.provider.unavailable',
  '2494100': 'chat.provider.unavailable'
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

/** Friendlier messages for the conditions agents most need to act on. */
let WHATSAPP_CHAT_ERROR_MESSAGES: Record<string, string> = {
  '131047':
    'The 24-hour customer service window with this WhatsApp user is closed. Free-form messages can only be sent within 24 hours of the user’s last message; send an approved template message instead.',
  '131026':
    'WhatsApp could not deliver the message to this recipient (not a WhatsApp number, outdated client, or the user has not accepted the latest terms).',
  '131050': 'This WhatsApp user has opted out of marketing messages from this business.',
  '130403': 'This business has blocked the WhatsApp user. Unblock the user to message them.',
  '133010':
    'The business phone number is not registered with the WhatsApp Cloud API. Register the phone number before sending messages.',
  '131045':
    'The business phone number is not registered with the WhatsApp Cloud API. Register the phone number before sending messages.'
};

export interface WhatsAppChatErrorContext {
  action?: string;
  channelId?: string;
  messageId?: string;
  workspaceId?: string;
  attachmentId?: string;
  emoji?: string;
  /** Per-operation overrides for codes whose meaning depends on the target. */
  ambiguous?: Record<string, ChatErrorCode>;
}

let TARGET_FIELDS: Partial<Record<ChatErrorTargetType, keyof WhatsAppChatErrorContext>> = {
  workspace: 'workspaceId',
  channel: 'channelId',
  // A WhatsApp customer conversation is identified by the customer's id.
  user: 'channelId',
  message: 'messageId',
  attachment: 'attachmentId',
  reaction: 'messageId'
};

export let getWhatsAppUpstreamCode = (error: unknown): string | undefined => {
  if (error instanceof ServiceError) {
    let code = error.data.upstreamCode;
    if ((typeof code === 'string' && code) || typeof code === 'number') return String(code);
  }

  if (SlateError.is(error)) {
    let code = error.data.upstream?.code;
    if (typeof code === 'string' && code) return code;
  }

  return undefined;
};

let resolveChatCode = (
  error: unknown,
  upstreamCode: string | undefined,
  context: WhatsAppChatErrorContext
): ChatErrorCode => {
  if (upstreamCode) {
    let ambiguous = context.ambiguous?.[upstreamCode];
    if (ambiguous) return ambiguous;

    let mapped = WHATSAPP_CHAT_ERROR_CODES[upstreamCode];
    if (mapped) return mapped;

    let numeric = Number(upstreamCode);
    if (Number.isInteger(numeric) && numeric >= 200 && numeric <= 299) {
      return 'chat.auth.missing_scope';
    }
  }

  if (SlateError.is(error)) {
    let mapped = SLATE_CHAT_ERROR_CODES[error.code];
    if (mapped) return mapped;
  }

  return 'chat.provider.error';
};

let resolveTarget = (code: ChatErrorCode, context: WhatsAppChatErrorContext) => {
  let entity = getChatErrorTargetType(code);
  if (!entity) return undefined;

  let field = TARGET_FIELDS[entity];
  let id = field ? context[field] : undefined;
  return typeof id === 'string' ? id : undefined;
};

let getUpstreamMessage = (error: unknown) => {
  if (SlateError.is(error)) return error.message;
  if (error instanceof Error) return error.message;
  return undefined;
};

export let mapWhatsAppChatError = (error: unknown, context: WhatsAppChatErrorContext = {}) => {
  if (ChatError.is(error)) return error;

  let upstreamCode = getWhatsAppUpstreamCode(error);
  let code = resolveChatCode(error, upstreamCode, context);
  let upstreamMessage = getUpstreamMessage(error);

  let details: ChatErrorDetailsInput = {
    action: context.action,
    target: resolveTarget(code, context),
    provider: upstreamCode ? { code: upstreamCode, message: upstreamMessage } : undefined
  };

  let friendly = upstreamCode ? WHATSAPP_CHAT_ERROR_MESSAGES[upstreamCode] : undefined;
  if (friendly) details.message = friendly;

  if (code === 'chat.auth.missing_scope') {
    details.scopes = ['whatsapp_business_messaging'];
  }

  return wrapChatError(code, error, details);
};

export let withWhatsAppChatErrors = async <T>(
  context: WhatsAppChatErrorContext,
  run: () => Promise<T>
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw mapWhatsAppChatError(error, context);
  }
};
