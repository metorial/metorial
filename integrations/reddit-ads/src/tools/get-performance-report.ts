import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let getPerformanceReport = SlateTool.create(spec, {
  name: 'Get Performance Report',
  key: 'get_performance_report',
  description: `Retrieve advertising performance data at the account, campaign, ad group, or ad level. Query impressions, clicks, CTR, CPC, spend, conversions, and other metrics over a date range. Supports optional breakdowns for detailed analysis.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'Reporting data is in UTC and accurate up to 3 hours ago.'
  ],
  constraints: ['Rate limit: 1 request per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Report start date in YYYY-MM-DD format'),
      endDate: z.string().describe('Report end date in YYYY-MM-DD format'),
      level: z.enum(['account', 'campaign', 'adGroup', 'ad']).describe('Reporting level'),
      metrics: z
        .array(z.string())
        .optional()
        .describe(
          'Metrics to include (e.g., impressions, clicks, spend, ctr, cpc, ecpm, conversions, video_viewable_impressions)'
        ),
      breakdowns: z
        .array(z.string())
        .optional()
        .describe('Breakdown dimensions (e.g., date, campaign_id, ad_group_id)'),
      campaignIds: z
        .array(z.string())
        .optional()
        .describe('Filter report to specific campaign IDs'),
      adGroupIds: z
        .array(z.string())
        .optional()
        .describe('Filter report to specific ad group IDs'),
      adIds: z.array(z.string()).optional().describe('Filter report to specific ad IDs')
    })
  )
  .output(
    z.object({
      report: z.any().describe('Report data containing the requested metrics and breakdowns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditAdsClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let levelMap: Record<string, string> = {
      account: 'account',
      campaign: 'campaign',
      adGroup: 'ad_group',
      ad: 'ad'
    };

    let report = await client.getReport({
      start_date: ctx.input.startDate,
      end_date: ctx.input.endDate,
      level: levelMap[ctx.input.level] || ctx.input.level,
      metrics: ctx.input.metrics,
      breakdowns: ctx.input.breakdowns,
      campaign_ids: ctx.input.campaignIds,
      ad_group_ids: ctx.input.adGroupIds,
      ad_ids: ctx.input.adIds
    });

    return {
      output: { report },
      message: `Performance report generated for **${ctx.input.startDate}** to **${ctx.input.endDate}** at **${ctx.input.level}** level.`
    };
  })
  .build();
