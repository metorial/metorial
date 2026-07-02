import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let ECOMMERCE_TRIGGER_TYPES = [
  'ecomm_new_order',
  'ecomm_order_changed',
  'ecomm_inventory_changed'
] as const;

export let ecommerceEventsTrigger = SlateTrigger.create(spec, {
  name: 'Ecommerce Events',
  key: 'ecommerce_events',
  description:
    'Triggered on ecommerce activity: new orders, order status changes, and inventory changes on a Webflow site.'
})
  .input(
    z.object({
      triggerType: z.string().describe('Type of ecommerce event'),
      orderId: z.string().optional().describe('Order ID (for order events)'),
      itemId: z.string().optional().describe('Item ID (for inventory events)'),
      siteId: z.string().optional().describe('Site the event occurred on'),
      eventId: z.string().optional().describe('Unique event identifier'),
      rawPayload: z.any().optional().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      orderId: z.string().optional().describe('Order ID (for order events)'),
      itemId: z.string().optional().describe('Item ID (for inventory events)'),
      siteId: z.string().optional().describe('Site the event occurred on'),
      orderStatus: z.string().optional().describe('Order status (for order events)'),
      customerEmail: z.string().optional().describe('Customer email (for order events)'),
      totalPrice: z.any().optional().describe('Total price (for order events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.siteId) {
        throw new Error('siteId is required in config for automatic webhook registration');
      }
      let client = new WebflowClient(ctx.auth.token);
      let registeredWebhookIds: string[] = [];

      for (let triggerType of ECOMMERCE_TRIGGER_TYPES) {
        let webhook = await client.createWebhook(ctx.config.siteId, {
          triggerType,
          url: ctx.input.webhookBaseUrl
        });
        registeredWebhookIds.push(webhook.id ?? webhook._id);
      }

      return {
        registrationDetails: {
          webhookIds: registeredWebhookIds,
          siteId: ctx.config.siteId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebflowClient(ctx.auth.token);
      let webhookIds: string[] = ctx.input.registrationDetails.webhookIds ?? [];
      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be removed
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventId = data._id ?? data.id ?? crypto.randomUUID();

      return {
        inputs: [
          {
            triggerType: data.triggerType ?? 'ecommerce_event',
            orderId: data.orderId ?? data.order?.orderId ?? data.order?.id,
            itemId: data.itemId ?? data.item?.id,
            siteId: data.siteId ?? data.site,
            eventId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'ecommerce.event';
      if (ctx.input.triggerType === 'ecomm_new_order') eventType = 'ecommerce.order_created';
      else if (ctx.input.triggerType === 'ecomm_order_changed')
        eventType = 'ecommerce.order_changed';
      else if (ctx.input.triggerType === 'ecomm_inventory_changed')
        eventType = 'ecommerce.inventory_changed';

      let raw = ctx.input.rawPayload ?? {};
      let order = raw.order ?? raw;

      return {
        type: eventType,
        id: ctx.input.eventId ?? crypto.randomUUID(),
        output: {
          orderId: ctx.input.orderId,
          itemId: ctx.input.itemId,
          siteId: ctx.input.siteId,
          orderStatus: order.status,
          customerEmail: order.customerInfo?.email ?? order.customerEmail,
          totalPrice: order.totalPrice
        }
      };
    }
  })
  .build();
