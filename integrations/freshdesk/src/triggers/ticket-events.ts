import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let ticketEvents = SlateTrigger.create(spec, {
  name: 'Ticket Events',
  key: 'ticket_events',
  description:
    '[Polling fallback] Triggers when tickets are created or updated in Freshdesk. Polls for new and recently modified tickets. Prefer Ticket Events (Webhook) when using Freshdesk automation webhooks.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of ticket event'),
      ticketId: z.number().describe('ID of the affected ticket'),
      subject: z.string().describe('Subject of the ticket'),
      status: z.number().describe('Current ticket status'),
      priority: z.number().describe('Current ticket priority'),
      requesterId: z.number().describe('Requester contact ID'),
      responderId: z.number().nullable().describe('Assigned agent ID'),
      groupId: z.number().nullable().describe('Assigned group ID'),
      type: z.string().nullable().describe('Ticket type'),
      tags: z.array(z.string()).describe('Ticket tags'),
      createdAt: z.string().describe('Ticket creation timestamp'),
      updatedAt: z.string().describe('Ticket last update timestamp')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('ID of the affected ticket'),
      subject: z.string().describe('Ticket subject'),
      status: z.number().describe('Current status: 2=Open, 3=Pending, 4=Resolved, 5=Closed'),
      priority: z.number().describe('Current priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      requesterId: z.number().describe('Requester contact ID'),
      responderId: z.number().nullable().describe('Assigned agent ID'),
      groupId: z.number().nullable().describe('Assigned group ID'),
      type: z.string().nullable().describe('Ticket type'),
      tags: z.array(z.string()).describe('Ticket tags'),
      createdAt: z.string().describe('Ticket creation timestamp'),
      updatedAt: z.string().describe('Ticket last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FreshdeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token
      });

      let state = ctx.state ?? {};
      let lastPollTime: string | null = state.lastPollTime ?? null;
      let knownTicketIds: Record<string, boolean> = state.knownTicketIds ?? {};

      let now = new Date().toISOString();

      let params: Record<string, any> = {
        orderBy: 'updated_at',
        orderType: 'desc' as const,
        perPage: 30
      };

      if (lastPollTime) {
        params.updatedSince = lastPollTime;
      }

      let tickets = await client.listTickets(params);

      let inputs = tickets.map((t: any) => {
        let isNew =
          !knownTicketIds[String(t.id)] && (!lastPollTime || t.created_at >= lastPollTime);
        return {
          eventType: (isNew ? 'created' : 'updated') as 'created' | 'updated',
          ticketId: t.id,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          requesterId: t.requester_id,
          responderId: t.responder_id ?? null,
          groupId: t.group_id ?? null,
          type: t.type ?? null,
          tags: t.tags ?? [],
          createdAt: t.created_at,
          updatedAt: t.updated_at
        };
      });

      // Update known ticket IDs
      let updatedKnownIds: Record<string, boolean> = { ...knownTicketIds };
      for (let t of tickets) {
        updatedKnownIds[String(t.id)] = true;
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          knownTicketIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `ticket.${ctx.input.eventType}`,
        id: `ticket-${ctx.input.ticketId}-${ctx.input.updatedAt}`,
        output: {
          ticketId: ctx.input.ticketId,
          subject: ctx.input.subject,
          status: ctx.input.status,
          priority: ctx.input.priority,
          requesterId: ctx.input.requesterId,
          responderId: ctx.input.responderId,
          groupId: ctx.input.groupId,
          type: ctx.input.type,
          tags: ctx.input.tags,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
