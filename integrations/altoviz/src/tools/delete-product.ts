import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Delete a product from Altoviz by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      productId: z.number().describe('Altoviz product ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteProduct(ctx.input.productId);
    return {
      output: { deleted: true },
      message: `Deleted product with ID **${ctx.input.productId}**.`
    };
  })
  .build();
