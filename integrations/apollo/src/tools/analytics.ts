import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { apolloServiceError } from '../lib/errors';
import { spec } from '../spec';

let recordSchema = z.record(z.string(), z.any());

export let queryAnalyticsReport = SlateTool.create(spec, {
  name: 'Query Analytics Report',
  key: 'query_analytics_report',
  description:
    "Query Apollo's analytics report engine for aggregated sales activity metrics, grouped rows, or pivot reports.",
  instructions: [
    'Use metrics, groupBy, filters, and dateRanges values from Apollo Analytics or the Apollo metrics and dimensions reference.',
    'groupBy and pivotGroupBy each support at most one entry.'
  ],
  constraints: ['Requires an API key with access to api/v1/reports/sync_report'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      metrics: z.array(recordSchema).describe('Metric definitions to query'),
      groupBy: z
        .array(recordSchema)
        .describe('Row grouping dimensions. Use an empty array for flat totals.'),
      pivotGroupBy: z
        .array(recordSchema)
        .optional()
        .describe('Optional pivot column grouping dimension. Maximum one entry.'),
      sorts: z
        .array(recordSchema)
        .describe('Sort definitions. Use an empty array for default ordering.'),
      filters: recordSchema.describe('Filter map. Use an empty object for no filters.'),
      groupByTotalsSelected: z
        .boolean()
        .describe('Whether to include an aggregated totals row'),
      pivotGroupByTotalsSelected: z
        .boolean()
        .describe('Whether to include an aggregated pivot totals column'),
      dateRanges: z.array(recordSchema).describe('Date range definitions. Maximum one entry.'),
      skipGroupByValues: z
        .array(z.string())
        .optional()
        .describe('Dimension values to exclude from the result rows'),
      minRatioDenominator: z
        .number()
        .optional()
        .describe('Minimum denominator for ratio metrics')
    })
  )
  .output(
    z.object({
      report: recordSchema
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.groupBy.length > 1) {
      throw apolloServiceError('groupBy supports at most one entry.');
    }
    if ((ctx.input.pivotGroupBy?.length ?? 0) > 1) {
      throw apolloServiceError('pivotGroupBy supports at most one entry.');
    }
    if (ctx.input.dateRanges.length > 1) {
      throw apolloServiceError('dateRanges supports at most one entry.');
    }
    if ((ctx.input.skipGroupByValues?.length ?? 0) > 500) {
      throw apolloServiceError('skipGroupByValues supports up to 500 entries.');
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let report = await client.queryAnalyticsReport({
      metrics: ctx.input.metrics,
      group_by: ctx.input.groupBy,
      pivot_group_by: ctx.input.pivotGroupBy || [],
      sorts: ctx.input.sorts,
      filters: ctx.input.filters,
      group_by_totals_selected: ctx.input.groupByTotalsSelected,
      pivot_group_by_totals_selected: ctx.input.pivotGroupByTotalsSelected,
      date_ranges: ctx.input.dateRanges,
      skip_group_by_values: ctx.input.skipGroupByValues,
      min_ratio_denominator: ctx.input.minRatioDenominator
    });

    return {
      output: { report },
      message: 'Retrieved Apollo analytics report.'
    };
  })
  .build();
