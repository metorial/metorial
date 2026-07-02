import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenResourceList } from '../lib/helpers';
import { spec } from '../spec';

export let checkAvailability = SlateTool.create(spec, {
  name: 'Check Inventory',
  key: 'check_inventory',
  description: `Query inventory levels and availability for products. Check stock at specific locations and view breakdowns of available, reserved, and rented inventory.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productGroupId: z.string().optional().describe('Filter by product group ID'),
      locationId: z.string().optional().describe('Filter by location ID'),
      from: z.string().optional().describe('Start of date range in ISO 8601 format'),
      till: z.string().optional().describe('End of date range in ISO 8601 format'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      inventoryLevels: z
        .array(z.record(z.string(), z.any()))
        .describe('Inventory level records with stock counts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let filters: Record<string, string> = {};
    if (ctx.input.productGroupId) filters.product_group_id = ctx.input.productGroupId;
    if (ctx.input.locationId) filters.location_id = ctx.input.locationId;
    if (ctx.input.from) filters.from = ctx.input.from;
    if (ctx.input.till) filters.till = ctx.input.till;

    let response = await client.listInventoryLevels({
      pagination: {
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      },
      filters
    });

    let inventoryLevels = flattenResourceList(response);

    return {
      output: { inventoryLevels },
      message: `Found ${inventoryLevels.length} inventory level record(s).`
    };
  })
  .build();
