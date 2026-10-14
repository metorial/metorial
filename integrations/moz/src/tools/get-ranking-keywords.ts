import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let rankingKeywordSchema = z
  .object({
    keyword: z.string().optional().describe('The keyword'),
    position: z.number().optional().describe('Ranking position'),
    volume: z.number().optional().describe('Monthly search volume'),
    difficulty: z.number().optional().describe('Keyword difficulty')
  })
  .passthrough();

export let getRankingKeywordsTool = SlateTool.create(spec, {
  name: 'Get Ranking Keywords',
  key: 'get_ranking_keywords',
  description: `Retrieve keywords that a specific site ranks for in organic search results (top 50 positions). Provides ranking position, search volume, and difficulty for each keyword. Useful for competitive analysis and understanding a site's organic search visibility.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      site: z.string().describe('Domain to get ranking keywords for'),
      engine: z
        .enum(['google', 'bing'])
        .optional()
        .describe('Search engine; ranking data supports Google only (default: google)'),
      locale: z.string().optional().describe('Locale code (default: en-US)'),
      limit: z
        .number()
        .min(1)
        .max(500)
        .refine(Number.isSafeInteger, 'Must be a whole number')
        .optional()
        .describe('Maximum number of keywords to return'),
      page: z
        .number()
        .min(0)
        .refine(Number.isSafeInteger, 'Must be a whole number')
        .optional()
        .describe('Zero-based page number')
    })
  )
  .output(
    z.object({
      rankings: z.array(rankingKeywordSchema).describe('Keywords the site ranks for')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let result = await client.getRankingKeywords({
      site: ctx.input.site,
      engine: ctx.input.engine,
      locale: ctx.input.locale,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let rankings = (result?.ranking_keywords ?? result?.results ?? result?.keywords ?? []).map(
      (r: any) => ({
        ...r,
        keyword: r.keyword,
        position: r.position ?? r.rank ?? r.rank_position,
        volume: r.volume ?? r.keyword_metrics?.volume ?? undefined,
        difficulty: r.difficulty ?? r.keyword_metrics?.difficulty ?? undefined
      })
    );

    return {
      output: { rankings },
      message: `Found **${rankings.length}** ranking keywords for **${ctx.input.site}**.`
    };
  })
  .build();
