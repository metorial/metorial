import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in Modelry. Products represent items for which 3D models will be created and managed. You can specify identifiers like SKU, associate products with batches, add tags for categorization, and link to external product pages.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sku: z.string().optional().describe('Unique product identifier (Stock Keeping Unit).'),
      title: z.string().optional().describe('Name of the product.'),
      batchId: z
        .string()
        .optional()
        .describe('Batch ID to associate the product with for bulk operations.'),
      description: z.string().optional().describe('Text description of the product.'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Labels for categorizing and searching products.'),
      dimensions: z.string().optional().describe('Physical dimensions of the product.'),
      externalUrl: z
        .string()
        .optional()
        .describe('Link to the product page on your eCommerce store.')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the created product.'),
      sku: z.string().nullable().describe('SKU of the product.'),
      title: z.string().nullable().describe('Title of the product.'),
      batchId: z.string().nullable().describe('Batch ID associated with the product.'),
      description: z.string().nullable().describe('Description of the product.'),
      tags: z.array(z.string()).nullable().describe('Tags assigned to the product.'),
      dimensions: z.string().nullable().describe('Dimensions of the product.'),
      externalUrl: z.string().nullable().describe('External URL of the product.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createProduct({
      sku: ctx.input.sku,
      title: ctx.input.title,
      batchId: ctx.input.batchId,
      description: ctx.input.description,
      tags: ctx.input.tags,
      dimensions: ctx.input.dimensions,
      externalUrl: ctx.input.externalUrl
    });

    let product = result.data;

    return {
      output: {
        productId: product.id,
        sku: product.attributes.sku,
        title: product.attributes.title,
        batchId: product.attributes.batch_id,
        description: product.attributes.description,
        tags: product.attributes.tags,
        dimensions: product.attributes.dimensions,
        externalUrl: product.attributes.external_url
      },
      message: `Successfully created product **${product.attributes.title || product.id}** (ID: \`${product.id}\`).`
    };
  })
  .build();
