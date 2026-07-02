import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTicket = SlateTool.create(spec, {
  name: 'Delete Ticket',
  key: 'delete_ticket',
  description: `Delete a ticket by its ID. Deleted tickets can be restored later using the restore functionality. This performs a soft delete.`,
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
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
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
