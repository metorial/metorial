import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let purchaseEvents = SlateTrigger.create(spec, {
  name: 'Purchase Events',
  key: 'purchase_events',
  description:
    'Triggers when a new purchase is made or a purchase is canceled/expired/refunded.'
})
  .input(
    z.object({
      eventType: z
        .enum(['new_purchase', 'cancel_purchase'])
        .describe('Type of purchase event'),
      purchaseId: z.string().describe('Purchase ID'),
      productId: z.string().describe('Product ID'),
      productName: z.string().describe('Product name'),
      state: z.string().describe('Purchase state'),
      email: z.string().describe('Contact email')
    })
  )
  .output(
    z.object({
      purchaseId: z.string().describe('Purchase ID'),
      productId: z.string().describe('Product ID'),
      productName: z.string().describe('Product name'),
      state: z.string().describe('Purchase state'),
      email: z.string().describe('Contact email address')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new SimpleroClient({
        token: ctx.auth.token,
        userAgent: ctx.config.userAgent
      });

      let newResult = await client.createZapierSubscription({
        event: 'new_purchase',
        targetUrl: `${ctx.input.webhookBaseUrl}/new_purchase`
      });

      let cancelResult = await client.createZapierSubscription({
        event: 'cancel_purchase',
        targetUrl: `${ctx.input.webhookBaseUrl}/cancel_purchase`
      });

      return {
        registrationDetails: {
          newPurchaseId: String(newResult.id),
          cancelPurchaseId: String(cancelResult.id)
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new SimpleroClient({
        token: ctx.auth.token,
        userAgent: ctx.config.userAgent
      });

      let details = ctx.input.registrationDetails as Record<string, string>;
      if (details.newPurchaseId) {
        await client.destroyZapierSubscription(details.newPurchaseId);
      }
      if (details.cancelPurchaseId) {
        await client.destroyZapierSubscription(details.cancelPurchaseId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let url = ctx.request.url;
      let eventType: 'new_purchase' | 'cancel_purchase' = 'new_purchase';
      if (url.includes('/cancel_purchase')) {
        eventType = 'cancel_purchase';
      }

      let items: Record<string, unknown>[] = [];
      if (Array.isArray(data.results)) {
        items = data.results as Record<string, unknown>[];
      } else if (data.purchase_id || data.email) {
        items = [data];
      }

      return {
        inputs: items.map(item => ({
          eventType,
          purchaseId: String(item.purchase_id || ''),
          productId: String(item.product_id || ''),
          productName: String(item.product_name || ''),
          state: String(item.state || ''),
          email: String(item.email || '')
        }))
      };
    },

    handleEvent: async ctx => {
      return {
        type: `purchase.${ctx.input.eventType === 'new_purchase' ? 'created' : 'canceled'}`,
        id: `${ctx.input.eventType}-${ctx.input.purchaseId}-${Date.now()}`,
        output: {
          purchaseId: ctx.input.purchaseId,
          productId: ctx.input.productId,
          productName: ctx.input.productName,
          state: ctx.input.state,
          email: ctx.input.email
        }
      };
    }
  })
  .build();
