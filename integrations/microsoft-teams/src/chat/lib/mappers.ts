import type {
  AttachmentRef,
  Author,
  Channel,
  ChatBody,
  Emoji,
  Message,
  Thread,
  Workspace
} from '@slates/adapter-chat';
import { attachmentTypeForMime } from '@slates/adapter-chat';
import { z } from 'zod';
import { normalizeAppId } from '../../lib/botFramework';
import type { TeamsActivity } from '../../triggers/botFrameworkTriggerGroup';
import {
  buildTeamsChannel,
  parseConversationId,
  teamsBotUserId,
  teamsBotWorkspaceId
} from './ids';

type Account = {
  id: string;
  name?: string | null;
  aadObjectId?: string | null;
  role?: string | null;
  email?: string | null;
  userPrincipalName?: string | null;
  userRole?: string | null;
  [key: string]: unknown;
};

export let isBotAccountId = (id: string) => id.startsWith('28:');

export let mapTeamsAuthor = (account: Account, appId: string): Author => {
  let name = typeof account.name === 'string' && account.name ? account.name : undefined;
  let isApp = isBotAccountId(account.id) || account.role === 'bot';
  let email =
    typeof account.email === 'string' && account.email
      ? account.email
      : typeof account.userPrincipalName === 'string' &&
          account.userPrincipalName.includes('@')
        ? account.userPrincipalName
        : undefined;
  let userRole = typeof account.userRole === 'string' ? account.userRole.toLowerCase() : '';
  return {
    userId: account.id,
    userName: name ?? account.id,
    fullName: name ?? account.id,
    type: isApp ? 'app' : 'user',
    ...(userRole === 'guest'
      ? { role: 'guest' as const }
      : userRole === 'user'
        ? { role: 'member' as const }
        : {}),
    providerType: isApp ? 'bot' : 'user',
    isMe: account.id.toLowerCase() === teamsBotUserId(appId),
    ...(email ? { email } : {}),
    raw: account
  };
};

export let mapTeamsBotAuthor = (appId: string, botName?: string): Author => {
  let normalized = normalizeAppId(appId);
  let userId = teamsBotUserId(appId);
  return {
    userId,
    userName: botName ?? normalized,
    fullName: botName ?? normalized,
    type: 'app',
    providerType: 'bot',
    isMe: true,
    raw: { id: userId, appId: normalized }
  };
};

export let mapActivityAuthor = (activity: TeamsActivity, appId: string): Author =>
  activity.from
    ? mapTeamsAuthor(activity.from as Account, appId)
    : {
        userId: 'unknown',
        userName: 'unknown',
        fullName: 'unknown',
        type: 'unknown',
        isMe: false
      };

export let mapTeamsWorkspace = (appId: string, botName?: string): Workspace => ({
  id: teamsBotWorkspaceId(appId),
  ...(botName ? { name: botName } : {}),
  raw: { appId: normalizeAppId(appId), kind: 'teams_bot' }
});

// Mentions arrive as `<at>Name</at>`: https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-and-group-conversations#retrieve-mentions
export let cleanTeamsText = (text: string) =>
  text.replace(/<at[^>]*>(.*?)<\/at>/gi, '@$1').trim();

let REACTION_EMOJI: Record<string, string> = {
  like: '👍',
  heart: '❤️',
  laugh: '😆',
  surprised: '😮',
  sad: '😢',
  angry: '😠',
  plusone: '👍'
};

// Undocumented reaction types stay named custom reactions: https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events#message-reaction-events
export let mapTeamsReaction = (type: string): Emoji => {
  let unicode = REACTION_EMOJI[type.toLowerCase()];
  return unicode ? { type: 'unicode', value: unicode } : { type: 'custom', name: type };
};

export let isBotMentioned = (activity: TeamsActivity) => {
  let recipientId = activity?.recipient?.id;
  if (typeof recipientId !== 'string' || !Array.isArray(activity.entities)) return false;
  let botId = recipientId.toLowerCase();
  return activity.entities.some(
    (entity: any) =>
      typeof entity?.type === 'string' &&
      entity.type.toLowerCase() === 'mention' &&
      typeof entity.mentioned?.id === 'string' &&
      entity.mentioned.id.toLowerCase() === botId
  );
};

// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4#receive-files-in-personal-chat
export let TEAMS_FILE_DOWNLOAD_INFO = 'application/vnd.microsoft.teams.file.download.info';

export let teamsFileReferenceSchema = z.object({
  kind: z.enum(['download_info', 'content_url']),
  url: z.string(),
  name: z.string().optional(),
  contentType: z.string().optional(),
  uniqueId: z.string().optional()
});

export type TeamsFileReference = z.infer<typeof teamsFileReferenceSchema>;

