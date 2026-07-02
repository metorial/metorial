import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let feedbackWebhook = SlateTrigger.create(spec, {
  name: 'Feedback Event',
  key: 'feedback_event',
  description:
    'Triggers when feedback is created, updated, or deleted in Gleap. Configure the webhook URL in the Gleap dashboard under Integrations.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (e.g. feedback_created, feedback_updated, feedback_deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      ticketId: z.string().optional().describe('ID of the affected ticket'),
      ticketType: z.string().optional().describe('Type of the ticket'),
      ticketStatus: z.string().optional().describe('Current status of the ticket'),
      ticketTitle: z.string().optional().describe('Title of the ticket'),
      rawPayload: z.record(z.string(), z.any()).describe('Raw webhook payload from Gleap')
    })
  )
  .output(
    z.object({
      ticketId: z.string().optional().describe('ID of the affected ticket'),
      ticketType: z
        .string()
        .optional()
        .describe('Type of the ticket (e.g. BUG, FEATURE_REQUEST)'),
      ticketStatus: z.string().optional().describe('Current status of the ticket'),
      ticketTitle: z.string().optional().describe('Title of the ticket'),
      ticketPriority: z.string().optional().describe('Priority of the ticket'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID of the user who submitted the feedback'),
      imageUrl: z.string().optional().describe('Screenshot URL if available'),
      createdAt: z.string().optional().describe('When the feedback was created'),
      updatedAt: z.string().optional().describe('When the feedback was last updated'),
      rawPayload: z.record(z.string(), z.any()).describe('Complete raw webhook payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = data.event || data.type || 'feedback_created';
      let ticket = data.ticket || data.feedback || data;
      let ticketId = ticket._id || ticket.id || data._id || data.id;

      let eventId = `${eventType}_${ticketId}_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            ticketId,
            ticketType: ticket.type,
            ticketStatus: ticket.status,
            ticketTitle: ticket.title,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload as Record<string, any>;
      let ticket = (payload.ticket || payload.feedback || payload) as Record<string, any>;

      return {
        type: `feedback.${ctx.input.eventType.replace('feedback_', '')}`,
        id: ctx.input.eventId,
        output: {
          ticketId: ctx.input.ticketId,
          ticketType: ctx.input.ticketType || String(ticket.type || ''),
          ticketStatus: ctx.input.ticketStatus || String(ticket.status || ''),
          ticketTitle: ctx.input.ticketTitle || String(ticket.title || ''),
          ticketPriority: String(ticket.priority || ''),
          sessionId: String(ticket.session?._id || ticket.session || ''),
          imageUrl: String(ticket.imageUrl || ticket.screenshotUrl || ''),
          createdAt: String(ticket.createdAt || ''),
          updatedAt: String(ticket.updatedAt || ''),
          rawPayload: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
