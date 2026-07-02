import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bigcommerceServiceError } from '../lib/errors';
import { spec } from '../spec';

let inventoryAdjustmentItemSchema = z.object({
  locationId: z.number().describe('Inventory location ID to update'),
  quantity: z.number().describe('Absolute inventory quantity to set'),
  sku: z
    .string()
    .optional()
    .describe('SKU to update. Provide sku, variantId, or productId for each item.'),
  variantId: z
    .number()
    .optional()
    .describe('Variant ID to update. Provide sku, variantId, or productId for each item.'),
  productId: z
    .number()
    .optional()
    .describe('Product ID to update when the product has no variants.')
});

export let manageInventory = SlateTool.create(spec, {
  name: 'Manage Inventory',
  key: 'manage_inventory',
  description: `List location-aware inventory items, list inventory locations, or apply absolute inventory adjustments. Absolute adjustments set the current quantity for tracked products or variants at specific locations.`,
  instructions: [
    'Use action "list_items" to view inventory quantities across locations.',
    'Use action "list_locations" to retrieve inventory locations.',
    'Use action "adjust_absolute" to set inventory quantities; each item needs locationId, quantity, and at least one of sku, variantId, or productId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list_items', 'list_locations', 'adjust_absolute'])
        .describe('Action to perform'),
      page: z.number().optional().describe('Page number for list actions'),
      limit: z.number().optional().describe('Results per page for list actions'),
      sku: z.string().optional().describe('Filter inventory items by SKU'),
      variantId: z.number().optional().describe('Filter inventory items by variant ID'),
      productId: z.number().optional().describe('Filter inventory items by product ID'),
      locationId: z.number().optional().describe('Filter inventory items by location ID'),
      reason: z.string().optional().describe('Reason for an absolute adjustment'),
      items: z
        .array(inventoryAdjustmentItemSchema)
        .optional()
        .describe('Items for adjust_absolute. Not used for list actions.')
    })
  )
  .output(
    z.object({
      inventoryItems: z
        .array(z.any())
        .optional()
        .describe('Inventory item records returned by list_items'),
      locations: z
        .array(z.any())
        .optional()
        .describe('Inventory locations returned by list_locations'),
      adjustment: z.any().optional().describe('Absolute adjustment response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    if (ctx.input.action === 'list_locations') {
      let params: Record<string, any> = {};
      if (ctx.input.page) params.page = ctx.input.page;
      if (ctx.input.limit) params.limit = ctx.input.limit;

      let result = await client.listLocations(params);
      return {
        output: { locations: result.data },
        message: `Found ${result.data.length} inventory locations.`
      };
    }

    if (ctx.input.action === 'list_items') {
      let params: Record<string, any> = {};
      if (ctx.input.page) params.page = ctx.input.page;
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.sku) params.sku = ctx.input.sku;
      if (ctx.input.variantId !== undefined) params.variant_id = ctx.input.variantId;
      if (ctx.input.productId !== undefined) params.product_id = ctx.input.productId;
      if (ctx.input.locationId !== undefined) params.location_id = ctx.input.locationId;

      let result = await client.getInventoryItems(params);
      return {
        output: { inventoryItems: result.data },
        message: `Found ${result.data.length} inventory item records.`
      };
    }

    if (!ctx.input.items?.length) {
      throw bigcommerceServiceError('items is required for adjust_absolute');
    }

    let items = ctx.input.items.map((item, index) => {
      if (
        item.sku === undefined &&
        item.variantId === undefined &&
        item.productId === undefined
      ) {
        throw bigcommerceServiceError(`items[${index}] requires sku, variantId, or productId`);
      }

      let mapped: Record<string, any> = {
        location_id: item.locationId,
        quantity: item.quantity
      };

      if (item.sku !== undefined) mapped.sku = item.sku;
      if (item.variantId !== undefined) mapped.variant_id = item.variantId;
      if (item.productId !== undefined) mapped.product_id = item.productId;

      return mapped;
    });

    let adjustment = await client.adjustInventory({
      items,
      reason: ctx.input.reason
    });

    return {
      output: { adjustment },
      message: `Applied absolute inventory adjustment for ${items.length} item(s).`
    };
  })
  .build();