export let mapTeamsAttachments = (activity: TeamsActivity): AttachmentRef[] => {
  if (!Array.isArray(activity.attachments)) return [];

  let result: AttachmentRef[] = [];
  for (let attachment of activity.attachments as Record<string, any>[]) {
    let contentType =
      typeof attachment?.contentType === 'string' ? attachment.contentType : '';
    let name = typeof attachment?.name === 'string' ? attachment.name : undefined;

    if (contentType === TEAMS_FILE_DOWNLOAD_INFO) {
      let downloadUrl = attachment.content?.downloadUrl;
      if (typeof downloadUrl !== 'string') continue;
      let reference: TeamsFileReference = {
        kind: 'download_info',
        url: downloadUrl,
        name,
        uniqueId:
          typeof attachment.content?.uniqueId === 'string'
            ? attachment.content.uniqueId
            : undefined
      };
      result.push({
        type: 'file',
        id: reference.uniqueId,
        name,
        providerFileReference: reference,
        raw: attachment
      });
      continue;
    }

    // Inline media (e.g. pasted images) has a Bot Connector contentUrl.
    if (
      typeof attachment?.contentUrl === 'string' &&
      /^(image|video|audio)\//.test(contentType)
    ) {
      let reference: TeamsFileReference = {
        kind: 'content_url',
        url: attachment.contentUrl,
        name,
        contentType
      };
      result.push({
        type: attachmentTypeForMime(contentType),
        name,
        mimeType: contentType,
        providerFileReference: reference,
        raw: attachment
      });
    }
  }
  return result;
};

let stringOrUndefined = (value: unknown) =>
  typeof value === 'string' && value ? value : undefined;

export let mapActivityChannel = (activity: TeamsActivity, appId: string): Channel =>
  buildTeamsChannel({
    conversationId: activity.conversation?.id ?? '',
    appId,
    conversationType: stringOrUndefined(activity.conversation?.conversationType),
    name: stringOrUndefined(
      activity.channelData?.channel?.name ?? activity.conversation?.name
    ),
    raw: {
      conversation: activity.conversation,
      ...(activity.channelData?.team ? { team: activity.channelData.team } : {}),
      ...(activity.channelData?.tenant ? { tenant: activity.channelData.tenant } : {})
    }
  });

export let mapActivityThread = (
  activity: TeamsActivity,
  channel: Channel
): Thread | undefined => {
  let { threadRootId } = parseConversationId(activity.conversation?.id ?? '');
  if (!threadRootId || threadRootId === activity.id) return undefined;
  return {
    id: threadRootId,
    channelId: channel.id,
    type: 'conversation',
    providerType: 'channel_thread',
    rootMessageId: threadRootId,
    raw: { conversationId: activity.conversation?.id }
  };
};

export let mapActivityBody = (activity: TeamsActivity): ChatBody => {
  let text = typeof activity.text === 'string' ? cleanTeamsText(activity.text) : '';
  let attachments = mapTeamsAttachments(activity);
  return {
    // The body needs one part; file-only messages get an empty text part.
    parts: [text ? { type: 'markdown', markdown: text } : { type: 'text', content: '' }],
    ...(text ? { altText: text } : {}),
    ...(attachments.length > 0 ? { attachments } : {})
  };
};

export type MappedTeamsMessage = Message & { channel: Channel; thread?: Thread };

export let mapActivityMessage = (
  activity: TeamsActivity,
  appId: string,
  options: { edited?: boolean } = {}
): MappedTeamsMessage => {
  let channel = mapActivityChannel(activity, appId);
  let thread = mapActivityThread(activity, channel);
  let timestamp = activity.timestamp ?? new Date(0).toISOString();

  return {
    id: activity.id ?? '',
    channelId: channel.id,
    ...(thread ? { threadId: thread.id } : {}),
    author: mapActivityAuthor(activity, appId),
    body: mapActivityBody(activity),
    isMention: isBotMentioned(activity),
    providerType: activity.type,
    metadata: {
      sentAt: timestamp,
      edited: options.edited ?? false,
      ...(options.edited ? { editedAt: timestamp } : {})
    },
    raw: activity,
    channel,
    ...(thread ? { thread } : {})
  };
};

export let stripMessageRelations = ({ channel, thread, ...message }: MappedTeamsMessage) =>
  message as Message;

export let mapSentMessage = (input: {
  id: string;
  channelId: string;
  threadId?: string;
  body: ChatBody;
  appId: string;
  botName?: string;
  sentAt: string;
  edited?: boolean;
  raw: unknown;
}): Message => ({
  id: input.id,
  channelId: input.channelId,
  ...(input.threadId ? { threadId: input.threadId } : {}),
  author: mapTeamsBotAuthor(input.appId, input.botName),
  body: {
    parts: input.body.parts,
    ...(input.body.altText ? { altText: input.body.altText } : {})
  },
  providerType: 'message',
  metadata: {
    sentAt: input.sentAt,
    edited: input.edited ?? false,
    ...(input.edited ? { editedAt: input.sentAt } : {})
  },
  raw: input.raw
});
