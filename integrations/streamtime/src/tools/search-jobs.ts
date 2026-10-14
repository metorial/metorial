import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

let filterSchema = z.object({
  valueMatchTypeId: z
    .number()
    .describe('Comparison operator: 1 = Equals, 2 = Not Equals, 3 = Contains, etc.'),
  value: z.string().describe('The value to filter by')
});

let filterGroupSchema = z.object({
  filterGroupTypeId: z
    .number()
    .describe(
      'Type of filter (e.g., 1 = Company Name, 3 = Job Status). Numeric filter IDs for legacy filter groups; query selector discovery uses list_search_filters.'
    ),
  conditionMatchTypeId: z
    .number()
    .describe('Logic between filters in this group: 1 = AND, 2 = OR'),
  filters: z.array(filterSchema).describe('Array of filter conditions')
});

let filterGroupCollectionSchema = z.object({
  conditionMatchTypeId: z.number().describe('Logic between filter groups: 1 = AND, 2 = OR'),
  filterGroups: z.array(filterGroupSchema).describe('Array of filter groups')
});

export let searchJobs = SlateTool.create(spec, {
  name: 'Search Jobs',
  key: 'search_jobs',
  description: `Search for jobs using Streamtime's advanced filtering system. Filters can be combined with AND/OR logic. Common filter group types: **1** = Company Name, **3** = Job Status. Value match types: **1** = Equals, **2** = Not Equals. For job status, use value "1" for "In Play". Call list_search_filters with searchView 7 to discover selectors for the query input. Legacy numeric filter groups remain available.`,
  instructions: [
    'Use filterGroupTypeId 3 with value "1" to find jobs that are "In Play".',
    'Combine multiple filter groups in a collection for complex queries.'
  ],
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
        .describe('Filter collections for narrowing results. If empty, returns all jobs.')
    })
  )
  .output(
    z.object({
      jobs: z.array(z.record(z.string(), z.any())).describe('Array of matching jobs'),
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
    let searchBody: Record<string, any> = { searchView: 7 };
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

    let jobs = Array.isArray(result) ? result : result?.data || result?.results || [];
    let totalCount = result?.totalCount ?? result?.total ?? jobs.length;

    return {
      output: {
        jobs,
        totalCount
      },
      message: `Found **${totalCount}** job(s) reported for the search; this may be one page of results.`
    };
  })
  .build();
