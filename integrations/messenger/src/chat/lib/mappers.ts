import type {
  AttachmentRef,
  Author,
  Channel,
  ChatPart,
  Message,
  Workspace
} from '@slates/adapter-chat';
import type { MessengerMessagingEvent } from '../../triggers/event-schemas';
import type { MessengerChatClient, MessengerPage, MessengerUserProfile } from './client';

export let MESSENGER_CHANNEL_PROVIDER_TYPE = 'messenger_conversation';

let toIso = (timestamp: number | undefined) =>
  new Date(
    typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : Date.now()
  ).toISOString();

export let mapMessengerWorkspace = (pageId: string, page?: MessengerPage): Workspace => ({
  id: pageId,
  name: page?.name,
  imageUrl: page?.picture?.data?.url,
  raw: page
});

export let mapMessengerPageAuthor = (pageId: string, page?: MessengerPage): Author => ({
  userId: pageId,
  userName: page?.name ?? pageId,
  fullName: page?.name ?? pageId,
  type: 'app',
  providerType: 'page',
  isMe: true,
  imageUrl: page?.picture?.data?.url,
  raw: page
});

export let mapMessengerUserAuthor = (
  userId: string,
  profile?: MessengerUserProfile
): Author => {
  let fullName =
    profile?.name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    userId;
  return {
    userId,
    userName: fullName,
    fullName,
    type: 'user',
    providerType: 'psid',
    isMe: false,
    imageUrl: profile?.profile_pic,
    raw: profile
  };
};

export let mapMessengerChannel = (pageId: string, recipient: Author): Channel => ({
  id: recipient.userId,
  workspaceId: pageId,
  type: 'dm',
  providerType: MESSENGER_CHANNEL_PROVIDER_TYPE,
  name: recipient.fullName,
  hasAccess: true,
  recipient,
  raw: { psid: recipient.userId, pageId }
});

export let tryGetUserProfile = async (client: MessengerChatClient, userId: string) => {
  try {
    let profile = await client.getUserProfile(userId);
    return profile && Object.keys(profile).length > 0 ? profile : undefined;
  } catch {
    return undefined;
  }
};

let FILE_ATTACHMENT_TYPES: Record<string, AttachmentRef['type']> = {
  image: 'image',
  sticker: 'image',
  video: 'video',
  audio: 'audio',
  file: 'file'
};

export interface MessengerFileReference {
  messageId?: string;
  attachmentId?: string;
  index?: number;
  url?: string;
  type?: string;
}

type InboundAttachment = NonNullable<
  NonNullable<MessengerMessagingEvent['message']>['attachments']
>[number];

let stringField = (payload: Record<string, unknown> | null | undefined, key: string) => {
  let value = payload?.[key];
  return typeof value === 'string' && value ? value : undefined;
};

export let mapInboundAttachments = (
  messageId: string,
  attachments: InboundAttachment[] | undefined
) => {
  let files: AttachmentRef[] = [];
  let links: ChatPart[] = [];

  (attachments ?? []).forEach((attachment, index) => {
    let payload = attachment.payload ?? undefined;
    let url = stringField(payload, 'url');
    let fileType = FILE_ATTACHMENT_TYPES[attachment.type];

    if (fileType) {
      let reference: MessengerFileReference = { messageId, index, url, type: attachment.type };
      files.push({
        type: fileType,
        id: stringField(payload, 'sticker_id') ?? `${messageId}:${index}`,
        status: 'complete',
        providerFileReference: reference,
        raw: attachment
      });
      return;
    }

    // Shared links, posts, and reels arrive as URL-bearing payloads, not files.
    if (url) {
      links.push({ type: 'link', url, label: stringField(payload, 'title') ?? url });
    }
  });

  return { files, links };
};

export let mapInboundMessage = (opts: {
  pageId: string;
  event: MessengerMessagingEvent;
  author: Author;
  channel: Channel;
}): Message => {
  let message = opts.event.message!;
  let { files, links } = mapInboundAttachments(message.mid, message.attachments);
  let parts: ChatPart[] = [];
  if (message.text) parts.push({ type: 'text', content: message.text });
  parts.push(...links);
  // Attachment-only messages carry an empty text part; the body schema requires one part.
  if (parts.length === 0) parts.push({ type: 'text', content: '' });

  return {
    id: message.mid,
    channelId: opts.channel.id,
    author: opts.author,
    body: {
      parts,
      ...(message.text ? { altText: message.text } : {}),
      ...(files.length ? { attachments: files } : {})
    },
    providerType: 'message',
    metadata: { sentAt: toIso(opts.event.timestamp), edited: false },
    ...(message.reply_to?.mid ? { reply: { id: message.reply_to.mid } } : {}),
    raw: opts.event
  };
};

export let mapEditedMessage = (opts: {
  event: MessengerMessagingEvent;
  author: Author;
  channel: Channel;
}): Message => {
  let edit = opts.event.message_edit!;
  let editedAt = toIso(opts.event.timestamp);
  return {
    id: edit.mid,
    channelId: opts.channel.id,
    author: opts.author,
    body: {
      parts: [{ type: 'text', content: edit.text ?? '' }],
      ...(edit.text ? { altText: edit.text } : {})
    },
    providerType: 'message',
    // The edit event has no original send time.
    metadata: { sentAt: editedAt, edited: true, editedAt },
    raw: opts.event
  };
};

export let mapSentMessage = (opts: {
  messageId: string;
  channel: Channel;
  pageAuthor: Author;
  parts: ChatPart[];
  text?: string;
  attachments?: AttachmentRef[];
  replyToMessageId?: string;
  raw: unknown;
}): Message => ({
  id: opts.messageId,
  channelId: opts.channel.id,
  author: opts.pageAuthor,
  body: {
    parts: opts.parts,
    ...(opts.text ? { altText: opts.text } : {}),
    ...(opts.attachments?.length ? { attachments: opts.attachments } : {})
  },
  providerType: 'message',
  metadata: { sentAt: new Date().toISOString(), edited: false },
  ...(opts.replyToMessageId ? { reply: { id: opts.replyToMessageId } } : {}),
  raw: opts.raw
});

export let resolveMessengerChannel = async (client: MessengerChatClient, psid: string) => {
  let profile = await tryGetUserProfile(client, psid);
  return mapMessengerChannel(client.pageId, mapMessengerUserAuthor(psid, profile));
};
