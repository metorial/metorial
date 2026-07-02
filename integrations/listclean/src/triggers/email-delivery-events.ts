import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let emailDeliveryEvents = SlateTrigger.create(spec, {
  name: 'Email Delivery Events',
  key: 'email_delivery_events',
  description:
    'Receive webhook notifications for email delivery events including delivered, opened, clicked, bounced, unsubscribed, and spam reports. Configure the webhook URL in the Listclean dashboard.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of delivery event (e.g., delivered, open, click, soft_bounce, hard_bounce, unsubscribe, spam, soft_block, hard_block, request)'
        ),
      eventId: z.string().describe('Unique identifier for the event'),
      recipient: z.string().optional().describe('Recipient email address'),
      subject: z.string().optional().describe('Email subject line'),
      messageId: z.string().optional().describe('Unique message identifier'),
      timestamp: z.string().optional().describe('Timestamp of the event'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw event payload from the webhook')
    })
  )
  .output(
    z.object({
      recipient: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject line'),
      messageId: z.string().describe('Unique message identifier'),
      timestamp: z.string().describe('Timestamp of the event')
    })
  )
  .webhook({
    // Webhook registration must be done manually in the Listclean dashboard
    // No autoRegisterWebhook or autoUnregisterWebhook since the API doesn't support programmatic webhook management

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      // Handle both single event and batch payloads
      let events: Record<string, unknown>[] = Array.isArray(data) ? data : [data];

      let inputs = events.map((event, index) => {
        let eventType = String(event.event || event.type || event.event_type || 'unknown');

        // Normalize event type to snake_case
        let normalizedType = eventType.toLowerCase().replace(/[\s-]+/g, '_');

        let eventId = String(
          event.id ||
            event.event_id ||
            event.message_id ||
            `${normalizedType}_${event.timestamp || Date.now()}_${index}`
        );

        return {
          eventType: normalizedType,
          eventId,
          recipient: String(event.recipient || event.to || event.email || ''),
          subject: String(event.subject || ''),
          messageId: String(event.message_id || event.messageId || ''),
          timestamp: String(event.timestamp || event.created_at || event.date || ''),
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `email.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          recipient: ctx.input.recipient || '',
          subject: ctx.input.subject || '',
          messageId: ctx.input.messageId || '',
          timestamp: ctx.input.timestamp || ''
        }
      };
    }
  })
  .build();
