import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { productSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve detailed information about a specific DPD product including pricing, description, SKU, file info, and image details. Product images are available at \`https://d2beuh40lcdzfb.cloudfront.net/products/{productId}/{size}/{imageFileName}\` with sizes from 50x50 to 1000x1000.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.number().describe('The unique ID of the product to retrieve')
    })
  )
  .output(productSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let product = await client.getProduct(ctx.input.productId);

    return {
      output: product,
      message: `Retrieved product #${product.productId}.`
    };
  })
  .build();
