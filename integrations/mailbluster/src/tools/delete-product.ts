import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Permanently deletes a product by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteProduct(ctx.input.productId);

    return {
      output: {
        message: result.message || `Product ${ctx.input.productId} deleted`
      },
      message: `Product **${ctx.input.productId}** deleted successfully.`
    };
  })
  .build();
