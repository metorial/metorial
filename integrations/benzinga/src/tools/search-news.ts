import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

let newsArticleSchema = z.object({
  articleId: z.number().describe('Unique article identifier'),
  author: z.string().optional().describe('Article author'),
  created: z.string().optional().describe('Creation timestamp'),
  updated: z.string().optional().describe('Last update timestamp'),
  title: z.string().optional().describe('Article headline'),
  teaser: z.string().optional().describe('Article summary or abstract'),
  body: z.string().optional().describe('Full article body (HTML)'),
  url: z.string().optional().describe('Benzinga article URL'),
  images: z
    .array(
      z.object({
        size: z.string().optional(),
        url: z.string().optional()
      })
    )
    .optional()
    .describe('Article images'),
  channels: z.array(z.string()).optional().describe('Topic categories'),
  tickers: z.array(z.string()).optional().describe('Associated stock tickers'),
  tags: z.array(z.string()).optional().describe('Theme tags')
});

export let searchNewsTool = SlateTool.create(spec, {
  name: 'Search News',
  key: 'search_news',
  description: `Search and retrieve Benzinga news articles, headlines, and press releases. Filter by tickers, date range, channels, topics, or authors. Supports full article content or headline/abstract views. Covers the Wilshire 5000, TSX, and 1000+ popular tickers.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z
        .string()
        .optional()
        .describe('Comma-separated ticker symbols to filter by (max 50), e.g. "AAPL,MSFT"'),
      dateFrom: z.string().optional().describe('Start date for article range (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date for article range (YYYY-MM-DD)'),
      channels: z.string().optional().describe('Comma-separated channel names to filter by'),
      topics: z.string().optional().describe('Comma-separated keywords/phrases to filter by'),
      authors: z.string().optional().describe('Comma-separated author names to filter by'),
      contentTypes: z
        .string()
        .optional()
        .describe('Comma-separated content types to filter by'),
      displayOutput: z
        .enum(['full', 'abstract', 'headline'])
        .optional()
        .default('abstract')
        .describe('Level of article detail to return'),
      sort: z
        .enum([
          'id:asc',
          'id:desc',
          'created:asc',
          'created:desc',
          'updated:asc',
          'updated:desc'
        ])
        .optional()
        .describe('Sort order for results'),
      page: z.number().optional().default(0).describe('Page offset for pagination'),
      pageSize: z
        .number()
        .optional()
        .default(15)
        .describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      articles: z.array(newsArticleSchema).describe('List of news articles'),
      count: z.number().describe('Number of articles returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.getNews({
      tickers: ctx.input.tickers,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      channels: ctx.input.channels,
      topics: ctx.input.topics,
      authors: ctx.input.authors,
      contentTypes: ctx.input.contentTypes,
      displayOutput: ctx.input.displayOutput,
      sort: ctx.input.sort,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let articles = (Array.isArray(data) ? data : []).map((item: any) => ({
      articleId: item.id,
      author: item.author,
      created: item.created,
      updated: item.updated,
      title: item.title,
      teaser: item.teaser,
      body: item.body,
      url: item.url,
      images: item.image || [],
      channels: (item.channels || []).map((c: any) => c.name),
      tickers: (item.stocks || []).map((s: any) => s.name),
      tags: (item.tags || []).map((t: any) => t.name)
    }));

    return {
      output: {
        articles,
        count: articles.length
      },
      message: `Found **${articles.length}** news article(s)${ctx.input.tickers ? ` for tickers: ${ctx.input.tickers}` : ''}.`
    };
  })
  .build();
