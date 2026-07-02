import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let newsInputSchema = z.object({
  articleId: z.string().describe('Unique article ID'),
  title: z.string().describe('Article title'),
  author: z.string().optional().describe('Author name'),
  articleUrl: z.string().optional().describe('URL to the full article'),
  publishedUtc: z.string().describe('Published timestamp (UTC)'),
  tickers: z.array(z.string()).describe('Related ticker symbols'),
  imageUrl: z.string().optional().describe('Article image URL'),
  description: z.string().optional().describe('Article summary'),
  keywords: z.array(z.string()).optional().describe('Article keywords'),
  publisherName: z.string().optional().describe('Publisher name'),
  insights: z
    .array(
      z.object({
        ticker: z.string().optional(),
        sentiment: z.string().optional(),
        sentimentReasoning: z.string().optional()
      })
    )
    .optional()
    .describe('Sentiment insights')
});

export let newTickerNews = SlateTrigger.create(spec, {
  name: 'New Ticker News',
  key: 'new_ticker_news',
  description:
    'Triggers when new financial news articles are published. Includes article content, related tickers, and sentiment analysis.'
})
  .input(newsInputSchema)
  .output(
    z.object({
      articleId: z.string().describe('Unique article ID'),
      title: z.string().describe('Article title'),
      author: z.string().optional().describe('Author name'),
      articleUrl: z.string().optional().describe('URL to the full article'),
      publishedUtc: z.string().describe('Published timestamp (UTC)'),
      tickers: z.array(z.string()).describe('Related ticker symbols'),
      imageUrl: z.string().optional().describe('Article image URL'),
      description: z.string().optional().describe('Article summary'),
      keywords: z.array(z.string()).optional().describe('Article keywords'),
      publisherName: z.string().optional().describe('Publisher name'),
      insights: z
        .array(
          z.object({
            ticker: z.string().optional(),
            sentiment: z.string().optional(),
            sentimentReasoning: z.string().optional()
          })
        )
        .optional()
        .describe('Sentiment insights per ticker')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPublishedUtc = ctx.state?.lastPublishedUtc as string | undefined;

      let data = await client.getTickerNews({
        publishedUtcGte: lastPublishedUtc,
        order: 'desc',
        sort: 'published_utc',
        limit: 50
      });

      let articles = data.results || [];

      let knownIds = (ctx.state?.knownIds as string[] | undefined) || [];
      let newArticles = articles.filter((a: any) => !knownIds.includes(a.id));

      let newKnownIds = articles.map((a: any) => a.id as string).slice(0, 200);

      let newLastPublished =
        newArticles.length > 0 ? newArticles[0].published_utc : lastPublishedUtc;

      let inputs = newArticles.map((a: any) => ({
        articleId: a.id,
        title: a.title,
        author: a.author,
        articleUrl: a.article_url,
        publishedUtc: a.published_utc,
        tickers: a.tickers || [],
        imageUrl: a.image_url,
        description: a.description,
        keywords: a.keywords || [],
        publisherName: a.publisher?.name,
        insights: a.insights?.map((i: any) => ({
          ticker: i.ticker,
          sentiment: i.sentiment,
          sentimentReasoning: i.sentiment_reasoning
        }))
      }));

      return {
        inputs,
        updatedState: {
          lastPublishedUtc: newLastPublished,
          knownIds: newKnownIds
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
          author: ctx.input.author,
          articleUrl: ctx.input.articleUrl,
          publishedUtc: ctx.input.publishedUtc,
          tickers: ctx.input.tickers,
          imageUrl: ctx.input.imageUrl,
          description: ctx.input.description,
          keywords: ctx.input.keywords,
          publisherName: ctx.input.publisherName,
          insights: ctx.input.insights
        }
      };
    }
  })
  .build();
