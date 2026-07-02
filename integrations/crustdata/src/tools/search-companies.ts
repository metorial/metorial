import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

let searchFilterSchema = z.object({
  filterType: z
    .string()
    .describe(
      'Filter type identifier (e.g., "COMPANY_HEADCOUNT", "REGION", "INDUSTRY", "ANNUAL_REVENUE", "COMPANY_HEADCOUNT_GROWTH", "DEPARTMENT_HEADCOUNT", "NUM_OF_FOLLOWERS", "KEYWORD", "JOB_OPPORTUNITIES", "FORTUNE", "ACCOUNT_ACTIVITIES", "IN_THE_NEWS").'
    ),
  type: z
    .string()
    .optional()
    .describe(
      'Filter operator: "in", "not in", or "between". Omit for boolean filters like IN_THE_NEWS.'
    ),
  value: z
    .unknown()
    .optional()
    .describe(
      'Filter value. Arrays for "in"/"not in" (e.g., ["10,001+"]). Object with min/max for "between" (e.g., {"min": 1, "max": 500}). Omit for boolean filters.'
    ),
  subFilter: z
    .string()
    .optional()
    .describe(
      'Sub-filter for specific filter types (e.g., currency code "USD" for ANNUAL_REVENUE, department name for DEPARTMENT_HEADCOUNT).'
    )
});

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description: `Search and discover companies using various growth and firmographic criteria.
Filter by headcount, revenue, industry, region, department headcount growth, job opportunities, and more.
Useful for building prospect lists, market scans, and ICP-based company discovery.`,
  instructions: [
    'Combine multiple filters for precise targeting — all filters are joined with AND logic.',
    'Text filters use "in"/"not in" with array values. Range filters use "between" with {min, max} objects.',
    'Boolean filters (e.g., IN_THE_NEWS) need only the filterType, no type or value.',
    'Results return 25 companies per page — use the page parameter to paginate.'
  ],
  constraints: ['Returns up to 25 results per request.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z.array(searchFilterSchema).describe('Array of search filters to apply.'),
      page: z.number().optional().describe('Page number for pagination (starts at 1).')
    })
  )
  .output(
    z.object({
      companies: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of matching company profiles.'),
      totalDisplayCount: z.number().optional().describe('Total number of matching companies.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrustdataClient(ctx.auth.token);

    let result = await client.searchCompanies({
      filters: ctx.input.filters,
      page: ctx.input.page
    });

    let companies = result.companies ?? result.data ?? [];
    let totalDisplayCount = result.total_display_count ?? result.totalDisplayCount;

    return {
      output: { companies, totalDisplayCount },
      message: `Found **${companies.length}** companies${totalDisplayCount ? ` (${totalDisplayCount} total)` : ''} matching filters.`
    };
  })
  .build();
