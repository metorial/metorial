import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let queryEventSegmentationTool = SlateTool.create(spec, {
  name: 'Query Event Segmentation',
  key: 'query_event_segmentation',
  description: `Analyze event data with segmentation, filtering, and grouping. Returns time-series or aggregate data for specific events, similar to Amplitude's Event Segmentation chart. Supports metrics like event totals, uniques, DAU, session averages, property sums/averages, and more.`,
  instructions: [
    'The "events" parameter uses Amplitude\'s JSON event format: {"event_type": "EventName"} with optional filters.',
    'Metrics: "uniques" (unique users), "totals" (event count), "avg" (average per user), "pct_dau" (% of DAU).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      events: z
        .string()
        .describe(
          'JSON-encoded event definition. Example: {"event_type": "Purchase"}. Supports filters and group_by within the event definition.'
        ),
      start: z.string().describe('Start date in YYYYMMDD format.'),
      end: z.string().describe('End date in YYYYMMDD format.'),
      metric: z
        .enum([
          'uniques',
          'totals',
          'pct_dau',
          'avg',
          'formula',
          'sums',
          'median',
          'freq',
          'hist'
        ])
        .optional()
        .describe('Aggregation metric. Default is "totals".'),
      interval: z
        .number()
        .optional()
        .describe('Time interval: 1 (daily), 7 (weekly), 30 (monthly). Default is 1.'),
      segment: z.string().optional().describe('Segment definition as JSON to filter users.'),
      groupBy: z
        .string()
        .optional()
        .describe('JSON-encoded group-by clause for breaking down results.'),
      limit: z.number().optional().describe('Maximum number of group-by values to return.')
    })
  )
  .output(
    z.object({
      series: z.array(z.any()).describe('Time series data for the segmentation query.'),
      seriesLabels: z.array(z.any()).optional().describe('Labels for each data series.'),
      xValues: z.array(z.string()).optional().describe('X-axis date/time labels.'),
      seriesCollapsed: z.array(z.any()).optional().describe('Collapsed series totals.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getEventSegmentation({
      e: ctx.input.events,
      start: ctx.input.start,
      end: ctx.input.end,
      m: ctx.input.metric,
      interval: ctx.input.interval,
      segment: ctx.input.segment,
      groupBy: ctx.input.groupBy,
      limit: ctx.input.limit
    });

    let data = result.data ?? result;

    return {
      output: {
        series: data.series ?? [],
        seriesLabels: data.seriesLabels ?? data.series_labels,
        xValues: data.xValues ?? data.x_values,
        seriesCollapsed: data.seriesCollapsed ?? data.series_collapsed
      },
      message: `Event segmentation query completed for **${ctx.input.start}** to **${ctx.input.end}**.`
    };
  })
  .build();
