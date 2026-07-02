import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buyerSchema,
  couponSchema,
  customFieldSchema,
  mapBuyer,
  mapCustomFields,
  mapProduct,
  productSchema
} from '../lib/schemas';
import { spec } from '../spec';

let webhookPayloadSchema = z.object({
  event: z.string(),
  data: z.any()
});

export let subscriptionCancellationTrigger = SlateTrigger.create(spec, {
  name: 'Subscription Cancellation',
  key: 'subscription_cancellation',
  description:
    'Triggers when a subscriber cancels their subscription to a subscription product. Includes subscription details, cancellation dates, buyer info, and referrer data.'
})
  .input(webhookPayloadSchema)
  .output(
    z.object({
      subscriptionId: z.string().describe('Stripe subscription ID'),
      createdAt: z.string().describe('Subscription creation timestamp'),
      cancelAt: z.string().nullable().describe('Scheduled cancellation date'),
      canceledAt: z.string().nullable().describe('Actual cancellation date'),
      trialEnd: z.string().nullable().describe('Trial period end date'),
      trialStart: z.string().nullable().describe('Trial period start date'),
      currency: z.string().describe('Currency code'),
      amount: z.number().describe('Subscription amount'),
      interval: z.string().describe('Billing interval'),
      intervalCount: z.number().describe('Interval multiplier'),
      status: z.string().describe('Subscription status at time of cancellation'),
      product: productSchema.describe('Subscription product'),
      buyer: buyerSchema.describe('Subscriber information'),
      coupon: couponSchema.nullable().describe('Applied coupon'),
      customFields: z.array(customFieldSchema).describe('Custom checkout fields'),
      referrerEmail: z.string().nullable().describe('Referring affiliate email')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.subscribeWebhook('cancel', ctx.input.webhookBaseUrl);
      return {
        registrationDetails: {
          webhookUrl: result.webhook,
          signingSecret: result.signing_secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.unsubscribeWebhook(ctx.input.registrationDetails.webhookUrl as string);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as { event: string; data: unknown };
      return {
        inputs: [body]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.data as Record<string, unknown>;

      let buyer = mapBuyer((data.buyer || {}) as Record<string, unknown>);
      let product = mapProduct((data.product || {}) as Record<string, unknown>);
      let customFields = mapCustomFields(
        data.custom_fields as Record<string, unknown>[] | undefined
      );

      let couponData = data.coupon as Record<string, unknown> | null;
      let coupon = couponData
        ? {
            code: couponData.code as string,
            type: couponData.type as string,
            amount: couponData.amount as number
          }
        : null;

      let referrer = data.referrer as Record<string, unknown> | null;

      return {
        type: 'subscription.canceled',
        id: `${data.subscription_id}-cancel-${data.canceled_at || data.cancel_at}`,
        output: {
          subscriptionId: data.subscription_id as string,
          createdAt: data.created_at as string,
          cancelAt: (data.cancel_at as string | null) ?? null,
          canceledAt: (data.canceled_at as string | null) ?? null,
          trialEnd: (data.trial_end as string | null) ?? null,
          trialStart: (data.trial_start as string | null) ?? null,
          currency: data.currency as string,
          amount: data.amount as number,
          interval: data.interval as string,
          intervalCount: data.interval_count as number,
          status: data.status as string,
          product,
          buyer,
          coupon,
          customFields,
          referrerEmail: referrer ? (referrer.email as string) : null
        }
      };
    }
  })
  .build();
