import { SlateTool } from 'slates';
import { z } from 'zod';
import { klaviyoServiceError } from '../lib/errors';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

let timeframeKeys = [
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'last_90_days',
  'last_12_months',
  'last_365_days',
  'last_3_months',
  'last_week',
  'last_month',
  'last_year',
  'this_week',
  'this_month',
  'this_year'
] as const;

let seriesReports = ['flow_series', 'form_series', 'segment_series'];
let conversionMetricReports = ['campaign_values', 'flow_values', 'flow_series'];

let reportLabels: Record<string, string> = {
  campaign_values: 'campaign values',
  flow_values: 'flow values',
  flow_series: 'flow series',
  form_values: 'form values',
  form_series: 'form series',
  segment_values: 'segment values',
  segment_series: 'segment series'
};

let buildTimeframe = (input: {
  timeframeKey?: (typeof timeframeKeys)[number];
  timeframeStart?: string;
  timeframeEnd?: string;
}) => {
  if (input.timeframeKey) {
    return { key: input.timeframeKey };
  }

  if (input.timeframeStart && input.timeframeEnd) {
    return { start: input.timeframeStart, end: input.timeframeEnd };
  }

  throw klaviyoServiceError('Provide timeframeKey or both timeframeStart and timeframeEnd.');
};

export let queryReports = SlateTool.create(spec, {
  name: 'Query Reports',
  key: 'query_reports',
  description: `Query Klaviyo Reporting API values and time series for campaigns, flows, forms, and segments.
Use this for performance reporting that is scoped to Klaviyo marketing assets rather than raw metric aggregates.`,
  instructions: [
    'Use *_values reports for total values over a timeframe.',
    'Use *_series reports when you need hourly, daily, weekly, or monthly buckets.',
    'Campaign and flow reports require conversionMetricId for conversion statistics.',
    'Use filter with Klaviyo reporting syntax, e.g. `equals(form_id,"FORM_ID")` or `contains-any(send_channel,["email"])`.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      report: z
        .enum([
          'campaign_values',
          'flow_values',
          'flow_series',
          'form_values',
          'form_series',
          'segment_values',
          'segment_series'
        ])
        .describe('Reporting endpoint to query.'),
      statistics: z
        .array(z.string())
        .describe('Statistics to return, e.g. ["opens", "open_rate"] or ["viewed_form"].'),
      timeframeKey: z
        .enum(timeframeKeys)
        .optional()
        .describe('Preset reporting timeframe. Omit when using custom start/end.'),
      timeframeStart: z
        .string()
        .optional()
        .describe('Custom reporting timeframe start, ISO 8601. Requires timeframeEnd.'),
      timeframeEnd: z
        .string()
        .optional()
        .describe('Custom reporting timeframe end, ISO 8601. Requires timeframeStart.'),
      interval: z
        .enum(['hourly', 'daily', 'weekly', 'monthly'])
        .optional()
        .describe('Required for *_series reports.'),
      conversionMetricId: z
        .string()
        .optional()
        .describe('Conversion metric ID required by campaign and flow reports.'),
      groupBy: z.array(z.string()).optional().describe('Reporting group_by fields.'),
      filter: z.string().optional().describe('Klaviyo Reporting API filter string.'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Sparse report fields such as ["results"] or ["results","date_times"].'),
      pageCursor: z
        .string()
        .optional()
        .describe('Pagination cursor for campaign and flow report endpoints.')
    })
  )
  .output(
    z.object({
      report: z.any().describe('Raw Klaviyo report response'),
      results: z.any().optional().describe('Report result rows'),
      dateTimes: z
        .array(z.string())
        .optional()
        .describe('Series timestamps returned by *_series reports'),
      nextCursor: z.string().optional().describe('Cursor for the next page'),
      hasMore: z.boolean().optional().describe('Whether more report rows are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    if (seriesReports.includes(input.report) && !input.interval) {
      throw klaviyoServiceError('interval is required for *_series reports.');
    }

    if (conversionMetricReports.includes(input.report) && !input.conversionMetricId) {
      throw klaviyoServiceError(
        'conversionMetricId is required for campaign and flow reports.'
      );
    }

    let attributes: Record<string, any> = {
      statistics: input.statistics,
      timeframe: buildTimeframe(input)
    };

    if (input.interval) attributes.interval = input.interval;
    if (input.conversionMetricId) attributes.conversion_metric_id = input.conversionMetricId;
    if (input.groupBy?.length) attributes.group_by = input.groupBy;
    if (input.filter) attributes.filter = input.filter;

    let params = {
      fields: input.fields,
      pageCursor: input.pageCursor
    };

    let report: any;
    if (input.report === 'campaign_values') {
      report = await client.queryCampaignValues(attributes, params);
    } else if (input.report === 'flow_values') {
      report = await client.queryFlowValues(attributes, params);
    } else if (input.report === 'flow_series') {
      report = await client.queryFlowSeries(attributes, params);
    } else if (input.report === 'form_values') {
      report = await client.queryFormValues(attributes, { fields: input.fields });
    } else if (input.report === 'form_series') {
      report = await client.queryFormSeries(attributes, { fields: input.fields });
    } else if (input.report === 'segment_values') {
      report = await client.querySegmentValues(attributes, { fields: input.fields });
    } else {
      report = await client.querySegmentSeries(attributes, { fields: input.fields });
    }

    let data = Array.isArray(report.data) ? report.data[0] : report.data;
    let nextCursor = extractPaginationCursor(report.links);

    return {
      output: {
        report,
        results: data?.attributes?.results,
        dateTimes: data?.attributes?.date_times,
        nextCursor,
        hasMore: !!nextCursor
      },
      message: `Queried Klaviyo ${reportLabels[input.report]} report`
    };
  })
  .build();
