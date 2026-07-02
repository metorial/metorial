import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in the Salesmate product catalog. Products can include pricing, quantities, and discounts, and can be associated with deals.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Product name (required)'),
      owner: z.number().describe('User ID of the product owner'),
      unitPrice: z.number().optional().describe('Unit price of the product'),
      currency: z.string().optional().describe('Currency code (e.g., "USD")'),
      description: z.string().optional().describe('Product description'),
      tags: z.string().optional().describe('Comma-separated tags'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('ID of the created product')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { customFields, ...fields } = ctx.input;
    let data = { ...fields, ...customFields };
    let result = await client.createProduct(data);
    let productId = result?.Data?.id;

    return {
      output: { productId },
      message: `Product **${ctx.input.name}** created with ID \`${productId}\`.`
    };
  })
  .build();
