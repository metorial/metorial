import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let CATALOG_EVENT_TYPES = ['catalog.version.updated'];

export let catalogEvents = SlateTrigger.create(spec, {
  name: 'Catalog Events',
  key: 'catalog_events',
  description:
    'Triggered when any catalog object is created, updated, or deleted. A single event fires for all catalog changes.'
})
  .input(
    z.object({
      eventType: z.string(),
      eventId: z.string(),
      merchantId: z.string().optional(),
      createdAt: z.string().optional(),
      rawCatalog: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      catalogVersion: z.number().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      let subscription = await client.createWebhookSubscription({
        idempotencyKey: crypto.randomUUID(),
        subscription: {
          name: 'Slates Catalog Events',
          eventTypes: CATALOG_EVENT_TYPES,
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

      let catalog = body.data?.object || body.data || {};

      return {
        inputs: [
          {
            eventType: body.type,
            eventId: body.event_id || crypto.randomUUID(),
            merchantId: body.merchant_id,
            createdAt: body.created_at,
            rawCatalog: catalog
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.rawCatalog as any;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          catalogVersion: c.catalog_version?.updated_at ? undefined : c.catalog_version,
          updatedAt: c.updated_at || ctx.input.createdAt
        }
      };
    }
  })
  .build();
