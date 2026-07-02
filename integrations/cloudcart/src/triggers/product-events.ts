import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let productEventTypes = ['product.created', 'product.updated', 'product.deleted'] as const;

export let productEvents = SlateTrigger.create(spec, {
  name: 'Product Events',
  key: 'product_events',
  description:
    'Triggers when a product is created, updated, or deleted in the CloudCart store.'
})
  .input(
    z.object({
      eventType: z.enum(productEventTypes).describe('The type of product event'),
      productId: z.string().describe('ID of the affected product'),
      productAttributes: z
        .record(z.string(), z.any())
        .describe('Product attributes from the webhook payload')
    })
  )
  .output(
    z.object({
      productId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      priceFrom: z.any().optional(),
      priceTo: z.any().optional(),
      active: z.any().optional(),
      draft: z.any().optional(),
      urlHandle: z.string().optional(),
      dateAdded: z.string().optional(),
      dateModified: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

      let webhookIds: string[] = [];
      for (let event of productEventTypes) {
        let res = await client.createWebhook({
          url: ctx.input.webhookBaseUrl,
          event
        });
        webhookIds.push(res.data.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_err) {
          // Webhook may already be deleted or deactivated
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;

      let data = body.data;
      if (!data) {
        return { inputs: [] };
      }

      let eventType: string = 'product.updated';
      if (body.event) {
        eventType = body.event;
      }

      let resource = Array.isArray(data) ? data[0] : data;
      if (!resource) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: eventType as (typeof productEventTypes)[number],
            productId: String(resource.id || ''),
            productAttributes: (resource.attributes || resource) as Record<string, any>
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs = ctx.input.productAttributes as Record<string, any>;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.productId}-${Date.now()}`,
        output: {
          productId: ctx.input.productId,
          name: attrs.name as string | undefined,
          description: attrs.description as string | undefined,
          priceFrom: attrs.price_from,
          priceTo: attrs.price_to,
          active: attrs.active,
          draft: attrs.draft,
          urlHandle: attrs.url_handle as string | undefined,
          dateAdded: attrs.date_added as string | undefined,
          dateModified: attrs.date_modified as string | undefined
        }
      };
    }
  })
  .build();
