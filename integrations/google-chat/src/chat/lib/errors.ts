import { ServiceError } from '@lowerdeck/error';
import {
  type ChatErrorCode,
  type ChatErrorTargetType,
  createChatErrorMapper
} from '@slates/adapter-chat';
import { SlateError } from 'slates';

// 403/404 depend on the action, so callers pass `ambiguous` overrides.
let GOOGLE_STATUS_CHAT_CODES: Record<string, ChatErrorCode> = {
  UNAUTHENTICATED: 'chat.auth.invalid',
  PERMISSION_DENIED: 'chat.access.forbidden',
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

export interface GoogleChatChatErrorContext {
  action?: string;
  channelId?: string;
  threadId?: string;
  messageId?: string;
  userId?: string;
  workspaceId?: string;
  attachmentId?: string;
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

let googleChatErrors = createChatErrorMapper<GoogleChatChatErrorContext>({
  targetFields: TARGET_FIELDS,
  classify: (error, context) => {
    let googleStatus = getGoogleStatus(error);
    return {
      code: googleStatus
        ? (context.ambiguous?.[googleStatus] ?? GOOGLE_STATUS_CHAT_CODES[googleStatus])
        : undefined,
      provider: googleStatus ? { code: googleStatus } : undefined
    };
  }
});

export let mapGoogleChatChatError = googleChatErrors.map;
