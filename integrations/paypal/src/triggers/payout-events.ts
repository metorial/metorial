import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

let PAYOUT_EVENT_TYPES = [
  'PAYMENT.PAYOUTSBATCH.PROCESSING',
  'PAYMENT.PAYOUTSBATCH.SUCCESS',
  'PAYMENT.PAYOUTSBATCH.DENIED',
  'PAYMENT.PAYOUTS-ITEM.BLOCKED',
  'PAYMENT.PAYOUTS-ITEM.CANCELED',
  'PAYMENT.PAYOUTS-ITEM.DENIED',
  'PAYMENT.PAYOUTS-ITEM.FAILED',
  'PAYMENT.PAYOUTS-ITEM.HELD',
  'PAYMENT.PAYOUTS-ITEM.REFUNDED',
  'PAYMENT.PAYOUTS-ITEM.RETURNED',
  'PAYMENT.PAYOUTS-ITEM.SUCCEEDED',
  'PAYMENT.PAYOUTS-ITEM.UNCLAIMED'
];

export let payoutEvents = SlateTrigger.create(spec, {
  name: 'Payout Events',
  key: 'payout_events',
  description:
    'Triggers on payout batch and item events including processing, success, denied, blocked, cancelled, held, and more.'
})
  .input(
    z.object({
      eventId: z.string().describe('PayPal webhook event ID'),
      eventType: z.string().describe('Event type'),
      resourceType: z.string().optional().describe('Resource type'),
      resource: z.any().describe('Full event resource payload'),
      createTime: z.string().optional().describe('Event creation time')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('Payout batch ID or item ID'),
      resourceType: z.string().optional().describe('Resource type (batch or item)'),
      status: z.string().optional().describe('Payout status'),
      senderBatchId: z.string().optional().describe('Sender batch ID'),
      receiver: z.string().optional().describe('Payout recipient'),
      currencyCode: z.string().optional().describe('Currency code'),
      amount: z.string().optional().describe('Payout amount'),
      resource: z.any().optional().describe('Full payout resource')
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
        eventTypes: PAYOUT_EVENT_TYPES
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
            resourceType: data.resource_type,
            resource: data.resource,
            createTime: data.create_time
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let resource = ctx.input.resource || {};
      let isBatch = ctx.input.eventType.includes('PAYOUTSBATCH');

      return {
        type: ctx.input.eventType.toLowerCase().replace(/\./g, '.'),
        id: ctx.input.eventId,
        output: {
          resourceId: isBatch
            ? resource.batch_header?.payout_batch_id
            : resource.payout_item_id,
          resourceType: isBatch ? 'batch' : 'item',
          status: isBatch ? resource.batch_header?.batch_status : resource.transaction_status,
          senderBatchId: isBatch
            ? resource.batch_header?.sender_batch_header?.sender_batch_id
            : resource.payout_batch_id,
          receiver: resource.payout_item?.receiver,
          currencyCode: isBatch
            ? resource.batch_header?.amount?.currency
            : resource.payout_item?.amount?.currency,
          amount: isBatch
            ? resource.batch_header?.amount?.value
            : resource.payout_item?.amount?.value,
          resource
        }
      };
    }
  })
  .build();
