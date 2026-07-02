import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let replyCommentOutputSchema = z.object({
  ticketId: z.number().describe('ID of the ticket this reply/comment belongs to'),
  ticketSubject: z.string().optional().describe('Subject of the parent ticket'),
  messageId: z.number().describe('ID of the reply or comment'),
  authorName: z.string().optional().describe('Name of the person who posted'),
  authorEmail: z.string().optional().describe('Email of the person who posted'),
  contentText: z.string().optional().describe('Plain text content'),
  contentHtml: z.string().optional().describe('HTML content'),
  createdAt: z.string().optional().describe('Timestamp when the reply/comment was created')
});

export let replyCommentEvents = SlateTrigger.create(spec, {
  name: 'Reply and Comment Events',
  key: 'reply_comment_events',
  description:
    'Triggered when a new reply or comment is created on a ticket. Covers customer replies, agent replies, and internal comments. Configure the webhook URL in SupportBee admin settings under the Web Hooks tab.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of reply/comment event'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      rawData: z.any().describe('Raw webhook payload data')
    })
  )
  .output(replyCommentOutputSchema)
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event_type || data.action || 'unknown';
      let payload = data.reply || data.comment || data.object || data;
      let ticket = data.ticket || payload.ticket || {};
      let payloadId = payload?.id || 'unknown';

      let eventId = `${eventType}-${payloadId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            rawData: { ...data, _ticket: ticket, _payload: payload }
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, rawData } = ctx.input;
      let payload = rawData._payload || {};
      let ticket = rawData._ticket || rawData.ticket || {};

      let typeMap: Record<string, string> = {
        'reply.created': 'reply.customer_created',
        customer_reply_create: 'reply.customer_created',
        'agent_reply.created': 'reply.agent_created',
        agent_reply_create: 'reply.agent_created',
        'comment.created': 'comment.created',
        comment_create: 'comment.created'
      };

      let normalizedType = typeMap[eventType] || `reply.${eventType}`;

      let author = payload.replier || payload.commenter || {};

      return {
        type: normalizedType,
        id: ctx.input.eventId,
        output: {
          ticketId: ticket.id || payload.ticket_id || 0,
          ticketSubject: ticket.subject,
          messageId: payload.id || 0,
          authorName: author.name,
          authorEmail: author.email,
          contentText: payload.content?.text || payload.content?.body || payload.summary,
          contentHtml: payload.content?.html,
          createdAt: payload.created_at
        }
      };
    }
  })
  .build();
