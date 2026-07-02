import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let webhookEventTypes = [
  'tickets.create',
  'tickets.update',
  'tickets.events.status',
  'tickets.events.priority',
  'tickets.events.assignment',
  'tickets.events.message',
  'tickets.events.tags',
  'tickets.events.followers'
] as const;

let ticketSchema = z.object({
  ticketId: z.string().describe('Unique identifier for the ticket'),
  shortId: z.string().optional().describe('Short identifier for the ticket'),
  subject: z.string().optional().describe('Subject line of the ticket'),
  status: z
    .enum(['open', 'pending', 'on hold', 'solved', 'closed'])
    .optional()
    .describe('Current ticket status'),
  priority: z
    .enum(['low', 'medium', 'high', 'urgent'])
    .optional()
    .describe('Ticket priority level'),
  requesterEmail: z.string().optional().describe('Email address of the ticket requester'),
  requesterName: z.string().optional().describe('Name of the ticket requester'),
  teamId: z.string().optional().describe('ID of the assigned team'),
  assigneeId: z.string().optional().describe('ID of the assigned agent'),
  tags: z.array(z.string()).optional().describe('Tags applied to the ticket'),
  followers: z.array(z.string()).optional().describe('Agent IDs following the ticket'),
  createdAt: z.string().optional().describe('Timestamp when the ticket was created'),
  updatedAt: z.string().optional().describe('Timestamp when the ticket was last updated')
});

let eventSchema = z.object({
  eventId: z.string().optional().describe('Unique identifier for the event within the ticket'),
  eventType: z
    .string()
    .optional()
    .describe('Type of event that occurred (e.g., message, status_change)'),
  messageText: z.string().optional().describe('Text content if the event is a message'),
  messageVisibility: z
    .enum(['public', 'private'])
    .optional()
    .describe('Visibility of the message'),
  authorId: z.string().optional().describe('ID of the event author'),
  authorType: z
    .string()
    .optional()
    .describe('Type of the event author (e.g., agent, customer)'),
  authorName: z.string().optional().describe('Name of the event author'),
  authorEmail: z.string().optional().describe('Email of the event author'),
  createdAt: z.string().optional().describe('Timestamp of the event')
});

export let ticketEventsTrigger = SlateTrigger.create(spec, {
  name: 'Ticket Events',
  key: 'ticket_events',
  description:
    'Fires when ticket events occur in HelpDesk, including ticket creation, updates, status changes, priority changes, assignment changes, new messages, tag changes, and follower changes.'
})
  .input(
    z.object({
      webhookEventType: z
        .enum(webhookEventTypes)
        .describe('The type of webhook event received'),
      ticket: z.any().describe('Full ticket object from the webhook payload'),
      event: z
        .any()
        .optional()
        .describe('Event object if the webhook includes event-specific data')
    })
  )
  .output(
    z.object({
      ticket: ticketSchema.describe('The ticket associated with the event'),
      event: eventSchema.optional().describe('Details about the specific event, if applicable')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registeredWebhookIds: string[] = [];

      for (let eventType of webhookEventTypes) {
        let webhook = await client.createWebhook({
          url: `${ctx.input.webhookBaseUrl}/${eventType}`,
          eventType
        });
        registeredWebhookIds.push(webhook.id);
      }

      return {
        registrationDetails: {
          webhookIds: registeredWebhookIds
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Best effort cleanup - webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        id?: string;
        eventType?: string;
        ticket?: unknown;
        event?: unknown;
      };

      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let inferredEventType =
        pathParts.slice(-2).join('.') || body.eventType || 'tickets.update';

      return {
        inputs: [
          {
            webhookEventType: inferredEventType as (typeof webhookEventTypes)[number],
            ticket: body.ticket ?? body,
            event: body.event
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let rawTicket = ctx.input.ticket as Record<string, unknown> | undefined;
      let rawEvent = ctx.input.event as Record<string, unknown> | undefined;

      let requester = rawTicket?.requester as { email?: string; name?: string } | undefined;
      let ticketId = String(rawTicket?.id ?? rawTicket?.ticketID ?? '');

      let ticketOutput: z.infer<typeof ticketSchema> = {
        ticketId,
        shortId: rawTicket?.shortID as string | undefined,
        subject: rawTicket?.subject as string | undefined,
        status: rawTicket?.status as
          | 'open'
          | 'pending'
          | 'on hold'
          | 'solved'
          | 'closed'
          | undefined,
        priority: rawTicket?.priority as 'low' | 'medium' | 'high' | 'urgent' | undefined,
        requesterEmail: requester?.email,
        requesterName: requester?.name,
        teamId: rawTicket?.teamID as string | undefined,
        assigneeId: rawTicket?.assigneeID as string | undefined,
        tags: rawTicket?.tags as string[] | undefined,
        followers: rawTicket?.followers as string[] | undefined,
        createdAt: rawTicket?.createdAt as string | undefined,
        updatedAt: rawTicket?.updatedAt as string | undefined
      };

      let eventOutput: z.infer<typeof eventSchema> | undefined;
      if (rawEvent) {
        let author = rawEvent.author as
          | { id?: string; type?: string; name?: string; email?: string }
          | undefined;
        let message = rawEvent.message as { text?: string } | undefined;
        eventOutput = {
          eventId: rawEvent.id as string | undefined,
          eventType: rawEvent.type as string | undefined,
          messageText: message?.text,
          messageVisibility: rawEvent.visibility as 'public' | 'private' | undefined,
          authorId: author?.id,
          authorType: author?.type,
          authorName: author?.name,
          authorEmail: author?.email,
          createdAt: rawEvent.createdAt as string | undefined
        };
      }

      let eventTypeMap: Record<string, string> = {
        'tickets.create': 'ticket.created',
        'tickets.update': 'ticket.updated',
        'tickets.events.status': 'ticket.status_changed',
        'tickets.events.priority': 'ticket.priority_changed',
        'tickets.events.assignment': 'ticket.assignment_changed',
        'tickets.events.message': 'ticket.message_added',
        'tickets.events.tags': 'ticket.tags_changed',
        'tickets.events.followers': 'ticket.followers_changed'
      };

      let type = eventTypeMap[ctx.input.webhookEventType] ?? 'ticket.updated';
      let eventId = rawEvent?.id
        ? String(rawEvent.id)
        : `${ticketId}-${ctx.input.webhookEventType}-${Date.now()}`;

      return {
        type,
        id: eventId,
        output: {
          ticket: ticketOutput,
          event: eventOutput
        }
      };
    }
  })
  .build();
