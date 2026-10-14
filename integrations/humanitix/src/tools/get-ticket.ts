import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  eventIdSchema,
  mapTicket,
  overrideLocationSchema,
  ticketSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description:
    'Retrieve a specific Humanitix ticket, including attendee details, pricing, event date, associated order, seating, and check-in state. Call list_events and list_tickets to discover its event and ticket IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: eventIdSchema,
      ticketId: z.string().describe('Ticket ID. Call list_tickets to discover ticket IDs.'),
      overrideLocation: overrideLocationSchema
    })
  )
  .output(ticketSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let ticket = await client.getTicket(ctx.input.eventId, ctx.input.ticketId, {
      overrideLocation: ctx.input.overrideLocation
    });
    return {
      output: mapTicket(ticket),
      message: `Retrieved ticket \`${ticket._id}\` for event \`${ctx.input.eventId}\`.`
    };
  })
  .build();
