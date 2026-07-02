import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let productResultSchema = z
  .object({
    domain: z.string().optional().describe('Website domain selling the product'),
    url: z.string().optional().describe('Product page URL'),
    title: z.string().optional().describe('Product title')
  })
  .passthrough();

export let searchProducts = SlateTool.create(spec, {
  name: 'Search eCommerce Products',
  key: 'search_products',
  description: `Find websites selling specific eCommerce products by search query. Returns domains and product pages matching the search term.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Product search query (e.g., "wireless headphones")')
    })
  )
  .output(
    z.object({
      products: z
        .array(productResultSchema)
        .describe('Websites and product pages matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.productSearch(ctx.input.query);

    let products = data?.Results ?? [];

    return {
      output: {
        products
      },
      message: `Found **${products.length}** product result(s) for query **"${ctx.input.query}"**.`
    };
  });
