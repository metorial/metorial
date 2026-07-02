import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product in the Salesmate product catalog. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to update'),
      name: z.string().optional().describe('Product name'),
      owner: z.number().optional().describe('User ID of the product owner'),
      unitPrice: z.number().optional().describe('Unit price'),
      currency: z.string().optional().describe('Currency code'),
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
      productId: z.string().describe('ID of the updated product')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { productId, customFields, ...fields } = ctx.input;

    let updateData: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (customFields) {
      Object.assign(updateData, customFields);
    }

    await client.updateProduct(productId, updateData);

    return {
      output: { productId },
      message: `Product \`${productId}\` updated successfully.`
    };
  })
  .build();
