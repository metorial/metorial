import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Delete a product from the Salesmate product catalog by its ID. This action is permanent.`,
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
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteProduct(ctx.input.productId);

    return {
      output: { success: true },
      message: `Product \`${ctx.input.productId}\` deleted.`
    };
  })
  .build();
