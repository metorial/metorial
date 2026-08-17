import {
  type AttachmentRef,
  type Author,
  type Channel,
  type Message,
  parseEmoji,
  type Thread,
  type Workspace
} from '@slates/adapter-chat';
import type { SlackClient } from '../../lib/client';
import type {
  SlackAuthIdentity,
  SlackConversation,
  SlackFile,
  SlackMessage,
  SlackTeamInfo,
  SlackUser
} from '../../lib/types';
import { parseSlackBlocks, slackMrkdwnToMarkdown } from './render';

export let slackTimestampToIso = (timestamp?: string | number) => {
  let seconds = typeof timestamp === 'number' ? timestamp : Number.parseFloat(timestamp ?? '');
  return Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : new Date(0).toISOString();
};

export let mapSlackAuthor = (
  user: SlackUser | undefined,
  identity?: SlackAuthIdentity,
  fallback: Partial<SlackMessage> & { user?: string } = {}
): Author => {
  let userId = user?.id ?? fallback.user ?? fallback.bot_id ?? fallback.app_id ?? 'USLACK';
  let isSystem = userId === 'USLACK' || fallback.subtype?.startsWith('channel_');
  let isApp = user?.is_bot || user?.is_app_user || !!fallback.bot_id || !!fallback.app_id;
  return {
    userId,
    userName:
      user?.profile?.display_name ||
      user?.name ||
      fallback.username ||
      (isSystem ? 'slack' : userId),
    fullName:
      user?.real_name ||
      user?.profile?.real_name ||
      user?.profile?.display_name ||
      user?.name ||
      fallback.username ||
      (isSystem ? 'Slack' : userId),
    type: isSystem
      ? 'system'
      : isApp
        ? 'app'
        : fallback.subtype === 'bot_message'
          ? 'webhook'
          : 'user',
    role:
      user?.is_restricted || user?.is_ultra_restricted ? 'guest' : user ? 'member' : 'unknown',
    providerType: fallback.subtype,
    isMe: userId === identity?.user_id || userId === identity?.bot_id,
    email: user?.profile?.email,
    imageUrl:
      user?.profile?.image_512 ??
      user?.profile?.image_192 ??
      user?.profile?.image_72 ??
      user?.profile?.image_48,
    raw: user ?? fallback
  };
};

export let mapSlackChannel = (channel: SlackConversation, workspaceId?: string): Channel => ({
  id: channel.id,
  workspaceId,
  type: channel.is_im
    ? 'dm'
    : channel.is_mpim
      ? 'group_dm'
      : channel.is_ext_shared || channel.is_shared || channel.is_org_shared
        ? 'shared'
        : channel.is_private || channel.is_group
          ? 'private'
          : channel.is_channel
            ? 'public'
            : 'unknown',
  providerType: channel.is_im
    ? 'im'
    : channel.is_mpim
      ? 'mpim'
      : channel.is_group
        ? 'private_channel'
        : 'public_channel',
  name: channel.name,
  topic: channel.topic?.value,
  subject: channel.purpose?.value,
  memberCount: channel.num_members,
  raw: channel
});

export let mapSlackThread = (
  channelId: string,
  threadTs: string,
  message?: SlackMessage,
  permalink?: string
): Thread => ({
  id: threadTs,
  channelId,
  type: channelId.startsWith('D') ? 'dm' : 'conversation',
  providerType: 'slack_thread',
  permalink,
  rootMessageId: threadTs,
  replyCount: message?.reply_count,
  lastReplyAt: message?.latest_reply ? slackTimestampToIso(message.latest_reply) : undefined,
  raw: message ?? { channelId, threadTs }
});

export let mapSlackFile = (file: SlackFile): AttachmentRef => ({
  type: file.mimetype?.startsWith('image/')
    ? 'image'
    : file.mimetype?.startsWith('video/')
      ? 'video'
      : file.mimetype?.startsWith('audio/')
        ? 'audio'
        : 'file',
  id: file.id,
  name: file.name ?? file.title,
  mimeType: file.mimetype,
  url: file.url_private_download ?? file.url_private ?? file.permalink,
  size: file.size,
  width: file.original_w,
  height: file.original_h,
  fetchMetadata: file.id ? { fileId: file.id } : undefined,
  raw: file
});

