import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cursorInput, cursorOutput, nextCursor, responseRows } from '../lib/response';
import { spec } from '../spec';

let newsPublisherSchema = z.object({
  name: z.string().optional().describe('Publisher name'),
  homepageUrl: z.string().optional().describe('Publisher homepage URL'),
  logoUrl: z.string().optional().describe('Publisher logo URL'),
  faviconUrl: z.string().optional().describe('Publisher favicon URL')
});

let newsInsightSchema = z.object({
  ticker: z.string().optional().describe('Related ticker'),
  sentiment: z.string().optional().describe('Sentiment (positive, negative, neutral)'),
  sentimentReasoning: z.string().optional().describe('Reasoning for sentiment classification')
});

let newsArticleSchema = z.object({
  articleId: z.string().optional().describe('Unique article ID'),
  title: z.string().optional().describe('Article title'),
  author: z.string().optional().describe('Author name'),
  articleUrl: z.string().optional().describe('URL to the full article'),
  publishedUtc: z.string().optional().describe('Published date/time (UTC)'),
  tickers: z.array(z.string()).optional().describe('Related ticker symbols'),
  imageUrl: z.string().optional().describe('Article image URL'),
  description: z.string().optional().describe('Article description/summary'),
  keywords: z.array(z.string()).optional().describe('Article keywords'),
  publisher: newsPublisherSchema.optional().describe('Publisher info'),
  insights: z.array(newsInsightSchema).optional().describe('Sentiment insights per ticker')
});

export let getTickerNews = SlateTool.create(spec, {
  name: 'Get Ticker News',
  key: 'get_ticker_news',
  description: `Retrieve financial news articles with optional sentiment analysis. Filter by ticker symbol and date range. Includes article metadata, publisher info, related tickers, and per-ticker sentiment insights.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: cursorInput,
      ticker: z
        .string()
        .optional()
        .describe('Ticker symbol to filter news for (e.g., "AAPL")'),
      publishedAfter: z
        .string()
        .optional()
        .describe('Return articles published after this date (YYYY-MM-DD)'),
      publishedBefore: z
        .string()
        .optional()
        .describe('Return articles published before this date (YYYY-MM-DD)'),
      order: z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc')
        .describe('Sort order by published date'),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of articles to return (max 1000)')
    })
  )
  .output(
    z.object({
      nextCursor: cursorOutput,
      articles: z.array(newsArticleSchema).optional().describe('Array of news articles'),
      count: z.number().optional().describe('Number of articles returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getTickerNews({
      ticker: ctx.input.ticker,
      publishedUtcGte: ctx.input.publishedAfter,
      publishedUtcLte: ctx.input.publishedBefore,
      order: ctx.input.order,
      sort: 'published_utc',
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let articles = responseRows(data.results)?.map((a: any) => ({
      articleId: a.id ?? undefined,
      title: a.title ?? undefined,
      author: a.author ?? undefined,
      articleUrl: a.article_url ?? undefined,
      publishedUtc: a.published_utc ?? undefined,
      tickers: a.tickers ?? undefined,
      imageUrl: a.image_url ?? undefined,
      description: a.description ?? undefined,
      keywords: a.keywords ?? undefined,
      publisher: a.publisher
        ? {
            name: a.publisher.name ?? undefined,
            homepageUrl: a.publisher.homepage_url ?? undefined,
            logoUrl: a.publisher.logo_url ?? undefined,
            faviconUrl: a.publisher.favicon_url ?? undefined
          }
        : undefined,
      insights: a.insights?.map((i: any) => ({
        ticker: i.ticker ?? undefined,
        sentiment: i.sentiment ?? undefined,
        sentimentReasoning: i.sentiment_reasoning ?? undefined
      }))
    }));

    return {
      output: {
        nextCursor: nextCursor(data),
        articles,
        count: articles?.length ?? undefined
      },
      message: `Retrieved **${articles?.length ?? 0}** news article(s)${ctx.input.ticker ? ` for **${ctx.input.ticker}**` : ''}.`
    };
  })
  .build();
