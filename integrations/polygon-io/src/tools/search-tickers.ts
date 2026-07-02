import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tickerResultSchema = z.object({
  ticker: z.string().describe('Ticker symbol'),
  name: z.string().optional().describe('Name of the asset'),
  market: z.string().optional().describe('Market (stocks, crypto, fx, otc, indices)'),
  locale: z.string().optional().describe('Locale (us, global)'),
  primaryExchange: z.string().optional().describe('Primary exchange'),
  type: z.string().optional().describe('Type of the ticker (CS, ETF, CRYPTO, etc.)'),
  active: z.boolean().optional().describe('Whether the ticker is actively traded'),
  currencyName: z.string().optional().describe('Currency name'),
  lastUpdatedUtc: z.string().optional().describe('Last updated timestamp')
});

export let searchTickers = SlateTool.create(spec, {
  name: 'Search Tickers',
  key: 'search_tickers',
  description: `Search and list ticker symbols supported by Polygon.io across stocks, crypto, forex, and more. Filter by name, type, market, exchange, and active status. Useful for discovering tickers or looking up symbols.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter tickers by name or symbol'),
      ticker: z.string().optional().describe('Exact ticker symbol to look up'),
      type: z
        .string()
        .optional()
        .describe('Filter by ticker type (e.g., CS, ETF, CRYPTO, FX)'),
      market: z
        .enum(['stocks', 'crypto', 'fx', 'otc', 'indices'])
        .optional()
        .describe('Filter by market'),
      exchange: z.string().optional().describe('Filter by exchange MIC code'),
      active: z.boolean().optional().default(true).describe('Filter by active status'),
      sort: z
        .enum([
          'ticker',
          'name',
          'market',
          'locale',
          'primary_exchange',
          'type',
          'currency_symbol',
          'currency_name',
          'base_currency_symbol',
          'base_currency_name',
          'last_updated_utc'
        ])
        .optional()
        .describe('Field to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      limit: z.number().optional().default(20).describe('Maximum number of results (max 1000)')
    })
  )
  .output(
    z.object({
      tickers: z.array(tickerResultSchema).describe('Array of matching tickers'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.searchTickers({
      search: ctx.input.search,
      ticker: ctx.input.ticker,
      type: ctx.input.type,
      market: ctx.input.market,
      exchange: ctx.input.exchange,
      active: ctx.input.active,
      sort: ctx.input.sort,
      order: ctx.input.order,
      limit: ctx.input.limit
    });

    let tickers = (data.results || []).map((r: any) => ({
      ticker: r.ticker,
      name: r.name,
      market: r.market,
      locale: r.locale,
      primaryExchange: r.primary_exchange,
      type: r.type,
      active: r.active,
      currencyName: r.currency_name,
      lastUpdatedUtc: r.last_updated_utc
    }));

    return {
      output: {
        tickers,
        count: tickers.length
      },
      message: `Found **${tickers.length}** ticker(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}${ctx.input.market ? ` in ${ctx.input.market}` : ''}.`
    };
  })
  .build();
