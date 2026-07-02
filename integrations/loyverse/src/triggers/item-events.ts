import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let itemEvents = SlateTrigger.create(spec, {
  name: 'Item Events',
  key: 'item_events',
  description:
    'Triggers when items (products) are created, updated, or deleted. Useful for keeping external catalogs in sync.'
})
  .input(
    z.object({
      itemId: z.string().describe('Item ID'),
      webhookType: z.string().describe('Webhook event type'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Item ID'),
      itemName: z.string().optional().describe('Item name'),
      description: z.string().nullable().optional().describe('Item description'),
      categoryId: z.string().nullable().optional().describe('Category ID'),
      trackStock: z.boolean().optional().describe('Whether stock tracking is enabled'),
      imageUrl: z.string().nullable().optional().describe('Image URL'),
      variants: z
        .array(
          z.object({
            variantId: z.string(),
            sku: z.string().nullable().optional(),
            barcode: z.string().nullable().optional(),
            defaultPrice: z.number().nullable().optional(),
            cost: z.number().nullable().optional()
          })
        )
        .optional()
        .describe('Item variants'),
      isDeleted: z.boolean().optional().describe('Whether the item was deleted'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      deletedAt: z.string().nullable().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        types: ['items.update']
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

      let itemId = body.item_id ?? body.id ?? '';
      let webhookType = body.type ?? 'items.update';

      return {
        inputs: [
          {
            itemId,
            webhookType,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      try {
        let item = await client.getItem(ctx.input.itemId);

        return {
          type: item.deleted_at ? 'item.deleted' : 'item.updated',
          id: `${ctx.input.itemId}-${item.updated_at ?? Date.now()}`,
          output: {
            itemId: item.id,
            itemName: item.item_name,
            description: item.description,
            categoryId: item.category_id,
            trackStock: item.track_stock,
            imageUrl: item.image_url,
            variants: (item.variants ?? []).map((v: any) => ({
              variantId: v.variant_id,
              sku: v.sku,
              barcode: v.barcode,
              defaultPrice: v.default_price,
              cost: v.cost
            })),
            isDeleted: !!item.deleted_at,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            deletedAt: item.deleted_at
          }
        };
      } catch {
        // Item may have been deleted
        return {
          type: 'item.deleted',
          id: `${ctx.input.itemId}-deleted`,
          output: {
            itemId: ctx.input.itemId,
            isDeleted: true
          }
        };
      }
    }
  })
  .build();
