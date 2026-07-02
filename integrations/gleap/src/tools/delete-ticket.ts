import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTicket = SlateTool.create(spec, {
  name: 'Delete Ticket',
  key: 'delete_ticket',
  description: `Permanently delete a support ticket by its ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The ID of the ticket to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the ticket was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    await client.deleteTicket(ctx.input.ticketId);

    return {
      output: { deleted: true },
      message: `Deleted ticket **${ctx.input.ticketId}**.`
    };
  })
  .build();
