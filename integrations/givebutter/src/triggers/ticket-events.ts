import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let ticketEvents = SlateTrigger.create(spec, {
  name: 'Ticket Purchased',
  key: 'ticket_events',
  description:
    'Triggered when a supporter purchases a ticket (not when a ticket type is created in the dashboard).'
})
  .input(
    z.object({
      ticketId: z.string().describe('Ticket ID'),
      rawPayload: z.any().describe('Raw ticket payload')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('Ticket ID'),
      idSuffix: z.string().nullable().describe('Ticket ID suffix'),
      transactionId: z.string().nullable().describe('Associated transaction ID'),
      name: z.string().nullable().describe('Attendee full name'),
      firstName: z.string().nullable().describe('Attendee first name'),
      lastName: z.string().nullable().describe('Attendee last name'),
      email: z.string().nullable().describe('Attendee email'),
      phone: z.string().nullable().describe('Attendee phone'),
      title: z.string().nullable().describe('Ticket type title'),
      description: z.string().nullable().describe('Ticket description'),
      price: z.number().nullable().describe('Ticket price'),
      pdf: z.string().nullable().describe('PDF ticket URL'),
      checkedInAt: z.string().nullable().describe('Check-in timestamp'),
      createdAt: z.string().nullable().describe('When created')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event !== 'ticket.created') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            ticketId: String(body.data.id),
            rawPayload: body.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let d = ctx.input.rawPayload;

      return {
        type: 'ticket.created',
        id: `ticket-${ctx.input.ticketId}-${d.created_at ?? Date.now()}`,
        output: {
          ticketId: ctx.input.ticketId,
          idSuffix: d.id_suffix ?? null,
          transactionId: d.transaction_id ? String(d.transaction_id) : null,
          name: d.name ?? null,
          firstName: d.first_name ?? null,
          lastName: d.last_name ?? null,
          email: d.email ?? null,
          phone: d.phone ?? null,
          title: d.title ?? null,
          description: d.description ?? null,
          price: d.price ?? null,
          pdf: d.pdf ?? null,
          checkedInAt: d.checked_in_at ?? null,
          createdAt: d.created_at ?? null
        }
      };
    }
  })
  .build();
