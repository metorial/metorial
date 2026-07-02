import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

let DISPUTE_EVENT_TYPES = [
  'CUSTOMER.DISPUTE.CREATED',
  'CUSTOMER.DISPUTE.UPDATED',
  'CUSTOMER.DISPUTE.RESOLVED'
];

export let disputeEvents = SlateTrigger.create(spec, {
  name: 'Dispute Events',
  key: 'dispute_events',
  description: 'Triggers when customer disputes are created, updated, or resolved.'
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
      disputeId: z.string().describe('PayPal dispute ID'),
      status: z.string().optional().describe('Dispute status'),
      reason: z.string().optional().describe('Dispute reason'),
      disputeAmount: z.string().optional().describe('Disputed amount'),
      currencyCode: z.string().optional().describe('Currency code'),
      transactionId: z.string().optional().describe('Disputed transaction ID'),
      createTime: z.string().optional().describe('Dispute creation time'),
      resource: z.any().optional().describe('Full dispute resource')
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
        eventTypes: DISPUTE_EVENT_TYPES
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
      let transaction = resource.disputed_transactions?.[0];

      return {
        type: ctx.input.eventType.toLowerCase().replace(/\./g, '.'),
        id: ctx.input.eventId,
        output: {
          disputeId: resource.dispute_id,
          status: resource.status,
          reason: resource.reason,
          disputeAmount: resource.dispute_amount?.value,
          currencyCode: resource.dispute_amount?.currency_code,
          transactionId:
            transaction?.buyer_transaction_id || transaction?.seller_transaction_id,
          createTime: resource.create_time,
          resource
        }
      };
    }
  })
  .build();
