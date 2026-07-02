import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

let ORDER_EVENT_TYPES = [
  'CHECKOUT.ORDER.APPROVED',
  'CHECKOUT.ORDER.COMPLETED',
  'CHECKOUT.ORDER.PROCESSED',
  'CHECKOUT.PAYMENT-APPROVAL.REVERSED'
];

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description:
    'Triggers on checkout order lifecycle events: approved, completed, processed, and payment approval reversed.'
})
  .input(
    z.object({
      eventId: z.string().describe('PayPal webhook event ID'),
      eventType: z.string().describe('Event type'),
      resource: z.any().describe('Full event resource payload'),
      createTime: z.string().optional().describe('Event creation time')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('PayPal order ID'),
      status: z.string().optional().describe('Order status'),
      intent: z.string().optional().describe('Order intent'),
      currencyCode: z.string().optional().describe('Currency code'),
      totalAmount: z.string().optional().describe('Order total'),
      payerEmail: z.string().optional().describe('Payer email'),
      payerId: z.string().optional().describe('PayPal payer ID'),
      createTime: z.string().optional().describe('Order creation time'),
      resource: z.any().optional().describe('Full order resource')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PayPalClient({
        token: ctx.auth.token,
        clientId: ctx.auth.clientId,
        clientSecret: ctx.auth.clientSecret,
        environment: ctx.auth.environment
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        eventTypes: ORDER_EVENT_TYPES
      });

      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PayPalClient({
        token: ctx.auth.token,
        clientId: ctx.auth.clientId,
        clientSecret: ctx.auth.clientSecret,
        environment: ctx.auth.environment
      });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      return {
        inputs: [
          {
            eventId: data.id,
            eventType: data.event_type,
            resource: data.resource,
            createTime: data.create_time
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.resource || {};
      let purchaseUnit = (resource.purchase_units || [])[0];

      return {
        type: ctx.input.eventType.toLowerCase().replace(/\./g, '.'),
        id: ctx.input.eventId,
        output: {
          orderId: resource.id,
          status: resource.status,
          intent: resource.intent,
          currencyCode: purchaseUnit?.amount?.currency_code,
          totalAmount: purchaseUnit?.amount?.value,
          payerEmail: resource.payer?.email_address,
          payerId: resource.payer?.payer_id,
          createTime: resource.create_time,
          resource
        }
      };
    }
  })
  .build();
