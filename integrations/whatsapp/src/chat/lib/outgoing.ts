import { type ChatBody, ChatErrors, type Message } from '@slates/adapter-chat';
import type {
  WhatsAppChatClient,
  WhatsAppPhoneNumberInfo,
  WhatsAppSendResponse
} from './client';
import { isWhatsAppChannelId, mapWhatsAppBusinessAuthor, mapWhatsAppChannel } from './mappers';

export let assertWhatsAppChannelId = (channelId: string, action: string) => {
  if (!isWhatsAppChannelId(channelId)) {
    throw ChatErrors.inputInvalid({
      action,
      message:
        'channelId must be a WhatsApp user ID (the customer phone number in international format, digits only) or a business-scoped user ID.',
      issues: [
        {
          path: ['channelId'],
          code: 'invalid_format',
          message: 'Expected a WhatsApp user ID or business-scoped user ID'
        }
      ]
    });
  }
};

// No threads; replies use reply.id.
export let assertNoWhatsAppThread = (threadId: string | undefined, action: string) => {
  if (threadId) {
    throw ChatErrors.inputInvalid({
      action,
      message:
        'WhatsApp conversations do not have threads. Omit threadId; to quote a message, pass reply.id instead.',
      issues: [
        { path: ['threadId'], code: 'unsupported', message: 'Threads are not supported' }
      ]
    });
  }
};

// Best-effort; display metadata must not fail a completed send.
export let getWhatsAppBusinessInfo = async (
  client: WhatsAppChatClient
): Promise<WhatsAppPhoneNumberInfo | undefined> => {
  try {
    return await client.getPhoneNumber();
  } catch {
    return undefined;
  }
};

export let getSentMessageId = (response: WhatsAppSendResponse, action: string) => {
  let id = response.messages?.[0]?.id;
  if (!id) {
    throw ChatErrors.providerError({
      action,
      message: 'WhatsApp accepted the request but did not return a message ID.'
    });
  }
  return id;
};

export let buildWhatsAppSentMessage = (input: {
  client: WhatsAppChatClient;
  channelId: string;
  messageId: string;
  body: ChatBody;
  business?: WhatsAppPhoneNumberInfo;
  replyToId?: string;
  response: WhatsAppSendResponse;
}): { message: Message; channel: ReturnType<typeof mapWhatsAppChannel> } => {
  let channel = mapWhatsAppChannel({
    channelId: input.channelId,
    workspaceId: input.client.phoneNumberId
  });

  return {
    channel,
    message: {
      id: input.messageId,
      channelId: input.channelId,
      author: mapWhatsAppBusinessAuthor(input.client.phoneNumberId, input.business),
      body: input.body,
      metadata: { sentAt: new Date().toISOString(), edited: false },
      ...(input.replyToId ? { reply: { id: input.replyToId } } : {}),
      raw: input.response
    }
  };
};
