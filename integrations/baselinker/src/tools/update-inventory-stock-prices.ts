import { createApiServiceError, SlateTool } from 'slates';
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
      inventoryId: z
        .number()
        .describe('Catalog ID. Call get_inventories to discover catalog IDs.'),
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
      pricesUpdated: z.boolean().describe('Whether prices were updated'),
      stockResult: z
        .any()
        .optional()
        .describe(
          'Unmodified stock result with the actual updated counter and per-product warnings'
        ),
      priceResult: z
        .any()
        .optional()
        .describe(
          'Unmodified price result with the actual updated counter and per-product warnings'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });
    let stockCount = Object.keys(ctx.input.stockUpdates ?? {}).length;
    let priceCount = Object.keys(ctx.input.priceUpdates ?? {}).length;
    if (!stockCount && !priceCount) {
      throw createApiServiceError('Provide nonempty stockUpdates or priceUpdates.');
    }
    if (stockCount > 1000 || priceCount > 1000) {
      throw createApiServiceError(
        'Each stock or price request supports at most 1000 products.'
      );
    }
    let stockResult: any;
    let priceResult: any;
    let stockUpdated = false;
    let pricesUpdated = false;
    let messages: string[] = [];

    if (ctx.input.stockUpdates && Object.keys(ctx.input.stockUpdates).length > 0) {
      stockResult = await client.updateInventoryProductsStock({
        inventoryId: ctx.input.inventoryId,
        products: ctx.input.stockUpdates
      });
      if (typeof stockResult.counter !== 'number') {
        throw createApiServiceError('BaseLinker did not return the stock update counter.');
      }
      stockUpdated = stockResult.counter > 0;
      messages.push(
        `stock for ${stockResult.counter} product(s); inspect stockResult.warnings for individual errors`
      );
    }

    if (ctx.input.priceUpdates && Object.keys(ctx.input.priceUpdates).length > 0) {
      priceResult = await client.updateInventoryProductsPrices({
        inventoryId: ctx.input.inventoryId,
        products: ctx.input.priceUpdates
      });
      if (typeof priceResult.counter !== 'number') {
        throw createApiServiceError('BaseLinker did not return the price update counter.');
      }
      pricesUpdated = priceResult.counter > 0;
      messages.push(
        `prices for ${priceResult.counter} product(s); inspect priceResult.warnings for individual errors`
      );
    }

    return {
      output: { stockUpdated, pricesUpdated, stockResult, priceResult },
      message:
        messages.length > 0
          ? `Updated ${messages.join(' and ')} in inventory **#${ctx.input.inventoryId}**.`
          : 'No updates provided.'
    };
  })
  .build();
