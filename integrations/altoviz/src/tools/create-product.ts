import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in Altoviz. Provide a name and product number, along with optional pricing and description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Product name'),
      number: z.string().describe('Product number (unique identifier)'),
      description: z.string().optional().describe('Product description'),
      purchasePrice: z.number().optional().describe('Purchase price'),
      salePrice: z.number().optional().describe('Sale price'),
      internalId: z.string().optional().describe('Your custom internal ID'),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      productId: z.number().describe('Altoviz product ID'),
      name: z.string().nullable().optional(),
      number: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createProduct(ctx.input);

    return {
      output: {
        productId: result.id,
        name: result.name,
        number: result.number
      },
      message: `Created product **${result.name}** (number: ${result.number}).`
    };
  })
  .build();
