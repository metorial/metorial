import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newProductTrigger = SlateTrigger.create(spec, {
  name: 'New Product',
  key: 'new_product',
  description: 'Triggers when a new product is created in Agiled.'
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product'),
      product: z.record(z.string(), z.unknown()).describe('Product record from Agiled')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the new product'),
      name: z.string().optional().describe('Product name'),
      price: z.string().optional().describe('Product price'),
      description: z.string().optional().describe('Product description'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        brand: ctx.auth.brand
      });

      let lastKnownId = (ctx.state as Record<string, unknown>)?.lastKnownId as
        | number
        | undefined;

      let result = await client.listProducts(1, 50);
      let products = result.data;

      let newProducts = lastKnownId ? products.filter(p => Number(p.id) > lastKnownId) : [];

      let maxId = products.reduce(
        (max, p) => Math.max(max, Number(p.id) || 0),
        lastKnownId ?? 0
      );

      return {
        inputs: newProducts.map(p => ({
          productId: String(p.id),
          product: p
        })),
        updatedState: {
          lastKnownId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.product;
      return {
        type: 'product.created',
        id: ctx.input.productId,
        output: {
          productId: ctx.input.productId,
          name: p.name as string | undefined,
          price: p.price != null ? String(p.price) : undefined,
          description: p.description as string | undefined,
          createdAt: p.created_at as string | undefined
        }
      };
    }
  })
  .build();
