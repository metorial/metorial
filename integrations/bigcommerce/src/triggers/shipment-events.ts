import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let shipmentEvents = SlateTrigger.create(spec, {
  name: 'Shipment Events',
  key: 'shipment_events',
  description: 'Triggers when shipments are created, updated, or deleted for orders.'
})
  .input(
    z.object({
      scope: z.string().describe('The webhook scope (e.g., store/shipment/created)'),
      shipmentId: z.number().describe('The shipment ID from the webhook payload'),
      orderId: z.number().optional().describe('The associated order ID'),
      webhookEventHash: z.string().describe('Unique hash for the webhook event')
    })
  )
  .output(
    z.object({
      shipmentId: z.number().describe('The shipment ID'),
      orderId: z.number().optional().describe('The associated order ID'),
      trackingNumber: z.string().optional().describe('Tracking number'),
      shippingMethod: z.string().optional().describe('Shipping method'),
      shippingProvider: z.string().optional().describe('Shipping provider')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let scopes = [
        'store/shipment/created',
        'store/shipment/updated',
        'store/shipment/deleted'
      ];

      let webhookIds: number[] = [];
      for (let scope of scopes) {
        let result = await client.createWebhook({
          scope,
          destination: ctx.input.webhookBaseUrl,
          is_active: true
        });
        webhookIds.push(result.data.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let { webhookIds } = ctx.input.registrationDetails as { webhookIds: number[] };
      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let scope = body.scope as string;
      let shipmentId = body.data?.id as number;
      let orderId = body.data?.orderId as number | undefined;
      let hash = (body.hash as string) || `${scope}-${shipmentId}-${Date.now()}`;

      return {
        inputs: [
          {
            scope,
            shipmentId,
            orderId,
            webhookEventHash: hash
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let scopeParts = ctx.input.scope.replace('store/shipment/', '');
      let eventType = `shipment.${scopeParts}`;

      return {
        type: eventType,
        id: ctx.input.webhookEventHash,
        output: {
          shipmentId: ctx.input.shipmentId,
          orderId: ctx.input.orderId
        }
      };
    }
  })
  .build();
