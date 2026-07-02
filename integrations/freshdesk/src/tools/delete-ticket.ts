import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTicket = SlateTool.create(spec, {
  name: 'Delete Ticket',
  key: 'delete_ticket',
  description: `Deletes a ticket from Freshdesk. The ticket is moved to trash and can be restored from the Freshdesk UI within 30 days.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to delete')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('ID of the deleted ticket'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    await client.deleteTicket(ctx.input.ticketId);

    return {
      output: {
        ticketId: ctx.input.ticketId,
        deleted: true
      },
      message: `Deleted ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();
