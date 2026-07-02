import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

let newsItemSchema = z.object({
  title: z.string().optional().describe('News headline'),
  source: z.string().optional().describe('News source'),
  description: z.string().optional().describe('Brief summary'),
  url: z.string().optional().describe('Link to the full article'),
  publishedAt: z.string().optional().describe('Publication date/time'),
  symbols: z.array(z.string()).optional().describe('Related ticker symbols')
});

export let getMarketNews = SlateTool.create(spec, {
  name: 'Get Market News',
  key: 'get_market_news',
  description: `Retrieve the latest market news articles. Filter by stock symbol for targeted news, or query crypto-specific news. News is sourced from vetted providers and enriched with metadata and ticker symbols.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z
        .string()
        .optional()
        .describe('Ticker symbol to filter news (e.g. "AAPL"). Required for stock news.'),
      newsType: z
        .enum(['stock', 'crypto'])
        .default('stock')
        .describe('Type of news to retrieve'),
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Maximum articles to return')
    })
  )
  .output(
    z.object({
      symbol: z.string().optional().describe('Queried ticker symbol'),
      articles: z.array(newsItemSchema).describe('News articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { symbol, newsType, page, limit } = ctx.input;

    let data: any;
    if (newsType === 'crypto') {
      data = await client.getCryptoNews({ symbol, page, limit });
    } else {
      if (!symbol) {
        throw new Error('Symbol is required for stock market news.');
      }
      data = await client.getMarketNews(symbol.toUpperCase(), { page, limit });
    }

    let rawNews = data.news || data.articles || (Array.isArray(data) ? data : []);
    let articles = rawNews.map((item: any) => ({
      title: item.title,
      source: item.source,
      description: item.description ?? item.summary,
      url: item.url ?? item.link,
      publishedAt: item.publishedAt ?? item.published_at ?? item.date,
      symbols: item.symbols ?? item.tickers ?? (item.ticker ? [item.ticker] : undefined)
    }));

    return {
      output: {
        symbol: symbol?.toUpperCase(),
        articles
      },
      message: `Retrieved **${articles.length}** ${newsType} news articles${symbol ? ` for **${symbol.toUpperCase()}**` : ''}.`
    };
  })
  .build();
