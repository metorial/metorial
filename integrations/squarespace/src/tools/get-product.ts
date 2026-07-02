import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Products',
  key: 'get_product',
  description: `Retrieve detailed information for one or more specific products by their IDs. Returns full product details including variants, images, pricing, and metadata. Supports retrieving up to 50 products per request.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productIds: z
        .array(z.string())
        .describe('One or more product IDs to retrieve (up to 50)')
    })
  )
  .output(
    z.object({
      products: z.array(z.any()).describe('Array of product objects with full details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let products = await client.getProducts(ctx.input.productIds);

    return {
      output: {
        products
      },
      message: `Retrieved **${products.length}** product(s).`
    };
  })
  .build();
