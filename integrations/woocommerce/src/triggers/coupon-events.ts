import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let couponEvents = SlateTrigger.create(spec, {
  name: 'Coupon Events',
  key: 'coupon_events',
  description: 'Triggers when a coupon is created, updated, deleted, or restored in the store.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of coupon event'),
      webhookId: z.number().describe('WooCommerce webhook ID'),
      coupon: z.any().describe('Raw coupon data from WooCommerce')
    })
  )
  .output(
    z.object({
      couponId: z.number(),
      code: z.string(),
      discountType: z.string(),
      amount: z.string(),
      description: z.string(),
      dateExpires: z.string().nullable(),
      usageCount: z.number(),
      usageLimit: z.number().nullable(),
      usageLimitPerUser: z.number().nullable(),
      individualUse: z.boolean(),
      freeShipping: z.boolean(),
      minimumAmount: z.string(),
      maximumAmount: z.string(),
      productIds: z.array(z.number()),
      excludedProductIds: z.array(z.number()),
      dateCreated: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let topics = ['coupon.created', 'coupon.updated', 'coupon.deleted', 'coupon.restored'];
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
            eventType: topic || 'coupon.updated',
            webhookId,
            coupon: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.coupon;

      return {
        type: ctx.input.eventType,
        id: `coupon-${c.id}-${ctx.input.eventType}-${c.date_modified || Date.now()}`,
        output: {
          couponId: c.id,
          code: c.code || '',
          discountType: c.discount_type || '',
          amount: c.amount || '0',
          description: c.description || '',
          dateExpires: c.date_expires || null,
          usageCount: c.usage_count || 0,
          usageLimit: c.usage_limit ?? null,
          usageLimitPerUser: c.usage_limit_per_user ?? null,
          individualUse: c.individual_use || false,
          freeShipping: c.free_shipping || false,
          minimumAmount: c.minimum_amount || '0',
          maximumAmount: c.maximum_amount || '0',
          productIds: c.product_ids || [],
          excludedProductIds: c.excluded_product_ids || [],
          dateCreated: c.date_created || ''
        }
      };
    }
  })
  .build();
