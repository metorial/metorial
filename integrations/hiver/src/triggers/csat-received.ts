import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let csatReceived = SlateTrigger.create(spec, {
  name: 'CSAT Rating Received',
  key: 'csat_received',
  description:
    'Triggers when a customer satisfaction (CSAT) rating is received for a conversation. Fires when a customer submits a satisfaction rating for a resolved conversation.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique identifier for this event'),
      conversationId: z.string().describe('ID of the rated conversation'),
      inboxId: z.string().optional().describe('ID of the shared mailbox'),
      rating: z.number().optional().describe('Numeric CSAT rating value'),
      ratingLabel: z
        .string()
        .optional()
        .describe('Label for the CSAT rating (e.g., "satisfied", "dissatisfied")'),
      feedback: z.string().optional().describe('Text feedback provided by the customer'),
      customerEmail: z
        .string()
        .optional()
        .describe('Email of the customer who gave the rating'),
      customerName: z.string().optional().describe('Name of the customer'),
      subject: z.string().optional().describe('Subject of the rated conversation'),
      ratedAt: z.string().optional().describe('Timestamp when the rating was submitted'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('ID of the rated conversation'),
      inboxId: z.string().optional().describe('ID of the shared mailbox'),
      rating: z.number().optional().describe('Numeric CSAT rating value'),
      ratingLabel: z.string().optional().describe('Label for the rating'),
      feedback: z.string().optional().describe('Customer text feedback'),
      customerEmail: z.string().optional().describe('Customer email'),
      customerName: z.string().optional().describe('Customer name'),
      subject: z.string().optional().describe('Conversation subject'),
      ratedAt: z.string().optional().describe('Timestamp of the rating')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: Record<string, any>) => {
        let csat = event.csat ?? event.data ?? event;
        let customer = csat.customer ?? csat.contact ?? {};
        let conversation = csat.conversation ?? {};
        let conversationId = String(
          csat.conversation_id ?? conversation.id ?? event.conversation_id ?? event.id ?? ''
        );

        return {
          eventId: event.event_id ?? event.id ?? `csat-${conversationId}-${Date.now()}`,
          conversationId,
          inboxId: csat.inbox_id
            ? String(csat.inbox_id)
            : conversation.inbox_id
              ? String(conversation.inbox_id)
              : undefined,
          rating:
            typeof csat.rating === 'number'
              ? csat.rating
              : typeof csat.score === 'number'
                ? csat.score
                : undefined,
          ratingLabel: csat.rating_label ?? csat.rating_text ?? csat.label,
          feedback: csat.feedback ?? csat.comment ?? csat.remarks,
          customerEmail: customer.email ?? csat.customer_email,
          customerName: customer.name ?? csat.customer_name,
          subject: conversation.subject ?? csat.subject,
          ratedAt:
            csat.rated_at ?? csat.created_at ?? event.timestamp ?? new Date().toISOString(),
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: 'csat.received',
        id: ctx.input.eventId,
        output: {
          conversationId: ctx.input.conversationId,
          inboxId: ctx.input.inboxId,
          rating: ctx.input.rating,
          ratingLabel: ctx.input.ratingLabel,
          feedback: ctx.input.feedback,
          customerEmail: ctx.input.customerEmail,
          customerName: ctx.input.customerName,
          subject: ctx.input.subject,
          ratedAt: ctx.input.ratedAt
        }
      };
    }
  });
