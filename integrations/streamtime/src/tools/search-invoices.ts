import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

let filterSchema = z.object({
  valueMatchTypeId: z
    .number()
    .describe('Comparison operator: 1 = Equals, 2 = Not Equals, etc.'),
  value: z.string().describe('The value to filter by')
});

let filterGroupSchema = z.object({
  filterGroupTypeId: z
    .number()
    .describe(
      'Type of filter. Use the search filters tool to discover available types for invoices.'
    ),
  conditionMatchTypeId: z.number().describe('Logic between filters: 1 = AND, 2 = OR'),
  filters: z.array(filterSchema)
});

let filterGroupCollectionSchema = z.object({
  conditionMatchTypeId: z.number().describe('Logic between filter groups: 1 = AND, 2 = OR'),
  filterGroups: z.array(filterGroupSchema)
});

export let searchInvoices = SlateTool.create(spec, {
  name: 'Search Invoices',
  key: 'search_invoices',
  description: `Search for invoices using Streamtime's advanced filtering system. Uses searchView 11 for invoices. Filters can be combined with AND/OR logic. Use the **List Search Filters** tool to discover available filter types for invoices.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filterGroupCollections: z
        .array(filterGroupCollectionSchema)
        .optional()
        .describe('Filter collections for narrowing results')
    })
  )
  .output(
    z.object({
      invoices: z.array(z.record(z.string(), z.any())).describe('Array of matching invoices'),
      totalCount: z.number().optional().describe('Total number of matching results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let searchBody: Record<string, any> = {
      searchView: 11
    };

    if (ctx.input.filterGroupCollections && ctx.input.filterGroupCollections.length > 0) {
      searchBody.filterGroupCollections = ctx.input.filterGroupCollections;
    }

    let result = await client.search(searchBody);

    let invoices = Array.isArray(result) ? result : result.data || result.results || [];
    let totalCount = result.totalCount ?? result.total ?? invoices.length;

    return {
      output: {
        invoices,
        totalCount
      },
      message: `Found **${totalCount}** invoice(s) matching the search criteria.`
    };
  })
  .build();
