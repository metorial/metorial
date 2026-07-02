import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Permanently delete a product from Modelry by its ID. This action is irreversible and will remove the product and its associated data.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to delete.')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the deleted product.'),
      deleted: z.boolean().describe('Whether the product was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteProduct(ctx.input.productId);

    return {
      output: {
        productId: ctx.input.productId,
        deleted: true
      },
      message: `Successfully deleted product with ID \`${ctx.input.productId}\`.`
    };
  })
  .build();
