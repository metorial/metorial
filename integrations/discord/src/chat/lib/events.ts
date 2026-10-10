import type { CommandOptionValue } from '@slates/adapter-chat';
import type { DiscordGatewayEventPayload } from '../../triggers/gateway';
import { DISCORD_COMMAND_OPTION_TYPES, encodeDiscordResponseToken } from './interaction';
import { mapAuthor, mapEmoji, mapEventChannel, mapMessage } from './mappers';
import type { DiscordApiMessage, DiscordIdentity } from './types';

export let identityFromEvent = (payload: DiscordGatewayEventPayload): DiscordIdentity => ({
  botUserId: payload.botUserId ?? undefined,
  applicationId: payload.applicationId ?? undefined
});

export let mapMessageEvent = (payload: DiscordGatewayEventPayload) => {
  let identity = identityFromEvent(payload);
  let data = payload.data as DiscordApiMessage;
  let message = mapMessage(data, identity);
  let channel = mapEventChannel({
    channelId: data.channel_id,
    guildId: data.guild_id,
    channelType: typeof data.channel_type === 'number' ? data.channel_type : undefined,
    author: message.author
  });
  return { message, channel };
};

export let mentionsBot = (payload: DiscordGatewayEventPayload) => {
  let botUserId = payload.botUserId;
  if (!botUserId) return false;
  let data = payload.data as DiscordApiMessage;
  if (data.author?.id === botUserId) return false;
  return (data.mentions ?? []).some(mention => mention.id === botUserId);
};

export let emojiKey = (emoji: { id?: string | null; name?: string | null } | undefined) =>
  emoji?.id ? `${emoji.name ?? ''}:${emoji.id}` : (emoji?.name ?? '');

export let mapReactionEvent = (payload: DiscordGatewayEventPayload) => {
  let identity = identityFromEvent(payload);
  let data = payload.data;
  let author = mapAuthor(data.member?.user, identity, {
    member: data.member,
    userId: data.user_id
  });
  let channel = mapEventChannel({
    channelId: data.channel_id,
    guildId: data.guild_id
  });

  return {
    messageId: String(data.message_id),
    channelId: String(data.channel_id),
    emoji: mapEmoji(data.emoji ?? {}),
    author,
    channel
  };
};

export let reactionEventId = (
  payload: DiscordGatewayEventPayload,
  kind: 'added' | 'removed'
) => {
  let data = payload.data;
  return [
    'reaction',
    kind,
    data.message_id,
    data.user_id,
    emojiKey(data.emoji),
    payload.sessionId ?? 'no-session',
    payload.sequence ?? 'no-seq'
  ].join(':');
};

interface InteractionOption {
  name: string;
  type: number;
  value?: unknown;
  options?: InteractionOption[];
}

export let flattenCommandOptions = (options: InteractionOption[] | undefined) => {
  let subcommandGroup: string | undefined;
  let subcommand: string | undefined;
  let current = options ?? [];

  let group = current.find(option => option.type === 2);
  if (group) {
    subcommandGroup = group.name;
    current = group.options ?? [];
  }

  let sub = current.find(option => option.type === 1);
  if (sub) {
    subcommand = sub.name;
    current = sub.options ?? [];
  }

  let values: CommandOptionValue[] = current.map(option => ({
    name: option.name,
    value:
      option.value === undefined || option.value === null ? undefined : String(option.value),
    type: DISCORD_COMMAND_OPTION_TYPES[option.type] ?? 'unknown'
  }));

  return { subcommandGroup, subcommand, options: values };
};

export let mapCommandEvent = (payload: DiscordGatewayEventPayload) => {
  let identity = identityFromEvent(payload);
  let data = payload.data;
  let user = data.member?.user ?? data.user;
  let author = mapAuthor(user, identity, { member: data.member });
  let channelId = String(data.channel_id ?? data.channel?.id ?? '');
  let flattened = flattenCommandOptions(data.data?.options);
  let applicationId = String(data.application_id ?? payload.applicationId ?? '');

  let responseToken =
    data.token && data.id && applicationId
      ? encodeDiscordResponseToken({
          v: 1,
          interactionId: String(data.id),
          applicationId,
          token: String(data.token),
          deferred: payload.interaction?.deferred ?? false,
          ephemeral: payload.interaction?.ephemeral ?? false,
          receivedAt: payload.interaction?.receivedAt ?? Date.now()
        })
      : undefined;

  // The interaction token only travels inside the opaque responseToken, never in raw.
  let { token: _token, ...raw } = data;

  return {
    name: String(data.data?.name ?? ''),
    commandId: data.data?.id ? String(data.data.id) : undefined,
    subcommand: flattened.subcommand,
    subcommandGroup: flattened.subcommandGroup,
    options: flattened.options.length > 0 ? flattened.options : undefined,
    author,
    channelId,
    triggerId: String(data.id),
    responseToken,
    channel: mapEventChannel({
      channelId,
      guildId: data.guild_id,
      channelType: typeof data.channel?.type === 'number' ? data.channel.type : undefined,
      author
    }),
    raw
  };
};
