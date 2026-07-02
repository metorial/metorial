import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

let jobConditionSchema = z.object({
  column: z
    .string()
    .describe(
      'Column to filter on (e.g., "job_title", "job_category", "job_location", "workplace_type", "department", "openings_count").'
    ),
  type: z.string().describe('Comparison operator: "=", ">=", "<=", "(.)".'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Value to compare against.'),
  allowNull: z.boolean().optional().describe('Whether to include null values.')
});

let sortSchema = z.object({
  column: z.string().describe('Column to sort by.'),
  direction: z.string().describe('Sort direction: "asc" or "desc".')
});

export let searchJobListings = SlateTool.create(spec, {
  name: 'Search Job Listings',
  key: 'search_job_listings',
  description: `Retrieve structured, real-time job listing data for specified companies.
Returns 30+ data points per listing including full job descriptions, category, openings count, workplace type, reposted flag, and company context.
Supports 35+ search filters for title, category, location, workplace type, and department.`,
  instructions: [
    'Provide company tickers (domain names or identifiers) to search within.',
    'Use filters to narrow results by job title, location, workplace type, etc.',
    'Filter by job locations to detect geographic expansion signals.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z
        .array(z.string())
        .describe('Company tickers or domain names to search job listings for.'),
      filterOp: z
        .enum(['and', 'or'])
        .optional()
        .describe('Logical operator to combine filter conditions.'),
      conditions: z
        .array(jobConditionSchema)
        .optional()
        .describe('Filter conditions for job listings.'),
      offset: z.number().optional().describe('Starting offset for pagination (default: 0).'),
      count: z.number().optional().describe('Number of results to return (default: 100).'),
      sorts: z.array(sortSchema).optional().describe('Sort criteria.')
    })
  )
  .output(
    z.object({
      jobListings: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of job listing records.'),
      totalCount: z.number().optional().describe('Total number of matching listings.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrustdataClient(ctx.auth.token);

    let normalizedConditions = (ctx.input.conditions ?? [])
      .filter(c => c.value !== undefined)
      .map(c => ({
        column: c.column,
        type: c.type,
        value: c.value as string | number | boolean,
        allowNull: c.allowNull
      }));

    let filters =
      normalizedConditions.length > 0
        ? {
            op: ctx.input.filterOp ?? 'and',
            conditions: normalizedConditions
          }
        : undefined;

    let result = await client.searchJobListings({
      tickers: ctx.input.tickers,
      filters,
      offset: ctx.input.offset,
      count: ctx.input.count,
      sorts: ctx.input.sorts
    });

    let jobListings = Array.isArray(result)
      ? result
      : (result.data ?? result.job_listings ?? []);
    let totalCount = result.total_count ?? result.totalCount;

    return {
      output: { jobListings, totalCount },
      message: `Found **${jobListings.length}** job listings for the specified companies.`
    };
  })
  .build();
