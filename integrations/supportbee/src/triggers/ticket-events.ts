import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ticketSchema } from '../lib/types';
import { spec } from '../spec';

export let ticketEvents = SlateTrigger.create(spec, {
  name: 'Ticket Events',
  key: 'ticket_events',
  description:
    'Triggered when a ticket lifecycle event occurs: created, archived, unarchived, trashed, untrashed, spammed, unspammed, answered, or unanswered. Configure the webhook URL in SupportBee admin settings under the Web Hooks tab.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of ticket event'),
      ticketId: z.string().describe('Unique event identifier for deduplication'),
      ticket: z.any().describe('Raw ticket data from the webhook')
    })
  )
  .output(ticketSchema)
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // SupportBee webhooks send ticket data with an event type
      // The webhook payload contains the ticket object and event metadata
      let eventType = data.event_type || data.action || 'unknown';
      let ticket = data.ticket || data.object || data;
      let ticketId = ticket?.id || 'unknown';

      // Create a unique event ID from event type and ticket ID and timestamp
      let eventId = `${eventType}-${ticketId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            ticketId: eventId,
            ticket
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.ticket;
      let eventType = ctx.input.eventType;

      // Map the event type to a normalized format
      let typeMap: Record<string, string> = {
        'ticket.created': 'ticket.created',
        ticket_create: 'ticket.created',
        'ticket.archived': 'ticket.archived',
        ticket_archive: 'ticket.archived',
        'ticket.unarchived': 'ticket.unarchived',
        ticket_unarchive: 'ticket.unarchived',
        'ticket.trashed': 'ticket.trashed',
        ticket_trash: 'ticket.trashed',
        'ticket.untrashed': 'ticket.untrashed',
        ticket_untrash: 'ticket.untrashed',
        'ticket.spammed': 'ticket.spammed',
        ticket_spam: 'ticket.spammed',
        'ticket.unspammed': 'ticket.unspammed',
        ticket_unspam: 'ticket.unspammed',
        'ticket.answered': 'ticket.answered',
        ticket_answer: 'ticket.answered',
        'ticket.unanswered': 'ticket.unanswered',
        ticket_unanswer: 'ticket.unanswered'
      };

      let normalizedType = typeMap[eventType] || `ticket.${eventType}`;

      return {
        type: normalizedType,
        id: ctx.input.ticketId,
        output: {
          ticketId: raw.id || 0,
          subject: raw.subject || '',
          repliesCount: raw.replies_count,
          commentsCount: raw.comments_count,
          archived: raw.archived,
          spam: raw.spam,
          trash: raw.trash,
          starred: raw.starred,
          unanswered: raw.unanswered,
          createdAt: raw.created_at,
          lastActivityAt: raw.last_activity_at,
          requester: raw.requester
            ? {
                userId: raw.requester.id,
                email: raw.requester.email,
                name: raw.requester.name
              }
            : undefined,
          currentUserAssignee: raw.current_user_assignee
            ? {
                userId: raw.current_user_assignee.id,
                email: raw.current_user_assignee.email || '',
                firstName: raw.current_user_assignee.first_name,
                lastName: raw.current_user_assignee.last_name,
                name: raw.current_user_assignee.name,
                role: raw.current_user_assignee.role,
                agent: raw.current_user_assignee.agent,
                imageUrl: raw.current_user_assignee.picture?.thumb64
              }
            : undefined,
          currentTeamAssignee: raw.current_team_assignee
            ? {
                teamId: raw.current_team_assignee.id,
                name: raw.current_team_assignee.name
              }
            : undefined,
          labels: raw.labels
            ? raw.labels.map((l: any) => ({
                name: l.name || l.label || '',
                color: l.color
              }))
            : undefined,
          content: raw.content
            ? {
                text: raw.content.text || raw.content.body,
                html: raw.content.html,
                attachments: raw.content.attachments
              }
            : undefined
        }
      };
    }
  })
  .build();
