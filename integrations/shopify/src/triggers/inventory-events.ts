import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let inventoryEvents = SlateTrigger.create(spec, {
  name: 'Inventory Events',
  key: 'inventory_events',
  description:
    'Triggers when inventory levels are updated at any location. Fires whenever stock quantities change for any inventory item.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic'),
      inventoryItemId: z.string().describe('Inventory item ID'),
      locationId: z.string().describe('Location ID'),
      payload: z.any().describe('Raw inventory level payload')
    })
  )
  .output(
    z.object({
      inventoryItemId: z.string(),
      locationId: z.string(),
      available: z.number().nullable(),
      updatedAt: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ShopifyClient({
        token: ctx.auth.token,
        shopDomain: ctx.config.shopDomain,
        apiVersion: ctx.config.apiVersion
      });

      let webhook = await client.createWebhook({
        topic: 'inventory_levels/update',
        address: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: { webhookId: String(webhook.id) }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ShopifyClient({
        token: ctx.auth.token,
        shopDomain: ctx.config.shopDomain,
        apiVersion: ctx.config.apiVersion
      });

      let { webhookId } = ctx.input.registrationDetails as { webhookId: string };
      try {
        await client.deleteWebhook(webhookId);
      } catch (_e) {
        // Webhook may already be deleted
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let topic = ctx.request.headers.get('x-shopify-topic') || 'inventory_levels/update';

      return {
        inputs: [
          {
            topic,
            inventoryItemId: String(body.inventory_item_id),
            locationId: String(body.location_id),
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: 'inventory_level.updated',
        id: `${ctx.input.inventoryItemId}-${ctx.input.locationId}-${p.updated_at || Date.now()}`,
        output: {
          inventoryItemId: String(p.inventory_item_id),
          locationId: String(p.location_id),
          available: p.available ?? null,
          updatedAt: p.updated_at || new Date().toISOString()
        }
      };
    }
  })
  .build();
