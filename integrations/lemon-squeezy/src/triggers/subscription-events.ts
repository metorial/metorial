import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ALL_SUBSCRIPTION_EVENTS = [
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
  'subscription_paused',
  'subscription_unpaused'
];

export let subscriptionEventsTrigger = SlateTrigger.create(spec, {
  name: 'Subscription Events',
  key: 'subscription_events',
  description:
    'Triggers on subscription lifecycle events: created, updated, cancelled, resumed, expired, paused, and unpaused.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name'),
      subscriptionId: z.string().describe('The subscription resource ID'),
      storeId: z.number(),
      customerId: z.number(),
      orderId: z.number(),
      orderItemId: z.number(),
      productId: z.number(),
      variantId: z.number(),
      productName: z.string(),
      variantName: z.string(),
      userName: z.string(),
      userEmail: z.string(),
      status: z.string(),
      statusFormatted: z.string(),
      cardBrand: z.string().nullable(),
      cardLastFour: z.string().nullable(),
      pause: z.record(z.string(), z.unknown()).nullable(),
      cancelled: z.boolean(),
      trialEndsAt: z.string().nullable(),
      billingAnchor: z.number(),
      renewsAt: z.string().nullable(),
      endsAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      customData: z.record(z.string(), z.unknown()).nullable().optional()
    })
  )
  .output(
    z.object({
      subscriptionId: z.string(),
      storeId: z.number(),
      customerId: z.number(),
      orderId: z.number(),
      orderItemId: z.number(),
      productId: z.number(),
      variantId: z.number(),
      productName: z.string(),
      variantName: z.string(),
      userName: z.string(),
      userEmail: z.string(),
      status: z.string(),
      statusFormatted: z.string(),
      cardBrand: z.string().nullable(),
      cardLastFour: z.string().nullable(),
      pause: z.record(z.string(), z.unknown()).nullable(),
      cancelled: z.boolean(),
      trialEndsAt: z.string().nullable(),
      billingAnchor: z.number(),
      renewsAt: z.string().nullable(),
      endsAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      customData: z.record(z.string(), z.unknown()).nullable().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let storeId = ctx.config.storeId;

      if (!storeId) {
        let storesResponse = await client.listStores({ perPage: 1 });
        storeId = storesResponse.data?.[0]?.id;
        if (!storeId) throw new Error('No store found. Please configure a store ID.');
      }

      let secret = generateSecret();

      let response = await client.createWebhook(
        storeId,
        ctx.input.webhookBaseUrl,
        ALL_SUBSCRIPTION_EVENTS,
        secret
      );

      return {
        registrationDetails: {
          webhookId: response.data.id,
          secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.meta?.event_name;
      let data = body.data;

      if (!data || !ALL_SUBSCRIPTION_EVENTS.includes(eventName)) {
        return { inputs: [] };
      }

      let attrs = data.attributes;

      return {
        inputs: [
          {
            eventName,
            subscriptionId: data.id,
            storeId: attrs.store_id,
            customerId: attrs.customer_id,
            orderId: attrs.order_id,
            orderItemId: attrs.order_item_id,
            productId: attrs.product_id,
            variantId: attrs.variant_id,
            productName: attrs.product_name,
            variantName: attrs.variant_name,
            userName: attrs.user_name,
            userEmail: attrs.user_email,
            status: attrs.status,
            statusFormatted: attrs.status_formatted,
            cardBrand: attrs.card_brand,
            cardLastFour: attrs.card_last_four,
            pause: attrs.pause,
            cancelled: attrs.cancelled,
            trialEndsAt: attrs.trial_ends_at,
            billingAnchor: attrs.billing_anchor,
            renewsAt: attrs.renews_at,
            endsAt: attrs.ends_at,
            createdAt: attrs.created_at,
            updatedAt: attrs.updated_at,
            customData: body.meta?.custom_data || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventName, subscriptionId, ...rest } = ctx.input;

      return {
        type: eventName,
        id: `${eventName}_${subscriptionId}_${rest.updatedAt}`,
        output: {
          subscriptionId,
          ...rest
        }
      };
    }
  })
  .build();

let generateSecret = (): string => {
  let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
