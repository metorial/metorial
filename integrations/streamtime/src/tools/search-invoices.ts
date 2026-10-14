import { createApiServiceError, SlateTool } from 'slates';
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
      'Type of filter. Numeric filter IDs for legacy filter groups; query selector discovery uses list_search_filters.'
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
  description: `Search for invoices using Streamtime's advanced filtering system. Uses searchView 11 for invoices. Filters can be combined with AND/OR logic. Call list_search_filters with searchView 11 to discover selectors for the query input. Legacy numeric filter groups remain available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Query using selectors from list_search_filters. Alternative to legacy filterGroupCollections. An empty query returns an unfiltered page.'
        ),
      limit: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .optional()
        .describe('Maximum records in this page; defaults to 1000'),
      offset: z.number().int().min(0).optional().describe('Zero-based pagination offset'),
      sortColumn: z
        .string()
        .optional()
        .describe('Sort selector from list_search_filters; applies to query searches'),
      sortAscending: z.boolean().optional().describe('Sort ascending when true'),
      additionalData: z
        .array(z.string())
        .optional()
        .describe('Related data options from list_search_filters; applies to query searches'),
      filterGroupCollections: z
        .array(filterGroupCollectionSchema)
        .optional()
        .describe('Filter collections for narrowing results')
    })
  )
  .output(
    z.object({
      invoices: z.array(z.record(z.string(), z.any())).describe('Array of matching invoices'),
      totalCount: z
        .number()
        .optional()
        .describe(
          'Provider total when available; otherwise the count of records returned in this page'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let hasLegacyFilters = !!ctx.input.filterGroupCollections?.length;
    if (hasLegacyFilters && ctx.input.query !== undefined) {
      throw createApiServiceError(
        'Provide query or filterGroupCollections for a search, not both.'
      );
    }
    if (
      hasLegacyFilters &&
      (ctx.input.sortColumn !== undefined || ctx.input.additionalData !== undefined)
    ) {
      throw createApiServiceError(
        'sortColumn and additionalData require the query search format.'
      );
    }
    let searchBody: Record<string, any> = { searchView: 11 };
    if (hasLegacyFilters) {
      searchBody.filterGroupCollection = {
        conditionMatchTypeId: 1,
        filterGroupCollections: ctx.input.filterGroupCollections
      };
      if (ctx.input.limit !== undefined) searchBody.maxResults = ctx.input.limit;
    } else {
      searchBody.query = ctx.input.query ?? '';
      if (ctx.input.limit !== undefined) searchBody.limit = ctx.input.limit;
      if (ctx.input.sortColumn !== undefined) searchBody.sortColumn = ctx.input.sortColumn;
      if (ctx.input.additionalData !== undefined)
        searchBody.additionalData = ctx.input.additionalData;
    }
    if (ctx.input.offset !== undefined) searchBody.offset = ctx.input.offset;
    if (ctx.input.sortAscending !== undefined)
      searchBody.sortAscending = ctx.input.sortAscending;

    let result = await client.search(searchBody);

    let invoices = Array.isArray(result) ? result : result?.data || result?.results || [];
    let totalCount = result?.totalCount ?? result?.total ?? invoices.length;

    return {
      output: {
        invoices,
        totalCount
      },
      message: `Found **${totalCount}** invoice(s) reported for the search; this may be one page of results.`
    };
  })
  .build();
