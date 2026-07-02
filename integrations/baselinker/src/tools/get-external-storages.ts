import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let getExternalStorages = SlateTool.create(spec, {
  name: 'Get External Storages',
  key: 'get_external_storages',
  description: `Retrieve external storages (connected shops and warehouses) and their products. Lists all connected external storages, and optionally fetches product data, stock, or prices from a specific storage.`,
  instructions: [
    'First call without a storageId to list all connected storages.',
    'Then use a storageId to fetch products, stock, or prices from a specific storage.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storageId: z.string().optional().describe('External storage ID to fetch data from'),
      fetchProducts: z.boolean().optional().describe('Fetch product list from the storage'),
      fetchStock: z.boolean().optional().describe('Fetch stock quantities from the storage'),
      fetchPrices: z.boolean().optional().describe('Fetch prices from the storage'),
      productIds: z
        .array(z.string())
        .optional()
        .describe('Specific product IDs to fetch detailed data for'),
      filterCategoryId: z.string().optional().describe('Filter products by category ID'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      storages: z.any().optional().describe('List of connected external storages'),
      products: z.any().optional().describe('Products from the storage'),
      stock: z.any().optional().describe('Stock data from the storage'),
      prices: z.any().optional().describe('Prices from the storage')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });
    let storages: any;
    let products: any;
    let stock: any;
    let prices: any;

    if (!ctx.input.storageId) {
      let result = await client.getExternalStoragesList();
      storages = result.storages || [];
      let count = Array.isArray(storages) ? storages.length : Object.keys(storages).length;
      return {
        output: { storages },
        message: `Found **${count}** connected external storage(s).`
      };
    }

    let messages: string[] = [];

    if (ctx.input.productIds && ctx.input.productIds.length > 0) {
      let result = await client.getExternalStorageProductsData({
        storageId: ctx.input.storageId,
        products: ctx.input.productIds
      });
      products = result.products;
      messages.push(`${ctx.input.productIds.length} product detail(s)`);
    } else if (ctx.input.fetchProducts) {
      let result = await client.getExternalStorageProductsList({
        storageId: ctx.input.storageId,
        filterCategoryId: ctx.input.filterCategoryId,
        page: ctx.input.page
      });
      products = result.products;
      messages.push('product list');
    }

    if (ctx.input.fetchStock) {
      let result = await client.getExternalStorageProductsQuantity({
        storageId: ctx.input.storageId,
        page: ctx.input.page
      });
      stock = result.products;
      messages.push('stock data');
    }

    if (ctx.input.fetchPrices) {
      let result = await client.getExternalStorageProductsPrices({
        storageId: ctx.input.storageId,
        page: ctx.input.page
      });
      prices = result.products;
      messages.push('price data');
    }

    return {
      output: { products, stock, prices },
      message: `Fetched ${messages.join(', ')} from external storage **${ctx.input.storageId}**.`
    };
  })
  .build();
