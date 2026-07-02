import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let productPurchaseEvent = SlateTrigger.create(spec, {
  name: 'Product Purchase',
  key: 'product_purchase_event',
  description:
    'Fires when a subscriber purchases a specific product. This webhook event requires a product ID and must be configured manually, as the API does not expose a product listing endpoint.'
})
  .input(
    z.object({
      productId: z.number().describe('Product ID that was purchased'),
      subscriberId: z.number().describe('Subscriber ID'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      emailAddress: z.string().describe('Subscriber email address'),
      state: z.string().describe('Subscriber state'),
      createdAt: z.string().describe('Subscriber creation timestamp'),
      fields: z.record(z.string(), z.string().nullable()).describe('Custom field values')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('Product ID that was purchased'),
      subscriberId: z.number().describe('Subscriber ID'),
      firstName: z.string().nullable().describe('First name'),
      emailAddress: z.string().describe('Email address'),
      state: z.string().describe('Current subscriber state'),
      createdAt: z.string().describe('When the subscriber was created'),
      fields: z.record(z.string(), z.string().nullable()).describe('Custom field values')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let subscriber = body.subscriber;

      if (!subscriber) {
        return { inputs: [] };
      }

      let productId = body.product?.id || body.product_id || 0;

      return {
        inputs: [
          {
            productId,
            subscriberId: subscriber.id,
            firstName: subscriber.first_name || null,
            emailAddress: subscriber.email_address,
            state: subscriber.state,
            createdAt: subscriber.created_at,
            fields: subscriber.fields || {}
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'product.purchased',
        id: `product-purchased-${ctx.input.productId}-${ctx.input.subscriberId}-${Date.now()}`,
        output: {
          productId: ctx.input.productId,
          subscriberId: ctx.input.subscriberId,
          firstName: ctx.input.firstName,
          emailAddress: ctx.input.emailAddress,
          state: ctx.input.state,
          createdAt: ctx.input.createdAt,
          fields: ctx.input.fields
        }
      };
    }
  });
