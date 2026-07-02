import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve a list of all products in your DPD account. Optionally filter by storefront. Returns product IDs and names.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storefrontId: z
        .number()
        .optional()
        .describe(
          'Filter products by storefront ID. Omit to return products from all storefronts.'
        )
    })
  )
  .output(
    z.object({
      products: z.array(
        z.object({
          productId: z.number().describe('Unique product ID'),
          name: z.string().describe('Product name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let products = await client.listProducts(ctx.input.storefrontId);

    return {
      output: { products },
      message: `Found **${products.length}** product(s)${ctx.input.storefrontId ? ` in storefront ${ctx.input.storefrontId}` : ''}.`
    };
  })
  .build();
