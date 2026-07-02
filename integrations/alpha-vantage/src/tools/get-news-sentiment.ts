import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tickerSentimentSchema = z.object({
  ticker: z.string().describe('Ticker symbol mentioned in the article'),
  relevanceScore: z.string().describe('Relevance of the article to this ticker (0 to 1)'),
  sentimentScore: z.string().describe('Sentiment score for this ticker (-1 to 1)'),
  sentimentLabel: z
    .string()
    .describe(
      'Sentiment label (Bullish, Somewhat-Bullish, Neutral, Somewhat-Bearish, Bearish)'
    )
});

let articleSchema = z.object({
  title: z.string().describe('Article title'),
  url: z.string().describe('URL to the full article'),
  timePublished: z.string().describe('Publication timestamp'),
  source: z.string().describe('News source name'),
  summary: z.string().describe('Brief summary of the article'),
  overallSentimentScore: z.string().describe('Overall sentiment score (-1 to 1)'),
  overallSentimentLabel: z.string().describe('Overall sentiment label'),
  tickerSentiment: z
    .array(tickerSentimentSchema)
    .describe('Sentiment scores per mentioned ticker')
});

export let getNewsSentiment = SlateTool.create(spec, {
  name: 'Get News & Sentiment',
  key: 'get_news_sentiment',
  description: `Retrieve market news articles with AI-generated sentiment scores. Filter by ticker symbols, news topics (e.g. technology, finance, earnings), and time ranges. Each article includes an overall sentiment score and per-ticker sentiment breakdowns.`,
  instructions: [
    'Available topics: blockchain, earnings, ipo, mergers_and_acquisitions, financial_markets, economy_fiscal, economy_monetary, economy_macro, energy_transportation, finance, life_sciences, manufacturing, real_estate, retail_wholesale, technology.',
    'Multiple tickers or topics can be comma-separated.',
    'Time format for timeFrom/timeTo: YYYYMMDDTHHMM (e.g. "20240101T0000").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z
        .string()
        .optional()
        .describe('Comma-separated ticker symbols to filter by, e.g. "AAPL,MSFT"'),
      topics: z
        .string()
        .optional()
        .describe('Comma-separated news topics to filter by, e.g. "technology,earnings"'),
      timeFrom: z.string().optional().describe('Start time in YYYYMMDDTHHMM format'),
      timeTo: z.string().optional().describe('End time in YYYYMMDDTHHMM format'),
      sort: z
        .enum(['LATEST', 'EARLIEST', 'RELEVANCE'])
        .optional()
        .default('LATEST')
        .describe('Sort order for results'),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of articles to return (max 1000)')
    })
  )
  .output(
    z.object({
      totalResults: z.number().describe('Total number of articles matching the query'),
      sentimentScoreDefinition: z.string().describe('Explanation of sentiment score ranges'),
      articles: z.array(articleSchema).describe('News articles with sentiment data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.newsSentiment({
      tickers: ctx.input.tickers,
      topics: ctx.input.topics,
      timeFrom: ctx.input.timeFrom,
      timeTo: ctx.input.timeTo,
      sort: ctx.input.sort,
      limit: ctx.input.limit
    });

    let feed: any[] = data.feed || [];

    let articles = feed.map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      timePublished: item.time_published || '',
      source: item.source || '',
      summary: item.summary || '',
      overallSentimentScore: String(item.overall_sentiment_score ?? ''),
      overallSentimentLabel: item.overall_sentiment_label || '',
      tickerSentiment: (item.ticker_sentiment || []).map((ts: any) => ({
        ticker: ts.ticker || '',
        relevanceScore: ts.relevance_score || '',
        sentimentScore: String(ts.ticker_sentiment_score ?? ''),
        sentimentLabel: ts.ticker_sentiment_label || ''
      }))
    }));

    return {
      output: {
        totalResults: data.items ? Number(data.items) : articles.length,
        sentimentScoreDefinition: data.sentiment_score_definition || '',
        articles
      },
      message: `Retrieved ${articles.length} news article(s) with sentiment data.`
    };
  })
  .build();
