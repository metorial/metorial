import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Lists all products in your MailBluster brand. Returns an array of products with their IDs, names, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageNo: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of products per page')
    })
  )
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.string().describe('ID of the product'),
            name: z.string().describe('Name of the product'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of products')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let products = await client.listProducts(ctx.input.pageNo, ctx.input.perPage);

    let mappedProducts = (Array.isArray(products) ? products : []).map(p => ({
      productId: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return {
      output: {
        products: mappedProducts
      },
      message: `Retrieved **${mappedProducts.length}** product(s).`
    };
  })
  .build();
