import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { shopifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let inventoryLevelSchema = z.object({
  inventoryItemId: z.string(),
  locationId: z.string(),
  available: z.number().nullable(),
  updatedAt: z.string()
});

export let manageInventory = SlateTool.create(spec, {
  name: 'Manage Inventory',
  key: 'manage_inventory',
  description: `View and adjust inventory levels across locations. Supports:
- **list**: Query inventory levels by item IDs or location IDs
- **set**: Set absolute inventory quantity for an item at a location
- **adjust**: Increment or decrement inventory by a relative amount`,
  instructions: [
    'To find inventory item IDs, use Get Product — each variant includes its inventoryItemId.',
    'To find location IDs, use List Locations.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      action: z.enum(['list', 'set', 'adjust']).describe('Operation to perform'),
      inventoryItemIds: z
        .string()
        .optional()
        .describe('Comma-separated inventory item IDs (for list action)'),
      locationIds: z
        .string()
        .optional()
        .describe('Comma-separated location IDs (for list action)'),
      inventoryItemId: z
        .string()
        .optional()
        .describe('Single inventory item ID (for set/adjust actions)'),
      locationId: z
        .string()
        .optional()
        .describe('Single location ID (for set/adjust actions)'),
      available: z.number().optional().describe('Absolute quantity to set (for set action)'),
      adjustment: z
        .number()
        .optional()
        .describe('Relative quantity change, positive or negative (for adjust action)'),
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of results to return (for list action)')
    })
  )
  .output(
    z.object({
      inventoryLevels: z.array(inventoryLevelSchema).optional(),
      inventoryLevel: inventoryLevelSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let mapLevel = (l: any) => ({
      inventoryItemId: String(l.inventory_item_id),
      locationId: String(l.location_id),
      available: l.available,
      updatedAt: l.updated_at
    });

    if (ctx.input.action === 'list') {
      let levels = await client.listInventoryLevels({
        inventoryItemIds: ctx.input.inventoryItemIds,
        locationIds: ctx.input.locationIds,
        limit: ctx.input.limit
      });
      return {
        output: { inventoryLevels: levels.map(mapLevel) },
        message: `Found **${levels.length}** inventory level(s).`
      };
    }

    if (ctx.input.action === 'set') {
      if (!ctx.input.inventoryItemId)
        throw shopifyServiceError('inventoryItemId is required for set');
      if (!ctx.input.locationId) throw shopifyServiceError('locationId is required for set');
      if (ctx.input.available === undefined)
        throw shopifyServiceError('available is required for set');

      let level = await client.setInventoryLevel({
        inventoryItemId: ctx.input.inventoryItemId,
        locationId: ctx.input.locationId,
        available: ctx.input.available
      });
      return {
        output: { inventoryLevel: mapLevel(level) },
        message: `Set inventory to **${ctx.input.available}** for item ${ctx.input.inventoryItemId} at location ${ctx.input.locationId}.`
      };
    }

    if (ctx.input.action === 'adjust') {
      if (!ctx.input.inventoryItemId)
        throw shopifyServiceError('inventoryItemId is required for adjust');
      if (!ctx.input.locationId)
        throw shopifyServiceError('locationId is required for adjust');
      if (ctx.input.adjustment === undefined)
        throw shopifyServiceError('adjustment is required for adjust');

      let level = await client.adjustInventoryLevel({
        inventoryItemId: ctx.input.inventoryItemId,
        locationId: ctx.input.locationId,
        availableAdjustment: ctx.input.adjustment
      });
      return {
        output: { inventoryLevel: mapLevel(level) },
        message: `Adjusted inventory by **${ctx.input.adjustment > 0 ? '+' : ''}${ctx.input.adjustment}** for item ${ctx.input.inventoryItemId} at location ${ctx.input.locationId}. New available: ${level.available}.`
      };
    }

    throw shopifyServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
