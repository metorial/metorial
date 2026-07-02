import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

export let deleteConversation = SlateTool.create(spec, {
  name: 'Delete Conversation',
  key: 'delete_conversation',
  description: `Permanently delete a conversation. This action cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      conversationId: z.number().describe('The conversation ID to delete')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Deleted conversation ID'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    await client.deleteConversation(ctx.input.conversationId);

    return {
      output: {
        conversationId: ctx.input.conversationId,
        deleted: true
      },
      message: `Deleted conversation **#${ctx.input.conversationId}**.`
    };
  })
  .build();
