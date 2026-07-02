import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let INVENTORY_EVENT_TYPES = ['inventory.count.updated'];

export let inventoryEvents = SlateTrigger.create(spec, {
  name: 'Inventory Events',
  key: 'inventory_events',
  description: 'Triggered when inventory counts are updated for catalog item variations.'
})
  .input(
    z.object({
      eventType: z.string(),
      eventId: z.string(),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawInventory: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      catalogObjectId: z.string().optional(),
      catalogObjectType: z.string().optional(),
      locationId: z.string().optional(),
      quantity: z.string().optional(),
      state: z.string().optional(),
      calculatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let subscription = await client.createWebhookSubscription({
        idempotencyKey: crypto.randomUUID(),
        subscription: {
          name: 'Square Inventory Events',
          eventTypes: INVENTORY_EVENT_TYPES,
          notificationUrl: ctx.input.webhookBaseUrl
        }
      });
      return { registrationDetails: { subscriptionId: subscription.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.deleteWebhookSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      if (!body?.type) return { inputs: [] };

      let inventory = body.data?.object?.inventory_counts?.[0] || body.data?.object || {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawInventory: inventory
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let inv = ctx.input.rawInventory as any;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          catalogObjectId: inv.catalog_object_id,
          catalogObjectType: inv.catalog_object_type,
          locationId: inv.location_id,
          quantity: inv.quantity,
          state: inv.state,
          calculatedAt: inv.calculated_at
        }
      };
    }
  })
  .build();
