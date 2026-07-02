import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let whatsappEvents = SlateTrigger.create(spec, {
  name: 'WhatsApp Events',
  key: 'whatsapp_events',
  description:
    'Receive WhatsApp delivery status updates and inbound messages. Configure the webhook URL via the delivery report URL when sending messages, or in the Mocean dashboard for inbound messages.'
})
  .input(
    z.object({
      eventType: z
        .enum(['delivery_status', 'inbound_message'])
        .describe('Type of WhatsApp event'),
      messageId: z.string().describe('Message identifier'),
      from: z.string().optional().describe('Sender phone number'),
      to: z.string().optional().describe('Recipient / WABA phone number'),
      deliveryStatus: z
        .string()
        .optional()
        .describe('Delivery status: sent, delivered, read, failed'),
      timestamp: z.number().optional().describe('Unix timestamp of the event'),
      pricingType: z.string().optional().describe('Meta pricing type'),
      pricingCategory: z.string().optional().describe('Meta pricing category'),
      fromName: z.string().optional().describe('Sender WhatsApp profile name'),
      contentType: z.string().optional().describe('Inbound message content type'),
      contentText: z.string().optional().describe('Message text content'),
      mediaId: z.string().optional().describe('Media ID for rich media messages'),
      mimeType: z.string().optional().describe('MIME type of media'),
      forwarded: z.boolean().optional().describe('Whether the message was forwarded')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message identifier'),
      from: z.string().optional().describe('Sender phone number'),
      to: z.string().optional().describe('Recipient / WABA phone number'),
      deliveryStatus: z
        .string()
        .optional()
        .describe('Delivery status: sent, delivered, read, failed'),
      fromName: z.string().optional().describe('Sender WhatsApp profile name'),
      contentType: z.string().optional().describe('Message content type'),
      contentText: z.string().optional().describe('Message text content or caption'),
      mediaId: z.string().optional().describe('Media ID for downloading rich media'),
      mimeType: z.string().optional().describe('MIME type of media content'),
      forwarded: z.boolean().optional().describe('Whether the message was forwarded'),
      timestamp: z.string().optional().describe('Event timestamp'),
      pricingType: z.string().optional().describe('Meta pricing type'),
      pricingCategory: z.string().optional().describe('Meta pricing category')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;

      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body?.event_type) {
        return { inputs: [] };
      }

      if (body.event_type === 'delivery-status') {
        let eventData = body.event_data || {};
        return {
          inputs: [
            {
              eventType: 'delivery_status' as const,
              messageId: body.message_id || '',
              from: eventData.from,
              to: eventData.to,
              deliveryStatus: eventData.meta_delivery_status,
              timestamp: eventData.timestamp,
              pricingType: eventData.meta_whatsapp_pricing?.pricing_type,
              pricingCategory: eventData.meta_whatsapp_pricing?.pricing_category
            }
          ]
        };
      }

      if (body.event_type === 'message') {
        let eventData = body.event_data || {};
        let content = eventData.content || {};
        return {
          inputs: [
            {
              eventType: 'inbound_message' as const,
              messageId: body.message_id || '',
              from: eventData.from,
              to: eventData.to,
              fromName: eventData.from_name,
              contentType: content.type,
              contentText: content.text,
              mediaId: content.media_id,
              mimeType: content.mime_type,
              forwarded: eventData.forwarded,
              timestamp: eventData.timestamp
            }
          ]
        };
      }

      return { inputs: [] };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      if (input.eventType === 'delivery_status') {
        return {
          type: 'whatsapp.delivery_status',
          id: `wa_dlr_${input.messageId}_${input.deliveryStatus}`,
          output: {
            messageId: input.messageId,
            from: input.from,
            to: input.to,
            deliveryStatus: input.deliveryStatus,
            timestamp: input.timestamp !== undefined ? String(input.timestamp) : undefined,
            pricingType: input.pricingType,
            pricingCategory: input.pricingCategory
          }
        };
      }

      return {
        type: 'whatsapp.inbound',
        id: input.messageId,
        output: {
          messageId: input.messageId,
          from: input.from,
          to: input.to,
          fromName: input.fromName,
          contentType: input.contentType,
          contentText: input.contentText,
          mediaId: input.mediaId,
          mimeType: input.mimeType,
          forwarded: input.forwarded,
          timestamp: input.timestamp !== undefined ? String(input.timestamp) : undefined
        }
      };
    }
  })
  .build();
