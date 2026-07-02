import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProduct = SlateTool.create(spec, {
  name: 'Delete Product',
  key: 'delete_product',
  description: `Permanently delete a product from the BigCommerce catalog by its ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      productId: z.number().describe('The ID of the product to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the product was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    await client.deleteProduct(ctx.input.productId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted product with ID ${ctx.input.productId}.`
    };
  })
  .build();
