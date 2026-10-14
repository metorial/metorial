import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { resolveTeamId, teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteConversation = SlateTool.create(spec, {
  name: 'Delete Conversation',
  key: 'delete_conversation',
  description: `Delete a conversation session and all its messages from a bot. Requires bot edit permissions. Call list_teams to discover accessible team IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: teamIdSchema,
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
      resolveTeamId(ctx.input.teamId, ctx.config.teamId),
      ctx.input.botId,
      ctx.input.conversationId
    );

    return {
      output: { deleted: true },
      message: `Deleted conversation \`${ctx.input.conversationId}\``
    };
  })
  .build();
