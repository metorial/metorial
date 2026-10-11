import type { Channel, ChannelType } from '@slates/adapter-chat';
import { normalizeAppId } from '../../lib/botFramework';

export let TEAMS_CHAT_PROVIDER = 'microsoft-teams';

// Teams has no workspace object; each Microsoft App ID gets one synthetic workspace.
export let teamsBotWorkspaceId = (appId: string) => `msteams-bot:${normalizeAppId(appId)}`;

export let teamsBotUserId = (appId: string) => `28:${normalizeAppId(appId)}`;

export interface TeamsConversationRef {
  /** Conversation id without the thread suffix. */
  baseId: string;
  /** Channel thread root message id (`;messageid=`). */
  threadRootId?: string;
}

// Channel threads are `19:...@thread.tacv2;messageid=<root message id>`.
export let parseConversationId = (conversationId: string): TeamsConversationRef => {
  let [baseId, ...suffixes] = conversationId.split(';');
  let threadRootId = suffixes
    .map(suffix => suffix.match(/^messageid=(.+)$/i)?.[1])
    .find((value): value is string => !!value);
  return { baseId: baseId ?? conversationId, threadRootId };
};

export let threadConversationId = (channelId: string, threadId: string | undefined) => {
  let { baseId } = parseConversationId(channelId);
  return threadId ? `${baseId};messageid=${threadId}` : channelId;
};

export interface TeamsConversationKind {
  type: ChannelType;
  providerType: string;
}

// Bots can't see channel visibility, so channels are typed `unknown`.
export let classifyConversation = (
  conversationId: string,
  conversationType?: string | null
): TeamsConversationKind | undefined => {
  let type = conversationType?.toLowerCase();
  if (type === 'personal') return { type: 'dm', providerType: 'personal' };
  if (type === 'groupchat') return { type: 'group_dm', providerType: 'groupChat' };
  if (type === 'channel') return { type: 'unknown', providerType: 'channel' };

  let { baseId } = parseConversationId(conversationId);
  if (/^a:/i.test(baseId) || /^8:/i.test(baseId)) {
    return { type: 'dm', providerType: 'personal' };
  }
  if (/^19:.+@thread\.(tacv2|skype)$/i.test(baseId)) {
    return { type: 'unknown', providerType: 'channel' };
  }
  if (/^19:.+@thread\.v2$/i.test(baseId)) {
    return { type: 'group_dm', providerType: 'groupChat' };
  }
  return undefined;
};

export let buildTeamsChannel = (input: {
  conversationId: string;
  appId: string;
  conversationType?: string | null;
  name?: string | null;
  raw?: unknown;
}): Channel => {
  let { baseId } = parseConversationId(input.conversationId);
  let kind = classifyConversation(input.conversationId, input.conversationType) ?? {
    type: 'unknown' as const,
    providerType: input.conversationType ?? 'unknown'
  };
  return {
    id: baseId,
    workspaceId: teamsBotWorkspaceId(input.appId),
    type: kind.type,
    providerType: kind.providerType,
    ...(input.name ? { name: input.name } : {}),
    raw: input.raw
  };
};
