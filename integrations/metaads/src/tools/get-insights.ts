import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { spec } from '../spec';

export let getInsights = SlateTool.create(spec, {
  name: 'Get Performance Insights',
  key: 'get_insights',
  description: `Query performance metrics (impressions, clicks, spend, conversions, ROAS, etc.) at account, campaign, ad set, or ad level. Supports date ranges, time breakdowns, and dimensional breakdowns (age, gender, country, platform, placement, etc.).

Use **objectId** to scope to a specific campaign/ad set/ad, or omit it to get account-level data. Use **level** to aggregate data at a specific level within the hierarchy.`,
  instructions: [
    'When using breakdowns, be aware that some combinations are not supported by Meta.',
    'For large date ranges, consider using timeIncrement to get daily/weekly/monthly aggregations.',
    'The datePreset and timeRange parameters are mutually exclusive — use one or the other.'
  ],
  constraints: [
    'Reach data with breakdowns is limited to the past 13 months.',
    'Some attribution windows have been deprecated. Only 1d_view and click-through windows are supported.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectId: z
        .string()
        .optional()
        .describe(
          'ID of the campaign, ad set, or ad to get insights for. Omit to get account-level insights.'
        ),
      level: z
        .enum(['account', 'campaign', 'adset', 'ad'])
        .optional()
        .describe(
          'Level of aggregation. Use when objectId is an account or campaign to break down data.'
        ),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Metrics to retrieve (e.g., ["impressions", "clicks", "spend", "ctr", "cpc", "cpm", "reach", "actions", "cost_per_action_type", "purchase_roas"])'
        ),
      datePreset: z
        .enum([
          'today',
          'yesterday',
          'this_month',
          'last_month',
          'this_quarter',
          'maximum',
          'last_3d',
          'last_7d',
          'last_14d',
          'last_28d',
          'last_30d',
          'last_90d',
          'last_week_mon_sun',
          'last_week_sun_sat',
          'last_quarter',
          'last_year',
          'this_week_mon_today',
          'this_week_sun_today',
          'this_year'
        ])
        .optional()
        .describe('Predefined date range. Mutually exclusive with timeRange.'),
      timeRange: z
        .object({
          since: z.string().describe('Start date (YYYY-MM-DD)'),
          until: z.string().describe('End date (YYYY-MM-DD)')
        })
        .optional()
        .describe('Custom date range. Mutually exclusive with datePreset.'),
      timeIncrement: z
        .string()
        .optional()
        .describe(
          'Time increment for grouping results. Use "1" for daily, "7" for weekly, "monthly" for monthly, or "all_days" for aggregate.'
        ),
      breakdowns: z
        .array(
          z.enum([
            'age',
            'gender',
            'country',
            'region',
            'publisher_platform',
            'platform_position',
            'impression_device',
            'device_platform'
          ])
        )
        .optional()
        .describe('Dimensional breakdowns to segment data by'),
      limit: z.number().optional().describe('Max number of results to return'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      insights: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of insight records with requested metrics'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.getInsights({
      objectId: ctx.input.objectId,
      level: ctx.input.level,
      fields: ctx.input.fields?.join(','),
      datePreset: ctx.input.datePreset,
      timeRange: ctx.input.timeRange,
      breakdowns: ctx.input.breakdowns,
      timeIncrement: ctx.input.timeIncrement,
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let insights = result.data || [];

    return {
      output: {
        insights,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${insights.length}** insight records.`
    };
  })
  .build();
