import type { MessengerEvent } from '../../triggers/event-schemas';
import { MessengerChatClient } from './client';
import { mapMessengerChannel, mapMessengerUserAuthor, tryGetUserProfile } from './mappers';

// The workspace id is the signed delivery's Page id; the profile lookup is best-effort.
export let resolveMessengerEventParticipants = async (
  ctx: { auth: { token: string }; config?: { apiVersion?: string } },
  event: MessengerEvent,
  action: string
) => {
  let psid = event.messaging.sender.id;
  let client = new MessengerChatClient({
    token: ctx.auth.token,
    pageId: event.pageId,
    apiVersion: ctx.config?.apiVersion,
    action
  });
  let profile = await tryGetUserProfile(client, psid);
  let author = mapMessengerUserAuthor(psid, profile);
  let channel = mapMessengerChannel(event.pageId, author);
  return { author, channel };
};
