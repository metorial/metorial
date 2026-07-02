import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteConversation = SlateTool.create(spec, {
  name: 'Delete Conversation',
  key: 'delete_conversation',
  description: `Permanently delete a conversation and all its associated messages. This action cannot be undone.`,
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
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteConversation(ctx.input.conversationId);

    return {
      output: { success: true },
      message: `Deleted conversation **${ctx.input.conversationId}**.`
    };
  })
  .build();
