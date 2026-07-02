import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newTicketTrigger = SlateTrigger.create(spec, {
  name: 'New Ticket',
  key: 'new_ticket',
  description: 'Triggers when a new support ticket is created in Agiled.'
})
  .input(
    z.object({
      ticketId: z.string().describe('ID of the ticket'),
      ticket: z.record(z.string(), z.unknown()).describe('Ticket record from Agiled')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('ID of the new ticket'),
      subject: z.string().optional().describe('Ticket subject'),
      ticketNumber: z.string().optional().describe('Ticket number'),
      priority: z.string().optional().describe('Ticket priority'),
      agentId: z.string().optional().describe('Assigned agent user ID'),
      status: z.string().optional().describe('Ticket status'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        brand: ctx.auth.brand
      });

      let lastKnownId = (ctx.state as Record<string, unknown>)?.lastKnownId as
        | number
        | undefined;

      let result = await client.listTickets(1, 50);
      let tickets = result.data;

      let newTickets = lastKnownId ? tickets.filter(t => Number(t.id) > lastKnownId) : [];

      let maxId = tickets.reduce(
        (max, t) => Math.max(max, Number(t.id) || 0),
        lastKnownId ?? 0
      );

      return {
        inputs: newTickets.map(t => ({
          ticketId: String(t.id),
          ticket: t
        })),
        updatedState: {
          lastKnownId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      let t = ctx.input.ticket;
      return {
        type: 'ticket.created',
        id: ctx.input.ticketId,
        output: {
          ticketId: ctx.input.ticketId,
          subject: t.subject as string | undefined,
          ticketNumber: t.ticket_number as string | undefined,
          priority: t.priority as string | undefined,
          agentId: t.agent_id != null ? String(t.agent_id) : undefined,
          status: t.status as string | undefined,
          createdAt: t.created_at as string | undefined
        }
      };
    }
  })
  .build();
