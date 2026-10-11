import type {
  Author,
  Channel,
  ChatBody,
  Message,
  Thread,
  Workspace
} from '@slates/adapter-chat';

// https://developers.zoom.us/docs/chat/send-edit-and-delete-messages/#getting-to_jid-account_id-and-user_jid-values
export type ZoomJidKind = 'channel' | 'user' | 'unknown';

export let getZoomJidKind = (jid: string): ZoomJidKind => {
  let at = jid.lastIndexOf('@');
  if (at <= 0 || at === jid.length - 1) return 'unknown';
  let labels = jid
    .slice(at + 1)
    .toLowerCase()
    .split('.');
  // Zoom JID domains are `xmpp.<zoom host>` and `conference.xmpp.<zoom host>`.
  if (!labels.includes('xmpp')) return 'unknown';
  if (labels[0] === 'conference') return 'channel';
  return 'user';
};

export let normalizeJid = (jid: string) => jid.trim().toLowerCase();

export let mapZoomWorkspace = (accountId: string): Workspace => ({
  id: accountId,
  raw: { accountId }
});

export let mapZoomBotAuthor = (botJid: string): Author => ({
  userId: botJid,
  userName: botJid,
  fullName: botJid,
  type: 'app',
  providerType: 'chatbot',
  isMe: true,
  raw: { robotJid: botJid }
});

export let mapZoomUserAuthor = (input: {
  userJid: string;
  userName?: string;
  userId?: string;
  userMemberId?: string;
  userStatus?: string;
  botJid?: string;
}): Author => {
  let name = input.userName?.trim() || input.userJid;
  return {
    userId: input.userJid,
    userName: name,
    fullName: name,
    type: 'user',
    isMe: input.botJid ? normalizeJid(input.botJid) === normalizeJid(input.userJid) : false,
    raw: {
      userId: input.userId,
      userJid: input.userJid,
      userMemberId: input.userMemberId,
      userStatus: input.userStatus
    }
  };
};

// No channel lookup exists, so the channel is derived from its JID.
export let mapZoomChannel = (
  jid: string,
  accountId: string,
  extra: { name?: string; recipient?: Author } = {}
): Channel => {
  let kind = getZoomJidKind(jid);
  return {
    id: jid,
    workspaceId: accountId,
    type: kind === 'user' ? 'dm' : 'unknown',
    providerType: kind === 'channel' ? 'channel' : kind === 'user' ? 'user' : undefined,
    name: extra.name?.trim() || undefined,
    recipient: kind === 'user' ? extra.recipient : undefined,
    raw: { jid }
  };
};

export let mapZoomThread = (channelId: string, rootMessageId: string): Thread => ({
  id: rootMessageId,
  channelId,
  type: 'conversation',
  rootMessageId,
  raw: { reply_main_message_id: rootMessageId }
});

// `yyyy-MM-dd HH:mm:ss` in UTC, sometimes with ` +0000`.
export let parseZoomSentTime = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  let match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\s*(?:Z|\+0000|\+00:00))?$/.exec(
    value.trim()
  );
  if (!match) return undefined;
  let date = new Date(`${match[1]}T${match[2]}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export let epochToIso = (value: unknown): string | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  let date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export let mapZoomSentMessage = (input: {
  messageId: string;
  channelId: string;
  botJid: string;
  body: ChatBody;
  sentAt: string;
  edited?: boolean;
  editedAt?: string;
  threadId?: string;
  raw: unknown;
}): Message => ({
  id: input.messageId,
  channelId: input.channelId,
  threadId: input.threadId,
  author: mapZoomBotAuthor(input.botJid),
  body: input.body,
  providerType: 'chatbot_message',
  metadata: {
    sentAt: input.sentAt,
    edited: input.edited ?? false,
    editedAt: input.editedAt
  },
  reply: input.threadId ? { id: input.threadId } : undefined,
  raw: input.raw
});
