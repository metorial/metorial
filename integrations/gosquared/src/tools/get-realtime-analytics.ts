import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let getRealtimeAnalytics = SlateTool.create(spec, {
  name: 'Real-Time Analytics',
  key: 'get_realtime_analytics',
  description: `Retrieve real-time concurrent analytics data from GoSquared. Get current visitor counts, popular pages, traffic sources, visitor locations, engagement metrics, and individual visitor details. Select one or more dimensions to include.`,
  instructions: [
    'Best suited for sites with higher traffic (10+ concurrent visitors). For low-traffic sites, prefer historical analytics.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dimensions: z
        .array(
          z.enum([
            'overview',
            'concurrents',
            'pages',
            'sources',
            'countries',
            'visitors',
            'engagement'
          ])
        )
        .describe('Which real-time data dimensions to retrieve'),
      limit: z
        .string()
        .optional()
        .describe('Maximum number of items to return for list dimensions')
    })
  )
  .output(
    z.object({
      overview: z.record(z.string(), z.any()).optional().describe('Real-time site overview'),
      concurrents: z
        .record(z.string(), z.any())
        .optional()
        .describe('Concurrent visitor summary'),
      pages: z.record(z.string(), z.any()).optional().describe('Currently popular pages'),
      sources: z.record(z.string(), z.any()).optional().describe('Current traffic sources'),
      countries: z.record(z.string(), z.any()).optional().describe('Visitor countries'),
      visitors: z
        .record(z.string(), z.any())
        .optional()
        .describe('Individual online visitors'),
      engagement: z.record(z.string(), z.any()).optional().describe('Engagement metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    let output: Record<string, any> = {};
    let limitParams = ctx.input.limit ? { limit: ctx.input.limit } : undefined;

    let fetchers: Record<string, () => Promise<any>> = {
      overview: () => client.getNowOverview(),
      concurrents: () => client.getNowConcurrents(),
      pages: () => client.getNowPages(limitParams),
      sources: () => client.getNowSources(limitParams),
      countries: () => client.getNowCountries(limitParams),
      visitors: () => client.getNowVisitors(limitParams),
      engagement: () => client.getNowEngagement()
    };

    let results = await Promise.all(
      ctx.input.dimensions.map(async dim => {
        let fetcher = fetchers[dim];
        if (fetcher) {
          let result = await fetcher();
          return [dim, result] as const;
        }
        return [dim, null] as const;
      })
    );

    for (let [dim, result] of results) {
      output[dim] = result;
    }

    return {
      output: output as any,
      message: `Retrieved real-time analytics for **${ctx.input.dimensions.join(', ')}**.`
    };
  })
  .build();
