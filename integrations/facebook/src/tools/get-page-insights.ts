import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPageInsights = SlateTool.create(spec, {
  name: 'Get Page Insights',
  key: 'get_page_insights',
  description: `Retrieve analytics and insights for a Facebook Page. Returns metrics such as reach, impressions, engagement, page views, and fan demographics.
Provide specific metric names or use the defaults. Supports filtering by date range and aggregation period.`,
  instructions: [
    'Common metrics: `page_impressions`, `page_engaged_users`, `page_fan_adds`, `page_fan_removes`, `page_views_total`, `page_fans`, `page_post_engagements`.',
    'Period can be `day`, `week`, `days_28`, or `lifetime`.',
    'Date range filtering uses ISO date strings (e.g. `2024-01-01`).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageId: z.string().describe('Facebook Page ID'),
      metrics: z
        .array(z.string())
        .optional()
        .describe('List of metric names to retrieve. Defaults to common Page metrics.'),
      period: z
        .enum(['day', 'week', 'days_28', 'lifetime'])
        .optional()
        .describe('Aggregation period for the metrics'),
      since: z
        .string()
        .optional()
        .describe('Start date for the date range (ISO date, e.g. 2024-01-01)'),
      until: z
        .string()
        .optional()
        .describe('End date for the date range (ISO date, e.g. 2024-01-31)')
    })
  )
  .output(
    z.object({
      insights: z
        .array(
          z.object({
            metricName: z.string().describe('Metric identifier'),
            metricTitle: z.string().describe('Human-readable metric title'),
            period: z.string().describe('Aggregation period'),
            description: z.string().describe('Metric description'),
            values: z
              .array(
                z.object({
                  value: z.any().describe('Metric value (number or breakdown object)'),
                  endTime: z.string().describe('End time of the measurement period')
                })
              )
              .describe('Metric values over time')
          })
        )
        .describe('Page insight metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let pageAccessToken = await client.getPageAccessToken(ctx.input.pageId);

    let metrics = ctx.input.metrics || [
      'page_impressions',
      'page_engaged_users',
      'page_fan_adds',
      'page_views_total',
      'page_post_engagements'
    ];

    let insights = await client.getPageInsights(ctx.input.pageId, {
      metric: metrics,
      period: ctx.input.period,
      since: ctx.input.since,
      until: ctx.input.until,
      pageAccessToken
    });

    return {
      output: {
        insights: insights.map(i => ({
          metricName: i.name,
          metricTitle: i.title,
          period: i.period,
          description: i.description,
          values: i.values.map(v => ({
            value: v.value,
            endTime: v.end_time
          }))
        }))
      },
      message: `Retrieved **${insights.length}** insight metric(s) for page **${ctx.input.pageId}**.`
    };
  })
  .build();
