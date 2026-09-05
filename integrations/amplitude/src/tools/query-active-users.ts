import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import {
  dashboardDataSchema,
  numericSeriesSchema,
  parseResponse
} from '../lib/rest-validation';
import { spec } from '../spec';

export let queryActiveUsersTool = SlateTool.create(spec, {
  name: 'Query Active Users',
  key: 'query_active_users',
  description: `Retrieve daily, weekly, or monthly active and new user counts for the project already selected by the API-key connection. Call this tool directly with dates; no project ID, event discovery, or OAuth context lookup is needed. Returns time-series data showing how many users were active (performed any event) or new during each interval. Supports segmentation and grouping by user properties. Requires the API Key + Secret Key connection, not OAuth.`,
  instructions: [
    'For active-user counts and trends with an API-key connection, call this tool directly. The credentials already identify the project; do not call get_amplitude_context first.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      start: z.string().describe('Start date in YYYYMMDD format (e.g., "20240101").'),
      end: z.string().describe('End date in YYYYMMDD format (e.g., "20240131").'),
      metric: z
        .enum(['active', 'new', 'paying', 'power'])
        .optional()
        .describe(
          'Use active or new. paying and power are unsupported legacy values. Defaults to active.'
        ),
      interval: z
        .number()
        .optional()
        .describe('Time interval: 1 (daily), 7 (weekly), 30 (monthly). Default is 1.'),
      segment: z.string().optional().describe('Segment definition as JSON to filter users.'),
      groupBy: z
        .string()
        .optional()
        .describe('User property to group results by (e.g., "country", "platform").')
    })
  )
  .output(
    z.object({
      series: z.array(z.array(z.number().nullable())).describe('Time series data arrays.'),
      seriesLabels: z.array(z.unknown()).optional().describe('Labels for each series.'),
      xValues: z.array(z.string()).optional().describe('X-axis labels (dates/times).')
    })
  )
  .handleInvocation(async ctx => {
    let client = createAmplitudeClient(ctx);

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

    let data = parseResponse(dashboardDataSchema, result.data, 'analytics query');

    return {
      output: {
        series: parseResponse(numericSeriesSchema, data.series, 'active user series'),
        seriesLabels: data.seriesMeta,
        xValues: data.xValues
      },
      message: `Retrieved active user data from **${ctx.input.start}** to **${ctx.input.end}**.`
    };
  })
  .build();
