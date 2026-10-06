import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
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
      startDate: z
        .string()
        .optional()
        .describe(
          'Start date (YYYY-MM-DD) or ISO 8601 timestamp with a time zone. Date-only values use UTC midnight.'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'End date (YYYY-MM-DD) or ISO 8601 timestamp with a time zone. Date-only values use UTC midnight.'
        ),
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

    if (campaignId && campaignIds?.length)
      throw invalid('Use campaignId or campaignIds, not both.');
    if ((view === 'daily' || view === 'steps') && campaignIds !== undefined)
      throw invalid('daily and steps views accept a single campaignId, not campaignIds.');
    for (let date of [startDate, endDate]) {
      if (
        date !== undefined &&
        (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2}))?$/.test(
          date
        ) ||
          !Number.isFinite(Date.parse(date)))
      )
        throw invalid(
          'Use YYYY-MM-DD or a valid ISO 8601 timestamp with a time zone for analytics dates.'
        );
    }
    if (startDate && endDate && Date.parse(startDate) > Date.parse(endDate))
      throw invalid('startDate must be on or before endDate.');
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
