import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRows, responseText } from '../lib/response';
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
    'Comma-separated tickers and topics filter for articles that mention every specified ticker or topic. Crypto and forex tickers use CRYPTO:BTC and FOREX:USD prefixes.',
    'Time format for timeFrom/timeTo: YYYYMMDDTHHMM (e.g. "20240101T0000").'
  ],
  constraints: ['Market news and sentiment data require a premium API key.'],
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
      totalResults: z
        .number()
        .describe(
          'Number of articles returned for this response, subject to the requested limit'
        ),
      sentimentScoreDefinition: z.string().describe('Explanation of sentiment score ranges'),
      articles: z.array(articleSchema).describe('News articles with sentiment data')
    })
  )
  .handleInvocation(async ctx => {
    if (!Number.isInteger(ctx.input.limit) || ctx.input.limit < 1 || ctx.input.limit > 1000)
      throw createApiServiceError('limit must be a whole number from 1 to 1000.');
    for (let [field, value] of [
      ['timeFrom', ctx.input.timeFrom],
      ['timeTo', ctx.input.timeTo]
    ]) {
      if (value !== undefined && !/^\d{8}T\d{4}$/.test(value))
        throw createApiServiceError(`${field} must use YYYYMMDDTHHMM format.`);
    }
    if (ctx.input.timeFrom && ctx.input.timeTo && ctx.input.timeFrom > ctx.input.timeTo)
      throw createApiServiceError('timeFrom must be no later than timeTo.');
    let client = new Client(ctx.auth.token);
    let data = await client.newsSentiment({
      tickers: ctx.input.tickers,
      topics: ctx.input.topics,
      timeFrom: ctx.input.timeFrom,
      timeTo: ctx.input.timeTo,
      sort: ctx.input.sort,
      limit: ctx.input.limit
    });

    let feed: any[] = responseRows(data.feed, 'feed');

    let articles = feed.map((item: any) => ({
      title: responseText(item.title, 'title'),
      url: responseText(item.url, 'url'),
      timePublished: responseText(item.time_published, 'time_published'),
      source: responseText(item.source, 'source'),
      summary: responseText(item.summary, 'summary', true),
      overallSentimentScore: responseText(
        item.overall_sentiment_score,
        'overall sentiment score'
      ),
      overallSentimentLabel: responseText(
        item.overall_sentiment_label,
        'overall_sentiment_label'
      ),
      tickerSentiment: responseRows(item.ticker_sentiment, 'ticker_sentiment').map(
        (ts: any) => ({
          ticker: responseText(ts.ticker, 'ticker'),
          relevanceScore: responseText(ts.relevance_score, 'relevance_score'),
          sentimentScore: responseText(ts.ticker_sentiment_score, 'ticker sentiment score'),
          sentimentLabel: responseText(ts.ticker_sentiment_label, 'ticker_sentiment_label')
        })
      )
    }));

    let totalResults =
      data.items === undefined
        ? articles.length
        : Number(responseText(data.items, 'article count'));
    if (!Number.isInteger(totalResults) || totalResults < 0)
      throw createApiServiceError('Alpha Vantage returned an invalid article count.');
    return {
      output: {
        totalResults: totalResults,
        sentimentScoreDefinition: responseText(
          data.sentiment_score_definition,
          'sentiment_score_definition'
        ),
        articles
      },
      message: `Retrieved ${articles.length} news article(s) with sentiment data.`
    };
  })
  .build();
