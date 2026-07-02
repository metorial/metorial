import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenResourceList, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let manageStock = SlateTool.create(spec, {
  name: 'Manage Stock',
  key: 'manage_stock',
  description: `List, create, or update stock items for trackable products. Stock items represent individual physical items in your inventory with unique identifiers. Use this to add new stock, update identifiers, or view existing stock items.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('Action to perform'),
      stockItemId: z.string().optional().describe('Stock item ID (required for update)'),
      productId: z
        .string()
        .optional()
        .describe('Product ID (used for list filtering and create)'),
      locationId: z.string().optional().describe('Location ID for the stock item'),
      identifier: z
        .string()
        .optional()
        .describe('Unique identifier/barcode for the stock item'),
      pageNumber: z.number().optional().describe('Page number for list action'),
      pageSize: z.number().optional().describe('Page size for list action')
    })
  )
  .output(
    z.object({
      stockItem: z
        .record(z.string(), z.any())
        .optional()
        .describe('The created or updated stock item'),
      stockItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of stock items (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    if (ctx.input.action === 'list') {
      let filters: Record<string, string> = {};
      if (ctx.input.productId) filters.item_id = ctx.input.productId;
      if (ctx.input.locationId) filters.location_id = ctx.input.locationId;

      let response = await client.listStockItems({
        pagination: {
          pageNumber: ctx.input.pageNumber,
          pageSize: ctx.input.pageSize
        },
        filters
      });

      let stockItems = flattenResourceList(response);
      return {
        output: { stockItems },
        message: `Found ${stockItems.length} stock item(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let attributes: Record<string, any> = {};
      if (ctx.input.productId) attributes.item_id = ctx.input.productId;
      if (ctx.input.locationId) attributes.location_id = ctx.input.locationId;
      if (ctx.input.identifier) attributes.identifier = ctx.input.identifier;

      let response = await client.createStockItem(attributes);
      let stockItem = flattenSingleResource(response);

      return {
        output: { stockItem },
        message: `Created stock item **${stockItem?.identifier || stockItem?.resourceId}**.`
      };
    }

    if (ctx.input.action === 'update' && ctx.input.stockItemId) {
      let attributes: Record<string, any> = {};
      if (ctx.input.identifier) attributes.identifier = ctx.input.identifier;
      if (ctx.input.locationId) attributes.location_id = ctx.input.locationId;

      let response = await client.updateStockItem(ctx.input.stockItemId, attributes);
      let stockItem = flattenSingleResource(response);

      return {
        output: { stockItem },
        message: `Updated stock item **${stockItem?.identifier || ctx.input.stockItemId}**.`
      };
    }

    return {
      output: {},
      message: 'No action performed. Provide a valid action and required parameters.'
    };
  })
  .build();
