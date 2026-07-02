import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let inventoryEvents = SlateTrigger.create(spec, {
  name: 'Inventory Events',
  key: 'inventory_events',
  description:
    'Triggers when inventory levels change at specific locations, or when SKU/variant inventory is updated directly or via orders.'
})
  .input(
    z.object({
      scope: z.string().describe('The webhook scope'),
      resourceId: z.number().describe('The resource ID from the webhook payload'),
      webhookEventHash: z.string().describe('Unique hash for the webhook event')
    })
  )
  .output(
    z.object({
      resourceId: z
        .number()
        .describe('The ID of the affected resource (product, variant, or location)'),
      scope: z.string().describe('The event scope for context')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let scopes = [
        'store/sku/inventory/updated',
        'store/sku/inventory/order/updated',
        'store/inventory/location/inventory/updated'
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
      let resourceId = body.data?.id as number;
      let hash = (body.hash as string) || `${scope}-${resourceId}-${Date.now()}`;

      return {
        inputs: [
          {
            scope,
            resourceId,
            webhookEventHash: hash
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType: string;
      if (ctx.input.scope.includes('location')) {
        eventType = 'inventory.location_updated';
      } else if (ctx.input.scope.includes('order')) {
        eventType = 'inventory.order_updated';
      } else {
        eventType = 'inventory.updated';
      }

      return {
        type: eventType,
        id: ctx.input.webhookEventHash,
        output: {
          resourceId: ctx.input.resourceId,
          scope: ctx.input.scope
        }
      };
    }
  })
  .build();
