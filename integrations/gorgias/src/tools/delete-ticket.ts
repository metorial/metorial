import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteTicket = SlateTool.create(spec, {
  name: 'Delete Ticket',
  key: 'delete_ticket',
  description: `Permanently delete a support ticket and all its messages. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the ticket was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteTicket(ctx.input.ticketId);

    return {
      output: { deleted: true },
      message: `Deleted ticket **#${ctx.input.ticketId}**.`
    };
  })
  .build();
