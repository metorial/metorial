import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenResourceList } from '../lib/helpers';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `List all pickup/return locations and warehouses. Locations are physical sites where customers can pick up or return rental items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Results per page'),
      filterArchived: z.boolean().optional().describe('Filter by archived status')
    })
  )
  .output(
    z.object({
      locations: z.array(z.record(z.string(), z.any())).describe('List of location records'),
      totalCount: z.number().optional().describe('Total number of locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let filters: Record<string, string> = {};
    if (ctx.input.filterArchived !== undefined)
      filters.archived = String(ctx.input.filterArchived);

    let response = await client.listLocations({
      pagination: {
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      },
      filters
    });

    let locations = flattenResourceList(response);

    return {
      output: {
        locations,
        totalCount: response?.meta?.total_count
      },
      message: `Found ${locations.length} location(s).`
    };
  })
  .build();
