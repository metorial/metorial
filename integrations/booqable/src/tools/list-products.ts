import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenResourceList } from '../lib/helpers';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Search and list product groups in your Booqable catalog. Product groups are the top-level items that contain individual product variations. Supports filtering by name, SKU, tracking type, and archived status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Results per page (default 25)'),
      filterName: z.string().optional().describe('Filter by product name'),
      filterSku: z.string().optional().describe('Filter by SKU'),
      filterTrackable: z
        .boolean()
        .optional()
        .describe('Filter by whether products are individually trackable'),
      filterArchived: z.boolean().optional().describe('Filter by archived status'),
      sort: z.string().optional().describe('Sort field (prefix with - for descending)')
    })
  )
  .output(
    z.object({
      productGroups: z
        .array(z.record(z.string(), z.any()))
        .describe('List of product group records'),
      totalCount: z.number().optional().describe('Total number of matching product groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let filters: Record<string, string> = {};
    if (ctx.input.filterName) filters.name = ctx.input.filterName;
    if (ctx.input.filterSku) filters.sku = ctx.input.filterSku;
    if (ctx.input.filterTrackable !== undefined)
      filters.trackable = String(ctx.input.filterTrackable);
    if (ctx.input.filterArchived !== undefined)
      filters.archived = String(ctx.input.filterArchived);

    let response = await client.listProductGroups({
      pagination: {
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      },
      filters,
      sort: ctx.input.sort
    });

    let productGroups = flattenResourceList(response);

    return {
      output: {
        productGroups,
        totalCount: response?.meta?.total_count
      },
      message: `Found ${productGroups.length} product group(s).`
    };
  })
  .build();
