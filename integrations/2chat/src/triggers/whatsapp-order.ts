import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let whatsappOrderTrigger = SlateTrigger.create(spec, {
  name: 'WhatsApp Order Received',
  key: 'whatsapp_order_received',
  description: 'Triggers when a new WhatsApp order is received from a customer.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      eventId: z.string().describe('Unique identifier for this event'),
      fromNumber: z.string().optional().describe('Customer phone number'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      orderItems: z.array(z.any()).optional().describe('Items in the order'),
      orderText: z.string().optional().describe('Order message text'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      fromNumber: z.string().optional().describe('Customer phone number'),
      onNumber: z.string().optional().describe('Connected WhatsApp number'),
      orderItems: z.array(z.any()).optional().describe('Items in the order'),
      orderText: z.string().optional().describe('Order message text'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });

      let numbersResult = await client.listWhatsAppNumbers();
      let numbers = numbersResult.numbers || numbersResult.data || [];

      let registrations: Array<{ webhookUuid: string; event: string; onNumber: string }> = [];

      for (let num of numbers) {
        let phoneNumber = num.phone_number || num.number;
        if (!phoneNumber) continue;

        try {
          let result = await client.subscribeWebhook({
            hookUrl: ctx.input.webhookBaseUrl,
            onNumber: phoneNumber,
            event: 'whatsapp.order.received'
          });
          registrations.push({
            webhookUuid: result.uuid || result.webhook_uuid || result.id,
            event: 'whatsapp.order.received',
            onNumber: phoneNumber
          });
        } catch (_e) {
          // May not be supported for all number types
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TwoChatClient({ token: ctx.auth.token });
      let registrations = ctx.input.registrationDetails?.registrations || [];

      for (let reg of registrations) {
        try {
          if (reg.webhookUuid) {
            await client.deleteWebhook(reg.webhookUuid);
          }
        } catch (_e) {
          // Best-effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let order = data.order || data.payload || data;
      let msg = data.message || {};

      return {
        inputs: [
          {
            eventType: data.event || 'whatsapp.order.received',
            eventId: order.uuid || order.id || `order-${Date.now()}`,
            fromNumber: msg.from_number || msg.from || data.from_number || order.from_number,
            onNumber: data.on_number || data.channel_number,
            orderItems: order.items || order.product_items || [],
            orderText: msg.text || msg.body || order.text,
            timestamp: order.timestamp || msg.sent_at || data.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'whatsapp_order.received',
        id: ctx.input.eventId,
        output: {
          fromNumber: ctx.input.fromNumber,
          onNumber: ctx.input.onNumber,
          orderItems: ctx.input.orderItems,
          orderText: ctx.input.orderText,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
