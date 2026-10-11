import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { itemSchema, mapItem } from '../lib/items';
import { spec } from '../spec';

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `Retrieve items (products) from the Loyverse catalog, newest first. Supports filtering by item IDs and by created/updated time for syncing recently changed products. Returns paginated results with variants, pricing, stock tracking, and category assignments. To find a product by SKU, use List Variants.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of items to return (1-250, default 50)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      itemIds: z.array(z.string()).optional().describe('Only return items with these IDs'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Filter items created at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Filter items created at or before this ISO 8601 UTC timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Filter items updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Filter items updated at or before this ISO 8601 UTC timestamp'),
      showDeleted: z.boolean().optional().describe('Include deleted items in the response')
    })
  )
  .output(
    z.object({
      items: z.array(itemSchema).describe('List of items'),
      cursor: z.string().nullable().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listItems({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      itemIds: joinIds(ctx.input.itemIds),
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      showDeleted: ctx.input.showDeleted
    });

    let items = (result.items ?? []).map(mapItem);

    return {
      output: {
        items,
        cursor: result.cursor
      },
      message: `Retrieved **${items.length}** item(s).${result.cursor ? ' More items available via cursor pagination.' : ''}`
    };
  })
  .build();
