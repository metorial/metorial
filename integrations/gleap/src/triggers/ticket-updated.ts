import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let ticketUpdated = SlateTrigger.create(spec, {
  name: 'Ticket Updated',
  key: 'ticket_updated',
  description:
    '[Polling fallback] Polls for recently updated tickets. Detects new and modified tickets based on their last update timestamp.'
})
  .input(
    z.object({
      ticketId: z.string().describe('ID of the updated ticket'),
      title: z.string().optional().describe('Title of the ticket'),
      type: z.string().optional().describe('Ticket type'),
      status: z.string().optional().describe('Ticket status'),
      priority: z.string().optional().describe('Ticket priority'),
      updatedAt: z.string().optional().describe('When the ticket was last updated'),
      ticket: z.record(z.string(), z.any()).describe('Full ticket object')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('ID of the updated ticket'),
      title: z.string().optional().describe('Title of the ticket'),
      type: z.string().optional().describe('Ticket type (e.g. BUG, FEATURE_REQUEST)'),
      status: z.string().optional().describe('Current ticket status'),
      priority: z.string().optional().describe('Ticket priority'),
      processingUser: z.string().optional().describe('Assigned user ID'),
      sessionId: z.string().optional().describe('Session ID of the reporter'),
      createdAt: z.string().optional().describe('When the ticket was created'),
      updatedAt: z.string().optional().describe('When the ticket was last updated'),
      tags: z.array(z.string()).optional().describe('Ticket tags')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new GleapClient({
        token: ctx.auth.token,
        projectId: ctx.auth.projectId
      });

      let lastPollTime =
        (ctx.state as any)?.lastPollTime || new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let result = await client.listTickets({
        sort: '-updatedAt',
        limit: 50
      });

      let tickets = result.tickets || [];
      let newTickets = tickets.filter((t: any) => {
        let ticketUpdatedAt = t.updatedAt || t.createdAt;
        return ticketUpdatedAt && ticketUpdatedAt > lastPollTime;
      });

      let newLastPollTime =
        newTickets.length > 0
          ? newTickets[0]!.updatedAt || newTickets[0]!.createdAt
          : lastPollTime;

      return {
        inputs: newTickets.map((t: any) => ({
          ticketId: t._id || t.id,
          title: t.title,
          type: t.type,
          status: t.status,
          priority: t.priority,
          updatedAt: t.updatedAt,
          ticket: t
        })),
        updatedState: {
          lastPollTime: newLastPollTime
        }
      };
    },

    handleEvent: async ctx => {
      let ticket = ctx.input.ticket as Record<string, any>;

      return {
        type: 'ticket.updated',
        id: `${ctx.input.ticketId}_${ctx.input.updatedAt || Date.now()}`,
        output: {
          ticketId: ctx.input.ticketId,
          title: ctx.input.title,
          type: ctx.input.type,
          status: ctx.input.status,
          priority: ctx.input.priority,
          processingUser: String(ticket.processingUser?._id || ticket.processingUser || ''),
          sessionId: String(ticket.session?._id || ticket.session || ''),
          createdAt: String(ticket.createdAt || ''),
          updatedAt: String(ticket.updatedAt || ''),
          tags: Array.isArray(ticket.tags) ? (ticket.tags as string[]) : undefined
        }
      };
    }
  })
  .build();
