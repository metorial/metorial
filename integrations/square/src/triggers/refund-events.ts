import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let REFUND_EVENT_TYPES = ['refund.created', 'refund.updated'];

export let refundEvents = SlateTrigger.create(spec, {
  name: 'Refund Events',
  key: 'refund_events',
  description:
    'Triggered when refunds are created or updated (e.g., status changes upon completion).'
})
  .input(
    z.object({
      eventType: z.string(),
      eventId: z.string(),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawRefund: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      refundId: z.string().optional(),
      status: z.string().optional(),
      amountMoney: z
        .object({ amount: z.number().optional(), currency: z.string().optional() })
        .optional(),
      paymentId: z.string().optional(),
      orderId: z.string().optional(),
      locationId: z.string().optional(),
      reason: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let subscription = await client.createWebhookSubscription({
        idempotencyKey: crypto.randomUUID(),
        subscription: {
          name: 'Square Refund Events',
          eventTypes: REFUND_EVENT_TYPES,
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

      let refund = body.data?.object?.refund || body.data?.object || {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawRefund: refund
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let r = ctx.input.rawRefund as any;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          refundId: r.id,
          status: r.status,
          amountMoney: r.amount_money,
          paymentId: r.payment_id,
          orderId: r.order_id,
          locationId: r.location_id,
          reason: r.reason,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }
      };
    }
  })
  .build();
