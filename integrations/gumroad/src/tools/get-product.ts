import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';
import { mapProduct, productSchema } from './product-utils';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve detailed information about a specific Gumroad product, including variant categories, custom fields, and tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('The product ID to retrieve')
    })
  )
  .output(productSchema)
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let p = await client.getProduct(ctx.input.productId);

    return {
      output: mapProduct(p),
      message: `Retrieved product **${p.name}** (${p.id}).`
    };
  })
  .build();
