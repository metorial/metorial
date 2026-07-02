import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageReactions = SlateTool.create(spec, {
  name: 'Manage Reactions',
  key: 'manage_reactions',
  description: `Add, remove, or clear reactions on a message. Can add a single reaction, remove a specific user's reaction, remove all of one emoji, or clear all reactions on a message.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel containing the message'),
      messageId: z.string().describe('ID of the message to react to'),
      action: z
        .enum(['add', 'remove', 'clear_emoji', 'clear_all'])
        .describe(
          'Action to perform: add a reaction, remove your reaction, clear all of one emoji, or clear all reactions'
        ),
      emoji: z
        .string()
        .optional()
        .describe('Emoji identifier (required for add, remove, clear_emoji)'),
      userId: z
        .string()
        .optional()
        .describe('User ID to remove reaction for (admin only, for remove action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'add':
        if (!ctx.input.emoji) throw new Error('Emoji is required for add action');
        await client.addReaction(ctx.input.channelId, ctx.input.messageId, ctx.input.emoji);
        break;
      case 'remove':
        if (!ctx.input.emoji) throw new Error('Emoji is required for remove action');
        await client.removeReaction(
          ctx.input.channelId,
          ctx.input.messageId,
          ctx.input.emoji,
          {
            user_id: ctx.input.userId
          }
        );
        break;
      case 'clear_emoji':
        if (!ctx.input.emoji) throw new Error('Emoji is required for clear_emoji action');
        await client.removeReaction(
          ctx.input.channelId,
          ctx.input.messageId,
          ctx.input.emoji,
          {
            remove_all: true
          }
        );
        break;
      case 'clear_all':
        await client.clearAllReactions(ctx.input.channelId, ctx.input.messageId);
        break;
    }

    return {
      output: { success: true },
      message: `Reaction ${ctx.input.action} on message \`${ctx.input.messageId}\`${ctx.input.emoji ? ` (emoji: ${ctx.input.emoji})` : ''}`
    };
  })
  .build();
