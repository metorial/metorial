import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List all products in your Modelry account. Returns each product's ID, SKU, title, description, tags, dimensions, and external URL.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.string().describe('ID of the product.'),
            sku: z.string().nullable().describe('SKU of the product.'),
            title: z.string().nullable().describe('Title of the product.'),
            batchId: z.string().nullable().describe('Batch ID associated with the product.'),
            description: z.string().nullable().describe('Description of the product.'),
            tags: z.array(z.string()).nullable().describe('Tags assigned to the product.'),
            dimensions: z.string().nullable().describe('Dimensions of the product.'),
            externalUrl: z.string().nullable().describe('External URL of the product.')
          })
        )
        .describe('List of products.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProducts();

    let products = result.data.map(product => ({
      productId: product.id,
      sku: product.attributes.sku,
      title: product.attributes.title,
      batchId: product.attributes.batch_id,
      description: product.attributes.description,
      tags: product.attributes.tags,
      dimensions: product.attributes.dimensions,
      externalUrl: product.attributes.external_url
    }));

    return {
      output: { products },
      message: `Found **${products.length}** product(s).`
    };
  })
  .build();
