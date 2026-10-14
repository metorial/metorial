import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, formatProduct } from '../lib/client';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description:
    'Update an existing Modelry product by ID. Provide at least one field; omitted fields are left unchanged.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      productId: z.string().describe('Product ID. Call list_products to find products.'),
      sku: z.string().optional().describe('Product SKU.'),
      title: z.string().optional().describe('Product title.'),
      batchId: z.string().optional().describe('Batch ID associated with the product.'),
      description: z.string().optional().describe('Product description.'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Replacement product tags. An empty array clears the tags.'),
      dimensions: z.string().optional().describe('Physical dimensions of the product.'),
      externalUrl: z.string().optional().describe('External product page URL.')
    })
  )
  .output(
    z.object({
      productId: z.string(),
      sku: z.string().nullable(),
      title: z.string().nullable(),
      batchId: z.string().nullable(),
      description: z.string().nullable(),
      tags: z.array(z.string()).nullable(),
      dimensions: z.string().nullable(),
      externalUrl: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { productId, ...fields } = ctx.input;
    let result = await client.updateProduct(productId, fields);
    return {
      output: formatProduct(result.data),
      message: `Updated product **${result.data.attributes.title || result.data.id}** (ID: \`${result.data.id}\`).`
    };
  })
  .build();
