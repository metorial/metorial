import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { spec } from '../spec';

let inventoryLevelSchema = z.object({
  variantId: z.string().describe('Variant ID'),
  storeId: z.string().describe('Store ID'),
  inStock: z.number().describe('Current stock quantity'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let getInventory = SlateTool.create(spec, {
  name: 'Get Inventory',
  key: 'get_inventory',
  description: `Retrieve inventory (stock) levels for item variants across store locations. Filter by stores, variants, or update time to check specific stock levels. Use this instead of the item tools to get stock information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of inventory records to return (1-250, default 50)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      storeId: z.string().optional().describe('Filter by a single store ID'),
      variantId: z.string().optional().describe('Filter by a single variant ID'),
      storeIds: z.array(z.string()).optional().describe('Filter by several store IDs'),
      variantIds: z.array(z.string()).optional().describe('Filter by several variant IDs'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Only return levels updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Only return levels updated at or before this ISO 8601 UTC timestamp')
    })
  )
  .output(
    z.object({
      inventoryLevels: z.array(inventoryLevelSchema).describe('Inventory level records'),
      cursor: z.string().nullable().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getInventory({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      storeIds: joinIds(ctx.input.storeId, ctx.input.storeIds),
      variantIds: joinIds(ctx.input.variantId, ctx.input.variantIds),
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax
    });

    let inventoryLevels = (result.inventory_levels ?? []).map((il: any) => ({
      variantId: il.variant_id,
      storeId: il.store_id,
      inStock: il.in_stock,
      updatedAt: il.updated_at
    }));

    return {
      output: { inventoryLevels, cursor: result.cursor },
      message: `Retrieved **${inventoryLevels.length}** inventory record(s).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();
