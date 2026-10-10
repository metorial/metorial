import type {
  AttachmentRef,
  Author,
  Channel,
  ChannelType,
  Emoji,
  Message,
  Thread,
  Workspace
} from '@slates/adapter-chat';
import type { TelegramClient } from '../../lib/client';
import type {
  TelegramChat,
  TelegramEntity,
  TelegramFileObject,
  TelegramMessage,
  TelegramReactionType,
  TelegramUser
} from '../../triggers/event-schemas';

export let TELEGRAM_CHAT_PROVIDER = 'telegram';

export interface TelegramBotIdentity {
  id: string;
  username?: string;
  name?: string;
}

// Telegram has no workspaces; each bot is one synthetic workspace.
export let telegramWorkspaceId = (botId: string) => `telegram-bot-${botId}`;

export let buildTelegramWorkspace = (bot: TelegramBotIdentity): Workspace => ({
  id: telegramWorkspaceId(bot.id),
  name: bot.name || (bot.username ? `@${bot.username}` : `Bot ${bot.id}`),
  domain: bot.username ? `t.me/${bot.username}` : undefined,
  raw: { botId: bot.id, botUsername: bot.username }
});

// Falls back to getMe for older connections.
export let resolveTelegramBot = async (
  client: TelegramClient,
  auth: { botId?: string; botUsername?: string; botName?: string }
): Promise<TelegramBotIdentity> => {
  if (auth.botId) return { id: auth.botId, username: auth.botUsername, name: auth.botName };
  let me = await client.getMe();
  return {
    id: String(me.id),
    username: me.username,
    name: [me.first_name, me.last_name].filter(Boolean).join(' ')
  };
};

let fullName = (first?: string, last?: string) => [first, last].filter(Boolean).join(' ');

export let mapTelegramUser = (user: TelegramUser, botId: string): Author => ({
  userId: String(user.id),
  userName: user.username ?? String(user.id),
  fullName: fullName(user.first_name, user.last_name) || user.username || String(user.id),
  type: user.is_bot ? 'app' : 'user',
  providerType: user.is_bot ? 'bot' : 'user',
  isMe: String(user.id) === botId,
  raw: user
});

export let mapTelegramSenderChat = (chat: TelegramChat): Author => ({
  userId: String(chat.id),
  userName: chat.username ?? String(chat.id),
  fullName: chat.title ?? (fullName(chat.first_name, chat.last_name) || String(chat.id)),
  type: 'user',
  providerType: `chat:${chat.type}`,
  isMe: false,
  raw: chat
});

let unknownAuthor = (): Author => ({
  userId: 'unknown',
  userName: 'unknown',
  fullName: 'Unknown',
  type: 'unknown',
  isMe: false
});

let channelType = (chat: TelegramChat): ChannelType => {
  switch (chat.type) {
    case 'private':
      return 'dm';
    case 'group':
      return 'private';
    case 'supergroup':
      if (chat.is_forum) return 'forum';
      return chat.username ? 'public' : 'private';
    case 'channel':
      return 'announcement';
  }
};

let chatPermalinkBase = (chat: TelegramChat) => {
  if (chat.username) return `https://t.me/${chat.username}`;
  let id = String(chat.id);
  if ((chat.type === 'supergroup' || chat.type === 'channel') && id.startsWith('-100')) {
    return `https://t.me/c/${id.slice(4)}`;
  }
  return undefined;
};

export let mapTelegramChat = (
  chat: TelegramChat & { description?: string },
  botId: string,
  extra: { memberCount?: number } = {}
): Channel => ({
  id: String(chat.id),
  workspaceId: telegramWorkspaceId(botId),
  type: channelType(chat),
  providerType: chat.type,
  name: chat.title ?? (fullName(chat.first_name, chat.last_name) || chat.username),
  topic: typeof chat.description === 'string' ? chat.description : undefined,
  hasAccess: true,
  recipient:
    chat.type === 'private'
      ? {
          userId: String(chat.id),
          userName: chat.username ?? String(chat.id),
          fullName:
            fullName(chat.first_name, chat.last_name) || chat.username || String(chat.id),
          type: 'user',
          isMe: String(chat.id) === botId,
          raw: { id: chat.id, username: chat.username }
        }
      : undefined,
  permalink: chat.type === 'private' ? undefined : chatPermalinkBase(chat),
  memberCount: extra.memberCount,
  raw: chat
});

export let mapTelegramThread = (message: TelegramMessage): Thread | undefined => {
  if (!message.is_topic_message || message.message_thread_id === undefined) return undefined;
  return {
    id: String(message.message_thread_id),
    channelId: String(message.chat.id),
    type: 'conversation',
    providerType: 'forum_topic',
    rootMessageId: String(message.message_thread_id),
    raw: { message_thread_id: message.message_thread_id }
  };
};

export interface TelegramFileReference {
  fileId: string;
  fileUniqueId?: string;
}

let fileAttachment = (
  type: AttachmentRef['type'],
  file: TelegramFileObject,
  providerKind: string
): AttachmentRef => ({
  type,
  id: file.file_id,
  name: file.file_name ?? file.title,
  mimeType: file.mime_type,
  size: file.file_size,
  width: file.width,
  height: file.height,
  status: 'complete',
  providerFileReference: {
    fileId: file.file_id,
    fileUniqueId: file.file_unique_id
  } satisfies TelegramFileReference,
  raw: { kind: providerKind, ...file }
});

