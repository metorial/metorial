import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let PAYMENT_EVENT_TYPES = ['payment.created', 'payment.updated'];

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description:
    'Triggered when payments are created or updated (completed, authorized, canceled, voided).'
})
  .input(
    z.object({
      eventType: z.string().describe('The Square event type'),
      eventId: z.string().describe('Unique event ID'),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawPayment: z.record(z.string(), z.any()).describe('Raw payment object from the webhook')
    })
  )
  .output(
    z.object({
      paymentId: z.string().optional(),
      status: z.string().optional(),
      amountMoney: z
        .object({ amount: z.number().optional(), currency: z.string().optional() })
        .optional(),
      totalMoney: z
        .object({ amount: z.number().optional(), currency: z.string().optional() })
        .optional(),
      sourceType: z.string().optional(),
      locationId: z.string().optional(),
      orderId: z.string().optional(),
      customerId: z.string().optional(),
      receiptUrl: z.string().optional(),
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
          name: 'Slates Payment Events',
          eventTypes: PAYMENT_EVENT_TYPES,
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

      if (!body?.type) {
        return { inputs: [] };
      }

      let payment = body.data?.object?.payment || body.data?.object || {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawPayment: payment
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.rawPayment as any;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          paymentId: p.id,
          status: p.status,
          amountMoney: p.amount_money,
          totalMoney: p.total_money,
          sourceType: p.source_type,
          locationId: p.location_id,
          orderId: p.order_id,
          customerId: p.customer_id,
          receiptUrl: p.receipt_url,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }
      };
    }
  })
  .build();
