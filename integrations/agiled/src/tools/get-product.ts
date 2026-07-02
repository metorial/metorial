import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve a product by ID, or list products with pagination. Returns product details including name, price, and description.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z
        .string()
        .optional()
        .describe('ID of a specific product to retrieve. If omitted, lists products.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of products per page')
    })
  )
  .output(
    z.object({
      products: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of product records'),
      totalCount: z.number().optional().describe('Total number of products'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.productId) {
      let result = await client.getProduct(ctx.input.productId);
      return {
        output: { products: [result.data] },
        message: `Retrieved product **${result.data.name ?? ctx.input.productId}**.`
      };
    }

    let result = await client.listProducts(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        products: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} product(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
