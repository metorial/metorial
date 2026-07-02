import { SlateTool } from 'slates';
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
      'Type of filter (e.g., 1 = Company Name, 3 = Job Status). Use the search filters tool to discover available types.'
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
  description: `Search for jobs using Streamtime's advanced filtering system. Filters can be combined with AND/OR logic. Common filter group types: **1** = Company Name, **3** = Job Status. Value match types: **1** = Equals, **2** = Not Equals. For job status, use value "1" for "In Play". Use the **List Search Filters** tool to discover all available filter types.`,
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
      filterGroupCollections: z
        .array(filterGroupCollectionSchema)
        .optional()
        .describe('Filter collections for narrowing results. If empty, returns all jobs.')
    })
  )
  .output(
    z.object({
      jobs: z.array(z.record(z.string(), z.any())).describe('Array of matching jobs'),
      totalCount: z.number().optional().describe('Total number of matching results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let searchBody: Record<string, any> = {
      searchView: 7
    };

    if (ctx.input.filterGroupCollections && ctx.input.filterGroupCollections.length > 0) {
      searchBody.filterGroupCollections = ctx.input.filterGroupCollections;
    }

    let result = await client.search(searchBody);

    let jobs = Array.isArray(result) ? result : result.data || result.results || [];
    let totalCount = result.totalCount ?? result.total ?? jobs.length;

    return {
      output: {
        jobs,
        totalCount
      },
      message: `Found **${totalCount}** job(s) matching the search criteria.`
    };
  })
  .build();
