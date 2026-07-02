import { SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Fetch product details by product ID. Products can be attached to checkout flows and payment buttons.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('Product identifier (e.g., "e098921c-9db2-4796")')
    })
  )
  .output(
    z.object({
      product: z.any().describe('Product details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });
    let result = await client.getProduct({ productId: ctx.input.productId });

    return {
      output: { product: result },
      message: `Fetched product **${ctx.input.productId}**.`
    };
  })
  .build();
