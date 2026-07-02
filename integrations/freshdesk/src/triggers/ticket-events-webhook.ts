import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let ticketEventsWebhook = SlateTrigger.create(spec, {
  name: 'Ticket Events (Webhook)',
  key: 'ticket_events_webhook',
  description:
    'Receives Freshdesk ticket webhooks from Automations or Orchestration (JSON POST to the Slates webhook URL). Payload shapes vary by rule; this trigger resolves `ticket_id` from common fields and loads the ticket via API. Configure the webhook URL in Freshdesk; no API auto-registration.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the ticket was created or updated'),
      ticketId: z.number().describe('Freshdesk ticket ID')
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
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let ticketIdRaw =
        data.ticket_id ??
        data.ticketId ??
        data.freshdesk_webhook?.ticket_id ??
        data.ticket?.id ??
        data.detail?.ticket_id ??
        data.request_data?.ticket_id;

      if (ticketIdRaw == null) return { inputs: [] };

      let ticketId = Number(ticketIdRaw);
      if (Number.isNaN(ticketId)) return { inputs: [] };

      let ev = String(
        data.event_type ?? data.event ?? data.triggered_event ?? ''
      ).toLowerCase();
      let eventType: 'created' | 'updated' =
        ev.includes('create') || ev.includes('new') ? 'created' : 'updated';

      return {
        inputs: [{ eventType, ticketId }]
      };
    },

    handleEvent: async ctx => {
      let client = new FreshdeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token
      });

      let t: any;
      try {
        t = await client.getTicket(ctx.input.ticketId);
      } catch {
        return {
          type: `ticket.${ctx.input.eventType}`,
          id: `ticket-${ctx.input.ticketId}-webhook`,
          output: {
            ticketId: ctx.input.ticketId,
            subject: '',
            status: 0,
            priority: 0,
            requesterId: 0,
            responderId: null,
            groupId: null,
            type: null,
            tags: [],
            createdAt: '',
            updatedAt: ''
          }
        };
      }

      return {
        type: `ticket.${ctx.input.eventType}`,
        id: `ticket-${ctx.input.ticketId}-${t.updated_at ?? Date.now()}`,
        output: {
          ticketId: t.id,
          subject: t.subject ?? '',
          status: t.status,
          priority: t.priority,
          requesterId: t.requester_id,
          responderId: t.responder_id ?? null,
          groupId: t.group_id ?? null,
          type: t.type ?? null,
          tags: t.tags ?? [],
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }
      };
    }
  })
  .build();
