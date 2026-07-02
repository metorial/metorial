import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClarityClient } from '../lib/client';
import { spec } from '../spec';

let dimensionEnum = z.enum([
  'Browser',
  'Device',
  'Country/Region',
  'OS',
  'Source',
  'Medium',
  'Campaign',
  'Channel',
  'URL'
]);

let metricInformationSchema = z.record(
  z.string(),
  z.union([z.string(), z.number()]).optional()
);

let dashboardMetricSchema = z.object({
  metricName: z
    .string()
    .describe('Name of the metric (e.g. Traffic, Scroll Depth, Rage Click Count)'),
  information: z
    .array(metricInformationSchema)
    .describe(
      'Array of data points for this metric, each containing dimension values and metric values'
    )
});

export let getDashboardInsights = SlateTool.create(spec, {
  name: 'Get Dashboard Insights',
  key: 'get_dashboard_insights',
  description: `Retrieves dashboard analytics data from Microsoft Clarity including traffic, engagement, behavioral signals, and page metrics. Data can be broken down by up to three dimensions such as Browser, Device, Country/Region, OS, Source, Medium, Campaign, Channel, or URL.

Returns metrics like Traffic, Scroll Depth, Engagement Time, Popular Pages, Dead Click Count, Rage Click Count, Quickback Click, Excessive Scroll, Script Error Count, and Error Click Count.`,
  constraints: [
    'Maximum of 10 API requests per project per day.',
    'Data is limited to the previous 1 to 3 days only.',
    'Responses are limited to 1,000 rows.',
    'Maximum of 3 dimensions per request.',
    'Results are returned in UTC timezone.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      numOfDays: z
        .union([z.literal(1), z.literal(2), z.literal(3)])
        .describe(
          'Number of days to retrieve data for: 1 (last 24h), 2 (last 48h), or 3 (last 72h)'
        ),
      dimension1: dimensionEnum
        .optional()
        .describe('First dimension to break down insights by'),
      dimension2: dimensionEnum
        .optional()
        .describe('Second dimension to break down insights by'),
      dimension3: dimensionEnum
        .optional()
        .describe('Third dimension to break down insights by')
    })
  )
  .output(
    z.object({
      metrics: z
        .array(dashboardMetricSchema)
        .describe('Array of dashboard metrics with their data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClarityClient(ctx.auth.token);

    ctx.progress('Fetching dashboard insights...');

    let metrics = await client.getDashboardInsights({
      numOfDays: ctx.input.numOfDays,
      dimension1: ctx.input.dimension1,
      dimension2: ctx.input.dimension2,
      dimension3: ctx.input.dimension3
    });

    let dimensions = [ctx.input.dimension1, ctx.input.dimension2, ctx.input.dimension3].filter(
      Boolean
    );
    let dimensionSummary =
      dimensions.length > 0 ? ` broken down by ${dimensions.join(', ')}` : '';

    return {
      output: {
        metrics
      },
      message: `Retrieved **${metrics.length}** metric(s) for the last **${ctx.input.numOfDays * 24} hours**${dimensionSummary}.`
    };
  })
  .build();
