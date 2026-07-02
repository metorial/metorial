import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig } from '../lib/helpers';
import { spec } from '../spec';

let productEventTypes = [
  'product_group.created',
  'product_group.updated',
  'product_group.archived',
  'product.created'
] as const;

export let productEvents = SlateTrigger.create(spec, {
  name: 'Product Events',
  key: 'product_events',
  description:
    'Triggers when a product group is created, updated, or archived, or when a product variation is created.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of product event'),
      webhookId: z.string().describe('The webhook delivery ID'),
      productId: z.string().describe('The affected product or product group ID'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('The product/product group ID'),
      name: z.string().optional().describe('Product name'),
      sku: z.string().optional().describe('Product SKU'),
      basePriceInCents: z.number().optional().describe('Base price in cents'),
      trackable: z.boolean().optional().describe('Whether items are individually trackable'),
      archived: z.boolean().optional().describe('Whether the product is archived'),
      createdAt: z.string().optional().describe('Product creation timestamp'),
      updatedAt: z.string().optional().describe('Product last updated timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(buildClientConfig(ctx));

      let response = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        events: [...productEventTypes],
        version: 4
      });

      let endpointId = response?.data?.id;

      return {
        registrationDetails: {
          webhookEndpointId: endpointId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(buildClientConfig(ctx));
      let endpointId = ctx.input.registrationDetails?.webhookEndpointId;
      if (endpointId) {
        await client.deleteWebhookEndpoint(endpointId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data?.event || data?.type || 'product_group.updated';
      let productId =
        data?.data?.id || data?.product_group_id || data?.product_id || data?.id || '';
      let webhookId = data?.webhook_id || data?.id || `${productId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            webhookId: String(webhookId),
            productId: String(productId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs =
        ctx.input.payload?.data?.attributes ||
        ctx.input.payload?.product_group ||
        ctx.input.payload?.product ||
        ctx.input.payload ||
        {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.webhookId,
        output: {
          productId: ctx.input.productId,
          name: attrs.name,
          sku: attrs.sku,
          basePriceInCents: attrs.base_price_in_cents,
          trackable: attrs.trackable,
          archived: attrs.archived,
          createdAt: attrs.created_at,
          updatedAt: attrs.updated_at
        }
      };
    }
  })
  .build();
