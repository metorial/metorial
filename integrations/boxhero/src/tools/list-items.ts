import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { itemSchema, mapItem } from '../lib/schemas';
import { spec } from '../spec';

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `Retrieve inventory items from BoxHero. Supports filtering by location and pagination for large inventories. Returns item details including name, SKU, barcode, cost, price, and custom attributes.`,
  constraints: [
    'Rate limited to 5 requests per second.',
    'Returns up to 100 items per page by default.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      locationIds: z
        .array(z.number())
        .optional()
        .describe(
          'Filter items by nonzero stock at these locations. Call list_locations to discover IDs'
        ),
      itemIds: z.array(z.number()).optional().describe('Filter to item IDs from list_items'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of items to return per page (default 100)'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response to fetch the next page')
    })
  )
  .output(
    z.object({
      items: z.array(itemSchema).describe('List of inventory items'),
      hasMore: z.boolean().describe('Whether more items are available beyond this page'),
      cursor: z.string().optional().describe('Cursor to use for fetching the next page'),
      raw: z.unknown().optional().describe('Original page returned by BoxHero')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listItems({
      locationIds: ctx.input.locationIds,
      itemIds: ctx.input.itemIds,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let items = response.items.map(mapItem);

    return {
      output: {
        items,
        hasMore: response.has_more,
        cursor: response.cursor == null ? undefined : String(response.cursor),
        raw: response
      },
      message: `Retrieved ${items.length} item(s).${response.has_more ? ' More items available — use the cursor to fetch the next page.' : ''}`
    };
  })
  .build();
