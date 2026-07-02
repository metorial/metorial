import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Updates an existing product's name by its product ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to update'),
      name: z.string().describe('New name for the product')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the updated product'),
      name: z.string().describe('Updated name of the product'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let product = await client.updateProduct(ctx.input.productId, ctx.input.name);

    return {
      output: {
        productId: product.id,
        name: product.name,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      },
      message: `Product **${product.name}** (${product.id}) updated successfully.`
    };
  })
  .build();
