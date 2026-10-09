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
 * Graph API error classification for the Messenger Send, User Profile, and Page
 * endpoints. Codes and subcodes come from
 * https://developers.facebook.com/docs/messenger-platform/reference/send-api/error-codes
 */

export interface MessengerGraphError {
  code?: number;
  subcode?: number;
  message?: string;
  type?: string;
}

export interface MessengerChatErrorContext {
  action?: string;
  channelId?: string;
  messageId?: string;
  userId?: string;
  workspaceId?: string;
  attachmentId?: string;
  /** Chat code to use when Graph reports an unknown object/recipient (code 100). */
  notFound?: ChatErrorCode;
}

let OUTSIDE_WINDOW_SUBCODES = new Set([2534022, 2018278, 2018065]);
let OUTSIDE_WINDOW_MESSAGE =
  'Messenger only allows standard messages within 24 hours of the person’s last message to the Page. The person must message the Page again before it can reply.';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return undefined;
};

let readGraphErrorBody = (data: unknown): MessengerGraphError | undefined => {
  if (!isRecord(data) || !isRecord(data.error)) return undefined;
  let error = data.error;
  return {
    code: toNumber(error.code),
    subcode: toNumber(error.error_subcode),
    message: typeof error.message === 'string' ? error.message : undefined,
    type: typeof error.type === 'string' ? error.type : undefined
  };
};

/** Reads the Graph `error` object from an axios error or a normalized SlateError. */
export let getMessengerGraphError = (error: unknown): MessengerGraphError | undefined => {
  if (!isRecord(error)) return undefined;

  let response = error.response;
  if (isRecord(response)) {
    let fromResponse = readGraphErrorBody(response.data);
    if (fromResponse) return fromResponse;
  }

  if (SlateError.is(error)) {
    let baggage = error.data.baggage;
    if (isRecord(baggage)) {
      let fromBaggage = readGraphErrorBody(baggage.response);
      if (fromBaggage) return fromBaggage;
    }
  }

  if (error instanceof ServiceError) {
    let parent = (error as { parent?: unknown }).parent;
    if (parent && parent !== error) return getMessengerGraphError(parent);
  }

  return undefined;
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

let resolveGraphCode = (
  graph: MessengerGraphError,
  context: MessengerChatErrorContext
): { code: ChatErrorCode; message?: string } | undefined => {
  let { code, subcode } = graph;
  if (code === undefined) return undefined;

  switch (code) {
    case 190:
      return { code: subcode === 463 ? 'chat.auth.expired' : 'chat.auth.invalid' };
    case 10:
      if (subcode !== undefined && OUTSIDE_WINDOW_SUBCODES.has(subcode)) {
        return { code: 'chat.access.dm_not_allowed', message: OUTSIDE_WINDOW_MESSAGE };
      }
      if (subcode === 2018108) return { code: 'chat.access.dm_not_allowed' };
      return { code: 'chat.access.forbidden' };
    case 551:
      return { code: 'chat.access.dm_not_allowed' };
    case 200:
      return {
        code: subcode === 1545041 ? 'chat.access.dm_not_allowed' : 'chat.access.forbidden'
      };
    case 2018300:
    case 2018321:
      return { code: 'chat.access.forbidden' };
    case 2018218:
      return { code: 'chat.user.not_found' };
    case 2018247:
      return { code: 'chat.access.forbidden' };
    case 9000001:
      return { code: 'chat.message.not_found' };
    case 4:
    case 613:
    case 9:
      return { code: 'chat.rate_limit.exceeded' };
    case 2:
      return { code: 'chat.provider.unavailable' };
    case 100:
      switch (subcode) {
        case 2018008:
        case 2018047:
        case 2018294:
          return { code: 'chat.attachment.upload_failed' };
        case 2018109:
          return { code: 'chat.attachment.too_large' };
        case 2018074:
          return { code: 'chat.attachment.not_found' };
        case 2534037:
          return { code: 'chat.access.forbidden' };
        case 2534015:
          return { code: 'chat.content.invalid_blocks' };
        case undefined:
        case 33:
        case 2018001:
          return { code: context.notFound ?? 'chat.input.invalid' };
        default:
          return { code: 'chat.input.invalid' };
      }
    default:
      return undefined;
  }
};

let TARGET_FIELDS: Partial<Record<ChatErrorTargetType, keyof MessengerChatErrorContext>> = {
  workspace: 'workspaceId',
  channel: 'channelId',
  message: 'messageId',
  user: 'userId',
  attachment: 'attachmentId',
  reaction: 'messageId'
};

let resolveTarget = (code: ChatErrorCode, context: MessengerChatErrorContext) => {
  let entity = getChatErrorTargetType(code);
  if (!entity) return undefined;
  let field = TARGET_FIELDS[entity];
  if (!field) return undefined;
  let id = context[field];
  return typeof id === 'string' ? id : undefined;
};

export let mapMessengerChatError = (
  error: unknown,
  context: MessengerChatErrorContext = {}
): ChatError => {
  if (ChatError.is(error)) return error;

  let graph = getMessengerGraphError(error);
  let resolved = graph ? resolveGraphCode(graph, context) : undefined;
  let code: ChatErrorCode =
    resolved?.code ??
    (SlateError.is(error) ? SLATE_CHAT_ERROR_CODES[error.code] : undefined) ??
    'chat.provider.error';

  let providerCode =
    graph?.code !== undefined
      ? `${graph.code}${graph.subcode !== undefined ? `/${graph.subcode}` : ''}`
      : undefined;

  let details: ChatErrorDetailsInput = {
    action: context.action,
    target: resolveTarget(code, context),
    message: resolved?.message,
    provider:
      providerCode || graph?.message
        ? { code: providerCode, message: graph?.message }
        : undefined
  };

  return wrapChatError(code, error, details);
};

export let withMessengerChatErrors = async <T>(
  context: MessengerChatErrorContext,
  run: () => Promise<T>
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw mapMessengerChatError(error, context);
  }
};
