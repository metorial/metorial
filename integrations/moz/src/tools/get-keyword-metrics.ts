import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

export let getKeywordMetricsTool = SlateTool.create(spec, {
  name: 'Get Keyword Metrics',
  key: 'get_keyword_metrics',
  description: `Retrieve comprehensive SEO metrics for a keyword, including search volume, difficulty score (1-100), organic CTR (click-through rate), and priority score. Provides all the key data points needed to evaluate a keyword's potential for SEO targeting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Keyword to analyze'),
      locale: z.string().optional().describe('Locale code (default: en-US)'),
      device: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Device type (default: desktop)'),
      engine: z.enum(['google', 'bing']).optional().describe('Search engine (default: google)')
    })
  )
  .output(
    z.object({
      keyword: z.string().describe('The analyzed keyword'),
      locale: z.string().optional().describe('Locale used'),
      device: z.string().optional().describe('Device type used'),
      engine: z.string().optional().describe('Search engine used'),
      volume: z.number().optional().describe('Monthly search volume'),
      difficulty: z.number().optional().describe('Keyword difficulty score (1-100)'),
      organicCtr: z.number().optional().describe('Organic click-through rate'),
      priority: z.number().optional().describe('Keyword priority score')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let result = await client.getKeywordMetrics({
      keyword: ctx.input.keyword,
      locale: ctx.input.locale,
      device: ctx.input.device,
      engine: ctx.input.engine
    });

    let metrics = result?.keyword_metrics || {};
    let query = result?.serp_query || {};

    return {
      output: {
        keyword: query.keyword || ctx.input.keyword,
        locale: query.locale,
        device: query.device,
        engine: query.engine,
        volume: metrics.volume,
        difficulty: metrics.difficulty,
        organicCtr: metrics.organic_ctr,
        priority: metrics.priority
      },
      message: `**${ctx.input.keyword}**: Volume ${metrics.volume ?? 'N/A'}, Difficulty ${metrics.difficulty ?? 'N/A'}/100, Organic CTR ${metrics.organic_ctr ?? 'N/A'}%, Priority ${metrics.priority ?? 'N/A'}`
    };
  })
  .build();
