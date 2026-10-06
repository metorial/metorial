import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dateComponentSchema = z.object({
  year: z.number().describe('Year (e.g., 2025)'),
  month: z.number().describe('Month (1-12)'),
  day: z.number().describe('Day of month (1-31)')
});

export let getAdAnalytics = SlateTool.create(spec, {
  name: 'Get Ad Analytics',
  key: 'get_ad_analytics',
  description: `Retrieve advertising performance analytics from LinkedIn. Query metrics like impressions, clicks, spend, conversions, and engagement across accounts, campaigns, campaign groups, or creatives. Supports time-based breakdowns (daily, monthly, all).`,
  instructions: [
    'The exclusive end date preserves the tool date contract; LinkedIn receives the preceding inclusive UTC day. Analytics is capped at 15,000 rows and does not support continuation. An empty result is not proof of account access.',
    'At least one of accountIds, campaignIds, creativeIds, or campaignGroupIds must be provided.',
    'Common metrics include: impressions, clicks, costInLocalCurrency, externalWebsiteConversions, likes, comments, shares, follows, leadGenerationMailContactInfoShares.',
    'Pivot determines the grouping of results: ACCOUNT, CAMPAIGN, CAMPAIGN_GROUP, CREATIVE, MEMBER_COMPANY, MEMBER_COMPANY_SIZE, MEMBER_JOB_FUNCTION, MEMBER_JOB_TITLE, MEMBER_INDUSTRY, MEMBER_SENIORITY, MEMBER_COUNTRY, MEMBER_REGION.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(anyOf('r_ads_reporting'))
  .input(
    z.object({
      pivot: z
        .enum([
          'ACCOUNT',
          'CAMPAIGN',
          'CAMPAIGN_GROUP',
          'CREATIVE',
          'MEMBER_COMPANY',
          'MEMBER_COMPANY_SIZE',
          'MEMBER_JOB_FUNCTION',
          'MEMBER_JOB_TITLE',
          'MEMBER_INDUSTRY',
          'MEMBER_SENIORITY',
          'MEMBER_COUNTRY',
          'MEMBER_REGION',
          'MEMBER_COUNTRY_V2',
          'MEMBER_REGION_V2'
        ])
        .describe('Dimension to group results by'),
      startDate: dateComponentSchema.describe('Start date for the analytics period'),
      endDate: dateComponentSchema.describe(
        'Exclusive end date; converted to the preceding inclusive UTC day for LinkedIn'
      ),
      timeGranularity: z
        .enum(['DAILY', 'MONTHLY', 'ALL'])
        .default('ALL')
        .describe('Time granularity for breakdown'),
      accountIds: z.array(z.string()).optional().describe('Ad account IDs to query'),
      campaignIds: z.array(z.string()).optional().describe('Campaign IDs to query'),
      creativeIds: z
        .array(z.string())
        .optional()
        .describe('Creative IDs (URN format) to query'),
      campaignGroupIds: z.array(z.string()).optional().describe('Campaign group IDs to query'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Specific metric fields to return (e.g., ["impressions", "clicks", "costInLocalCurrency"])'
        )
    })
  )
  .output(
    z.object({
      analytics: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of analytics data rows with requested metrics'),
      totalCount: z.number().optional().describe('Total number of rows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAdAnalytics({
      pivot: ctx.input.pivot,
      dateRange: {
        start: ctx.input.startDate,
        end: ctx.input.endDate
      },
      timeGranularity: ctx.input.timeGranularity,
      accounts: ctx.input.accountIds,
      campaigns: ctx.input.campaignIds,
      creatives: ctx.input.creativeIds,
      campaignGroups: ctx.input.campaignGroupIds,
      fields: ctx.input.fields
    });

    return {
      output: {
        analytics: result.elements,
        totalCount: result.paging?.total
      },
      message: `Retrieved **${result.elements.length}** analytics row(s) pivoted by ${ctx.input.pivot}.`
    };
  })
  .build();
