import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let productEventsTrigger = SlateTrigger.create(spec, {
  name: 'Product Events',
  key: 'product_events',
  description:
    'Triggered when products are modified in the workspace. Products are top-level entities in the product hierarchy.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of product event'),
      eventId: z.string().describe('Unique event identifier'),
      productId: z.string().describe('ID of the affected product'),
      productName: z.string().optional().describe('Name of the product'),
      raw: z.record(z.string(), z.any()).optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the affected product'),
      productName: z.string().optional().describe('Name of the product'),
      product: z
        .record(z.string(), z.any())
        .optional()
        .describe('Raw product data from the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let eventTypes = ['product.created', 'product.updated', 'product.deleted'];
      let webhookIds: string[] = [];

      for (let eventType of eventTypes) {
        try {
          let webhook = await client.createWebhook({
            notificationUrl: ctx.input.webhookBaseUrl,
            eventType
          });
          webhookIds.push(webhook.id);
        } catch {
          // Some event types may not be available
        }
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;

      if (body.type === 'probe' || body.eventType === 'probe') {
        return { inputs: [] };
      }

      let eventType = body.eventType || body.type || 'product.updated';
      let productData = body.data || body;
      let productId = productData?.id || productData?.product?.id || '';
      let productName = productData?.name || productData?.product?.name;

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}-${productId}-${Date.now()}`,
            productId,
            productName,
            raw: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let rawData = ctx.input.raw as Record<string, any> | undefined;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          productId: ctx.input.productId,
          productName: ctx.input.productName,
          product: rawData?.data as Record<string, any> | undefined
        }
      };
    }
  })
  .build();
