import type {
  AttachmentRef,
  Author,
  Channel,
  ChannelType,
  ChatPart,
  Emoji,
  LinkUnfurl,
  Message,
  ReactionCount,
  Workspace
} from '@slates/adapter-chat';
import { attachmentTypeForMime } from '@slates/adapter-chat';
import type { DiscordFileReference } from './files';
import type {
  DiscordApiAttachment,
  DiscordApiChannel,
  DiscordApiEmbed,
  DiscordApiEmoji,
  DiscordApiMember,
  DiscordApiMessage,
  DiscordApiReaction,
  DiscordApiUser,
  DiscordIdentity
} from './types';

let CDN = 'https://cdn.discordapp.com';
let DISCORD_EPOCH = 1420070400000n;

// https://docs.discord.com/developers/resources/channel#channel-object-channel-types
export let DISCORD_CHANNEL_TYPE_NAMES: Record<number, string> = {
  0: 'GUILD_TEXT',
  1: 'DM',
  2: 'GUILD_VOICE',
  3: 'GROUP_DM',
  4: 'GUILD_CATEGORY',
  5: 'GUILD_ANNOUNCEMENT',
  10: 'ANNOUNCEMENT_THREAD',
  11: 'PUBLIC_THREAD',
  12: 'PRIVATE_THREAD',
  13: 'GUILD_STAGE_VOICE',
  14: 'GUILD_DIRECTORY',
  15: 'GUILD_FORUM',
  16: 'GUILD_MEDIA'
};

export let NON_MESSAGE_CHANNEL_TYPES = new Set([4, 14]);

let VIEW_CHANNEL = 1n << 10n;

