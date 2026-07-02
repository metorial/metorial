import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let ticketEvents = SlateTrigger.create(spec, {
  name: 'Ticket Events',
  key: 'ticket_events',
  description:
    'Triggers when tickets are created, updated, assigned, replied to, closed, resolved, or when contacts/attributes change.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      eventId: z.string().describe('Unique event identifier'),
      ticket: z.any().describe('Ticket data from webhook payload')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('Ticket ID'),
      ticketTypeId: z.string().optional().describe('Ticket type ID'),
      state: z.string().optional().describe('Ticket state'),
      open: z.boolean().optional().describe('Whether ticket is open'),
      subject: z.string().optional().describe('Ticket subject'),
      description: z.string().optional().describe('Ticket description'),
      assigneeId: z.string().optional().describe('Assignee ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      ticketAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom ticket attributes')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let topic = data.topic || '';
      let ticketTopics = [
        'ticket.created',
        'ticket.state.updated',
        'ticket.note.created',
        'ticket.admin.assigned',
        'ticket.team.assigned',
        'ticket.contact.attached',
        'ticket.contact.detached',
        'ticket.attribute.updated',
        'ticket.admin.replied',
        'ticket.contact.replied',
        'ticket.closed',
        'ticket.rating.provided',
        'ticket.resolved'
      ];

      if (!ticketTopics.includes(topic)) {
        return { inputs: [] };
      }

      let eventId =
        data.id || `${topic}-${data.data?.item?.id || ''}-${data.created_at || Date.now()}`;

      return {
        inputs: [
          {
            topic,
            eventId,
            ticket: data.data?.item
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let ticket = ctx.input.ticket || {};

      return {
        type: ctx.input.topic,
        id: ctx.input.eventId,
        output: {
          ticketId: ticket.id || '',
          ticketTypeId: ticket.ticket_type?.id,
          state: ticket.ticket_state || ticket.state,
          open: ticket.open,
          subject: ticket.ticket_attributes?._default_title_,
          description: ticket.ticket_attributes?._default_description_,
          assigneeId: ticket.admin_assignee_id ? String(ticket.admin_assignee_id) : undefined,
          createdAt: ticket.created_at ? String(ticket.created_at) : undefined,
          updatedAt: ticket.updated_at ? String(ticket.updated_at) : undefined,
          ticketAttributes: ticket.ticket_attributes
        }
      };
    }
  })
  .build();
