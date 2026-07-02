import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve all products configured for the current vendor. Returns product details including name, version, active status, and licensing configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productNumber: z.string().describe('Unique product identifier'),
            name: z.string().optional().describe('Product name'),
            active: z.boolean().optional().describe('Whether the product is active'),
            version: z.string().optional().describe('Product version'),
            description: z.string().optional().describe('Product description'),
            licenseeAutoCreate: z
              .boolean()
              .optional()
              .describe('Whether licensees are auto-created')
          })
        )
        .describe('List of products')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let items = await client.listProducts();
    let products = items.map(item => ({
      productNumber: item.number,
      name: item.name,
      active: item.active,
      version: item.version,
      description: item.description,
      licenseeAutoCreate: item.licenseeAutoCreate
    }));
    return {
      output: { products },
      message: `Found **${products.length}** product(s).`
    };
  })
  .build();