export let snowflakeToIso = (id: string) => {
  try {
    return new Date(Number((BigInt(id) >> 22n) + DISCORD_EPOCH)).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
};

export let compareSnowflakes = (a: string, b: string) => {
  let left = BigInt(a);
  let right = BigInt(b);
  return left < right ? -1 : left > right ? 1 : 0;
};

export let userAvatarUrl = (user: DiscordApiUser | undefined) => {
  if (!user?.id) return undefined;
  if (user.avatar) return `${CDN}/avatars/${user.id}/${user.avatar}.png`;
  try {
    return `${CDN}/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`;
  } catch {
    return undefined;
  }
};

export let mapAuthor = (
  user: DiscordApiUser | undefined,
  identity: DiscordIdentity,
  options: { member?: DiscordApiMember | null; webhookId?: string; userId?: string } = {}
): Author => {
  let userId = user?.id ?? options.userId ?? '';
  let type: Author['type'] = !user
    ? 'unknown'
    : options.webhookId
      ? 'webhook'
      : user.system
        ? 'system'
        : user.bot
          ? 'app'
          : 'user';

  return {
    userId,
    userName: user?.username ?? '',
    fullName: options.member?.nick ?? user?.global_name ?? user?.username ?? '',
    type,
    role: options.member ? 'member' : undefined,
    providerType: user ? (user.bot ? 'bot' : 'user') : undefined,
    isMe: !!identity.botUserId && userId === identity.botUserId,
    imageUrl: userAvatarUrl(user),
    raw: user ?? { id: userId }
  };
};

let isPrivateGuildChannel = (raw: DiscordApiChannel) => {
  if (!raw.guild_id) return false;
  let everyone = raw.permission_overwrites?.find(
    overwrite => overwrite.id === raw.guild_id && overwrite.type === 0
  );
  if (!everyone?.deny) return false;
  try {
    return (BigInt(everyone.deny) & VIEW_CHANNEL) === VIEW_CHANNEL;
  } catch {
    return false;
  }
};

export let mapChannelType = (
  type: number | undefined,
  options: { guildId?: string; isPrivate?: boolean } = {}
): ChannelType => {
  switch (type) {
    case 1:
      return 'dm';
    case 3:
      return 'group_dm';
    case 5:
      return 'announcement';
    case 12:
      return 'private';
    case 15:
    case 16:
      return 'forum';
    case 0:
    case 2:
    case 10:
    case 11:
    case 13:
      return options.isPrivate ? 'private' : 'public';
    case undefined:
      return options.guildId ? 'unknown' : 'dm';
    default:
      return 'unknown';
  }
};

export let channelPermalink = (channelId: string, guildId?: string) =>
  `https://discord.com/channels/${guildId ?? '@me'}/${channelId}`;

export let mapChannel = (raw: DiscordApiChannel, identity: DiscordIdentity): Channel => {
  let recipient = raw.type === 1 ? raw.recipients?.[0] : undefined;

  return {
    id: raw.id,
    workspaceId: raw.guild_id ?? undefined,
    type: mapChannelType(raw.type, {
      guildId: raw.guild_id,
      isPrivate: isPrivateGuildChannel(raw)
    }),
    providerType: DISCORD_CHANNEL_TYPE_NAMES[raw.type] ?? String(raw.type),
    name: raw.name ?? recipient?.global_name ?? recipient?.username ?? undefined,
    topic: raw.topic ?? undefined,
    recipient: recipient ? mapAuthor(recipient, identity) : undefined,
    permalink: channelPermalink(raw.id, raw.guild_id),
    memberCount: typeof raw.member_count === 'number' ? raw.member_count : undefined,
    raw
  };
};

// From gateway event fields only; DMs have no guild, so no `workspaceId`.
export let mapEventChannel = (input: {
  channelId: string;
  guildId?: string;
  channelType?: number;
  author?: Author;
}): Channel => {
  let type = mapChannelType(input.channelType, { guildId: input.guildId });
  let recipient =
    type === 'dm' && input.author && !input.author.isMe ? input.author : undefined;

  return {
    id: input.channelId,
    workspaceId: input.guildId,
    type,
    providerType:
      input.channelType !== undefined
        ? (DISCORD_CHANNEL_TYPE_NAMES[input.channelType] ?? String(input.channelType))
        : undefined,
    recipient,
    permalink: channelPermalink(input.channelId, input.guildId),
    raw: {
      id: input.channelId,
      guild_id: input.guildId,
      type: input.channelType
    }
  };
};

export let mapWorkspace = (guild: {
  id: string;
  name?: string;
  icon?: string | null;
}): Workspace => ({
  id: guild.id,
  name: guild.name,
  imageUrl: guild.icon ? `${CDN}/icons/${guild.id}/${guild.icon}.png` : undefined,
  raw: guild
});

export let mapAttachment = (
  attachment: DiscordApiAttachment,
  location: { channelId: string; messageId: string }
): AttachmentRef => ({
  type: attachmentTypeForMime(attachment.content_type),
  id: attachment.id,
  name: attachment.filename,
  mimeType: attachment.content_type,
  size: attachment.size,
  width: attachment.width ?? undefined,
  height: attachment.height ?? undefined,
  status: 'complete',
  providerFileReference: {
    channelId: location.channelId,
    messageId: location.messageId,
    attachmentId: attachment.id
  } satisfies DiscordFileReference,
  raw: attachment
});

export let mapEmoji = (emoji: DiscordApiEmoji): Emoji => {
  if (emoji.id) {
    return {
      type: 'custom',
      id: emoji.id,
      name: emoji.name ?? emoji.id,
      url: `${CDN}/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`
    };
  }

  return { type: 'unicode', value: emoji.name ?? '' };
};

export let mapReactions = (reactions: DiscordApiReaction[] | undefined): ReactionCount[] =>
  (reactions ?? []).map(reaction => ({
    emoji: mapEmoji(reaction.emoji),
    count: reaction.count
  }));

// Embed types Discord generates from links, as opposed to app-sent `rich` embeds.
let UNFURL_EMBED_TYPES = new Set(['link', 'article', 'image', 'video', 'gifv']);

let embedToCard = (embed: DiscordApiEmbed): ChatPart => {
  let children: ChatPart[] = [];
  if (embed.description) children.push({ type: 'markdown', markdown: embed.description });
  if (embed.fields?.length) {
    children.push({
      type: 'fields',
      children: embed.fields.map(field => ({
        type: 'field' as const,
        label: field.name,
        value: field.value
      }))
    });
  }
  if (embed.url)
    children.push({ type: 'link', url: embed.url, label: embed.title ?? embed.url });
  if (embed.footer?.text)
    children.push({ type: 'text', content: embed.footer.text, style: 'muted' });

  return {
    type: 'card',
    title: embed.title,
    subtitle: embed.author?.name,
    imageUrl: embed.image?.url ?? embed.thumbnail?.url,
    children
  };
};

let mapUnfurl = (embed: DiscordApiEmbed, messageId: string): LinkUnfurl | undefined =>
  embed.url
    ? {
        url: embed.url,
        title: embed.title,
        description: embed.description,
        imageUrl: embed.image?.url ?? embed.thumbnail?.url,
        siteName: embed.provider?.name,
        messageId
      }
    : undefined;

export let mapMessageParts = (raw: DiscordApiMessage): ChatPart[] => {
  let parts: ChatPart[] = [];
  if (raw.content) parts.push({ type: 'markdown', markdown: raw.content });

  for (let embed of raw.embeds ?? []) {
    if (!UNFURL_EMBED_TYPES.has(embed.type ?? 'rich')) parts.push(embedToCard(embed));
  }

  // The body schema needs a part; file-only/empty messages get an empty text part.
  if (parts.length === 0) parts.push({ type: 'text', content: '' });
  return parts;
};

export let messagePermalink = (raw: { id: string; channel_id: string; guild_id?: string }) =>
  `${channelPermalink(raw.channel_id, raw.guild_id)}/${raw.id}`;

export let mapMessage = (
  raw: DiscordApiMessage,
  identity: DiscordIdentity,
  options: { guildId?: string } = {}
): Message => {
  let guildId = raw.guild_id ?? options.guildId;
  let author = mapAuthor(raw.author, identity, {
    member: raw.member,
    webhookId: raw.webhook_id
  });
  let attachments = (raw.attachments ?? []).map(attachment =>
    mapAttachment(attachment, { channelId: raw.channel_id, messageId: raw.id })
  );
  let unfurls = (raw.embeds ?? [])
    .filter(embed => UNFURL_EMBED_TYPES.has(embed.type ?? 'rich'))
    .map(embed => mapUnfurl(embed, raw.id))
    .filter((unfurl): unfurl is LinkUnfurl => !!unfurl);

  let referenceId = raw.message_reference?.message_id;
  let referenced = raw.referenced_message;

  return {
    id: raw.id,
    channelId: raw.channel_id,
    author,
    body: {
      parts: mapMessageParts(raw),
      attachments: attachments.length > 0 ? attachments : undefined
    },
    reactions: raw.reactions?.length ? mapReactions(raw.reactions) : undefined,
    permalink: messagePermalink({ id: raw.id, channel_id: raw.channel_id, guild_id: guildId }),
    isMention:
      !!identity.botUserId &&
      (raw.mentions ?? []).some(mention => mention.id === identity.botUserId),
    unfurls: unfurls.length > 0 ? unfurls : undefined,
    providerType: raw.type !== undefined ? String(raw.type) : undefined,
    metadata: {
      sentAt: raw.timestamp ?? snowflakeToIso(raw.id),
      edited: !!raw.edited_timestamp,
      editedAt: raw.edited_timestamp ?? undefined
    },
    reply: referenceId
      ? {
          id: referenceId,
          reference: referenced
            ? {
                id: referenced.id,
                channelId: referenced.channel_id,
                body: { parts: mapMessageParts(referenced) }
              }
            : undefined
        }
      : undefined,
    raw
  };
};
