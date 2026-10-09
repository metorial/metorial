import type { GoogleChatInteractionEvent } from '../../triggers/interactionEvents';
import type { GoogleChatAppIdentity } from './identity';
import {
  type GoogleChatMessageResource,
  type GoogleChatSpaceResource,
  type GoogleChatUserResource,
  mapGoogleChatAuthor,
  mapGoogleChatChannel,
  mapGoogleChatMessage,
  mapGoogleChatThread,
  messageHasAppMention
} from './mappers';

/**
 * Interaction events carry the sender twice: `message.sender` and the richer
 * event `user` (with email and avatar). Merge them when they are the same user.
 */
let mergeSender = (event: GoogleChatInteractionEvent): GoogleChatUserResource | undefined => {
  let sender = (event.message as GoogleChatMessageResource | undefined)?.sender;
  let user = event.user as GoogleChatUserResource | undefined;
  if (!sender) return user;
  if (user && user.name === sender.name)
    return {
      ...user,
      ...sender,
      email: user.email ?? sender.email,
      avatarUrl: user.avatarUrl ?? sender.avatarUrl
    };
  return sender;
};

export let isGoogleChatMessageEvent = (payload: unknown) => {
  let event = payload as GoogleChatInteractionEvent | null;
  if (!event || typeof event !== 'object' || Array.isArray(event)) return false;
  let message = event.message as GoogleChatMessageResource | undefined;
  return (
    event.type === 'MESSAGE' &&
    typeof message === 'object' &&
    message !== null &&
    typeof message.name === 'string' &&
    typeof event.space?.name === 'string' &&
    !message.slashCommand &&
    event.isDialogEvent !== true
  );
};

export let isGoogleChatMentionEvent = (payload: unknown) =>
  isGoogleChatMessageEvent(payload) &&
  messageHasAppMention(
    (payload as GoogleChatInteractionEvent).message as GoogleChatMessageResource
  );

export let isGoogleChatCommandEvent = (payload: unknown) => {
  let event = payload as GoogleChatInteractionEvent | null;
  if (!event || typeof event !== 'object' || Array.isArray(event)) return false;
  if (typeof event.space?.name !== 'string' || event.isDialogEvent === true) return false;
  if (event.type === 'APP_COMMAND') return true;
  let message = event.message as GoogleChatMessageResource | undefined;
  return event.type === 'MESSAGE' && Boolean(message?.slashCommand);
};

export let mapGoogleChatEventChannel = (
  event: GoogleChatInteractionEvent,
  identity: GoogleChatAppIdentity
) =>
  mapGoogleChatChannel(event.space as GoogleChatSpaceResource, identity, {
    recipient: event.user as GoogleChatUserResource | undefined
  });

export let mapGoogleChatEventMessage = (
  event: GoogleChatInteractionEvent,
  identity: GoogleChatAppIdentity
) => {
  let spaceName = event.space.name;
  let raw = event.message as GoogleChatMessageResource;
  let message = mapGoogleChatMessage({ ...raw, sender: mergeSender(event) }, identity, {
    isMe: false,
    channelId: spaceName
  });
  return {
    message,
    channel: mapGoogleChatEventChannel(event, identity),
    thread: mapGoogleChatThread(raw, spaceName)
  };
};

export let mapGoogleChatEventAuthor = (event: GoogleChatInteractionEvent) =>
  mapGoogleChatAuthor(mergeSender(event), { isMe: false });
