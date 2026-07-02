import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Delete a product from the WooCommerce store. By default moves to trash; use force to permanently delete.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      productId: z.number().describe('The product ID to delete'),
      force: z
        .boolean()
        .optional()
        .default(false)
        .describe('True to permanently delete instead of moving to trash')
    })
  )
  .output(
    z.object({
      productId: z.number(),
      name: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.deleteProduct(ctx.input.productId, ctx.input.force);

    return {
      output: {
        productId: result.id,
        name: result.name,
        deleted: true
      },
      message: `${ctx.input.force ? 'Permanently deleted' : 'Trashed'} product **"${result.name}"** (ID: ${result.id}).`
    };
  })
  .build();
