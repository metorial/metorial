import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newProduct = SlateTrigger.create(spec, {
  name: 'New Product',
  key: 'new_product',
  description: 'Triggers when a new product is created in MailBluster.'
})
  .input(
    z.object({
      productId: z.string().describe('ID of the new product'),
      name: z.string().describe('Name of the product'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the product'),
      name: z.string().describe('Name of the product'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let products = await client.listProducts();
      let seenIds: string[] = ctx.input.state?.seenIds || [];
      let seenSet = new Set(seenIds);

      let newProducts = products.filter(p => !seenSet.has(p.id));

      let updatedSeenIds = products.map(p => p.id);

      return {
        inputs: newProducts.map(p => ({
          productId: p.id,
          name: p.name,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        })),
        updatedState: {
          seenIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'product.created',
        id: ctx.input.productId,
        output: {
          productId: ctx.input.productId,
          name: ctx.input.name,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
