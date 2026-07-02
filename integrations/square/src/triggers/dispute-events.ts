import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let DISPUTE_EVENT_TYPES = [
  'dispute.created',
  'dispute.state.updated',
  'dispute.evidence.created',
  'dispute.evidence.deleted'
];

export let disputeEvents = SlateTrigger.create(spec, {
  name: 'Dispute Events',
  key: 'dispute_events',
  description:
    'Triggered when disputes (chargebacks) are created, evidence is added/removed, or dispute state changes.'
})
  .input(
    z.object({
      eventType: z.string(),
      eventId: z.string(),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawDispute: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      disputeId: z.string().optional(),
      state: z.string().optional(),
      reason: z.string().optional(),
      disputedPaymentId: z.string().optional(),
      locationId: z.string().optional(),
      amountMoney: z
        .object({ amount: z.number().optional(), currency: z.string().optional() })
        .optional(),
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
          name: 'Square Dispute Events',
          eventTypes: DISPUTE_EVENT_TYPES,
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

      let dispute = body.data?.object?.dispute || body.data?.object || {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawDispute: dispute
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let d = ctx.input.rawDispute as any;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          disputeId: d.dispute_id || d.id,
          state: d.state,
          reason: d.reason,
          disputedPaymentId:
            d.disputed_payment?.payment_id || d.disputed_payments?.[0]?.payment_id,
          locationId: d.location_id,
          amountMoney: d.amount_money,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }
      };
    }
  })
  .build();
