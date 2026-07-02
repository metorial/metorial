import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';
import { mapProduct, productSchema } from './product-utils';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve products from your Gumroad account. Returns product details including name, price, category, sales count, and publish status.`,
  instructions: ['Use pageKey from a previous response to retrieve the next page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageKey: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema).describe('List of products'),
      nextPageKey: z.string().optional().describe('Cursor for the next page of results'),
      nextPageUrl: z.string().optional().describe('URL for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let result = await client.listProducts({ pageKey: ctx.input.pageKey });
    let mapped = result.products.map(mapProduct);

    return {
      output: {
        products: mapped,
        nextPageKey: result.nextPageKey,
        nextPageUrl: result.nextPageUrl
      },
      message: `Found **${mapped.length}** product(s).${result.nextPageKey ? ' More results are available with pagination.' : ''}`
    };
  })
  .build();
