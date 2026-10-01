import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { createClient } from '../lib/helpers';

export let deleteTicket = SlateTool.create(spec, {
  name: 'Desk Delete Ticket',
  key: 'desk_delete_ticket',
  description: `Permanently delete a support ticket by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      orgId: z
        .string()
        .optional()
        .describe('Organization ID. Call desk_list_organizations to discover IDs.'),
      ticketId: z.string().describe('ID of the ticket to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the ticket was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteTicket(ctx.input.ticketId);

    return {
      output: { deleted: true },
      message: `Deleted ticket **${ctx.input.ticketId}**`
    };
  })
  .build();
