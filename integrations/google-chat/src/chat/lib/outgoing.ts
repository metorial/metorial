import { type ChatBody, ChatErrors } from '@slates/adapter-chat';
import type { GoogleChatAppClient } from './client';
import type { GoogleChatMessageResource } from './mappers';
import { renderGoogleChatText } from './render';
import { resolveMessageName, resolveThreadName, resolveUserName } from './resources';

export interface GoogleChatSendTarget {
  action: string;
  space: string;
  threadId?: string;
  replyToMessageId?: string;
  privateViewerUserId?: string;
}

// privateMessageViewer messages cannot carry attachments.
export let createGoogleChatMessage = async (
  client: GoogleChatAppClient,
  body: ChatBody,
  target: GoogleChatSendTarget
) => {
  let text = renderGoogleChatText(body, target.action);
  let threadName = resolveThreadName(target.action, target.space, target.threadId);

  if (!threadName && target.replyToMessageId) {
    let { name } = resolveMessageName(target.action, target.space, target.replyToMessageId);
    let replyTarget = await client.request<GoogleChatMessageResource>(name, {
      method: 'get',
      context: { messageId: name, ambiguous: { NOT_FOUND: 'chat.message.not_found' } }
    });
    threadName = replyTarget.thread?.name;
    if (!threadName) {
      throw ChatErrors.capabilityUnsupported({
        action: target.action,
        capability: 'message_reply',
        message: 'The reply target is not in a thread that this space supports replying to.'
      });
    }
  }

  let viewer = target.privateViewerUserId
    ? resolveUserName(target.action, target.privateViewerUserId)
    : undefined;

  return client.request<GoogleChatMessageResource>(`${target.space}/messages`, {
    method: 'post',
    params: threadName
      ? { messageReplyOption: 'REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD' }
      : undefined,
    data: {
      text,
      ...(threadName ? { thread: { name: threadName } } : {}),
      ...(viewer ? { privateMessageViewer: { name: viewer } } : {})
    },
    context: { threadId: threadName, userId: viewer }
  });
};
