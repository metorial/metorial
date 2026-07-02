import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let serpResultSchema = z.object({
  title: z.string().optional().describe('Title of the search result'),
  link: z.string().optional().describe('URL of the search result'),
  description: z.string().optional().describe('Description snippet'),
  position: z.number().optional().describe('Position in the SERP')
});

export let serpRanking = SlateTool.create(spec, {
  name: 'SERP Ranking',
  key: 'serp_ranking',
  description: `Track a domain's SERP ranking for a specific search query. Returns the domain's position and surrounding results in Google search. Designed for SEO rank tracking, competitor monitoring, and keyword position analysis.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Search query to check ranking for (e.g., "professional network")'),
      domain: z.string().describe('Domain to track ranking for (e.g., "linkedin.com")'),
      num: z
        .number()
        .optional()
        .describe('Number of results to scan for ranking (e.g., 100 for top 100)'),
      proxyLocation: z
        .enum([
          'US',
          'EU',
          'CA',
          'GB',
          'FR',
          'DE',
          'SE',
          'IE',
          'IN',
          'JP',
          'KR',
          'SG',
          'AU',
          'BR'
        ])
        .optional()
        .describe('Geographic location for results, overrides default'),
      deviceType: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Device type for results, overrides default')
    })
  )
  .output(
    z.object({
      results: z.array(serpResultSchema).describe('SERP results for the domain'),
      total: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      proxyLocation: ctx.config.proxyLocation,
      deviceType: ctx.config.deviceType
    });

    let data = await client.serpRanking({
      query: ctx.input.query,
      domain: ctx.input.domain,
      num: ctx.input.num,
      proxyLocation: ctx.input.proxyLocation,
      deviceType: ctx.input.deviceType
    });

    let results = data.results || [];

    return {
      output: {
        results,
        total: data.total || 0
      },
      message: `Tracked SERP ranking for **${ctx.input.domain}** on query "${ctx.input.query}". Found **${results.length}** matching results.`
    };
  })
  .build();
