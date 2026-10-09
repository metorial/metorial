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

/**
 * Chatbot API error codes from the official OpenAPI description
 * (https://developers.zoom.us/api-hub/chatbot/methods/endpoints.json):
 * 7001 invalid body, 7002 invalid robot_jid, 7003 no chatbot for robot_jid,
 * 7004 not authorized / no channel or user for to_jid, 7010 bad Authorization,
 * 8001 invalid message_id.
 */
let ZOOM_CHAT_ERROR_CODES: Record<string, ChatErrorCode> = {
  '7001': 'chat.input.invalid',
  '7002': 'chat.auth.invalid',
  '7003': 'chat.auth.app_not_installed',
  '7004': 'chat.channel.not_found',
  '7010': 'chat.auth.invalid',
  '8001': 'chat.message.not_found'
};

let SLATE_CHAT_ERROR_CODES: Record<string, ChatErrorCode> = {
  'upstream.rate_limited': 'chat.rate_limit.exceeded',
  'upstream.timeout': 'chat.provider.timeout',
  'upstream.network_error': 'chat.provider.network_error',
  'upstream.unavailable': 'chat.provider.unavailable',
  'upstream.invalid_request': 'chat.input.invalid',
  'auth.invalid': 'chat.auth.invalid',
  'auth.expired': 'chat.auth.expired',
  'auth.required': 'chat.auth.invalid',
  'permission.denied': 'chat.access.forbidden'
};

export interface ZoomChatErrorContext {
  action?: string;
  channelId?: string;
  messageId?: string;
  userId?: string;
  workspaceId?: string;
}

let TARGET_FIELDS: Partial<Record<ChatErrorTargetType, keyof ZoomChatErrorContext>> = {
  workspace: 'workspaceId',
  channel: 'channelId',
  message: 'messageId',
  user: 'userId',
  reaction: 'messageId'
};

let getZoomCode = (error: unknown): string | undefined => {
  if (SlateError.is(error)) {
    let code = error.data.upstream?.code;
    if (typeof code === 'string' || typeof code === 'number') return String(code);
  }

  if (error instanceof ServiceError) {
    let code = error.data.upstreamCode;
    if (typeof code === 'string' || typeof code === 'number') return String(code);
  }

  return undefined;
};

let resolveCode = (error: unknown, zoomCode: string | undefined): ChatErrorCode => {
  if (zoomCode) {
    let mapped = ZOOM_CHAT_ERROR_CODES[zoomCode];
    if (mapped) return mapped;
  }

  if (SlateError.is(error)) {
    let mapped = SLATE_CHAT_ERROR_CODES[error.code];
    if (mapped) return mapped;
  }

  return 'chat.provider.error';
};

export let mapZoomChatError = (error: unknown, context: ZoomChatErrorContext = {}) => {
  if (ChatError.is(error)) return error;

  let zoomCode = getZoomCode(error);
  let code = resolveCode(error, zoomCode);
  let entity = getChatErrorTargetType(code);
  let field = entity ? TARGET_FIELDS[entity] : undefined;
  let target = field ? context[field] : undefined;

  let details: ChatErrorDetailsInput = {
    action: context.action,
    target: typeof target === 'string' ? target : undefined,
    provider: zoomCode ? { code: zoomCode } : undefined
  };

  return wrapChatError(code, error, details);
};

export let withZoomChatErrors = async <T>(
  context: ZoomChatErrorContext,
  run: () => Promise<T>
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw mapZoomChatError(error, context);
  }
};
