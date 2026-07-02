import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let queryMetricAggregates = SlateTool.create(spec, {
  name: 'Query Metric Aggregates',
  key: 'query_metric_aggregates',
  description: `Query aggregate analytics data for a specific metric in Klaviyo. Returns computed measurements like count, sum, or unique values over a time period.
Useful for building reports on email opens, revenue, clicks, conversions, and other performance metrics.`,
  instructions: [
    'Common measurements: "count", "sum_value", "unique".',
    'Use filter to restrict time range: ["greater-or-equal(datetime,2024-01-01T00:00:00)","less-than(datetime,2024-02-01T00:00:00)"].',
    'Use group_by to break down results, e.g. ["$flow", "$message"].'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      metricId: z.string().describe('Metric ID to query aggregates for'),
      measurements: z
        .array(z.string())
        .describe(
          'Aggregate measurements to compute (e.g., ["count", "sum_value", "unique"])'
        ),
      interval: z
        .string()
        .optional()
        .describe('Time bucket interval (e.g., "day", "week", "month")'),
      filter: z.array(z.string()).optional().describe('Filter conditions as array of strings'),
      groupBy: z
        .array(z.string())
        .optional()
        .describe('Fields to group results by (e.g., ["$flow"])'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for interval bucketing (e.g., "America/New_York")'),
      pageSize: z.number().optional().describe('Results per page'),
      pageCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Aggregated metric data')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.queryMetricAggregates({
      metric_id: ctx.input.metricId,
      measurements: ctx.input.measurements,
      interval: ctx.input.interval,
      filter: ctx.input.filter,
      group_by: ctx.input.groupBy,
      timezone: ctx.input.timezone,
      page_size: ctx.input.pageSize,
      page_cursor: ctx.input.pageCursor
    });

    return {
      output: { results: result },
      message: `Queried aggregates for metric **${ctx.input.metricId}** with measurements: ${ctx.input.measurements.join(', ')}`
    };
  })
  .build();
