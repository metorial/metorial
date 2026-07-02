import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product in Altoviz.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      productId: z.number().describe('Altoviz product ID'),
      name: z.string().optional(),
      number: z.string().optional(),
      description: z.string().optional(),
      purchasePrice: z.number().optional(),
      salePrice: z.number().optional(),
      internalId: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      productId: z.number(),
      name: z.string().nullable().optional(),
      number: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { productId, ...updateData } = ctx.input;
    let result = await client.updateProduct(productId, updateData);

    return {
      output: {
        productId: result.id,
        name: result.name,
        number: result.number
      },
      message: `Updated product **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
