import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { freeTicketInput, freeTicketOutput, mapFreeTicket } from '../lib/free-ticket-types';
import { spec } from '../spec';

export let updateFreeTicketTypeTool = SlateTool.create(spec, {
  name: 'Update Free Ticket Type',
  key: 'update_free_ticket_type',
  description:
    'Update an existing free ticket type. Call get_event_tickets to find its ID. Supply all ticket configuration fields; this endpoint requires the full ticket definition.',
  tags: { destructive: false }
})
  .input(
    freeTicketInput.extend({
      ticketTypeId: z.string().describe('Existing free ticket type ID from get_event_tickets')
    })
  )
  .output(freeTicketOutput)
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).updateFreeTicketType(
      ctx.input.eventId,
      ctx.input.ticketTypeId,
      ctx.input
    );
    let output = mapFreeTicket(data);
    return {
      output,
      message: `Eventzilla returned free ticket type ${output.ticketTypeId} after update.`
    };
  })
  .build();
