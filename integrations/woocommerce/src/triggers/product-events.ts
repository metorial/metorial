import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let productEvents = SlateTrigger.create(spec, {
  name: 'Product Events',
  key: 'product_events',
  description:
    'Triggers when a product is created, updated, deleted, or restored in the store.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of product event'),
      webhookId: z.number().describe('WooCommerce webhook ID'),
      product: z.any().describe('Raw product data from WooCommerce')
    })
  )
  .output(
    z.object({
      productId: z.number(),
      name: z.string(),
      slug: z.string(),
      type: z.string(),
      status: z.string(),
      sku: z.string(),
      price: z.string(),
      regularPrice: z.string(),
      salePrice: z.string(),
      onSale: z.boolean(),
      stockStatus: z.string(),
      stockQuantity: z.number().nullable(),
      categories: z.array(
        z.object({
          categoryId: z.number(),
          name: z.string(),
          slug: z.string()
        })
      ),
      tags: z.array(
        z.object({
          tagId: z.number(),
          name: z.string(),
          slug: z.string()
        })
      ),
      permalink: z.string(),
      dateCreated: z.string(),
      dateModified: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let topics = [
        'product.created',
        'product.updated',
        'product.deleted',
        'product.restored'
      ];
      let registeredWebhooks: Array<{ webhookId: number; topic: string }> = [];

      for (let topic of topics) {
        let webhook = await client.createWebhook({
          name: `Slates - ${topic}`,
          topic,
          delivery_url: ctx.input.webhookBaseUrl,
          status: 'active'
        });
        registeredWebhooks.push({ webhookId: webhook.id, topic });
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhooks = ctx.input.registrationDetails?.webhooks || [];

      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let topic = ctx.request.headers.get('x-wc-webhook-topic') || '';
      let webhookId = Number.parseInt(ctx.request.headers.get('x-wc-webhook-id') || '0', 10);

      if (!body?.id) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: topic || 'product.updated',
            webhookId,
            product: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.product;

      return {
        type: ctx.input.eventType,
        id: `product-${p.id}-${ctx.input.eventType}-${p.date_modified || Date.now()}`,
        output: {
          productId: p.id,
          name: p.name || '',
          slug: p.slug || '',
          type: p.type || '',
          status: p.status || '',
          sku: p.sku || '',
          price: p.price || '',
          regularPrice: p.regular_price || '',
          salePrice: p.sale_price || '',
          onSale: p.on_sale || false,
          stockStatus: p.stock_status || '',
          stockQuantity: p.stock_quantity ?? null,
          categories: (p.categories || []).map((c: any) => ({
            categoryId: c.id,
            name: c.name || '',
            slug: c.slug || ''
          })),
          tags: (p.tags || []).map((t: any) => ({
            tagId: t.id,
            name: t.name || '',
            slug: t.slug || ''
          })),
          permalink: p.permalink || '',
          dateCreated: p.date_created || '',
          dateModified: p.date_modified || ''
        }
      };
    }
  })
  .build();
