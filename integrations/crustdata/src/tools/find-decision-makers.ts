import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

let conditionSchema = z.object({
  column: z.string().describe('Column to filter on.'),
  type: z.string().describe('Comparison operator: "=", ">=", "<=", "(.)".'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Value to compare against.'),
  allowNull: z.boolean().optional().describe('Whether to include null values.')
});

let sortSchema = z.object({
  column: z.string().describe('Column to sort by.'),
  direction: z.string().describe('Sort direction: "asc" or "desc".')
});

export let findDecisionMakers = SlateTool.create(spec, {
  name: 'Find Decision Makers',
  key: 'find_decision_makers',
  description: `Find decision makers at companies filtered by title and additional criteria.
Extract targeted decision maker information using title-based filters combined with company-level filters.
Ideal for sales prospecting and identifying key contacts at target companies.`,
  instructions: [
    'Provide titles to search for (e.g., ["CEO", "CTO", "VP of Sales"]).',
    'Optionally add company-level filters to narrow down results.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      decisionMakerTitles: z
        .array(z.string())
        .describe('Titles to search for (e.g., ["CEO", "CTO", "VP of Engineering"]).'),
      filterOp: z
        .enum(['and', 'or'])
        .optional()
        .describe('Logical operator for filter conditions.'),
      conditions: z
        .array(conditionSchema)
        .optional()
        .describe('Additional filter conditions on company data.'),
      offset: z.number().optional().describe('Starting offset for pagination (default: 0).'),
      count: z.number().optional().describe('Number of results to return (default: 100).'),
      sorts: z.array(sortSchema).optional().describe('Sort criteria.')
    })
  )
  .output(
    z.object({
      decisionMakers: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of decision maker records.'),
      totalCount: z.number().optional().describe('Total number of matching records.')
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

    let result = await client.getDecisionMakers({
      decisionMakerTitles: ctx.input.decisionMakerTitles,
      filters,
      offset: ctx.input.offset,
      count: ctx.input.count,
      sorts: ctx.input.sorts
    });

    let decisionMakers = Array.isArray(result)
      ? result
      : (result.data ?? result.decision_makers ?? []);
    let totalCount = result.total_count ?? result.totalCount;

    return {
      output: { decisionMakers, totalCount },
      message: `Found **${decisionMakers.length}** decision makers matching criteria.`
    };
  })
  .build();
