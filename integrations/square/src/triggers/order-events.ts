import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let ORDER_EVENT_TYPES = ['order.created', 'order.updated', 'order.fulfillment.updated'];

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description:
    'Triggered when orders are created or updated, and when order fulfillments change.'
})
  .input(
    z.object({
      eventType: z.string(),
      eventId: z.string(),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawOrder: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      orderId: z.string().optional(),
      locationId: z.string().optional(),
      state: z.string().optional(),
      customerId: z.string().optional(),
      totalMoney: z
        .object({ amount: z.number().optional(), currency: z.string().optional() })
        .optional(),
      fulfillmentState: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      version: z.number().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let subscription = await client.createWebhookSubscription({
        idempotencyKey: crypto.randomUUID(),
        subscription: {
          name: 'Square Order Events',
          eventTypes: ORDER_EVENT_TYPES,
          notificationUrl: ctx.input.webhookBaseUrl
        }
      });
      return { registrationDetails: { subscriptionId: subscription.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.deleteWebhookSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      if (!body?.type) return { inputs: [] };

      let order = body.data?.object?.order || body.data?.object || {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawOrder: order
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let o = ctx.input.rawOrder as any;
      let fulfillments = o.fulfillments || [];
      let latestFulfillment = fulfillments[fulfillments.length - 1];

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          orderId: o.id,
          locationId: o.location_id,
          state: o.state,
          customerId: o.customer_id,
          totalMoney: o.total_money,
          fulfillmentState: latestFulfillment?.state,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
          version: o.version
        }
      };
    }
  })
  .build();
