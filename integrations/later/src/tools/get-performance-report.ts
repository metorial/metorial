import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let networkMetricsSchema = z
  .object({
    posts: z.number().describe('Number of posts'),
    stories: z.number().describe('Number of stories'),
    reels: z.number().describe('Number of reels'),
    lives: z.number().describe('Number of live sessions'),
    impressions: z.number().describe('Total impressions'),
    engagements: z.number().describe('Total engagements')
  })
  .passthrough();

let reportEntrySchema = z
  .object({
    period: z.string().describe('Time period for this entry'),
    contentTotals: z.number().describe('Total content count'),
    impressions: z.number().describe('Total impressions'),
    engagements: z.number().describe('Total engagements'),
    clicks: z.number().describe('Total affiliate clicks'),
    conversions: z.number().describe('Total affiliate conversions'),
    conversionValue: z.number().describe('Total affiliate conversion value'),
    networkBreakdown: z
      .record(z.string(), networkMetricsSchema)
      .describe(
        'Metrics broken down by social network (Facebook, Instagram, TikTok, Pinterest)'
      )
  })
  .passthrough();

export let getPerformanceReportTool = SlateTool.create(spec, {
  name: 'Get Performance Report',
  key: 'get_performance_report',
  description:
    'DEPRECATED — use `get_analytics` instead. Legacy Reporting API v1 campaign or reporting-group analytics.',
  instructions: [
    'Use get_analytics with Reporting API v2 credentials for current reporting.',
    'Provide either a campaignId or a reportingGroupId, not both.',
    'Use groupBy to aggregate data by time period (year, quarter, month, week_monday, week_sunday, or day).',
    'Dates should be in ISO 8601 format (YYYY-MM-DD).'
  ],
  constraints: ['Either campaignId or reportingGroupId must be provided.'],
  tags: {
    readOnly: true,
    deprecated: true
  }
})
  .input(
    z.object({
      campaignId: z.string().optional().describe('Campaign ID to report on'),
      reportingGroupId: z
        .string()
        .optional()
        .describe('Reporting group ID to report on (alternative to campaignId)'),
      startDate: z.string().optional().describe('Start date for the report (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date for the report (YYYY-MM-DD)'),
      groupBy: z
        .enum(['year', 'quarter', 'month', 'week_monday', 'week_sunday', 'day'])
        .optional()
        .describe('Time period to group results by')
    })
  )
  .output(
    z
      .object({
        campaignId: z.string().optional().describe('Campaign ID reported on'),
        reportingGroupId: z.string().optional().describe('Reporting group ID reported on'),
        entries: z.array(reportEntrySchema).describe('Performance report entries')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let report = await client.getPerformanceReport({
      campaignId: ctx.input.campaignId,
      reportingGroupId: ctx.input.reportingGroupId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      groupBy: ctx.input.groupBy
    });

    return {
      output: report,
      message: `Retrieved ${report.entries.length} legacy performance entries.`
    };
  })
  .build();
