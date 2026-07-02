import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { hookdeckServiceError, requireHookdeckInput } from '../lib/errors';
import { spec } from '../spec';

let metricSchema = z.enum([
  'requests',
  'events',
  'attempts',
  'events_by_issue',
  'queue_depth',
  'transformations',
  'events_pending_timeseries'
]);

let endpointByMetric: Record<z.infer<typeof metricSchema>, string> = {
  requests: 'requests',
  events: 'events',
  attempts: 'attempts',
  events_by_issue: 'events-by-issue',
  queue_depth: 'queue-depth',
  transformations: 'transformations',
  events_pending_timeseries: 'events-pending-timeseries'
};

let metricsRowSchema = z.object({
  timeBucket: z.string().nullable().optional().describe('Metrics time bucket'),
  dimensions: z
    .record(z.string(), z.unknown())
    .describe('Dimension values for this metrics row'),
  metrics: z.record(z.string(), z.unknown()).describe('Metric values for this row')
});

export let queryMetrics = SlateTool.create(spec, {
  name: 'Query Metrics',
  key: 'query_metrics',
  description: `Query Hookdeck metrics for requests, events, attempts, queue depth, transformations, and events by issue. Use this to monitor throughput, delivery success, retry rate, latency, queue/backpressure, and transformation health over a date range.`,
  instructions: [
    'Provide start and end ISO timestamps for the date range.',
    'Use measures for the metric values to return, such as count, successful_count, failed_count, error_rate, avg_attempts, or response latency measures supported by Hookdeck.',
    'Use dimensions to group results, such as source_id, webhook_id, destination_id, or status, depending on the selected metric endpoint.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      metric: metricSchema.describe('Metrics endpoint to query'),
      start: z.string().optional().describe('Start of the date range as an ISO timestamp'),
      end: z.string().optional().describe('End of the date range as an ISO timestamp'),
      granularity: z
        .string()
        .optional()
        .describe('Optional time bucket granularity, such as 1h or 1d'),
      measures: z
        .array(z.string())
        .optional()
        .describe('Metric measures to return, such as count or failed_count'),
      dimensions: z
        .array(z.string())
        .optional()
        .describe('Dimensions to group by, such as source_id or destination_id'),
      filters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional raw Hookdeck Metrics API query filters'),
      sourceId: z.string().optional().describe('Filter by source ID'),
      connectionId: z.string().optional().describe('Filter by connection/webhook ID'),
      destinationId: z.string().optional().describe('Filter by destination ID'),
      transformationId: z.string().optional().describe('Filter by transformation ID'),
      issueId: z.string().optional().describe('Filter by issue ID'),
      limit: z.number().optional().describe('Maximum rows to return')
    })
  )
  .output(
    z.object({
      metric: metricSchema.describe('Metrics endpoint queried'),
      data: z.array(metricsRowSchema).describe('Metrics rows returned by Hookdeck'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Hookdeck query metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let start = requireHookdeckInput(ctx.input.start, 'start');
    let end = requireHookdeckInput(ctx.input.end, 'end');

    if (ctx.input.measures && ctx.input.measures.length === 0) {
      throw hookdeckServiceError('measures cannot be empty.');
    }

    if (ctx.input.dimensions && ctx.input.dimensions.length === 0) {
      throw hookdeckServiceError('dimensions cannot be empty.');
    }

    let params: Record<string, unknown> = {
      date_range: {
        start,
        end
      },
      ...ctx.input.filters
    };

    if (ctx.input.granularity) params.granularity = ctx.input.granularity;
    if (ctx.input.measures) params.measures = ctx.input.measures;
    if (ctx.input.dimensions) params.dimensions = ctx.input.dimensions;
    if (ctx.input.sourceId) params.source_id = ctx.input.sourceId;
    if (ctx.input.connectionId) params.webhook_id = ctx.input.connectionId;
    if (ctx.input.destinationId) params.destination_id = ctx.input.destinationId;
    if (ctx.input.transformationId) params.transformation_id = ctx.input.transformationId;
    if (ctx.input.issueId) params.issue_id = ctx.input.issueId;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;

    let result = await client.queryMetrics(endpointByMetric[ctx.input.metric], params);
    let rows = result.data.map(row => ({
      timeBucket: row.time_bucket ?? null,
      dimensions: row.dimensions ?? {},
      metrics: row.metrics ?? {}
    }));

    return {
      output: {
        metric: ctx.input.metric,
        data: rows,
        metadata: result.metadata
      },
      message: `Retrieved **${rows.length}** ${ctx.input.metric} metric row${rows.length === 1 ? '' : 's'}.`
    };
  })
  .build();
