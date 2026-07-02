import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { InstagramClient } from '../lib/client';
import { spec } from '../spec';

let insightValueSchema = z.object({
  name: z.string().describe('Metric name'),
  title: z.string().optional().describe('Human-readable metric title'),
  period: z.string().optional().describe('Time period for the metric'),
  values: z
    .array(
      z.object({
        value: z.any().describe('Metric value (number or object for demographics)'),
        endTime: z.string().optional().describe('End time of the period')
      })
    )
    .optional()
    .describe('Metric values over time'),
  totalValue: z.any().optional().describe('Total aggregate value')
});

export let getInsightsTool = SlateTool.create(spec, {
  name: 'Get Insights',
  key: 'get_insights',
  description: `Retrieve analytics and performance insights for an Instagram account or specific media post. Account-level insights include reach, profile views, and audience metrics. Media-level insights include reach, views, saves, likes, comments, and shares.`,
  instructions: [
    'For account insights, provide a `period` (e.g. "day", "week", "days_28", "lifetime").',
    'Use `since` and `until` as ISO date strings to specify a date range for account insights.',
    'For media insights, provide a `mediaId` — the period is not needed.'
  ],
  constraints: [
    'Requires the `instagram_manage_insights` permission.',
    'Account insights "since"/"until" must be within the last 2 years.',
    'Story insights are only available for 24 hours after the story is published.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mediaId: z
        .string()
        .optional()
        .describe('Media ID to get insights for. If omitted, returns account-level insights.'),
      metrics: z
        .array(z.string())
        .optional()
        .describe('Specific metrics to retrieve. If omitted, returns default metrics.'),
      period: z
        .string()
        .optional()
        .describe('Time period for account insights: "day", "week", "days_28", or "lifetime"'),
      since: z
        .string()
        .optional()
        .describe('Start date for account insights (ISO 8601 date string)'),
      until: z
        .string()
        .optional()
        .describe('End date for account insights (ISO 8601 date string)'),
      metricType: z
        .enum(['time_series', 'total_value'])
        .optional()
        .describe('Metric type for account insights when required by selected metrics.'),
      breakdown: z
        .string()
        .optional()
        .describe('Optional account-insight breakdown such as media_product_type.'),
      userId: z
        .string()
        .optional()
        .describe('Instagram user ID. Defaults to the authenticated user.')
    })
  )
  .output(
    z.object({
      insights: z.array(insightValueSchema).describe('List of insight metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new InstagramClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    if (ctx.input.mediaId) {
      let defaultMetrics = ['reach', 'saved', 'likes', 'comments', 'shares', 'views'];
      let metrics = ctx.input.metrics || defaultMetrics;

      let result = await client.getMediaInsights(ctx.input.mediaId, metrics);

      let insights = (result.data || []).map((i: any) => ({
        name: i.name,
        title: i.title,
        period: i.period,
        values: i.values?.map((v: any) => ({
          value: v.value,
          endTime: v.end_time
        })),
        totalValue: i.total_value?.value
      }));

      return {
        output: { insights },
        message: `Retrieved **${insights.length}** insight metrics for media ${ctx.input.mediaId}.`
      };
    }

    let effectiveUserId = ctx.input.userId || ctx.auth.userId || 'me';
    let period = ctx.input.period || 'day';
    let defaultMetrics = ['reach', 'profile_views'];
    let metrics = ctx.input.metrics || defaultMetrics;

    let result = await client.getAccountInsights(effectiveUserId, {
      metrics,
      period,
      since: ctx.input.since,
      until: ctx.input.until,
      metricType: ctx.input.metricType,
      breakdown: ctx.input.breakdown
    });

    let insights = (result.data || []).map((i: any) => ({
      name: i.name,
      title: i.title,
      period: i.period,
      values: i.values?.map((v: any) => ({
        value: v.value,
        endTime: v.end_time
      })),
      totalValue: i.total_value?.value
    }));

    return {
      output: { insights },
      message: `Retrieved **${insights.length}** account insight metrics (period: ${period}).`
    };
  })
  .build();
