import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchNews = SlateTool.create(spec, {
  name: 'Search News',
  key: 'search_news',
  description: `Search for recent news about companies in the ZoomInfo database. Returns news articles, press releases, and related coverage. Useful for staying updated on prospects and accounts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.number().optional().describe('ZoomInfo company ID'),
      companyName: z.string().optional().describe('Company name'),
      keywords: z.array(z.string()).optional().describe('Keywords to search for in news'),
      publishedDateAfter: z
        .string()
        .optional()
        .describe('Only return news published after this date (ISO 8601)'),
      page: z.number().min(1).optional().describe('Page number'),
      pageSize: z.number().min(1).max(100).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      articles: z.array(z.record(z.string(), z.any())).describe('News articles and coverage'),
      totalResults: z.number().optional().describe('Total matching articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let { page, pageSize, ...searchParams } = ctx.input;

    let result = await client.searchNews(searchParams, page, pageSize);

    let articles = result.data || result.result || [];
    let totalResults = result.meta?.totalResults ?? result.totalResults;

    return {
      output: { articles, totalResults },
      message: `Found **${totalResults ?? articles.length}** news article(s).`
    };
  })
  .build();
