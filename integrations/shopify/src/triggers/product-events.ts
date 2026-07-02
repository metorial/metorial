import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

let productWebhookTopics = ['products/create', 'products/update', 'products/delete'] as const;

export let productEvents = SlateTrigger.create(spec, {
  name: 'Product Events',
  key: 'product_events',
  description: 'Triggers when products are created, updated, or deleted in the Shopify store.'
})
  .input(
    z.object({
      topic: z.string().describe('Webhook topic that fired'),
      productId: z.string().describe('Shopify product ID'),
      payload: z.any().describe('Raw product payload from Shopify')
    })
  )
  .output(
    z.object({
      productId: z.string(),
      title: z.string(),
      vendor: z.string(),
      productType: z.string(),
      handle: z.string(),
      status: z.string(),
      tags: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      variantCount: z.number(),
      variants: z.array(
        z.object({
          variantId: z.string(),
          title: z.string(),
          price: z.string(),
          sku: z.string().nullable(),
          inventoryQuantity: z.number()
        })
      )
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ShopifyClient({
        token: ctx.auth.token,
        shopDomain: ctx.config.shopDomain,
        apiVersion: ctx.config.apiVersion
      });

      let webhookIds: string[] = [];
      for (let topic of productWebhookTopics) {
        let webhook = await client.createWebhook({
          topic,
          address: ctx.input.webhookBaseUrl
        });
        webhookIds.push(String(webhook.id));
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ShopifyClient({
        token: ctx.auth.token,
        shopDomain: ctx.config.shopDomain,
        apiVersion: ctx.config.apiVersion
      });

      let { webhookIds } = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let topic = ctx.request.headers.get('x-shopify-topic') || 'products/update';

      return {
        inputs: [
          {
            topic,
            productId: String(body.id),
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;
      let topicParts = ctx.input.topic.split('/');
      let eventType = topicParts[1] || 'update';
      // Normalize Shopify's "update" to "updated" for consistency
      let normalizedType =
        eventType === 'update'
          ? 'updated'
          : eventType === 'create'
            ? 'created'
            : eventType === 'delete'
              ? 'deleted'
              : eventType;

      return {
        type: `product.${normalizedType}`,
        id: `${ctx.input.productId}-${ctx.input.topic}-${p.updated_at || p.created_at || Date.now()}`,
        output: {
          productId: String(p.id),
          title: p.title || '',
          vendor: p.vendor || '',
          productType: p.product_type || '',
          handle: p.handle || '',
          status: p.status || '',
          tags: p.tags || '',
          createdAt: p.created_at || '',
          updatedAt: p.updated_at || '',
          variantCount: (p.variants || []).length,
          variants: (p.variants || []).map((v: any) => ({
            variantId: String(v.id),
            title: v.title || '',
            price: v.price || '0.00',
            sku: v.sku,
            inventoryQuantity: v.inventory_quantity || 0
          }))
        }
      };
    }
  })
  .build();
