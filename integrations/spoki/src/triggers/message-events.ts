import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when a WhatsApp message is sent or received in Spoki, and when message statuses change (e.g., delivered, read).'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of message event'),
      eventId: z.string().describe('Unique event identifier'),
      messageId: z.string().optional().describe('ID of the message'),
      contactId: z.string().optional().describe('ID of the related contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      direction: z.string().optional().describe('Message direction (inbound or outbound)'),
      status: z.string().optional().describe('Message status (sent, delivered, read, etc.)'),
      messageText: z.string().optional().describe('Text content of the message'),
      messageType: z
        .string()
        .optional()
        .describe('Type of message (text, image, template, etc.)'),
      timestamp: z.string().optional().describe('When the message event occurred'),
      payload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('Message ID'),
      contactId: z.string().optional().describe('Contact ID'),
      phone: z.string().optional().describe('Phone number'),
      direction: z.string().optional().describe('Message direction'),
      status: z.string().optional().describe('Message status'),
      messageText: z.string().optional().describe('Message text content'),
      messageType: z.string().optional().describe('Message type'),
      timestamp: z.string().optional().describe('Event timestamp')
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

      let eventType = data?.event || data?.type || data?.event_type || 'unknown';
      let message = data?.message || data?.data || data;

      let eventTypeMap: Record<string, string> = {
        message_sent: 'message.sent',
        message_received: 'message.received',
        message_delivered: 'message.delivered',
        message_read: 'message.read',
        message_failed: 'message.failed'
      };

      let normalizedType = eventTypeMap[eventType] || `message.${eventType}`;
      let messageId = message?.id
        ? String(message.id)
        : data?.message_id
          ? String(data.message_id)
          : undefined;
      let eventId = data?.id
        ? String(data.id)
        : `${normalizedType}-${messageId || ''}-${Date.now()}`;

      let direction: string | undefined;
      if (normalizedType === 'message.received') {
        direction = 'inbound';
      } else if (
        normalizedType === 'message.sent' ||
        normalizedType === 'message.delivered' ||
        normalizedType === 'message.read'
      ) {
        direction = 'outbound';
      } else {
        direction = message?.direction || data?.direction;
      }

      return {
        inputs: [
          {
            eventType: normalizedType,
            eventId,
            messageId,
            contactId: message?.contact_id
              ? String(message.contact_id)
              : data?.contact_id
                ? String(data.contact_id)
                : undefined,
            phone: message?.phone || data?.phone || message?.from || message?.to,
            direction,
            status: message?.status || data?.status,
            messageText: message?.text || message?.body || message?.message || data?.text,
            messageType: message?.type || message?.message_type || data?.message_type,
            timestamp: message?.timestamp || data?.timestamp || data?.created_at,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          messageId: ctx.input.messageId,
          contactId: ctx.input.contactId,
          phone: ctx.input.phone,
          direction: ctx.input.direction,
          status: ctx.input.status,
          messageText: ctx.input.messageText,
          messageType: ctx.input.messageType,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
