import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let graphWebhook = SlateTrigger.create(spec, {
  name: 'Graph Content Webhook',
  key: 'graph_content_webhook',
  description:
    'Receives webhook events from Optimizely Graph when content is updated, expired, or a bulk synchronization completes.'
})
  .input(
    z.object({
      subject: z.string().describe('Event subject (e.g., doc, bulk)'),
      action: z.string().describe('Event action (e.g., updated, expired, completed)'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.any().describe('Full webhook event payload')
    })
  )
  .output(
    z.object({
      subject: z.string().describe('Event subject (doc or bulk)'),
      action: z.string().describe('Event action'),
      contentId: z.string().optional().describe('Content item ID (for doc events)'),
      contentType: z.string().optional().describe('Content type'),
      status: z.string().optional().describe('Content status'),
      timestamp: z.string().optional().describe('When the event occurred'),
      rawEvent: z.any().optional().describe('Full event payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.type || data.event || '';
      let parts = eventType.split('.');
      let subject = parts[0] || data.subject || 'doc';
      let action = parts[1] || data.action || 'updated';
      let eventId = data.id || data.event_id || `${subject}.${action}-${Date.now()}`;

      return {
        inputs: [
          {
            subject,
            action,
            eventId: String(eventId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      return {
        type: `${ctx.input.subject}.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          subject: ctx.input.subject,
          action: ctx.input.action,
          contentId: payload.content_id || payload.id || payload.data?.id,
          contentType: payload.content_type || payload.type || payload.data?.content_type,
          status: payload.status || payload.data?.status,
          timestamp: payload.timestamp || payload.created_at || new Date().toISOString(),
          rawEvent: payload
        }
      };
    }
  })
  .build();
