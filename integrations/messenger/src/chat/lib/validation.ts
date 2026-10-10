import { ChatErrors } from '@slates/adapter-chat';
import type { MessengerChatClient } from './client';

// The Page itself is not a conversation.
export let assertMessengerPsid = (
  client: MessengerChatClient,
  channelId: string,
  action: string
) => {
  if (!channelId || channelId !== channelId.trim() || channelId === client.pageId) {
    throw ChatErrors.channelNotFound({
      action,
      channelId,
      message: 'Messenger channel ids are the Page-scoped ids of people who messaged the Page.'
    });
  }
};
