import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let LOYALTY_EVENT_TYPES = [
  'loyalty.account.created',
  'loyalty.account.updated',
  'loyalty.event.created',
  'loyalty.program.created',
  'loyalty.program.updated',
  'loyalty.promotion.created',
  'loyalty.promotion.updated'
];

export let loyaltyEvents = SlateTrigger.create(spec, {
  name: 'Loyalty Events',
  key: 'loyalty_events',
  description:
    'Triggered for loyalty account changes, loyalty events, and loyalty program/promotion changes.'
})
  .input(
    z.object({
      eventType: z.string(),
      eventId: z.string(),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawLoyalty: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      loyaltyAccountId: z.string().optional(),
      loyaltyProgramId: z.string().optional(),
      loyaltyEventId: z.string().optional(),
      customerId: z.string().optional(),
      balance: z.number().optional(),
      lifetimePoints: z.number().optional(),
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
          name: 'Slates Loyalty Events',
          eventTypes: LOYALTY_EVENT_TYPES,
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

      let data =
        body.data?.object?.loyalty_account ||
        body.data?.object?.loyalty_event ||
        body.data?.object?.loyalty_program ||
        body.data?.object?.loyalty_promotion ||
        body.data?.object ||
        {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawLoyalty: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let l = ctx.input.rawLoyalty as any;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          loyaltyAccountId: l.id || l.loyalty_account_id,
          loyaltyProgramId: l.program_id,
          loyaltyEventId: ctx.input.eventType.includes('event') ? l.id : undefined,
          customerId: l.customer_id,
          balance: l.balance,
          lifetimePoints: l.lifetime_points,
          createdAt: l.created_at,
          updatedAt: l.updated_at
        }
      };
    }
  })
  .build();
