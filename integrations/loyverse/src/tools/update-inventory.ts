import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateInventory = SlateTool.create(spec, {
  name: 'Update Inventory',
  key: 'update_inventory',
  description: `Update stock levels for item variants across store locations. Supports batch updates for multiple variants and stores in a single request.`
})
  .input(
    z.object({
      inventoryLevels: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID to update stock for'),
            storeId: z.string().describe('Store ID where the stock is located'),
            inStock: z.number().describe('New stock quantity')
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
            inStock: z.number()
          })
        )
        .describe('Updated inventory levels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body = {
      inventory_levels: ctx.input.inventoryLevels.map(il => ({
        variant_id: il.variantId,
        store_id: il.storeId,
        in_stock: il.inStock
      }))
    };

    let result = await client.updateInventory(body);

    let updatedLevels = (result.inventory_levels ?? []).map((il: any) => ({
      variantId: il.variant_id,
      storeId: il.store_id,
      inStock: il.in_stock
    }));

    return {
      output: { updatedLevels },
      message: `Updated **${updatedLevels.length}** inventory level(s).`
    };
  })
  .build();
