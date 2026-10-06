import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve one page of products in your DPD account. Optionally filter by storefront. Returns product IDs and names.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('1-based page; omitted means page 1. Continue until endOfResults is true.'),
      storefrontId: z
        .number()
        .optional()
        .describe(
          'Filter products by storefront ID. Omit to query products across storefronts.'
        )
    })
  )
  .output(
    z.object({
      products: z.array(
        z.object({
          productId: z.number().describe('Unique product ID'),
          name: z.string().optional().describe('Product name when supplied')
        })
      ),
      ...pageSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.listProducts(ctx.input.storefrontId, ctx.input.page);

    return {
      output: {
        products: result.items,
        page: result.page,
        nextPage: result.nextPage,
        endOfResults: result.endOfResults
      },
      message: `Retrieved ${result.items.length} products on page ${result.page}${result.endOfResults ? '; end of results confirmed' : ''}.`
    };
  })
  .build();
