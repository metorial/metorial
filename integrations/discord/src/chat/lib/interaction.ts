import { Buffer } from 'node:buffer';
import type { CommandOptionType } from '@slates/adapter-chat';
import { z } from 'zod';

// Opaque command.respond token; carries the interaction token, never the bot token.
export let discordResponseTokenSchema = z.object({
  v: z.literal(1),
  interactionId: z.string(),
  applicationId: z.string(),
  token: z.string(),
  deferred: z.boolean(),
  ephemeral: z.boolean(),
  receivedAt: z.number()
});

export type DiscordResponseToken = z.infer<typeof discordResponseTokenSchema>;

let PREFIX = 'dci1.';

export let encodeDiscordResponseToken = (token: DiscordResponseToken) =>
  `${PREFIX}${Buffer.from(JSON.stringify(token), 'utf8').toString('base64url')}`;

export let decodeDiscordResponseToken = (value: string): DiscordResponseToken | undefined => {
  if (!value.startsWith(PREFIX)) return undefined;
  try {
    let parsed = JSON.parse(
      Buffer.from(value.slice(PREFIX.length), 'base64url').toString('utf8')
    );
    let result = discordResponseTokenSchema.safeParse(parsed);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
};

export let DISCORD_INTERACTION_TOKEN_TTL_MS = 15 * 60 * 1000;

// https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-response-object-interaction-callback-type
export let InteractionCallbackType = {
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5
} as const;

export let EPHEMERAL_FLAG = 1 << 6;

// https://docs.discord.com/developers/interactions/application-commands#application-command-object-application-command-option-type
export let DISCORD_COMMAND_OPTION_TYPES: Record<number, CommandOptionType> = {
  1: 'subcommand',
  2: 'subcommand_group',
  3: 'string',
  4: 'integer',
  5: 'boolean',
  6: 'user',
  7: 'channel',
  8: 'role',
  9: 'mentionable',
  10: 'number',
  11: 'attachment'
};
