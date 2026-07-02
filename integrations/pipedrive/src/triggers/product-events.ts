import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let productEvents = SlateTrigger.create(spec, {
  name: 'Product Events',
  key: 'product_events',
  description: 'Triggers when a product is created, updated, or deleted in Pipedrive.'
})
  .input(
    z.object({
      action: z.enum(['created', 'changed', 'deleted']).describe('Event action type'),
      eventId: z.string().describe('Unique event identifier'),
      current: z.any().optional().describe('Current state of the product'),
      previous: z.any().optional().describe('Previous state of the product')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('Product ID'),
      name: z.string().optional().describe('Product name'),
      code: z.string().optional().nullable().describe('Product code'),
      unit: z.string().optional().nullable().describe('Unit of measurement'),
      tax: z.number().optional().describe('Tax percentage'),
      activeFlag: z.boolean().optional().describe('Whether active'),
      userId: z.number().optional().describe('Owner user ID'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let result = await client.createWebhook({
        subscription_url: ctx.input.webhookBaseUrl,
        event_action: '*',
        event_object: 'product'
      });
      return {
        registrationDetails: { webhookId: result?.data?.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let action = data.meta?.action;
      let current = data.current;
      let previous = data.previous;

      let actionMap: Record<string, string> = {
        added: 'created',
        updated: 'changed',
        deleted: 'deleted'
      };

      return {
        inputs: [
          {
            action: actionMap[action] || action,
            eventId: `product-${current?.id || previous?.id}-${data.meta?.timestamp || Date.now()}`,
            current,
            previous
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let product = ctx.input.current || ctx.input.previous || {};

      return {
        type: `product.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          productId: product.id,
          name: product.name,
          code: product.code,
          unit: product.unit,
          tax: product.tax,
          activeFlag: product.active_flag,
          userId: product.owner_id,
          addTime: product.add_time,
          updateTime: product.update_time
        }
      };
    }
  });
