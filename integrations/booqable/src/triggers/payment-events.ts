import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig } from '../lib/helpers';
import { spec } from '../spec';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description: 'Triggers when a payment is completed.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of payment event'),
      webhookId: z.string().describe('The webhook delivery ID'),
      paymentId: z.string().describe('The affected payment ID'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('The payment ID'),
      orderId: z.string().optional().describe('Associated order ID'),
      amountInCents: z.number().optional().describe('Payment amount in cents'),
      status: z.string().optional().describe('Payment status'),
      provider: z.string().optional().describe('Payment provider'),
      createdAt: z.string().optional().describe('Payment creation timestamp'),
      updatedAt: z.string().optional().describe('Payment last updated timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(buildClientConfig(ctx));

      let response = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        events: ['payment.completed'],
        version: 4
      });

      let endpointId = response?.data?.id;

      return {
        registrationDetails: {
          webhookEndpointId: endpointId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(buildClientConfig(ctx));
      let endpointId = ctx.input.registrationDetails?.webhookEndpointId;
      if (endpointId) {
        await client.deleteWebhookEndpoint(endpointId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data?.event || data?.type || 'payment.completed';
      let paymentId = data?.data?.id || data?.payment_id || data?.id || '';
      let webhookId = data?.webhook_id || data?.id || `${paymentId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            webhookId: String(webhookId),
            paymentId: String(paymentId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs =
        ctx.input.payload?.data?.attributes ||
        ctx.input.payload?.payment ||
        ctx.input.payload ||
        {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.webhookId,
        output: {
          paymentId: ctx.input.paymentId,
          orderId: attrs.order_id,
          amountInCents: attrs.amount_in_cents,
          status: attrs.status,
          provider: attrs.provider,
          createdAt: attrs.created_at,
          updatedAt: attrs.updated_at
        }
      };
    }
  })
  .build();
