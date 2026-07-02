import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ALL_ORDER_EVENTS = ['order_created', 'order_refunded'];

export let orderEventsTrigger = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description: 'Triggers when an order is created or refunded in your Lemon Squeezy store.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name'),
      orderId: z.string().describe('The order resource ID'),
      storeId: z.number(),
      customerId: z.number(),
      identifier: z.string(),
      orderNumber: z.number(),
      userName: z.string(),
      userEmail: z.string(),
      currency: z.string(),
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
      orderId: z.string(),
      storeId: z.number(),
      customerId: z.number(),
      identifier: z.string(),
      orderNumber: z.number(),
      userName: z.string(),
      userEmail: z.string(),
      currency: z.string(),
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
        if (!storeId) throw new Error('No store found. Please configure a store ID.');
      }

      let secret = generateSecret();

      let response = await client.createWebhook(
        storeId,
        ctx.input.webhookBaseUrl,
        ALL_ORDER_EVENTS,
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

      if (!data || !ALL_ORDER_EVENTS.includes(eventName)) {
        return { inputs: [] };
      }

      let attrs = data.attributes;

      return {
        inputs: [
          {
            eventName,
            orderId: data.id,
            storeId: attrs.store_id,
            customerId: attrs.customer_id,
            identifier: attrs.identifier,
            orderNumber: attrs.order_number,
            userName: attrs.user_name,
            userEmail: attrs.user_email,
            currency: attrs.currency,
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
      let { eventName, orderId, ...rest } = ctx.input;

      return {
        type: eventName,
        id: `${eventName}_${orderId}_${rest.updatedAt}`,
        output: {
          orderId,
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
