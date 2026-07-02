import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieves a specific product by its ID. Returns the product's name and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to retrieve')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the product'),
      name: z.string().describe('Name of the product'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let product = await client.getProduct(ctx.input.productId);

    return {
      output: {
        productId: product.id,
        name: product.name,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      },
      message: `Retrieved product **${product.name}** (${product.id}).`
    };
  })
  .build();
