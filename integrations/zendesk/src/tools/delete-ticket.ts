import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTicket = SlateTool.create(spec, {
  name: 'Delete Ticket',
  key: 'delete_ticket',
  description: `Permanently deletes a support ticket from Zendesk. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The ID of the ticket to delete')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('The ID of the deleted ticket'),
      deleted: z.boolean().describe('Whether the ticket was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
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
