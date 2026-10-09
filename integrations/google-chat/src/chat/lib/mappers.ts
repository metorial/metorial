import type {
  AttachmentRef,
  Author,
  Channel,
  ChannelType,
  Message,
  Thread
} from '@slates/adapter-chat';
import type { GoogleChatAppIdentity } from './identity';

/** https://developers.google.com/workspace/chat/api/reference/rest/v1/User */
export interface GoogleChatUserResource {
  name?: string;
  displayName?: string;
  domainId?: string;
  type?: string;
  isAnonymous?: boolean;
  // Present on users in interaction events.
  email?: string;
  avatarUrl?: string;
}

/** https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces */
export interface GoogleChatSpaceResource {
  name?: string;
  type?: string;
  spaceType?: string;
  singleUserBotDm?: boolean;
  displayName?: string;
  externalUserAllowed?: boolean;
  spaceThreadingState?: string;
  spaceDetails?: { description?: string; guidelines?: string };
  membershipCount?: { joinedDirectHumanUserCount?: number };
  accessSettings?: { accessState?: string };
  spaceUri?: string;
}

/** https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages.attachments */
export interface GoogleChatAttachmentResource {
  name?: string;
  contentName?: string;
  contentType?: string;
  source?: string;
  thumbnailUri?: string;
  downloadUri?: string;
  attachmentDataRef?: { resourceName?: string };
  driveDataRef?: { driveFileId?: string };
}

/** https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages */
export interface GoogleChatMessageResource {
  name?: string;
  sender?: GoogleChatUserResource;
  createTime?: string;
  lastUpdateTime?: string;
  deleteTime?: string;
  text?: string;
  formattedText?: string;
  fallbackText?: string;
  argumentText?: string;
  annotations?: Array<{
    type?: string;
    startIndex?: number;
    length?: number;
    userMention?: { user?: GoogleChatUserResource; type?: string };
    slashCommand?: {
      bot?: GoogleChatUserResource;
      type?: string;
      commandName?: string;
      commandId?: string | number;
    };
  }>;
  thread?: { name?: string; threadKey?: string };
  space?: GoogleChatSpaceResource;
  slashCommand?: { commandId?: string | number };
  attachment?: GoogleChatAttachmentResource[];
  threadReply?: boolean;
  clientAssignedMessageId?: string;
  privateMessageViewer?: GoogleChatUserResource;
  emojiReactionSummaries?: Array<{
    emoji?: { unicode?: string; customEmoji?: { uid?: string; name?: string } };
    reactionCount?: number;
  }>;
}

/** https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.members */
export interface GoogleChatMembershipResource {
  name?: string;
  state?: string;
  role?: string;
  member?: GoogleChatUserResource;
  groupMember?: { name?: string };
  createTime?: string;
}

export let spaceNameFromResource = (name: string | undefined) =>
  /^(spaces\/[^/]+)/.exec(name ?? '')?.[1];

export let mapGoogleChatAuthor = (
  user: GoogleChatUserResource | undefined,
  options: { isMe?: boolean } = {}
): Author => {
  let userId = user?.name ?? 'users/unknown';
  let display = user?.displayName?.trim() || userId;
  let type: Author['type'] =
    user?.type === 'HUMAN' ? 'user' : user?.type === 'BOT' ? 'app' : 'unknown';
  return {
    userId,
    userName: display,
    fullName: display,
    type,
    providerType: user?.type,
    // The app's own user ID is not readable with app authentication, so only
    // paths that created the message (send/edit) mark it as this app's.
    isMe: options.isMe ?? false,
    email: user?.email || undefined,
    imageUrl: user?.avatarUrl || undefined,
    raw: user
  };
};

let mapChannelType = (space: GoogleChatSpaceResource): ChannelType => {
  let spaceType = space.spaceType ?? (space.type === 'DM' ? 'DIRECT_MESSAGE' : undefined);
  if (spaceType === 'DIRECT_MESSAGE') return 'dm';
  if (spaceType === 'GROUP_CHAT') return 'group_dm';
  if (spaceType === 'SPACE' || space.type === 'ROOM') {
    if (space.externalUserAllowed) return 'shared';
    if (space.accessSettings?.accessState === 'DISCOVERABLE') return 'public';
    if (space.accessSettings?.accessState === 'PRIVATE') return 'private';
  }
  return 'unknown';
};

