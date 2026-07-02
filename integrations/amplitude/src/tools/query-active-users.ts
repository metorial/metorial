import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let queryActiveUsersTool = SlateTool.create(spec, {
  name: 'Query Active Users',
  key: 'query_active_users',
  description: `Retrieve active and new user counts over a specified date range. Returns time-series data showing how many users were active (performed any event) and how many were new during each interval. Supports segmentation and grouping by user properties.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.string().describe('Start date in YYYYMMDD format (e.g., "20240101").'),
      end: z.string().describe('End date in YYYYMMDD format (e.g., "20240131").'),
      metric: z
        .enum(['active', 'new', 'paying', 'power'])
        .optional()
        .describe('Metric to retrieve. Defaults to active users.'),
      interval: z
        .number()
        .optional()
        .describe(
          'Time interval: -300000 (real-time), 1 (daily), 7 (weekly), 30 (monthly). Default is 1.'
        ),
      segment: z.string().optional().describe('Segment definition as JSON to filter users.'),
      groupBy: z
        .string()
        .optional()
        .describe('User property to group results by (e.g., "country", "platform").')
    })
  )
  .output(
    z.object({
      series: z.array(z.any()).describe('Time series data arrays.'),
      seriesLabels: z.array(z.any()).optional().describe('Labels for each series.'),
      xValues: z.array(z.string()).optional().describe('X-axis labels (dates/times).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let metricMap: Record<string, string> = {
      active: 'active',
      new: 'new',
      paying: 'paying',
      power: 'power'
    };

    let result = await client.getActiveAndNewUserCounts({
      start: ctx.input.start,
      end: ctx.input.end,
      m: ctx.input.metric ? metricMap[ctx.input.metric] : undefined,
      interval: ctx.input.interval,
      segment: ctx.input.segment,
      groupBy: ctx.input.groupBy
    });

    let data = result.data ?? result;

    return {
      output: {
        series: data.series ?? [],
        seriesLabels: data.seriesLabels ?? data.series_labels,
        xValues: data.xValues ?? data.x_values
      },
      message: `Retrieved active user data from **${ctx.input.start}** to **${ctx.input.end}**.`
    };
  })
  .build();
