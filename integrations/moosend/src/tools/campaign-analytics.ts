import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { spec } from '../spec';

export let campaignAnalytics = SlateTool.create(spec, {
  name: 'Campaign Analytics',
  key: 'campaign_analytics',
  description: `Retrieve detailed campaign performance analytics. Get aggregate summaries with key metrics, A/B test results, detailed stats by type (opens, clicks, bounces, etc.), link activity, or geographic open data.`,
  instructions: [
    'Use reportType "summary" for an overview of campaign performance.',
    'Use reportType "ab_summary" for A/B test campaign results.',
    'Use reportType "stats" with a statsType to get detailed breakdowns by opens, clicks, bounces, unsubscribes, etc.',
    'Sent stats are retained for 90 days; opened/clicked stats for 180 days.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to analyze'),
      reportType: z
        .enum(['summary', 'ab_summary', 'stats', 'links', 'locations'])
        .describe('Type of analytics report to retrieve'),
      statsType: z
        .enum([
          'Sent',
          'Opened',
          'LinkClicked',
          'Forward',
          'Unsubscribed',
          'Bounced',
          'Complained'
        ])
        .optional()
        .describe('Specific stat type (required when reportType is "stats")'),
      page: z.number().optional().default(1).describe('Page number for paginated stats'),
      pageSize: z
        .number()
        .optional()
        .default(50)
        .describe('Items per page for paginated stats'),
      fromDate: z
        .string()
        .optional()
        .describe('Start date filter for stats (e.g. "2024-01-01")'),
      toDate: z.string().optional().describe('End date filter for stats (e.g. "2024-12-31")')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      reportType: z.string().describe('Type of report returned'),
      analytics: z
        .record(z.string(), z.unknown())
        .describe('Analytics data returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });
    let { campaignId, reportType } = ctx.input;
    let analytics: Record<string, unknown>;

    switch (reportType) {
      case 'summary':
        analytics = await client.getCampaignSummary(campaignId);
        break;
      case 'ab_summary':
        analytics = await client.getCampaignABSummary(campaignId);
        break;
      case 'stats':
        if (!ctx.input.statsType) {
          throw new Error('statsType is required when reportType is "stats"');
        }
        analytics = await client.getCampaignStats(
          campaignId,
          ctx.input.statsType,
          ctx.input.page,
          ctx.input.pageSize,
          ctx.input.fromDate,
          ctx.input.toDate
        );
        break;
      case 'links':
        analytics = await client.getCampaignLinkActivity(campaignId);
        break;
      case 'locations':
        analytics = await client.getCampaignActivityByLocation(campaignId);
        break;
    }

    return {
      output: {
        campaignId,
        reportType,
        analytics: analytics!
      },
      message: `Retrieved **${reportType}** analytics for campaign ${campaignId}.`
    };
  })
  .build();