export let mapGoogleChatChannel = (
  space: GoogleChatSpaceResource,
  identity: GoogleChatAppIdentity,
  options: { recipient?: GoogleChatUserResource } = {}
): Channel => {
  let type = mapChannelType(space);
  return {
    id: space.name ?? 'spaces/unknown',
    workspaceId: identity.workspaceId,
    type,
    providerType: space.spaceType ?? space.type,
    name: space.displayName || undefined,
    topic: space.spaceDetails?.description || undefined,
    hasAccess: true,
    recipient:
      type === 'dm' && options.recipient
        ? mapGoogleChatAuthor(options.recipient, { isMe: false })
        : undefined,
    permalink: space.spaceUri || undefined,
    memberCount: space.membershipCount?.joinedDirectHumanUserCount,
    raw: space
  };
};

export let mapGoogleChatThread = (
  message: GoogleChatMessageResource,
  channelId: string
): Thread | undefined => {
  let threadName = message.thread?.name;
  if (!threadName) return undefined;
  return {
    id: threadName,
    channelId,
    type: 'conversation',
    rootMessageId: message.threadReply ? undefined : message.name,
    raw: message.thread
  };
};

let attachmentType = (contentType: string | undefined): AttachmentRef['type'] => {
  if (contentType?.startsWith('image/')) return 'image';
  if (contentType?.startsWith('video/')) return 'video';
  if (contentType?.startsWith('audio/')) return 'audio';
  return 'file';
};

export interface GoogleChatFileReference {
  attachmentName?: string;
  resourceName?: string;
  driveFileId?: string;
  contentName?: string;
  contentType?: string;
}

export let mapGoogleChatAttachment = (
  attachment: GoogleChatAttachmentResource
): AttachmentRef => {
  let reference: GoogleChatFileReference = {
    attachmentName: attachment.name,
    resourceName: attachment.attachmentDataRef?.resourceName,
    driveFileId: attachment.driveDataRef?.driveFileId,
    contentName: attachment.contentName,
    contentType: attachment.contentType
  };
  return {
    type: attachmentType(attachment.contentType),
    id: attachment.name,
    name: attachment.contentName,
    mimeType: attachment.contentType,
    providerFileReference: reference,
    status: 'complete',
    raw: attachment
  };
};

export let messageHasAppMention = (message: GoogleChatMessageResource | undefined) =>
  (message?.annotations ?? []).some(
    annotation =>
      annotation.type === 'USER_MENTION' &&
      annotation.userMention?.type !== 'ADD' &&
      annotation.userMention?.user?.type === 'BOT'
  );

export let mapGoogleChatMessage = (
  message: GoogleChatMessageResource,
  _identity: GoogleChatAppIdentity,
  options: { isMe?: boolean; channelId?: string } = {}
): Message => {
  let id = message.name ?? 'spaces/unknown/messages/unknown';
  let channelId =
    options.channelId ?? message.space?.name ?? spaceNameFromResource(id) ?? 'spaces/unknown';
  let text = message.text ?? message.fallbackText ?? '';
  let attachments = (message.attachment ?? []).map(mapGoogleChatAttachment);
  let edited = Boolean(
    message.lastUpdateTime && message.lastUpdateTime !== message.createTime
  );

  return {
    id,
    channelId,
    threadId: message.thread?.name,
    author: mapGoogleChatAuthor(message.sender, { isMe: options.isMe }),
    body: {
      parts: [{ type: 'text', content: text }],
      altText: text || undefined,
      attachments: attachments.length ? attachments : undefined
    },
    reactions: message.emojiReactionSummaries?.map(summary => ({
      emoji: summary.emoji?.unicode
        ? { type: 'unicode' as const, value: summary.emoji.unicode }
        : {
            type: 'custom' as const,
            id: summary.emoji?.customEmoji?.uid,
            name: summary.emoji?.customEmoji?.name ?? summary.emoji?.customEmoji?.uid ?? ''
          },
      count: summary.reactionCount ?? 0
    })),
    isMention: messageHasAppMention(message) || undefined,
    providerType: message.slashCommand ? 'slash_command' : undefined,
    metadata: {
      sentAt: message.createTime ?? new Date(0).toISOString(),
      edited,
      editedAt: edited ? message.lastUpdateTime : undefined
    },
    raw: message
  };
};