export let mapSlackMessage = async (
  client: SlackClient,
  channelId: string,
  message: SlackMessage,
  options: { identity?: SlackAuthIdentity; hydratePermalink?: boolean } = {}
): Promise<Message> => {
  let [user, permalink] = await Promise.all([
    message.user ? client.getUserInfo(message.user).catch(() => undefined) : undefined,
    options.hydratePermalink
      ? client
          .getPermalink({ channel: channelId, messageTs: message.ts })
          .catch(() => undefined)
      : undefined
  ]);
  let parts = parseSlackBlocks(message.blocks);
  if (parts.length === 0) {
    parts = [{ type: 'markdown', markdown: slackMrkdwnToMarkdown(message.text ?? '') }];
  }
  if (parts.length === 0) parts = [{ type: 'text', content: '' }];

  return {
    id: message.ts,
    channelId,
    threadId:
      message.thread_ts ?? (message.reply_count !== undefined ? message.ts : undefined),
    author: mapSlackAuthor(user, options.identity, message),
    body: {
      parts,
      altText: message.text,
      attachments: message.files?.map(mapSlackFile)
    },
    reactions: message.reactions?.map(reaction => ({
      emoji: parseEmoji(`:${reaction.name}:`),
      count: reaction.count
    })),
    permalink,
    isMention: options.identity?.user_id
      ? message.text?.includes(`<@${options.identity.user_id}>`)
      : undefined,
    unfurls: message.attachments
      ?.filter(attachment => attachment.from_url || attachment.original_url)
      .map(attachment => ({
        url: attachment.from_url ?? attachment.original_url,
        title: attachment.title,
        description: attachment.text ?? attachment.fallback,
        imageUrl: attachment.image_url ?? attachment.thumb_url,
        siteName: attachment.service_name
      })),
    providerType: message.subtype ?? message.type,
    metadata: {
      sentAt: slackTimestampToIso(message.ts),
      edited: !!message.edited,
      editedAt: message.edited?.ts ? slackTimestampToIso(message.edited.ts) : undefined
    },
    reply:
      message.thread_ts && message.thread_ts !== message.ts
        ? { id: message.thread_ts }
        : undefined,
    raw: message
  };
};

export let hydrateSlackMessageResult = async (
  client: SlackClient,
  channelId: string,
  message: SlackMessage,
  options: { identity?: SlackAuthIdentity } = {}
) => {
  let [mapped, rawChannel] = await Promise.all([
    mapSlackMessage(client, channelId, message, {
      identity: options.identity,
      hydratePermalink: true
    }),
    client.getConversationInfo(channelId).catch(() => undefined)
  ]);
  let channel = rawChannel
    ? mapSlackChannel(rawChannel, options.identity?.team_id)
    : undefined;
  let threadTs =
    message.thread_ts ?? (message.reply_count !== undefined ? message.ts : undefined);
  return {
    message: mapped,
    channel,
    thread: threadTs
      ? mapSlackThread(channelId, threadTs, message, mapped.permalink)
      : undefined,
    raw: message
  };
};

export let mapSlackWorkspace = (team: SlackTeamInfo): Workspace => ({
  id: team.id,
  name: team.name,
  domain: team.domain,
  imageUrl:
    team.icon?.image_original ??
    team.icon?.image_230 ??
    team.icon?.image_132 ??
    team.icon?.image_102,
  raw: team
});

export let getSlackIdentity = (client: SlackClient): Promise<SlackAuthIdentity> =>
  client.authTest().catch(() => ({}) as SlackAuthIdentity);

export let getEventId = (raw: unknown, fallback: string) => {
  if (raw && typeof raw === 'object') {
    let record = raw as Record<string, any>;
    return record.event_id ?? record.event?.event_ts ?? record.event?.ts ?? fallback;
  }
  return fallback;
};
