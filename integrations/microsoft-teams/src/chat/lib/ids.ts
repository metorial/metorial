import type { Channel, ChannelType } from '@slates/adapter-chat';
import { normalizeAppId } from '../../lib/botFramework';

export let TEAMS_CHAT_PROVIDER = 'microsoft-teams';

/**
 * Teams bots have no workspace object. Every conversation the bot can reach
 * belongs to one synthetic workspace per Microsoft App ID.
 */
export let teamsBotWorkspaceId = (appId: string) => `msteams-bot:${normalizeAppId(appId)}`;

export let teamsBotUserId = (appId: string) => `28:${normalizeAppId(appId)}`;

export interface TeamsConversationRef {
  /** Conversation id without the thread suffix. */
  baseId: string;
  /** Root message id for channel thread conversations (`;messageid=`). */
  threadRootId?: string;
}

/**
 * Channel thread conversations are addressed as
 * `19:...@thread.tacv2;messageid=<root message id>`.
 */
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

/**
 * Derives the conversation kind from Teams' documented `conversationType`
 * values (`personal`, `groupChat`, `channel`) or, when absent, from the id
 * shape. Channel visibility (standard/private/shared) is not exposed to bots,
 * so channels are reported as `unknown` with providerType `channel`.
 */
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
