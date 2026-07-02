import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let sentimentSchema = z.object({
  polarity: z.number().optional().describe('Overall polarity score'),
  neg: z.number().optional().describe('Negative sentiment score'),
  neu: z.number().optional().describe('Neutral sentiment score'),
  pos: z.number().optional().describe('Positive sentiment score')
});

let newsArticleSchema = z.object({
  date: z.string().describe('Publication timestamp (ISO 8601)'),
  title: z.string().describe('Article headline'),
  content: z.string().describe('Article body text'),
  link: z.string().describe('URL to the full article'),
  symbols: z.array(z.string()).describe('Mentioned ticker symbols'),
  tags: z.array(z.string()).optional().nullable().describe('Topic tags'),
  sentiment: sentimentSchema.optional().nullable().describe('AI-generated sentiment scores')
});

export let getFinancialNews = SlateTool.create(spec, {
  name: 'Get Financial News',
  key: 'get_financial_news',
  description: `Retrieve financial news articles with AI-generated sentiment analysis. Filter by specific ticker symbols, topic tags, and date ranges. Sentiment scores include polarity, negative, neutral, and positive values.`,
  instructions: [
    'Provide either a ticker symbol (e.g., AAPL.US) or a topic tag to filter news',
    'Common tags: balance sheet, capital markets, earnings, ipo, mergers and acquisitions'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().optional().describe('Filter by ticker symbol, e.g., AAPL.US'),
      tag: z.string().optional().describe('Filter by topic tag, e.g., "earnings", "ipo"'),
      from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      to: z.string().optional().describe('End date in YYYY-MM-DD format'),
      limit: z.number().optional().describe('Number of results (1-1000, default: 50)'),
      offset: z.number().optional().describe('Pagination offset (default: 0)')
    })
  )
  .output(
    z.object({
      articles: z.array(newsArticleSchema).describe('News articles with sentiment data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let articles = await client.getNews({
      symbol: ctx.input.ticker,
      tag: ctx.input.tag,
      from: ctx.input.from,
      to: ctx.input.to,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let articlesArray = Array.isArray(articles) ? articles : [];

    return {
      output: {
        articles: articlesArray
      },
      message: `Retrieved **${articlesArray.length}** news articles${ctx.input.ticker ? ` for **${ctx.input.ticker}**` : ''}${ctx.input.tag ? ` tagged "${ctx.input.tag}"` : ''}.`
    };
  })
  .build();
