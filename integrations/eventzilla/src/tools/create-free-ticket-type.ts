import { SlateTool } from 'slates';
import { Client } from '../lib/client';
import { freeTicketInput, freeTicketOutput, mapFreeTicket } from '../lib/free-ticket-types';
import { spec } from '../spec';

export let createFreeTicketTypeTool = SlateTool.create(spec, {
  name: 'Create Free Ticket Type',
  key: 'create_free_ticket_type',
  description: 'Create a free ticket type for an event discovered with list_events.',
  tags: { destructive: false }
})
  .input(freeTicketInput)
  .output(freeTicketOutput)
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).createFreeTicketType(
      ctx.input.eventId,
      ctx.input
    );
    let output = mapFreeTicket(data);
    return {
      output,
      message: `Eventzilla returned free ticket type ${output.ticketTypeId} after create.`
    };
  })
  .build();
