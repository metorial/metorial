import { ChatErrors, decodeChatCursor, encodeCursor } from '@slates/adapter-chat';
import { z } from 'zod';
import {
  resolveGoogleChatMessageName,
  resolveGoogleChatSpaceName,
  resolveGoogleChatThreadName,
  resolveGoogleChatUserName
} from '../../lib/resource-names';

export let GOOGLE_CHAT_CURSOR_PROVIDER = 'google-chat';

let validationMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Invalid Google Chat resource name.';

let resolve = <T>(action: string, field: string, run: () => T): T => {
  try {
    return run();
  } catch (error) {
    throw ChatErrors.inputInvalid({
      action,
      message: validationMessage(error),
      issues: [{ path: [field], code: 'invalid', message: validationMessage(error) }],
      cause: error
    });
  }
};

export let resolveChannelName = (action: string, channelId: string) =>
  resolve(action, 'channelId', () => resolveGoogleChatSpaceName(channelId));

export let resolveMessageName = (action: string, channelId: string, messageId: string) => {
  let space = resolveChannelName(action, channelId);
  let name = resolve(action, 'messageId', () =>
    resolveGoogleChatMessageName(messageId, space)
  );
  if (!name.startsWith(`${space}/messages/`)) {
    throw ChatErrors.inputInvalid({
      action,
      message: `The message ${name} does not belong to ${space}.`,
      issues: [
        { path: ['messageId'], code: 'invalid', message: 'Message is in another space' }
      ]
    });
  }
  return { space, name };
};

export let resolveThreadName = (action: string, space: string, threadId: string | undefined) =>
  resolve(action, 'threadId', () => resolveGoogleChatThreadName(threadId, space));

export let resolveUserName = (action: string, userId: string) =>
  resolve(action, 'userId', () => resolveGoogleChatUserName(userId));

let pageCursorSchema = z.object({ pageToken: z.string().min(1) });

export let encodePageCursor = (pageToken: string | undefined) =>
  pageToken
    ? encodeCursor(GOOGLE_CHAT_CURSOR_PROVIDER, {
        direction: 'forward',
        data: { pageToken }
      })
    : undefined;

export let decodePageCursor = (action: string, cursor: string | undefined) => {
  if (!cursor) return undefined;
  return decodeChatCursor(GOOGLE_CHAT_CURSOR_PROVIDER, cursor, pageCursorSchema, {
    action,
    message: 'The cursor is not a Google Chat page cursor from a previous call.'
  }).data.pageToken;
};
