import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requireValue, validatePeriod } from '../lib/client';
import { buildClientConfig, flattenResourceList } from '../lib/helpers';
import { spec } from '../spec';

export let checkAvailability = SlateTool.create(spec, {
  name: 'Check Inventory',
  key: 'check_inventory',
  description:
    'DEPRECATED — use `get_inventory_availability` instead. Read raw inventory snapshots for reporting. This legacy endpoint does not apply booking rules.',
  instructions: [
    'Use get_inventory_availability to find quantities that can be booked. Retain check_inventory only when raw reporting snapshots are needed.'
  ],
  tags: { readOnly: true, deprecated: true }
})
  .input(
    z.object({
      productGroupId: z
        .string()
        .optional()
        .describe(
          'Product group ID. Its product variations are resolved before querying inventory.'
        ),
      locationId: z
        .string()
        .optional()
        .describe('Filter by location ID. Call list_locations to discover IDs.'),
      from: z.string().optional().describe('Required start of date range in ISO 8601 format'),
      till: z.string().optional().describe('Required end of date range in ISO 8601 format'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      inventoryLevels: z
        .array(z.record(z.string(), z.any()))
        .describe('Raw inventory level records with stock counts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));
    let from = requireValue(ctx.input.from, 'Start of date range');
    let till = requireValue(ctx.input.till, 'End of date range');
    validatePeriod(from, till);
    let filters: Record<string, string | string[]> = { from, till };
    if (ctx.input.locationId) filters.location_id = ctx.input.locationId;
    if (ctx.input.productGroupId) {
      let productIds: string[] = [];
      for (let page = 1; ; page++) {
        let products = await client.listResource('products', {
          pagination: { pageNumber: page, pageSize: 100 },
          filters: { product_group_id: ctx.input.productGroupId }
        });
        let records = products.data ?? [];
        productIds.push(...records.map((product: { id: string }) => product.id));
        if (records.length < 100) break;
      }
      if (!productIds.length)
        return {
          output: { inventoryLevels: [] },
          message: 'The product group has no product variations.'
        };
      filters['item_id[]'] = productIds;
    }
    let response = await client.listInventoryLevels({
      pagination: { pageNumber: ctx.input.pageNumber, pageSize: ctx.input.pageSize },
      filters
    });
    let inventoryLevels = flattenResourceList(response);
    return {
      output: { inventoryLevels },
      message: `Found ${inventoryLevels.length} raw inventory snapshot(s).`
    };
  })
  .build();
