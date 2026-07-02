import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let updateInventoryStockPrices = SlateTool.create(spec, {
  name: 'Update Inventory Stock & Prices',
  key: 'update_inventory_stock_prices',
  description: `Bulk update stock quantities and/or prices for products in a BaseLinker inventory. Can update up to 1000 products at a time. Provide stock and/or prices — both are optional, at least one is required.`,
  instructions: [
    'Stock keys are warehouse IDs in format "bl_<id>", e.g. "bl_123".',
    'Price keys are price group IDs as strings.',
    'Product keys are product IDs as strings.'
  ],
  constraints: ['Maximum 1000 products per request.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      inventoryId: z.number().describe('Catalog (inventory) ID'),
      stockUpdates: z
        .record(z.string(), z.record(z.string(), z.number()))
        .optional()
        .describe('Stock updates: { "productId": { "warehouseId": quantity } }'),
      priceUpdates: z
        .record(z.string(), z.record(z.string(), z.number()))
        .optional()
        .describe('Price updates: { "productId": { "priceGroupId": price } }')
    })
  )
  .output(
    z.object({
      stockUpdated: z.boolean().describe('Whether stock was updated'),
      pricesUpdated: z.boolean().describe('Whether prices were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });
    let stockUpdated = false;
    let pricesUpdated = false;
    let messages: string[] = [];

    if (ctx.input.stockUpdates && Object.keys(ctx.input.stockUpdates).length > 0) {
      await client.updateInventoryProductsStock({
        inventoryId: ctx.input.inventoryId,
        products: ctx.input.stockUpdates
      });
      stockUpdated = true;
      messages.push(`stock for ${Object.keys(ctx.input.stockUpdates).length} product(s)`);
    }

    if (ctx.input.priceUpdates && Object.keys(ctx.input.priceUpdates).length > 0) {
      await client.updateInventoryProductsPrices({
        inventoryId: ctx.input.inventoryId,
        products: ctx.input.priceUpdates
      });
      pricesUpdated = true;
      messages.push(`prices for ${Object.keys(ctx.input.priceUpdates).length} product(s)`);
    }

    return {
      output: { stockUpdated, pricesUpdated },
      message:
        messages.length > 0
          ? `Updated ${messages.join(' and ')} in inventory **#${ctx.input.inventoryId}**.`
          : 'No updates provided.'
    };
  })
  .build();
