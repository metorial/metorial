import { zoomServiceError } from './errors';

// Team Chat user-level message endpoints address a conversation by exactly one of
// `to_channel` or `to_contact`: https://developers.zoom.us/docs/api/team-chat/#tag/chat-messages
export let assertChatRecipient = (
  toChannel: string | undefined,
  toContact: string | undefined,
  purpose: string
) => {
  if (!toChannel && !toContact) {
    throw zoomServiceError(`Provide either toChannel or toContact ${purpose}.`);
  }

  if (toChannel && toContact) {
    throw zoomServiceError('Provide only one chat recipient: toChannel or toContact.');
  }
};

export let describeChatRecipient = (toChannel?: string, toContact?: string) =>
  toChannel ? `channel ${toChannel}` : `contact ${toContact}`;
