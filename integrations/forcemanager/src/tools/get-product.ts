import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve one or more product records from the ForceManager catalog.
Fetch by ID or list/search products with filtering by model name or custom queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.number().optional().describe('Specific product ID to retrieve'),
      query: z.string().optional().describe('ForceManager query language filter'),
      model: z.string().optional().describe('Search by model name (LIKE match)'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      products: z.array(z.any()).describe('List of matching product records'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z.number().nullable().describe('Next page number, or null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.productId) {
      let product = await client.getProduct(ctx.input.productId);
      return {
        output: { products: [product], totalCount: 1, nextPage: null },
        message: `Retrieved product **${product?.model || ctx.input.productId}**`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.model) params.model = ctx.input.model;

    let result = await client.listProducts(params, ctx.input.page);

    return {
      output: {
        products: result.records,
        totalCount: result.entityCount,
        nextPage: result.nextPage
      },
      message: `Found **${result.entityCount}** product(s)${result.nextPage !== null ? ` (more pages available)` : ''}`
    };
  })
  .build();
