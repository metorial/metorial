import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTicket = SlateTool.create(spec, {
  name: 'Delete Ticket',
  key: 'delete_ticket',
  description: `Permanently delete a HelpDesk ticket by its ID. This action is irreversible and will remove the ticket and all associated data including messages, attachments, and activity history.`,
  instructions: [
    'This action is permanent and cannot be undone.',
    'Consider moving the ticket to the trash silo using the update_ticket tool instead if you want to preserve the ability to recover it.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The unique ID of the ticket to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the ticket was successfully deleted'),
      deletedTicketId: z.string().describe('The ID of the deleted ticket')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteTicket(ctx.input.ticketId);

    return {
      output: {
        success: true,
        deletedTicketId: ctx.input.ticketId
      },
      message: `Successfully deleted ticket **${ctx.input.ticketId}**.`
    };
  })
  .build();
