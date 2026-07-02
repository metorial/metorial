import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let productEvents = SlateTrigger.create(spec, {
  name: 'Product Events',
  key: 'product_events',
  description:
    'Triggers when products are created, updated, deleted, or when inventory changes. Fetches the full product details for each event.'
})
  .input(
    z.object({
      scope: z.string().describe('The webhook scope (e.g., store/product/created)'),
      productId: z.number().describe('The product ID from the webhook payload'),
      webhookEventHash: z.string().describe('Unique hash for the webhook event')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('The product ID'),
      name: z.string().optional().describe('Product name'),
      sku: z.string().optional().describe('Product SKU'),
      price: z.number().optional().describe('Product price'),
      inventoryLevel: z.number().optional().describe('Current inventory level'),
      isVisible: z.boolean().optional().describe('Product visibility'),
      availability: z.string().optional().describe('Product availability status'),
      dateModified: z.string().optional().describe('Date the product was last modified'),
      productDetails: z.any().optional().describe('Full product object from the API')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let scopes = [
        'store/product/created',
        'store/product/updated',
        'store/product/deleted',
        'store/product/inventory/updated',
        'store/product/inventory/order/updated'
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
      let productId = body.data?.id as number;
      let hash = (body.hash as string) || `${scope}-${productId}-${Date.now()}`;

      return {
        inputs: [
          {
            scope,
            productId,
            webhookEventHash: hash
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let scopeParts = ctx.input.scope.replace('store/product/', '');
      let eventType = `product.${scopeParts.replace('/', '_')}`;

      let productDetails: any = null;
      if (!ctx.input.scope.includes('deleted')) {
        try {
          productDetails = await client.getProduct(ctx.input.productId);
          productDetails = productDetails.data;
        } catch {
          // Product may have been deleted
        }
      }

      return {
        type: eventType,
        id: ctx.input.webhookEventHash,
        output: {
          productId: ctx.input.productId,
          name: productDetails?.name,
          sku: productDetails?.sku,
          price: productDetails?.price,
          inventoryLevel: productDetails?.inventory_level,
          isVisible: productDetails?.is_visible,
          availability: productDetails?.availability,
          dateModified: productDetails?.date_modified,
          productDetails
        }
      };
    }
  })
  .build();
