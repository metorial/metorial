import { Buffer } from 'node:buffer';
import { z } from 'zod';

/**
 * Opaque `responseToken` for `command.respond`. It holds the interaction id, the
 * interaction token (valid for 15 minutes), the application id, and how the gateway
 * acknowledged the interaction. It never contains the bot token.
 * https://docs.discord.com/developers/interactions/receiving-and-responding#responding-to-an-interaction
 */
export let discordResponseTokenSchema = z.object({
  v: z.literal(1),
  interactionId: z.string(),
  applicationId: z.string(),
  token: z.string(),
  deferred: z.boolean(),
  ephemeral: z.boolean(),
  /** Epoch milliseconds when the interaction was received. */
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

/** Interaction tokens stay valid for 15 minutes after the interaction is received. */
export let DISCORD_INTERACTION_TOKEN_TTL_MS = 15 * 60 * 1000;

// https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-response-object-interaction-callback-type
export let InteractionCallbackType = {
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5
} as const;

export let EPHEMERAL_FLAG = 1 << 6;
