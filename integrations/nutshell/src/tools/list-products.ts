import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `List products available in Nutshell CRM. Products can be associated with leads to track what is being sold.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z.string().optional().describe('Search term to filter products by name'),
      limit: z
        .number()
        .optional()
        .describe(
          'Results per page in list mode (default: 50); maximum matches in search mode (default: 10)'
        ),
      page: z
        .number()
        .optional()
        .describe('List page number (default: 1). Name search only supports page 1.')
    })
  )
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.number().describe('ID of the product'),
            name: z.string().describe('Product name'),
            entityType: z.string().optional().describe('Entity type')
          })
        )
        .describe('List of products'),
      count: z.number().describe('Number of products returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let results: Awaited<ReturnType<NutshellClient['findProducts']>>;
    if (ctx.input.searchQuery) {
      results = await client.searchProducts(
        ctx.input.searchQuery,
        ctx.input.limit,
        ctx.input.page
      );
    } else {
      results = await client.findProducts({
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let products = results.map(p => ({
      productId: p.id,
      name: p.name,
      entityType: p.entityType
    }));

    return {
      output: {
        products,
        count: products.length
      },
      message: `Found **${products.length}** product(s).`
    };
  })
  .build();
