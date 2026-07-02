import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let productEvents = SlateTrigger.create(spec, {
  name: 'Product Events',
  key: 'product_events',
  description: 'Triggers when a product is created, updated, or deleted in Altoviz.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (ProductCreated, ProductUpdated, ProductDeleted)'),
      webhookId: z.string().describe('Webhook ID'),
      product: z.any().describe('Product entity data from the webhook payload')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('Altoviz product ID'),
      name: z.string().nullable().optional(),
      number: z.string().nullable().optional().describe('Product number'),
      description: z.string().nullable().optional(),
      purchasePrice: z.number().nullable().optional(),
      salePrice: z.number().nullable().optional(),
      internalId: z.string().nullable().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.createWebhook({
        name: 'Slates Product Events',
        types: ['ProductCreated', 'ProductUpdated', 'ProductDeleted'],
        url: ctx.input.webhookBaseUrl
      });
      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      return {
        inputs: [
          {
            eventType: body.type,
            webhookId: String(body.id),
            product: body.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let product = ctx.input.product || {};
      let eventTypeMap: Record<string, string> = {
        ProductCreated: 'product.created',
        ProductUpdated: 'product.updated',
        ProductDeleted: 'product.deleted'
      };

      return {
        type:
          eventTypeMap[ctx.input.eventType] || `product.${ctx.input.eventType.toLowerCase()}`,
        id: `${ctx.input.webhookId}-${product.id || 'unknown'}-${ctx.input.eventType}`,
        output: {
          productId: product.id,
          name: product.name,
          number: product.number,
          description: product.description,
          purchasePrice: product.purchasePrice,
          salePrice: product.salePrice,
          internalId: product.internalId
        }
      };
    }
  })
  .build();