export let mapTelegramAttachments = (message: TelegramMessage): AttachmentRef[] => {
  let attachments: AttachmentRef[] = [];
  if (message.photo?.length) {
    // The last photo size is the largest.
    let largest = message.photo[message.photo.length - 1]!;
    attachments.push(fileAttachment('image', largest, 'photo'));
  }
  if (message.document) attachments.push(fileAttachment('file', message.document, 'document'));
  if (message.animation && !message.document) {
    attachments.push(fileAttachment('video', message.animation, 'animation'));
  }
  if (message.video) attachments.push(fileAttachment('video', message.video, 'video'));
  if (message.video_note) {
    attachments.push(fileAttachment('video', message.video_note, 'video_note'));
  }
  if (message.audio) attachments.push(fileAttachment('audio', message.audio, 'audio'));
  if (message.voice) attachments.push(fileAttachment('audio', message.voice, 'voice'));
  if (message.sticker) attachments.push(fileAttachment('image', message.sticker, 'sticker'));
  return attachments;
};

let CONTENT_KEYS = [
  'text',
  'caption',
  'photo',
  'document',
  'video',
  'animation',
  'video_note',
  'audio',
  'voice',
  'sticker',
  'poll',
  'location',
  'venue',
  'contact',
  'dice',
  'game',
  'story',
  'paid_media',
  'checklist'
];

export let isTelegramContentMessage = (message: Record<string, unknown>) =>
  CONTENT_KEYS.some(key => message[key] !== undefined);

let entityText = (text: string, entity: TelegramEntity) =>
  // Entity offsets are UTF-16 units, matching JS string indices.
  text.slice(entity.offset, entity.offset + entity.length);

let messageEntities = (message: TelegramMessage) => {
  if (message.text !== undefined) return { text: message.text, entities: message.entities };
  if (message.caption !== undefined) {
    return { text: message.caption, entities: message.caption_entities };
  }
  return { text: '', entities: undefined };
};

export let isTelegramBotMentioned = (
  message: TelegramMessage,
  bot: { id: string; username?: string }
) => {
  let { text, entities } = messageEntities(message);
  return (entities ?? []).some(entity => {
    if (entity.type === 'text_mention') return String(entity.user?.id) === bot.id;
    if (entity.type === 'mention' && bot.username) {
      return entityText(text, entity).toLowerCase() === `@${bot.username.toLowerCase()}`;
    }
    return false;
  });
};

export interface TelegramCommand {
  name: string;
  text?: string;
}

// Commands addressed to another bot (/cmd@other_bot) are ignored.
export let parseTelegramCommand = (
  message: TelegramMessage,
  bot: { username?: string }
): TelegramCommand | undefined => {
  if (message.text === undefined) return undefined;
  let entity = message.entities?.find(
    item => item.type === 'bot_command' && item.offset === 0
  );
  if (!entity) return undefined;

  let raw = entityText(message.text, entity).replace(/^\//, '');
  let [name, addressee] = raw.split('@');
  if (!name) return undefined;
  if (addressee && addressee.toLowerCase() !== bot.username?.toLowerCase()) return undefined;

  let text = message.text.slice(entity.offset + entity.length).trim();
  return { name, text: text || undefined };
};

let messagePermalink = (message: TelegramMessage) => {
  if (message.chat.type === 'private' || message.chat.type === 'group') return undefined;
  let base = chatPermalinkBase(message.chat);
  return base ? `${base}/${message.message_id}` : undefined;
};

let iso = (seconds: number) => new Date(seconds * 1000).toISOString();

export interface MappedTelegramMessage {
  message: Message;
  channel: Channel;
  thread?: Thread;
}

export let mapTelegramMessage = (
  message: TelegramMessage,
  bot: { id: string; username?: string },
  options: { clientReferenceIds?: (string | undefined)[] } = {}
): MappedTelegramMessage => {
  let channel = mapTelegramChat(message.chat, bot.id);
  let thread = mapTelegramThread(message);
  let author = message.from
    ? mapTelegramUser(message.from, bot.id)
    : message.sender_chat
      ? mapTelegramSenderChat(message.sender_chat)
      : unknownAuthor();

  let { text } = messageEntities(message);
  let attachments = mapTelegramAttachments(message).map((attachment, index) => {
    let clientReferenceId = options.clientReferenceIds?.[index];
    return clientReferenceId ? { ...attachment, clientReferenceId } : attachment;
  });

  // In forum topics a non-reply points at the topic root.
  let replyTo = message.reply_to_message;
  let isTopicRootReply =
    message.is_topic_message && replyTo?.message_id === message.message_thread_id;

  return {
    message: {
      id: String(message.message_id),
      channelId: String(message.chat.id),
      threadId: thread?.id,
      author,
      // File-only messages need an empty text part to satisfy the body schema.
      body: {
        parts: [{ type: 'text', content: text }],
        attachments: attachments.length ? attachments : undefined
      },
      permalink: messagePermalink(message),
      isMention: isTelegramBotMentioned(message, bot) || undefined,
      metadata: {
        sentAt: iso(message.date),
        edited: message.edit_date !== undefined,
        editedAt: message.edit_date !== undefined ? iso(message.edit_date) : undefined
      },
      reply: replyTo && !isTopicRootReply ? { id: String(replyTo.message_id) } : undefined,
      groupId: message.media_group_id,
      raw: message
    },
    channel,
    thread
  };
};

export let mapTelegramReactionEmoji = (reaction: TelegramReactionType): Emoji | undefined => {
  if (reaction.type === 'emoji') return { type: 'unicode', value: reaction.emoji };
  if (reaction.type === 'custom_emoji') {
    return { type: 'custom', name: reaction.custom_emoji_id, id: reaction.custom_emoji_id };
  }
  return undefined;
};
