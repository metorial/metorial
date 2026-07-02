import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

let PAYMENT_EVENT_TYPES = [
  'PAYMENT.AUTHORIZATION.CREATED',
  'PAYMENT.AUTHORIZATION.VOIDED',
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.CAPTURE.DENIED',
  'PAYMENT.CAPTURE.PENDING',
  'PAYMENT.CAPTURE.REFUNDED',
  'PAYMENT.CAPTURE.REVERSED',
  'PAYMENT.SALE.COMPLETED',
  'PAYMENT.SALE.DENIED',
  'PAYMENT.SALE.PENDING',
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED'
];

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description:
    'Triggers on payment lifecycle events including authorizations, captures, refunds, and reversals.'
})
  .input(
    z.object({
      eventId: z.string().describe('PayPal webhook event ID'),
      eventType: z.string().describe('Event type (e.g. PAYMENT.CAPTURE.COMPLETED)'),
      resourceType: z.string().optional().describe('Resource type'),
      resource: z.any().describe('Full event resource payload'),
      createTime: z.string().optional().describe('Event creation time')
    })
  )
  .output(
    z.object({
      resourceId: z
        .string()
        .describe('Payment resource ID (authorization, capture, sale, or refund ID)'),
      status: z.string().optional().describe('Resource status'),
      currencyCode: z.string().optional().describe('Currency code'),
      amount: z.string().optional().describe('Payment amount'),
      parentPaymentId: z.string().optional().describe('Parent payment or order ID'),
      payerEmail: z.string().optional().describe('Payer email if available'),
      createTime: z.string().optional().describe('Resource creation time'),
      resource: z.any().optional().describe('Full resource details')
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
        eventTypes: PAYMENT_EVENT_TYPES
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
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
            resourceType: data.resource_type,
            resource: data.resource,
            createTime: data.create_time
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.resource || {};
      let eventType = ctx.input.eventType.toLowerCase().replace(/\./g, '.');

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          resourceId: resource.id,
          status: resource.status || resource.state,
          currencyCode: resource.amount?.currency_code || resource.amount?.currency,
          amount: resource.amount?.value || resource.amount?.total,
          parentPaymentId:
            resource.parent_payment || resource.supplementary_data?.related_ids?.order_id,
          payerEmail: resource.payer?.email_address,
          createTime: resource.create_time,
          resource
        }
      };
    }
  })
  .build();
