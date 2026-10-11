import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

// One object schema (no top-level oneOf); `emoji` is validated per action at runtime.
let inputSchema = z.object({
  action: z
    .enum(['add', 'remove', 'remove_all'])
    .describe(
      'add: react; remove: remove your own reaction; remove_all: clear every reaction'
    ),
  channelId: z.string().describe('The ID of the channel containing the message'),
  messageId: z.string().describe('The ID of the message'),
  emoji: z
    .string()
    .optional()
    .describe(
      'Required for add and remove. A Unicode emoji character (e.g. "\ud83d\udc4d") or "name:id" for custom guild emojis (e.g. "myemoji:123456789")'
    )
});

let outputSchema = z.object({
  success: z.boolean().describe('Whether the reaction operation completed successfully'),
  channelId: z.string().describe('The ID of the channel containing the message'),
  messageId: z
    .string()
    .describe('The ID of the message the reaction operation was performed on')
});

export let manageReactions = SlateTool.create(spec, {
  name: 'Manage Reactions',
  key: 'manage_reactions',
  description: `Add or remove emoji reactions on a Discord message. Supports adding a reaction, removing your own reaction, or removing all reactions from a message.`,
  instructions: [
    'Use **add** to react to a message with an emoji.',
    'Use **remove** to remove your own reaction from a message.',
    'Use **remove_all** to remove all reactions from a message. This requires the MANAGE_MESSAGES permission.',
    'For Unicode emojis, pass the emoji character directly (e.g. "\ud83d\udc4d", "\u2764\ufe0f").',
    'For custom guild emojis, use the format "name:id" (e.g. "myemoji:123456789012345678").'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageReactions)
  .input(inputSchema)
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });

    let { action, channelId, messageId } = input;
    let emoji = input.emoji?.trim();
    if (action !== 'remove_all' && !emoji) {
      throw discordServiceError(`emoji is required for the ${action} action`);
    }

    if (action === 'add') {
      await client.createReaction(channelId, messageId, emoji!);
      return {
        output: {
          success: true,
          channelId,
          messageId
        },
        message: `Added reaction ${emoji} to message \`${messageId}\` in channel \`${channelId}\`.`
      };
    } else if (action === 'remove') {
      await client.deleteOwnReaction(channelId, messageId, emoji!);
      return {
        output: {
          success: true,
          channelId,
          messageId
        },
        message: `Removed your reaction ${emoji} from message \`${messageId}\` in channel \`${channelId}\`.`
      };
    } else {
      await client.deleteAllReactions(channelId, messageId);
      return {
        output: {
          success: true,
          channelId,
          messageId
        },
        message: `Removed all reactions from message \`${messageId}\` in channel \`${channelId}\`.`
      };
    }
  })
  .build();
