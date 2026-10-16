import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import {
  finageRecords,
  finageString,
  finageSymbol,
  validateFinageLimit
} from '../lib/response';
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
        .describe(
          'Ticker symbol to filter news (e.g. "AAPL"). Required for stock and crypto news.'
        ),
      newsType: z
        .enum(['stock', 'crypto'])
        .default('stock')
        .describe('Type of news to retrieve'),
      page: z
        .number()
        .optional()
        .describe('Legacy page input. Symbol news supports only an omitted page or page 1.'),
      limit: z.number().optional().describe('Maximum articles to return')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      symbol: z.string().optional().describe('Queried ticker symbol'),
      articles: z.array(newsItemSchema).describe('News articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { newsType, page, limit } = ctx.input;
    if (!ctx.input.symbol?.trim())
      throw createApiServiceError('Provide a symbol for stock or cryptocurrency news.');
    let symbol = finageSymbol(ctx.input.symbol);
    validateFinageLimit(limit, 'Limit', 30);
    if (page !== undefined && page !== 1)
      throw createApiServiceError(
        'Finage symbol news does not document pagination. Omit page or use page 1.'
      );
    let data =
      newsType === 'crypto'
        ? await client.getCryptoNews({ symbol, limit })
        : await client.getMarketNews(symbol, { limit });
    let articles = finageRecords(data, ['news', 'articles']).map(item => {
      let related = item.symbols ?? item.tickers ?? (item.ticker ? [item.ticker] : undefined);
      if (
        related !== undefined &&
        related !== null &&
        (!Array.isArray(related) || related.some(value => typeof value !== 'string'))
      ) {
        throw createApiServiceError('Finage returned invalid news symbols.');
      }
      return pickDefined({
        title: finageString(item.title),
        source: finageString(item.source),
        description: finageString(item.description ?? item.summary),
        url: finageString(item.url ?? item.link),
        publishedAt: finageString(item.publishedAt ?? item.published_at ?? item.date),
        symbols: related == null ? undefined : (related as string[])
      });
    });
    return {
      output: { symbol, articles, raw: data },
      message: `Retrieved **${articles.length}** ${newsType} news articles for **${symbol}**.`
    };
  })
  .build();
