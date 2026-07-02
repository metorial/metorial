import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let messageDelivery = SlateTrigger.create(spec, {
  name: 'Message Delivery & Read',
  key: 'message_delivery_read',
  description:
    'Triggered when a message sent by the Page is delivered to or read by the user. Useful for tracking message delivery status and read receipts.'
})
  .input(
    z.object({
      eventType: z.enum(['delivery', 'read']).describe('Type of event'),
      eventId: z.string().describe('Unique event identifier'),
      senderId: z.string().describe('PSID of the user'),
      recipientId: z.string().describe('Page ID'),
      timestamp: z.string().describe('Event timestamp'),
      watermark: z
        .string()
        .describe('Timestamp watermark — all messages before this were delivered/read'),
      messageIds: z
        .array(z.string())
        .optional()
        .describe('IDs of delivered messages (delivery only)')
    })
  )
  .output(
    z.object({
      senderId: z.string().describe('PSID of the user'),
      recipientPageId: z.string().describe('Page ID'),
      timestamp: z.string().describe('Event timestamp'),
      watermark: z
        .string()
        .describe('Timestamp watermark — all messages before this were delivered/read'),
      messageIds: z
        .array(z.string())
        .optional()
        .describe('IDs of delivered messages (delivery events only)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let request = ctx.request;

      if (request.method === 'GET') {
        return { inputs: [] };
      }

      let body = (await request.json()) as any;

      if (body.object !== 'page') {
        return { inputs: [] };
      }

      let inputs: any[] = [];

      for (let entry of body.entry || []) {
        let pageId = entry.id as string;

        for (let messagingEvent of entry.messaging || []) {
          let senderId = messagingEvent.sender?.id as string;
          let recipientId = (messagingEvent.recipient?.id as string) || pageId;
          let timestamp = String(messagingEvent.timestamp || Date.now());

          if (messagingEvent.delivery) {
            let delivery = messagingEvent.delivery;
            inputs.push({
              eventType: 'delivery' as const,
              eventId: `del_${delivery.watermark}_${senderId}`,
              senderId,
              recipientId,
              timestamp,
              watermark: String(delivery.watermark),
              messageIds: delivery.mids
            });
          }

          if (messagingEvent.read) {
            let read = messagingEvent.read;
            inputs.push({
              eventType: 'read' as const,
              eventId: `read_${read.watermark}_${senderId}`,
              senderId,
              recipientId,
              timestamp,
              watermark: String(read.watermark)
            });
          }
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let { input } = ctx;

      return {
        type: `message.${input.eventType}`,
        id: input.eventId,
        output: {
          senderId: input.senderId,
          recipientPageId: input.recipientId,
          timestamp: input.timestamp,
          watermark: input.watermark,
          messageIds: input.messageIds
        }
      };
    }
  })
  .build();
