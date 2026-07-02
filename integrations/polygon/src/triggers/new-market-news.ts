import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let newMarketNews = SlateTrigger.create(spec, {
  name: 'New Market News',
  key: 'new_market_news',
  description:
    'Triggers when new market news articles are published, optionally filtered by ticker.'
})
  .input(
    z.object({
      articleId: z.string().describe('Unique article identifier'),
      title: z.string().optional().describe('Article title'),
      articleUrl: z.string().optional().describe('URL to the full article'),
      author: z.string().optional().describe('Article author'),
      publishedUtc: z.string().optional().describe('Publication timestamp (UTC)'),
      description: z.string().optional().describe('Article summary'),
      tickers: z.array(z.string()).optional().describe('Related ticker symbols'),
      publisherName: z.string().optional().describe('Publisher name'),
      keywords: z.array(z.string()).optional().describe('Article keywords'),
      imageUrl: z.string().optional().describe('Article image URL'),
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
  .output(
    z.object({
      articleId: z.string().describe('Unique article identifier'),
      title: z.string().optional().describe('Article title'),
      articleUrl: z.string().optional().describe('URL to the full article'),
      author: z.string().optional().describe('Article author'),
      publishedUtc: z.string().optional().describe('Publication timestamp (UTC)'),
      description: z.string().optional().describe('Article summary'),
      tickers: z.array(z.string()).optional().describe('Related ticker symbols'),
      publisherName: z.string().optional().describe('Publisher name'),
      keywords: z.array(z.string()).optional().describe('Article keywords'),
      imageUrl: z.string().optional().describe('Article image URL'),
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
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new PolygonClient(ctx.auth.token);

      let lastPublishedUtc = ctx.state?.lastPublishedUtc as string | undefined;

      let response = await client.getNews({
        publishedUtcGte: lastPublishedUtc || undefined,
        order: 'desc',
        limit: 50,
        sort: 'published_utc'
      });

      let articles = response.results || [];

      let newLastPublishedUtc = lastPublishedUtc;
      if (articles.length > 0) {
        newLastPublishedUtc = articles[0].published_utc;
      }

      // Filter out articles we already seen (the gte filter is inclusive)
      let newArticles = lastPublishedUtc
        ? articles.filter((a: any) => a.published_utc > lastPublishedUtc!)
        : articles;

      let inputs = newArticles.map((a: any) => ({
        articleId: a.id || a.article_url || `${a.published_utc}_${a.title}`,
        title: a.title,
        articleUrl: a.article_url,
        author: a.author,
        publishedUtc: a.published_utc,
        description: a.description,
        tickers: a.tickers,
        publisherName: a.publisher?.name,
        keywords: a.keywords,
        imageUrl: a.image_url,
        insights: a.insights?.map((i: any) => ({
          ticker: i.ticker,
          sentiment: i.sentiment,
          sentimentReasoning: i.sentiment_reasoning
        }))
      }));

      return {
        inputs,
        updatedState: {
          lastPublishedUtc: newLastPublishedUtc
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'news.published',
        id: ctx.input.articleId,
        output: {
          articleId: ctx.input.articleId,
          title: ctx.input.title,
          articleUrl: ctx.input.articleUrl,
          author: ctx.input.author,
          publishedUtc: ctx.input.publishedUtc,
          description: ctx.input.description,
          tickers: ctx.input.tickers,
          publisherName: ctx.input.publisherName,
          keywords: ctx.input.keywords,
          imageUrl: ctx.input.imageUrl,
          insights: ctx.input.insights
        }
      };
    }
  })
  .build();
