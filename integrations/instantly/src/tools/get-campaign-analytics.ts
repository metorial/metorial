import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignAnalytics = SlateTool.create(spec, {
  name: 'Get Campaign Analytics',
  key: 'get_campaign_analytics',
  description: `Retrieve analytics for one or more campaigns, including sends, opens, clicks, replies, bounces, and CRM metrics. Supports overview, daily breakdown, and per-step views.`,
  instructions: [
    'Use view "overview" for high-level CRM metrics (opportunities, meetings, closed deals).',
    'Use view "daily" for day-by-day breakdown of email metrics.',
    'Use view "steps" for per-step/variant performance data.',
    'Default view "summary" returns aggregate campaign analytics.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe('Single campaign ID. Omit for all campaigns.'),
      campaignIds: z
        .array(z.string())
        .optional()
        .describe('Multiple campaign IDs to include.'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format.'),
      view: z
        .enum(['summary', 'overview', 'daily', 'steps'])
        .optional()
        .default('summary')
        .describe('Type of analytics view.')
    })
  )
  .output(
    z.object({
      analytics: z.any().describe('Campaign analytics data. Structure varies by view type.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { view, campaignId, campaignIds, startDate, endDate } = ctx.input;

    let analytics: any;

    if (view === 'overview') {
      analytics = await client.getCampaignAnalyticsOverview({
        campaignId,
        campaignIds,
        startDate,
        endDate
      });
    } else if (view === 'daily') {
      analytics = await client.getDailyCampaignAnalytics({ campaignId, startDate, endDate });
    } else if (view === 'steps') {
      analytics = await client.getStepAnalytics({
        campaignId,
        startDate,
        endDate,
        includeOpportunitiesCount: true
      });
    } else {
      analytics = await client.getCampaignAnalytics({
        campaignId,
        campaignIds,
        startDate,
        endDate
      });
    }

    return {
      output: { analytics },
      message: `Retrieved **${view}** analytics${campaignId ? ` for campaign ${campaignId}` : ''}.`
    };
  })
  .build();
