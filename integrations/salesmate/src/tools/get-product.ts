import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve a product by its ID from the Salesmate product catalog.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to retrieve')
    })
  )
  .output(
    z.object({
      product: z
        .record(z.string(), z.unknown())
        .describe('Full product record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getProduct(ctx.input.productId);
    let product = result?.Data ?? result;

    return {
      output: { product },
      message: `Retrieved product \`${ctx.input.productId}\`.`
    };
  })
  .build();
