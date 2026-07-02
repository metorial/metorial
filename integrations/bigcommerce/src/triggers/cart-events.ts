import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cartEvents = SlateTrigger.create(spec, {
  name: 'Cart Events',
  key: 'cart_events',
  description:
    'Triggers when carts are created, updated, deleted, abandoned, or converted to an order. Also fires for cart line item changes.'
})
  .input(
    z.object({
      scope: z.string().describe('The webhook scope (e.g., store/cart/created)'),
      cartId: z.string().describe('The cart ID from the webhook payload'),
      webhookEventHash: z.string().describe('Unique hash for the webhook event')
    })
  )
  .output(
    z.object({
      cartId: z.string().describe('The cart ID'),
      cartDetails: z
        .any()
        .optional()
        .describe('Full cart object from the API (if still available)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        storeHash: ctx.config.storeHash
      });

      let scopes = [
        'store/cart/created',
        'store/cart/updated',
        'store/cart/deleted',
        'store/cart/abandoned',
        'store/cart/converted',
        'store/cart/couponApplied',
        'store/cart/lineItem/created',
        'store/cart/lineItem/updated',
        'store/cart/lineItem/deleted'
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
      let cartId = String(body.data?.id || '');
      let hash = (body.hash as string) || `${scope}-${cartId}-${Date.now()}`;

      return {
        inputs: [
          {
            scope,
            cartId,
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

      let scopeParts = ctx.input.scope.replace('store/cart/', '');
      let eventType = `cart.${scopeParts.replace('/', '_')}`;

      let cartDetails: any = null;
      if (!ctx.input.scope.includes('deleted') && !ctx.input.scope.includes('converted')) {
        try {
          let result = await client.getCart(ctx.input.cartId);
          cartDetails = result.data;
        } catch {
          // Cart may have been deleted or converted
        }
      }

      return {
        type: eventType,
        id: ctx.input.webhookEventHash,
        output: {
          cartId: ctx.input.cartId,
          cartDetails
        }
      };
    }
  })
  .build();
