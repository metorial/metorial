import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

let conditionSchema = z.object({
  column: z
    .string()
    .describe(
      'Column name to filter on (e.g., "total_investment_usd", "headcount", "largest_headcount_country", "company_website_domain").'
    ),
  type: z
    .string()
    .describe(
      'Comparison operator: "=" (exact match), ">=" or "=>" (greater than or equal), "<=" (less than or equal), "(.)" (contains).'
    ),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Value to compare against.'),
  allowNull: z.boolean().optional().describe('Whether to include null values in results.')
});

let sortSchema = z.object({
  column: z.string().describe('Column to sort by.'),
  direction: z.string().describe('Sort direction: "asc" or "desc".')
});

export let screenCompanies = SlateTool.create(spec, {
  name: 'Screen Companies',
  key: 'screen_companies',
  description: `Screen companies using advanced column-based filters with precise operators.
Unlike the search endpoint, this uses database-style column filters with operators like equals, greater than, less than, and contains.
Best for data-driven screening with specific numeric thresholds (e.g., headcount > 500, total funding > $10M).`,
  instructions: [
    'Use "and" or "or" as the logical operator to combine filter conditions.',
    'Column names correspond to Crustdata data fields (e.g., total_investment_usd, headcount, largest_headcount_country).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filterOp: z.enum(['and', 'or']).describe('Logical operator to combine conditions.'),
      conditions: z.array(conditionSchema).describe('Array of filter conditions.'),
      offset: z.number().optional().describe('Starting offset for pagination (default: 0).'),
      count: z.number().optional().describe('Number of results to return (default: 100).'),
      sorts: z.array(sortSchema).optional().describe('Sort criteria for results.')
    })
  )
  .output(
    z.object({
      companies: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of screened company records.'),
      totalCount: z.number().optional().describe('Total number of matching records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrustdataClient(ctx.auth.token);

    let normalizedConditions = ctx.input.conditions
      .filter(c => c.value !== undefined)
      .map(c => ({
        column: c.column,
        type: c.type,
        value: c.value as string | number | boolean,
        allowNull: c.allowNull
      }));

    let result = await client.screenCompanies({
      filters: {
        op: ctx.input.filterOp,
        conditions: normalizedConditions
      },
      offset: ctx.input.offset,
      count: ctx.input.count,
      sorts: ctx.input.sorts
    });

    let companies = Array.isArray(result)
      ? result
      : (result.data ?? result.companies ?? [result]);
    let totalCount = result.total_count ?? result.totalCount;

    return {
      output: { companies, totalCount },
      message: `Screened **${companies.length}** companies matching the specified criteria.`
    };
  })
  .build();
