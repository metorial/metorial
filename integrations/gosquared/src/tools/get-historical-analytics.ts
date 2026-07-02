import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let getHistoricalAnalytics = SlateTool.create(spec, {
  name: 'Historical Analytics',
  key: 'get_historical_analytics',
  description: `Retrieve historical analytics data from GoSquared Trends API. Get aggregate metrics or break them down by dimension (browser, country, event, page, source, campaign, language, OS, etc.) over any time period.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dimension: z
        .enum([
          'aggregate',
          'browser',
          'country',
          'event',
          'language',
          'organisation',
          'os',
          'page',
          'path1',
          'sources',
          'campaign_name',
          'campaign_source',
          'campaign_medium',
          'campaign_content',
          'campaign_term',
          'screenDimensions'
        ])
        .describe('The data dimension to retrieve'),
      from: z
        .string()
        .optional()
        .describe(
          'Start date/time in ISO 8601 format or relative format (e.g. "2024-01-01", "-30d")'
        ),
      to: z
        .string()
        .optional()
        .describe(
          'End date/time in ISO 8601 format or relative format (e.g. "2024-01-31", "now")'
        ),
      interval: z
        .string()
        .optional()
        .describe(
          'Aggregation interval for time series (e.g. "hour", "day", "week", "month"). Only for aggregate dimension.'
        ),
      limit: z.string().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      trends: z
        .any()
        .describe('Historical analytics data for the requested dimension and time range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    let result: any;
    if (ctx.input.dimension === 'aggregate') {
      result = await client.getTrendsAggregate({
        from: ctx.input.from,
        to: ctx.input.to,
        interval: ctx.input.interval
      });
    } else {
      result = await client.getTrendsByDimension(ctx.input.dimension, {
        from: ctx.input.from,
        to: ctx.input.to,
        limit: ctx.input.limit
      });
    }

    return {
      output: { trends: result },
      message: `Retrieved **${ctx.input.dimension}** historical analytics${ctx.input.from ? ` from ${ctx.input.from}` : ''}${ctx.input.to ? ` to ${ctx.input.to}` : ''}.`
    };
  })
  .build();
