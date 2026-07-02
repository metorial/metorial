import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageReactions = SlateTool.create(spec, {
  name: 'Manage Reactions',
  key: 'manage_reactions',
  description: `Add or remove emoji reactions on a Zulip message.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z.number().describe('ID of the message to react to'),
      emojiName: z
        .string()
        .describe('Name of the emoji to add or remove (e.g., "thumbs_up", "heart", "tada")'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the reaction')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'add') {
      await client.addReaction(ctx.input.messageId, ctx.input.emojiName);
    } else {
      await client.removeReaction(ctx.input.messageId, ctx.input.emojiName);
    }

    return {
      output: { success: true },
      message: `Reaction :${ctx.input.emojiName}: ${ctx.input.action === 'add' ? 'added to' : 'removed from'} message ${ctx.input.messageId}`
    };
  })
  .build();
