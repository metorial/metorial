import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let ticketEvents = SlateTrigger.create(spec, {
  name: 'Ticket Events',
  key: 'ticket_events',
  description:
    'Triggers when a ticket is created, updated, or when a new message is added to a ticket. Receives webhook payloads from Gorgias HTTP integrations.'
})
  .input(
    z.object({
      eventType: z
        .enum(['ticket-created', 'ticket-updated', 'ticket-message-created'])
        .describe('Type of ticket event'),
      eventId: z.string().describe('Unique event identifier'),
      ticket: z.any().describe('Ticket data from the webhook payload')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('Ticket ID'),
      status: z.string().nullable().describe('Ticket status'),
      channel: z.string().nullable().describe('Ticket channel'),
      subject: z.string().nullable().describe('Ticket subject'),
      priority: z.string().nullable().describe('Ticket priority'),
      customerEmail: z.string().nullable().describe('Customer email'),
      customerId: z.number().nullable().describe('Customer ID'),
      assigneeUserId: z.number().nullable().describe('Assigned agent user ID'),
      assigneeUserName: z.string().nullable().describe('Assigned agent name'),
      tags: z.array(z.string()).describe('Tag names on the ticket'),
      createdDatetime: z.string().nullable().describe('When the ticket was created'),
      updatedDatetime: z.string().nullable().describe('When the ticket was last updated')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let integration = await client.createIntegration({
        name: 'Slates Webhook Integration',
        description: 'Automated webhook integration for Slates platform',
        type: 'http',
        http: {
          url: ctx.input.webhookBaseUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          request_content_type: 'application/json',
          response_content_type: 'application/json',
          triggers: {
            'ticket-created': true,
            'ticket-message-created': true,
            'ticket-updated': true
          },
          form: {
            body: JSON.stringify({
              ticket_id: '{{ticket.id}}',
              ticket_status: '{{ticket.status}}',
              ticket_channel: '{{ticket.channel}}',
              ticket_subject: '{{ticket.subject}}',
              ticket_priority: '{{ticket.priority}}',
              customer_email: '{{ticket.customer.email}}',
              customer_id: '{{ticket.customer.id}}',
              assignee_user_id: '{{ticket.assignee_user.id}}',
              assignee_user_firstname: '{{ticket.assignee_user.firstname}}',
              assignee_user_lastname: '{{ticket.assignee_user.lastname}}',
              created_datetime: '{{ticket.created_datetime}}',
              updated_datetime: '{{ticket.updated_datetime}}'
            })
          }
        }
      });

      return {
        registrationDetails: {
          integrationId: integration.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.config, ctx.auth);
      let details = ctx.input.registrationDetails as { integrationId: number };
      await client.deleteIntegration(details.integrationId);
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Gorgias HTTP integrations send the templated body we configured.
      // The body may have ticket_id from our template, or the raw ticket object.
      let ticketId = body.ticket_id || body.id;
      if (!ticketId) {
        return { inputs: [] };
      }

      // Determine event type from what data has changed
      // Since Gorgias doesn't include the event type in the webhook payload by default,
      // we'll classify based on available data and let the mapper fetch full details
      let eventType: 'ticket-created' | 'ticket-updated' | 'ticket-message-created' =
        'ticket-updated';

      let eventId = `${ticketId}-${body.updated_datetime || body.created_datetime || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            ticket: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let ticket = ctx.input.ticket;

      // If we have minimal template data, try to enrich by fetching full ticket
      let ticketId = ticket.ticket_id || ticket.id;
      let enriched = ticket;

      if (ticketId && !ticket.tags) {
        try {
          let client = createClient(ctx.config, ctx.auth);
          enriched = await client.getTicket(Number(ticketId));
        } catch {
          // Use the data we have from the webhook payload
        }
      }

      let eventTypeMap: Record<string, string> = {
        'ticket-created': 'ticket.created',
        'ticket-updated': 'ticket.updated',
        'ticket-message-created': 'ticket.message_created'
      };

      return {
        type: eventTypeMap[ctx.input.eventType] || 'ticket.updated',
        id: ctx.input.eventId,
        output: {
          ticketId: enriched.id || Number(ticketId),
          status: enriched.status || enriched.ticket_status || null,
          channel: enriched.channel || enriched.ticket_channel || null,
          subject: enriched.subject || enriched.ticket_subject || null,
          priority: enriched.priority || enriched.ticket_priority || null,
          customerEmail: enriched.customer?.email || enriched.customer_email || null,
          customerId:
            enriched.customer?.id ||
            (enriched.customer_id ? Number(enriched.customer_id) : null),
          assigneeUserId:
            enriched.assignee_user?.id ||
            (enriched.assignee_user_id ? Number(enriched.assignee_user_id) : null),
          assigneeUserName: enriched.assignee_user
            ? [enriched.assignee_user.firstname, enriched.assignee_user.lastname]
                .filter(Boolean)
                .join(' ') || null
            : enriched.assignee_user_firstname
              ? [enriched.assignee_user_firstname, enriched.assignee_user_lastname]
                  .filter(Boolean)
                  .join(' ') || null
              : null,
          tags: enriched.tags
            ? enriched.tags.map((t: any) => (typeof t === 'string' ? t : t.name))
            : [],
          createdDatetime: enriched.created_datetime || null,
          updatedDatetime: enriched.updated_datetime || null
        }
      };
    }
  })
  .build();
