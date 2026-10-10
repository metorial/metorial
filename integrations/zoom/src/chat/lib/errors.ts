import {
  type ChatErrorCode,
  type ChatErrorTargetType,
  chatErrorCodeForStatus,
  createChatErrorMapper
} from '@slates/adapter-chat';
import { SlateError } from '@slates/provider';

// https://developers.zoom.us/api-hub/chatbot/methods/endpoints.json
let ZOOM_CHAT_ERROR_CODES: Record<string, ChatErrorCode> = {
  '7001': 'chat.input.invalid',
  '7002': 'chat.auth.invalid',
  '7003': 'chat.auth.app_not_installed',
  '7004': 'chat.channel.not_found',
  '7010': 'chat.auth.invalid',
  '8001': 'chat.message.not_found'
};

export interface ZoomChatErrorContext {
  action?: string;
  channelId?: string;
  messageId?: string;
  userId?: string;
  workspaceId?: string;
  /** Classification for an HTTP 404 without a known Zoom code. */
  notFound?: ChatErrorCode;
}

let TARGET_FIELDS: Partial<Record<ChatErrorTargetType, keyof ZoomChatErrorContext>> = {
  workspace: 'workspaceId',
  channel: 'channelId',
  message: 'messageId',
  user: 'userId',
  reaction: 'messageId'
};

let zoomChatErrors = createChatErrorMapper<ZoomChatErrorContext>({
  targetFields: TARGET_FIELDS,
  extraCodes: { 'upstream.invalid_request': 'chat.input.invalid' },
  classify: (error, context, { code, status }) => {
    // Only a real HTTP status; slates derives one from its code (timeouts become 504).
    let httpStatus = SlateError.is(error) ? error.data.upstream?.status : status;
    return {
      code:
        (code ? ZOOM_CHAT_ERROR_CODES[code] : undefined) ??
        chatErrorCodeForStatus(httpStatus, context.notFound),
      provider: code ? { code } : undefined
    };
  }
});

export let mapZoomChatError = zoomChatErrors.map;
export let withZoomChatErrors = zoomChatErrors.withErrors;
