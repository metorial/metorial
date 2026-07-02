import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let transactionEvents = SlateTrigger.create(spec, {
  name: 'Transaction Events',
  key: 'transaction_events',
  description:
    'Triggered when a transaction (label) is created or updated. Covers both transaction_created and transaction_updated events.'
})
  .input(
    z.object({
      eventType: z
        .enum(['transaction_created', 'transaction_updated'])
        .describe('Type of transaction event'),
      transactionPayload: z.any().describe('Full transaction object from Shippo')
    })
  )
  .output(
    z.object({
      transactionId: z.string().optional(),
      status: z
        .string()
        .optional()
        .describe('Transaction status: SUCCESS, ERROR, QUEUED, WAITING'),
      trackingNumber: z.string().optional(),
      labelUrl: z.string().optional(),
      commercialInvoiceUrl: z.string().optional(),
      rate: z.string().optional(),
      metadata: z.string().optional(),
      messages: z.array(z.any()).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ShippoClient(ctx.auth.token);

      let createdWebhook = (await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/created`,
        event: 'transaction_created',
        is_test: false
      })) as Record<string, any>;

      let updatedWebhook = (await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/updated`,
        event: 'transaction_updated',
        is_test: false
      })) as Record<string, any>;

      return {
        registrationDetails: {
          createdWebhookId: createdWebhook.object_id,
          updatedWebhookId: updatedWebhook.object_id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ShippoClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as {
        createdWebhookId: string;
        updatedWebhookId: string;
      };
      await client.deleteWebhook(details.createdWebhookId);
      await client.deleteWebhook(details.updatedWebhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let url = new URL(ctx.request.url);
      let pathSegment = url.pathname.split('/').pop();

      let eventType: 'transaction_created' | 'transaction_updated' =
        pathSegment === 'created' ? 'transaction_created' : 'transaction_updated';

      return {
        inputs: [
          {
            eventType,
            transactionPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.transactionPayload as Record<string, any>;

      return {
        type: `transaction.${ctx.input.eventType === 'transaction_created' ? 'created' : 'updated'}`,
        id: `${payload.object_id}-${ctx.input.eventType}-${payload.object_updated || Date.now()}`,
        output: {
          transactionId: payload.object_id,
          status: payload.status,
          trackingNumber: payload.tracking_number,
          labelUrl: payload.label_url,
          commercialInvoiceUrl: payload.commercial_invoice_url,
          rate: payload.rate,
          metadata: payload.metadata,
          messages: payload.messages,
          createdAt: payload.object_created,
          updatedAt: payload.object_updated
        }
      };
    }
  })
  .build();
