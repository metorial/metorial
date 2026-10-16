import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAnalytics = SlateTool.create(spec, {
  name: 'Get Link Analytics',
  key: 'get_analytics',
  description: `Retrieve analytics for TinyURL links. Supports multiple analytics types: timeline (click trends over time), general (browser/OS/device breakdown), top sources, top languages, location data, and popularity by day of week or hour.
Filter by a specific alias or tag, and optionally narrow results by date range. This is a **paid feature**.`,
  instructions: [
    'Use the "type" parameter to choose the analytics report. Each type returns different data.',
    'Provide a start datetime in "from" for every report. The end datetime defaults to now.',
    'For location analytics, omit "region" for countries or provide an ISO country code for regional detail.',
    'For timeline analytics, specify an "interval" such as "day", "week", or "month".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum([
          'timeline',
          'general',
          'sources',
          'languages',
          'location',
          'weekday_popularity',
          'hour_popularity'
        ])
        .describe('Type of analytics report to retrieve'),
      alias: z
        .string()
        .optional()
        .describe(
          'TinyURL to analyze, such as tinyurl.com/myalias. A bare alias uses tinyurl.com.'
        ),
      tag: z.string().optional().describe('Filter analytics by a specific tag'),
      from: z
        .string()
        .optional()
        .describe('Required by TinyURL: ISO 8601 start datetime for the analytics period'),
      to: z.string().optional().describe('ISO 8601 end datetime for the analytics period'),
      interval: z
        .enum(['minute', 'hour', 'day', 'week', 'month'])
        .optional()
        .describe('Time interval for timeline analytics'),
      region: z
        .string()
        .optional()
        .describe(
          'For location reports: ISO 3166-1 alpha-2 country code, or world for countries (default)'
        )
    })
  )
  .output(
    z.object({
      analyticsType: z.string().describe('The type of analytics report returned'),
      analytics: z.unknown().describe('Analytics data (structure varies by report type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let baseParams = {
      from: ctx.input.from,
      to: ctx.input.to,
      alias: ctx.input.alias,
      tag: ctx.input.tag
    };

    let analytics: unknown;

    switch (ctx.input.type) {
      case 'timeline':
        analytics = await client.getTimelineAnalytics({
          ...baseParams,
          interval: ctx.input.interval
        });
        break;
      case 'general':
        analytics = await client.getGeneralAnalytics(baseParams);
        break;
      case 'sources':
        analytics = await client.getTopSources(baseParams);
        break;
      case 'languages':
        analytics = await client.getTopLanguages(baseParams);
        break;
      case 'location':
        analytics = await client.getLocationAnalytics(ctx.input.region || 'world', baseParams);
        break;
      case 'weekday_popularity':
        analytics = await client.getWeekdayPopularity(baseParams);
        break;
      case 'hour_popularity':
        analytics = await client.getHourPopularity(baseParams);
        break;
    }

    return {
      output: {
        analyticsType: ctx.input.type,
        analytics
      },
      message: `Retrieved **${ctx.input.type}** analytics${ctx.input.alias ? ` for alias **${ctx.input.alias}**` : ''}${ctx.input.tag ? ` for tag **${ctx.input.tag}**` : ''}`
    };
  })
  .build();
