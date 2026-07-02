import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { lemonSqueezyServiceError } from '../lib/errors';
import { spec } from '../spec';

let ALL_SUBSCRIPTION_PAYMENT_EVENTS = [
  'subscription_payment_success',
  'subscription_payment_failed',
  'subscription_payment_recovered',
  'subscription_payment_refunded'
];

export let subscriptionPaymentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Subscription Payment Events',
  key: 'subscription_payment_events',
  description:
    'Triggers on subscription payment events: successful payments, failures, recoveries, and refunds. Covers both initial payments and renewals.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name'),
      invoiceId: z.string().describe('The subscription invoice resource ID'),
      storeId: z.number(),
      subscriptionId: z.number(),
      billingReason: z.string(),
      cardBrand: z.string().nullable(),
      cardLastFour: z.string().nullable(),
      currency: z.string(),
      currencyRate: z.string(),
      subtotal: z.number(),
      discountTotal: z.number(),
      tax: z.number(),
      total: z.number(),
      subtotalFormatted: z.string(),
      discountTotalFormatted: z.string(),
      taxFormatted: z.string(),
      totalFormatted: z.string(),
      status: z.string(),
      statusFormatted: z.string(),
      refunded: z.boolean(),
      refundedAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      customData: z.record(z.string(), z.unknown()).nullable().optional()
    })
  )
  .output(
    z.object({
      invoiceId: z.string(),
      storeId: z.number(),
      subscriptionId: z.number(),
      billingReason: z.string(),
      cardBrand: z.string().nullable(),
      cardLastFour: z.string().nullable(),
      currency: z.string(),
      currencyRate: z.string(),
      subtotal: z.number(),
      discountTotal: z.number(),
      tax: z.number(),
      total: z.number(),
      subtotalFormatted: z.string(),
      discountTotalFormatted: z.string(),
      taxFormatted: z.string(),
      totalFormatted: z.string(),
      status: z.string(),
      statusFormatted: z.string(),
      refunded: z.boolean(),
      refundedAt: z.string().nullable(),
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
        if (!storeId) {
          throw lemonSqueezyServiceError('No store found. Please configure a store ID.');
        }
      }

      let secret = generateSecret();

      let response = await client.createWebhook(
        storeId,
        ctx.input.webhookBaseUrl,
        ALL_SUBSCRIPTION_PAYMENT_EVENTS,
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

      if (!data || !ALL_SUBSCRIPTION_PAYMENT_EVENTS.includes(eventName)) {
        return { inputs: [] };
      }

      let attrs = data.attributes;

      return {
        inputs: [
          {
            eventName,
            invoiceId: data.id,
            storeId: attrs.store_id,
            subscriptionId: attrs.subscription_id,
            billingReason: attrs.billing_reason,
            cardBrand: attrs.card_brand,
            cardLastFour: attrs.card_last_four,
            currency: attrs.currency,
            currencyRate: attrs.currency_rate,
            subtotal: attrs.subtotal,
            discountTotal: attrs.discount_total,
            tax: attrs.tax,
            total: attrs.total,
            subtotalFormatted: attrs.subtotal_formatted,
            discountTotalFormatted: attrs.discount_total_formatted,
            taxFormatted: attrs.tax_formatted,
            totalFormatted: attrs.total_formatted,
            status: attrs.status,
            statusFormatted: attrs.status_formatted,
            refunded: attrs.refunded,
            refundedAt: attrs.refunded_at,
            createdAt: attrs.created_at,
            updatedAt: attrs.updated_at,
            customData: body.meta?.custom_data || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventName, invoiceId, ...rest } = ctx.input;

      return {
        type: eventName,
        id: `${eventName}_${invoiceId}_${rest.updatedAt}`,
        output: {
          invoiceId,
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
