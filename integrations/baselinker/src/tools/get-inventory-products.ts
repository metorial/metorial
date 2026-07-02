import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let getInventoryProducts = SlateTool.create(spec, {
  name: 'Get Inventory Products',
  key: 'get_inventory_products',
  description: `Retrieve products from a BaseLinker inventory (product catalog). Use **list** mode to browse products with filters (by category, name, SKU, EAN, price range, stock range). Use **detail** mode to get full product data (including variants, images, text fields, stock, prices) for specific product IDs. Returns up to 1000 products per page in list mode.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      inventoryId: z.number().describe('Catalog (inventory) ID'),
      mode: z
        .enum(['list', 'detail'])
        .describe('"list" for browsing/filtering, "detail" for full product data by IDs'),

      // List mode filters
      filterCategoryId: z.number().optional().describe('Filter by category ID (list mode)'),
      filterEan: z.string().optional().describe('Filter by EAN code (list mode)'),
      filterSku: z.string().optional().describe('Filter by SKU (list mode)'),
      filterName: z.string().optional().describe('Filter by product name (list mode)'),
      filterPriceFrom: z.number().optional().describe('Minimum price filter (list mode)'),
      filterPriceTo: z.number().optional().describe('Maximum price filter (list mode)'),
      filterStockFrom: z.number().optional().describe('Minimum stock filter (list mode)'),
      filterStockTo: z.number().optional().describe('Maximum stock filter (list mode)'),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination (list mode, 1000 products per page)'),

      // Detail mode
      productIds: z.array(z.number()).optional().describe('Product IDs to fetch (detail mode)')
    })
  )
  .output(
    z.object({
      products: z.any().describe('Products data — shape depends on mode')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    if (ctx.input.mode === 'detail') {
      let result = await client.getInventoryProductsData({
        inventoryId: ctx.input.inventoryId,
        products: ctx.input.productIds || []
      });

      let products = result.products || {};
      let count = Object.keys(products).length;

      return {
        output: { products },
        message: `Retrieved detailed data for **${count}** product(s) from inventory **#${ctx.input.inventoryId}**.`
      };
    }

    // list mode
    let result = await client.getInventoryProductsList({
      inventoryId: ctx.input.inventoryId,
      filterCategoryId: ctx.input.filterCategoryId,
      filterEan: ctx.input.filterEan,
      filterSku: ctx.input.filterSku,
      filterName: ctx.input.filterName,
      filterPriceFrom: ctx.input.filterPriceFrom,
      filterPriceTo: ctx.input.filterPriceTo,
      filterStockFrom: ctx.input.filterStockFrom,
      filterStockTo: ctx.input.filterStockTo,
      page: ctx.input.page
    });

    let products = result.products || {};
    let count = Object.keys(products).length;

    return {
      output: { products },
      message: `Retrieved **${count}** product(s) from inventory **#${ctx.input.inventoryId}**${ctx.input.page ? ` (page ${ctx.input.page})` : ''}.`
    };
  })
  .build();
