import { createApiServiceError, SlateTrigger } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let COLLECTION_ITEM_TRIGGER_TYPES = [
  'collection_item_created',
  'collection_item_changed',
  'collection_item_deleted',
  'collection_item_unpublished'
] as const;

export let collectionItemEventsTrigger = SlateTrigger.create(spec, {
  name: 'Collection Item Events',
  key: 'collection_item_events',
  description:
    'Triggered when CMS collection items are created, changed, deleted, or unpublished on a Webflow site.'
})
  .input(
    z.object({
      triggerType: z.string().describe('Type of collection item event'),
      itemId: z.string().optional().describe('Collection item ID'),
      collectionId: z.string().optional().describe('Collection the item belongs to'),
      siteId: z.string().optional().describe('Site the item belongs to'),
      slug: z.string().optional().describe('Item slug'),
      eventId: z.string().optional().describe('Unique event identifier'),
      rawPayload: z.any().optional().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      itemId: z.string().optional().describe('Collection item ID'),
      collectionId: z.string().optional().describe('Collection the item belongs to'),
      siteId: z.string().optional().describe('Site the item belongs to'),
      slug: z.string().optional().describe('Item slug'),
      fieldData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Item field data (if available)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      if (!ctx.config.siteId) {
        throw createApiServiceError(
          'siteId is required in config for automatic webhook registration.'
        );
      }
      let client = new WebflowClient(ctx.auth.token);
      let registeredWebhookIds: string[] = [];

      for (let triggerType of COLLECTION_ITEM_TRIGGER_TYPES) {
        let webhook = await client.createWebhook(ctx.config.siteId, {
          triggerType,
          url: ctx.input.webhookBaseUrl
        });
        registeredWebhookIds.push(webhook.id ?? webhook._id);
      }

      return {
        registrationDetails: {
          webhookIds: registeredWebhookIds,
          siteId: ctx.config.siteId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WebflowClient(ctx.auth.token);
      let webhookIds: string[] = ctx.input.registrationDetails.webhookIds ?? [];
      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be removed
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventId = data._id ?? data.id ?? crypto.randomUUID();
      let item = data.item ?? data;

      return {
        inputs: [
          {
            triggerType: data.triggerType ?? 'collection_item_event',
            itemId: item.itemId ?? item.id ?? item._id,
            collectionId: item.collectionId ?? data.collectionId,
            siteId: data.siteId ?? data.site,
            slug: item.slug ?? item.fieldData?.slug,
            eventId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'collection_item.changed';
      if (ctx.input.triggerType === 'collection_item_created')
        eventType = 'collection_item.created';
      else if (ctx.input.triggerType === 'collection_item_deleted')
        eventType = 'collection_item.deleted';
      else if (ctx.input.triggerType === 'collection_item_unpublished')
        eventType = 'collection_item.unpublished';

      let raw = ctx.input.rawPayload ?? {};
      let item = raw.item ?? raw;

      return {
        type: eventType,
        id: ctx.input.eventId ?? crypto.randomUUID(),
        output: {
          itemId: ctx.input.itemId,
          collectionId: ctx.input.collectionId,
          siteId: ctx.input.siteId,
          slug: ctx.input.slug,
          fieldData: item.fieldData
        }
      };
    }
  })
  .build();
