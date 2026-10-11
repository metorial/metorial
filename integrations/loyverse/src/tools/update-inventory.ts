import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateInventory = SlateTool.create(spec, {
  name: 'Update Inventory',
  key: 'update_inventory',
  description: `Set the stock level of item variants at store locations. Supports batch updates for multiple variants and stores in a single request. The value replaces the current stock (it is not added to it).`,
  instructions: [
    'Stock can only be set for variants of items with stock tracking enabled (trackStock).'
  ]
})
  .input(
    z.object({
      inventoryLevels: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID to update stock for'),
            storeId: z.string().describe('Store ID where the stock is located'),
            inStock: z.number().describe('New absolute stock quantity')
          })
        )
        .min(1)
        .describe('Inventory levels to update')
    })
  )
  .output(
    z.object({
      updatedLevels: z
        .array(
          z.object({
            variantId: z.string(),
            storeId: z.string(),
            inStock: z.number(),
            updatedAt: z.string().optional()
          })
        )
        .describe('Updated inventory levels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateInventory({
      inventory_levels: ctx.input.inventoryLevels.map(il => ({
        variant_id: il.variantId,
        store_id: il.storeId,
        stock_after: il.inStock
      }))
    });

    let updatedLevels = (result.inventory_levels ?? []).map((il: any) => ({
      variantId: il.variant_id,
      storeId: il.store_id,
      inStock: il.in_stock ?? il.stock_after,
      updatedAt: il.updated_at
    }));

    return {
      output: { updatedLevels },
      message: `Updated **${updatedLevels.length}** inventory level(s).`
    };
  })
  .build();
