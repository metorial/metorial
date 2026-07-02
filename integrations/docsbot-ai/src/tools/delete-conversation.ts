import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let deleteConversation = SlateTool.create(spec, {
  name: 'Delete Conversation',
  key: 'delete_conversation',
  description: `Delete a conversation session and all its messages from a bot. Requires bot edit permissions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID the conversation belongs to'),
      conversationId: z.string().describe('Conversation ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the conversation was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    await client.deleteConversation(
      ctx.config.teamId,
      ctx.input.botId,
      ctx.input.conversationId
    );

    return {
      output: { deleted: true },
      message: `Deleted conversation \`${ctx.input.conversationId}\``
    };
  })
  .build();
