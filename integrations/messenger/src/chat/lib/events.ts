import type { MessengerEvent } from '../../triggers/event-schemas';
import { MessengerChatClient } from './client';
import { mapMessengerChannel, mapMessengerUserAuthor, tryGetUserProfile } from './mappers';

/**
 * Maps the person behind a Messenger event to an author and its DM channel. The
 * workspace id is the Page id from the signed delivery (the routing identity),
 * and the profile lookup is best-effort enrichment.
 */
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
