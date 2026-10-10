import type { GoogleChatAppClient } from './client';
import type { GoogleChatAppIdentity } from './identity';
import {
  type GoogleChatMessageResource,
  type GoogleChatSpaceResource,
  mapGoogleChatChannel,
  mapGoogleChatMessage,
  mapGoogleChatThread
} from './mappers';

// Space metadata is best-effort; falls back to the space returned with the message.
export let loadGoogleChatSpace = async (
  client: GoogleChatAppClient,
  spaceName: string,
  fallback?: GoogleChatSpaceResource
): Promise<GoogleChatSpaceResource> => {
  try {
    return await client.request<GoogleChatSpaceResource>(spaceName, { method: 'get' });
  } catch {
    return { ...fallback, name: spaceName };
  }
};

export let buildGoogleChatMessageResult = async (
  client: GoogleChatAppClient,
  identity: GoogleChatAppIdentity,
  spaceName: string,
  message: GoogleChatMessageResource,
  options: { isMe?: boolean } = {}
) => {
  let space = await loadGoogleChatSpace(client, spaceName, message.space);
  let mapped = mapGoogleChatMessage(message, { isMe: options.isMe, channelId: spaceName });
  return {
    message: mapped,
    channel: mapGoogleChatChannel(space, identity),
    thread: mapGoogleChatThread(message, spaceName),
    raw: message
  };
};
