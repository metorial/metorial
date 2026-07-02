import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getMarketNews = SlateTool.create(spec, {
  name: 'Get Market News',
  key: 'get_market_news',
  description: `Retrieve financial news articles with optional filtering by ticker and publication date. Articles include title, summary, publisher info, sentiment analysis per ticker, and related ticker symbols.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().optional().describe('Filter news by ticker symbol (e.g., AAPL)'),
      publishedAfter: z
        .string()
        .optional()
        .describe(
          'Only return articles published after this date (YYYY-MM-DD or ISO datetime)'
        ),
      publishedBefore: z
        .string()
        .optional()
        .describe(
          'Only return articles published before this date (YYYY-MM-DD or ISO datetime)'
        ),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by publication date'),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Max number of articles to return (default 10, max 1000)'),
      sort: z.string().optional().describe('Field to sort by (e.g., published_utc)')
    })
  )
  .output(
    z.object({
      articles: z
        .array(
          z.object({
            articleId: z.string().optional().describe('Unique article identifier'),
            title: z.string().optional().describe('Article title'),
            description: z.string().optional().describe('Article summary/description'),
            articleUrl: z.string().optional().describe('URL to the full article'),
            imageUrl: z.string().optional().describe('Article image URL'),
            author: z.string().optional().describe('Article author'),
            publishedUtc: z.string().optional().describe('Publication timestamp (UTC)'),
            tickers: z.array(z.string()).optional().describe('Related ticker symbols'),
            publisherName: z.string().optional().describe('Publisher name'),
            publisherLogoUrl: z.string().optional().describe('Publisher logo URL'),
            publisherHomepageUrl: z.string().optional().describe('Publisher homepage URL'),
            keywords: z.array(z.string()).optional().describe('Article keywords'),
            insights: z
              .array(
                z.object({
                  ticker: z.string().optional(),
                  sentiment: z.string().optional(),
                  sentimentReasoning: z.string().optional()
                })
              )
              .optional()
              .describe('Per-ticker sentiment analysis')
          })
        )
        .describe('News articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let response = await client.getNews({
      ticker: ctx.input.ticker,
      publishedUtcGte: ctx.input.publishedAfter,
      publishedUtcLte: ctx.input.publishedBefore,
      order: ctx.input.order,
      limit: ctx.input.limit,
      sort: ctx.input.sort
    });

    let articles = (response.results || []).map((a: any) => ({
      articleId: a.id,
      title: a.title,
      description: a.description,
      articleUrl: a.article_url,
      imageUrl: a.image_url,
      author: a.author,
      publishedUtc: a.published_utc,
      tickers: a.tickers,
      publisherName: a.publisher?.name,
      publisherLogoUrl: a.publisher?.logo_url,
      publisherHomepageUrl: a.publisher?.homepage_url,
      keywords: a.keywords,
      insights: a.insights?.map((i: any) => ({
        ticker: i.ticker,
        sentiment: i.sentiment,
        sentimentReasoning: i.sentiment_reasoning
      }))
    }));

    return {
      output: { articles },
      message: `Retrieved **${articles.length}** news articles${ctx.input.ticker ? ` related to **${ctx.input.ticker}**` : ''}.`
    };
  })
  .build();
