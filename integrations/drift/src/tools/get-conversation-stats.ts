import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let getConversationStats = SlateTool.create(spec, {
  name: 'Get Conversation Stats',
  key: 'get_conversation_stats',
  description: `Get Drift conversation counts grouped by status for the connected organization.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      open: z.number().describe('Open conversation count'),
      closed: z.number().describe('Closed conversation count'),
      pending: z.number().describe('Pending conversation count'),
      total: z.number().describe('Total conversations across returned statuses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);
    let result = await client.getConversationStats();
    let counts = result.conversationCount ?? result;
    let open = Number(counts.OPEN ?? counts.open ?? 0);
    let closed = Number(counts.CLOSED ?? counts.closed ?? 0);
    let pending = Number(counts.PENDING ?? counts.pending ?? 0);

    return {
      output: {
        open,
        closed,
        pending,
        total: open + closed + pending
      },
      message: `Found **${open}** open, **${closed}** closed, and **${pending}** pending conversation(s).`
    };
  })
  .build();
