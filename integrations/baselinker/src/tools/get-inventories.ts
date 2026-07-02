import { SlateTool } from 'slates';
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
      manufacturers: z.any().optional().describe('List of manufacturers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    let inventoriesResult = await client.getInventories();
    let categories: any;
    let manufacturers: any;

    if (ctx.input.includeCategoriesForInventoryId) {
      let catResult = await client.getInventoryCategories(
        ctx.input.includeCategoriesForInventoryId
      );
      categories = catResult.categories;
    }

    if (ctx.input.includeManufacturers) {
      let mfgResult = await client.getInventoryManufacturers();
      manufacturers = mfgResult.manufacturers;
    }

    let inventories = inventoriesResult.inventories || [];

    return {
      output: { inventories, categories, manufacturers },
      message: `Retrieved **${Array.isArray(inventories) ? inventories.length : Object.keys(inventories).length}** inventory catalog(s).`
    };
  })
  .build();
