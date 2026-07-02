import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let inputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add'),
    channelId: z.string().describe('The ID of the channel containing the message'),
    messageId: z.string().describe('The ID of the message to react to'),
    emoji: z
      .string()
      .describe(
        'The emoji to react with. Use a Unicode emoji character (e.g. "\ud83d\udc4d") or the format "name:id" for custom guild emojis (e.g. "myemoji:123456789")'
      )
  }),
  z.object({
    action: z.literal('remove'),
    channelId: z.string().describe('The ID of the channel containing the message'),
    messageId: z.string().describe('The ID of the message to remove your reaction from'),
    emoji: z
      .string()
      .describe(
        'The emoji to remove. Use a Unicode emoji character (e.g. "\ud83d\udc4d") or the format "name:id" for custom guild emojis (e.g. "myemoji:123456789")'
      )
  }),
  z.object({
    action: z.literal('remove_all'),
    channelId: z.string().describe('The ID of the channel containing the message'),
    messageId: z.string().describe('The ID of the message to remove all reactions from')
  })
]);

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
    let input = ctx.input as any;
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });

    let { action, channelId, messageId } = input;

    if (action === 'add') {
      await client.createReaction(channelId, messageId, input.emoji);
      return {
        output: {
          success: true,
          channelId,
          messageId
        },
        message: `Added reaction ${input.emoji} to message \`${messageId}\` in channel \`${channelId}\`.`
      };
    } else if (action === 'remove') {
      await client.deleteOwnReaction(channelId, messageId, input.emoji);
      return {
        output: {
          success: true,
          channelId,
          messageId
        },
        message: `Removed your reaction ${input.emoji} from message \`${messageId}\` in channel \`${channelId}\`.`
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
