import type { Message } from '@slates/adapter-chat';
import { DiscordChatClient } from './client';
import { type DiscordChatErrorContext, withDiscordChatErrors } from './errors';
import { mapChannel, mapEventChannel, mapMessage } from './mappers';
import type {
  DiscordApiChannel,
  DiscordApiMessage,
  DiscordAuthOutput,
  DiscordIdentity
} from './types';

interface ChatActionContext {
  auth: DiscordAuthOutput;
  input?: unknown;
}

let contextFromInput = (input: unknown): DiscordChatErrorContext => {
  if (!input || typeof input !== 'object') return {};

  let source = input as Record<string, unknown>;
  let pick = (key: string) => (typeof source[key] === 'string' ? source[key] : undefined);

  return {
    channelId: pick('threadId') ?? pick('channelId'),
    threadId: pick('threadId'),
    messageId: pick('messageId'),
    userId: pick('userId'),
    workspaceId: pick('workspaceId'),
    emoji: pick('emoji')
  };
};

/**
 * Runs a chat action with a bot client, translating every failure (including local
 * validation and Discord API errors) into the chat error envelope.
 */
export let runDiscordChatAction = <T>(
  ctx: ChatActionContext,
  options: Omit<DiscordChatErrorContext, 'action'> & { action: string },
  run: (client: DiscordChatClient) => Promise<T>
) =>
  withDiscordChatErrors({ ...contextFromInput(ctx.input), ...options }, async () =>
    run(new DiscordChatClient(ctx.auth))
  );

/** The bot user id, from the connection when available, else `GET /users/@me`. */
export let resolveDiscordIdentity = async (
  client: DiscordChatClient,
  auth: DiscordAuthOutput
): Promise<DiscordIdentity> => {
  if (auth.botUserId) return { botUserId: auth.botUserId, applicationId: auth.applicationId };

  let me = await client.getCurrentUser();
  return { botUserId: me.id, applicationId: auth.applicationId };
};

export let resolveApplicationId = async (
  client: DiscordChatClient,
  auth: DiscordAuthOutput
): Promise<string> => {
  if (auth.applicationId) return auth.applicationId;
  let application = await client.getCurrentApplication();
  return application.id;
};

export let withClientReferences = (message: Message, references: Map<string, string>) => {
  if (references.size === 0 || !message.body.attachments) return message;

  return {
    ...message,
    body: {
      ...message.body,
      attachments: message.body.attachments.map(attachment => {
        let reference = attachment.id ? references.get(attachment.id) : undefined;
        return reference ? { ...attachment, clientReferenceId: reference } : attachment;
      })
    }
  };
};

export let loadChannelSafe = (client: DiscordChatClient, channelId: string) =>
  client.getChannel(channelId).catch(() => undefined) as Promise<
    DiscordApiChannel | undefined
  >;

/**
 * Normalized message result. The channel is enriched from REST on a best-effort basis so
 * a completed mutation is never failed for display metadata.
 */
export let buildMessageResult = (
  raw: DiscordApiMessage,
  rawChannel: DiscordApiChannel | undefined,
  identity: DiscordIdentity,
  references: Map<string, string> = new Map()
) => {
  let guildId = raw.guild_id ?? rawChannel?.guild_id;
  let message = withClientReferences(mapMessage(raw, identity, { guildId }), references);
  return {
    message,
    channel: rawChannel
      ? mapChannel(rawChannel, identity)
      : mapEventChannel({ channelId: raw.channel_id, guildId, author: message.author }),
    raw
  };
};
