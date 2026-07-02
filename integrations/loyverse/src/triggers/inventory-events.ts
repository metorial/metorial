import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let inventoryEvents = SlateTrigger.create(spec, {
  name: 'Inventory Events',
  key: 'inventory_events',
  description:
    'Triggers when inventory (stock) levels change. Useful for syncing stock data with external warehouse or e-commerce systems.'
})
  .input(
    z.object({
      variantId: z.string().describe('Variant ID that changed'),
      storeId: z.string().describe('Store ID where the change occurred'),
      webhookType: z.string().describe('Webhook event type'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      variantId: z.string().describe('Variant ID'),
      storeId: z.string().describe('Store ID'),
      inStock: z.number().describe('Current stock quantity'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        types: ['inventory_levels.update']
      });

      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let variantId = body.variant_id ?? '';
      let storeId = body.store_id ?? '';
      let webhookType = body.type ?? 'inventory_levels.update';

      return {
        inputs: [
          {
            variantId,
            storeId,
            webhookType,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.getInventory({
        variantId: ctx.input.variantId,
        storeId: ctx.input.storeId,
        limit: 1
      });

      let level = (result.inventory_levels ?? [])[0];

      return {
        type: 'inventory_level.updated',
        id: `${ctx.input.variantId}-${ctx.input.storeId}-${Date.now()}`,
        output: {
          variantId: level?.variant_id ?? ctx.input.variantId,
          storeId: level?.store_id ?? ctx.input.storeId,
          inStock: level?.in_stock ?? 0,
          updatedAt: level?.updated_at
        }
      };
    }
  })
  .build();
