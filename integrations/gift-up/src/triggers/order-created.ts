import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderCreatedTrigger = SlateTrigger.create(spec, {
  name: 'Order Created',
  key: 'order_created',
  description:
    'Fires when a new order is placed in the Gift Up! checkout or created via the API.'
})
  .input(
    z
      .object({
        orderId: z.string().describe('Order ID'),
        orderNumber: z.string().describe('Order number'),
        createdOn: z.string().describe('Creation date'),
        purchaserEmail: z.string().describe('Purchaser email'),
        purchaserName: z.string().describe('Purchaser name'),
        revenue: z.number().describe('Order revenue'),
        currency: z.string().describe('Currency code'),
        tip: z.number().nullable().describe('Tip amount'),
        serviceFee: z.number().nullable().describe('Service fee'),
        discount: z.number().nullable().describe('Discount applied'),
        selectedRecipient: z.string().nullable().describe('Recipient selection type'),
        giftCards: z
          .array(
            z
              .object({
                code: z.string(),
                title: z.string().nullable(),
                canBeRedeemed: z.boolean(),
                remainingValue: z.number(),
                initialValue: z.number()
              })
              .passthrough()
          )
          .nullable()
          .describe('Gift cards in the order'),
        customFields: z
          .array(
            z.object({
              label: z.string(),
              value: z.any()
            })
          )
          .nullable()
          .describe('Custom fields'),
        salesTaxes: z
          .array(
            z.object({
              label: z.string(),
              amount: z.number(),
              type: z.string()
            })
          )
          .nullable()
          .describe('Sales taxes'),
        metadata: z.record(z.string(), z.string()).nullable().describe('Metadata')
      })
      .passthrough()
  )
  .output(
    z
      .object({
        orderId: z.string().describe('Order ID'),
        orderNumber: z.string().describe('Order number'),
        createdOn: z.string().describe('Creation date'),
        purchaserEmail: z.string().describe('Purchaser email'),
        purchaserName: z.string().describe('Purchaser name'),
        revenue: z.number().describe('Order revenue'),
        currency: z.string().describe('Currency code'),
        tip: z.number().nullable().describe('Tip amount'),
        serviceFee: z.number().nullable().describe('Service fee'),
        discount: z.number().nullable().describe('Discount applied'),
        selectedRecipient: z.string().nullable().describe('Recipient selection type'),
        giftCards: z
          .array(
            z
              .object({
                code: z.string(),
                title: z.string().nullable(),
                canBeRedeemed: z.boolean(),
                remainingValue: z.number(),
                initialValue: z.number()
              })
              .passthrough()
          )
          .nullable()
          .describe('Gift cards in the order'),
        customFields: z
          .array(
            z.object({
              label: z.string(),
              value: z.any()
            })
          )
          .nullable()
          .describe('Custom fields'),
        salesTaxes: z
          .array(
            z.object({
              label: z.string(),
              amount: z.number(),
              type: z.string()
            })
          )
          .nullable()
          .describe('Sales taxes'),
        metadata: z.record(z.string(), z.string()).nullable().describe('Metadata')
      })
      .passthrough()
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        testMode: ctx.config.testMode
      });

      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        eventType: 'OrderCreated',
        testMode: ctx.config.testMode
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        testMode: ctx.config.testMode
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Gift Up! sends a test payload { "test": true } during webhook registration verification
      if (body.test === true) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            orderId: body.id,
            orderNumber: body.orderNumber,
            createdOn: body.createdOn,
            purchaserEmail: body.purchaserEmail,
            purchaserName: body.purchaserName,
            revenue: body.revenue ?? 0,
            currency: body.currency ?? '',
            tip: body.tip ?? null,
            serviceFee: body.serviceFee ?? null,
            discount: body.discount ?? null,
            selectedRecipient: body.selectedRecipient ?? null,
            giftCards: body.giftCards ?? null,
            customFields: body.customFields ?? null,
            salesTaxes: body.salesTaxes ?? null,
            metadata: body.metadata ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'order.created',
        id: ctx.input.orderId,
        output: ctx.input
      };
    }
  })
  .build();
