import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve products from a Squarespace store. Supports filtering by product type and date range. Returns physical, service, gift card, and download products with their variants and images.`,
  instructions: [
    'Cannot combine cursor with date range filters — use one or the other',
    'Use comma-separated product types to filter (e.g., "PHYSICAL,SERVICE")'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 UTC datetime — only return products modified after this date'),
      modifiedBefore: z
        .string()
        .optional()
        .describe('ISO 8601 UTC datetime — only return products modified before this date'),
      type: z
        .string()
        .optional()
        .describe('Comma-separated product types: PHYSICAL, SERVICE, GIFT_CARD, DIGITAL')
    })
  )
  .output(
    z.object({
      products: z.array(z.any()).describe('Array of product objects with variants and images'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      nextPageCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProducts({
      cursor: ctx.input.cursor,
      modifiedAfter: ctx.input.modifiedAfter,
      modifiedBefore: ctx.input.modifiedBefore,
      type: ctx.input.type
    });

    return {
      output: {
        products: result.products,
        hasNextPage: result.pagination.hasNextPage,
        nextPageCursor: result.pagination.nextPageCursor
      },
      message: `Retrieved **${result.products.length}** products.${result.pagination.hasNextPage ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
