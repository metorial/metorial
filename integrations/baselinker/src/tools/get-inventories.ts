import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let getInventories = SlateTool.create(spec, {
  name: 'Get Inventories',
  key: 'get_inventories',
  description: `Retrieve the list of BaseLinker inventories (product catalogs), their categories, and manufacturers. Provides the inventory IDs needed to work with products, stock, and prices.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeCategoriesForInventoryId: z
        .number()
        .optional()
        .describe('Also fetch categories for this inventory ID'),
      includeWarehouses: z
        .boolean()
        .optional()
        .describe('Also retrieve warehouse IDs, names and types'),
      includePriceGroups: z
        .boolean()
        .optional()
        .describe('Also retrieve price group IDs, names and currencies'),
      manufacturersPage: z
        .number()
        .optional()
        .describe('Manufacturer page, 1000 per page; used when includeManufacturers is true'),
      includeManufacturers: z
        .boolean()
        .optional()
        .describe('Also fetch the list of manufacturers')
    })
  )
  .output(
    z.object({
      inventories: z.any().describe('List of inventories with their IDs, names, and details'),
      categories: z.any().optional().describe('Categories for the requested inventory'),
      manufacturers: z.any().optional().describe('List of manufacturers'),
      warehouses: z.any().optional().describe('Available warehouses'),
      priceGroups: z.any().optional().describe('Available price groups')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.manufacturersPage !== undefined &&
      (!Number.isInteger(ctx.input.manufacturersPage) || ctx.input.manufacturersPage < 1)
    ) {
      throw createApiServiceError('manufacturersPage must be a positive integer.');
    }
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    let inventoriesResult = await client.getInventories();
    let categories: any;
    let manufacturers: any;
    let warehouses: any;
    let priceGroups: any;

    if (ctx.input.includeCategoriesForInventoryId !== undefined) {
      let catResult = await client.getInventoryCategories(
        ctx.input.includeCategoriesForInventoryId
      );
      categories = catResult.categories;
    }

    if (ctx.input.includeManufacturers) {
      let mfgResult = await client.getInventoryManufacturers(ctx.input.manufacturersPage);
      manufacturers = mfgResult.manufacturers;
    }

    if (ctx.input.includeWarehouses) {
      warehouses = (await client.getInventoryWarehouses()).warehouses;
    }
    if (ctx.input.includePriceGroups) {
      priceGroups = (await client.getInventoryPriceGroups()).price_groups;
    }
    let inventories = inventoriesResult.inventories;

    return {
      output: { inventories, categories, manufacturers, warehouses, priceGroups },
      message: `Retrieved **${Array.isArray(inventories) ? inventories.length : Object.keys(inventories).length}** inventory catalog(s).`
    };
  })
  .build();
