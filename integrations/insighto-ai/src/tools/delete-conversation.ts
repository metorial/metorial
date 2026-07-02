import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteConversation = SlateTool.create(spec, {
  name: 'Delete Conversation',
  key: 'delete_conversation',
  description: `Delete a conversation by its ID. Permanently removes the conversation and its messages.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to delete')
    })
  )
  .output(
    z.object({
      conversationId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteConversation(ctx.input.conversationId);

    return {
      output: {
        conversationId: ctx.input.conversationId,
        deleted: true
      },
      message: `Deleted conversation \`${ctx.input.conversationId}\`.`
    };
  })
  .build();
