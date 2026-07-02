import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let walmartProduct = SlateTool.create(spec, {
  name: 'Walmart Product Lookup',
  key: 'walmart_product_lookup',
  description: `Extract product data from Walmart by product ID. Returns detailed product information including pricing, availability, and store-specific data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.number().describe('The Walmart product ID'),
      storeId: z.number().optional().describe('The Walmart store ID for store-specific data')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Walmart product data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.walmartProduct({
      productId: ctx.input.productId,
      storeId: ctx.input.storeId
    });

    return {
      output: { results: data },
      message: `Extracted Walmart product data for product ID **${ctx.input.productId}**.`
    };
  })
  .build();
