import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let ticketEvents = SlateTrigger.create(spec, {
  name: 'Ticket Events',
  key: 'ticket_events',
  description:
    'Triggers when ticket activity occurs, including ticket creation, comment additions, status changes, assignment changes, and other ticket modifications.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of ticket event'),
      eventId: z.string().describe('Unique event identifier'),
      ticketId: z.string().describe('The ticket ID'),
      subject: z.string().nullable().describe('The ticket subject'),
      status: z.string().nullable().describe('The ticket status'),
      priority: z.string().nullable().describe('The ticket priority'),
      requesterId: z.string().nullable().describe('The requester user ID'),
      assigneeId: z.string().nullable().describe('The assigned agent user ID'),
      groupId: z.string().nullable().describe('The assigned group ID'),
      tags: z.array(z.string()).describe('Tags on the ticket'),
      via: z
        .string()
        .nullable()
        .describe('How the event was triggered (e.g., web, api, email)'),
      updatedAt: z.string().nullable().describe('When the ticket was last updated')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('The ticket ID'),
      ticketUrl: z.string().describe('The URL of the ticket'),
      subject: z.string().nullable().describe('The ticket subject'),
      status: z.string().nullable().describe('The ticket status'),
      priority: z.string().nullable().describe('The ticket priority'),
      requesterId: z.string().nullable().describe('The requester user ID'),
      assigneeId: z.string().nullable().describe('The assigned agent user ID'),
      groupId: z.string().nullable().describe('The assigned group ID'),
      tags: z.array(z.string()).describe('Tags on the ticket'),
      via: z.string().nullable().describe('How the event was triggered'),
      updatedAt: z.string().nullable().describe('When the ticket was last updated')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ZendeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType
      });

      let webhook = await client.createWebhook({
        name: 'Slates Ticket Events',
        status: 'active',
        endpoint: ctx.input.webhookBaseUrl,
        http_method: 'POST',
        request_format: 'json',
        subscriptions: [
          'zen:event-type:ticket.created',
          'zen:event-type:ticket.CommentAdded',
          'zen:event-type:ticket.StatusChanged',
          'zen:event-type:ticket.AssigneeChanged',
          'zen:event-type:ticket.GroupChanged',
          'zen:event-type:ticket.PriorityChanged',
          'zen:event-type:ticket.SubjectChanged',
          'zen:event-type:ticket.TagsChanged'
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ZendeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let eventType = 'ticket.updated';
      if (data.type) {
        let typeParts = String(data.type).split(':');
        eventType = typeParts[typeParts.length - 1] || 'ticket.updated';
      }
      if (data.event?.type) {
        eventType = data.event.type;
      }

      let ticket = data.detail?.ticket || data.ticket || data;
      let ticketId = String(ticket.id || data.id || 'unknown');

      return {
        inputs: [
          {
            eventType,
            eventId: `${ticketId}-${data.id || Date.now()}`,
            ticketId,
            subject: ticket.subject || null,
            status: ticket.status || null,
            priority: ticket.priority || null,
            requesterId: ticket.requester_id ? String(ticket.requester_id) : null,
            assigneeId: ticket.assignee_id ? String(ticket.assignee_id) : null,
            groupId: ticket.group_id ? String(ticket.group_id) : null,
            tags: ticket.tags || [],
            via: ticket.via?.channel || null,
            updatedAt: ticket.updated_at || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');
      if (!eventType.startsWith('ticket.')) {
        eventType = `ticket.${eventType}`;
      }

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          ticketId: ctx.input.ticketId,
          ticketUrl: `https://${ctx.config.subdomain}.zendesk.com/agent/tickets/${ctx.input.ticketId}`,
          subject: ctx.input.subject,
          status: ctx.input.status,
          priority: ctx.input.priority,
          requesterId: ctx.input.requesterId,
          assigneeId: ctx.input.assigneeId,
          groupId: ctx.input.groupId,
          tags: ctx.input.tags,
          via: ctx.input.via,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
