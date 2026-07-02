import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let searchTickers = SlateTool.create(spec, {
  name: 'Search Tickers',
  key: 'search_tickers',
  description: `Search and list ticker symbols across all markets (stocks, options, forex, crypto, indices). Filter by market type, exchange, active status, or search by company name. Useful for finding ticker symbols or browsing available instruments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe(
          'Search query to match against ticker symbol or company name (e.g., "Apple")'
        ),
      ticker: z.string().optional().describe('Exact ticker symbol to filter by'),
      market: z
        .enum(['stocks', 'crypto', 'fx', 'otc', 'indices'])
        .optional()
        .describe('Market type to filter by'),
      type: z
        .string()
        .optional()
        .describe(
          'Ticker type to filter by (e.g., CS for common stock, ETF for exchange-traded fund)'
        ),
      exchange: z.string().optional().describe('ISO 10383 MIC exchange code to filter by'),
      active: z
        .boolean()
        .optional()
        .describe('Filter by active/delisted status. Defaults to true.'),
      sort: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., ticker, name, market, type)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      limit: z.number().int().optional().describe('Max number of results (max 1000)')
    })
  )
  .output(
    z.object({
      count: z.number().optional().describe('Total matching results'),
      tickers: z
        .array(
          z.object({
            ticker: z.string().optional().describe('Ticker symbol'),
            name: z.string().optional().describe('Company or asset name'),
            market: z.string().optional().describe('Market type'),
            locale: z.string().optional().describe('Locale'),
            primaryExchange: z.string().optional().describe('Primary exchange MIC'),
            type: z.string().optional().describe('Ticker type'),
            active: z.boolean().optional().describe('Whether actively traded'),
            currencyName: z.string().optional().describe('Currency traded in'),
            lastUpdatedUtc: z.string().optional().describe('Last updated timestamp')
          })
        )
        .describe('List of matching tickers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let response = await client.getTickers({
      search: ctx.input.search,
      ticker: ctx.input.ticker,
      market: ctx.input.market,
      type: ctx.input.type,
      exchange: ctx.input.exchange,
      active: ctx.input.active,
      sort: ctx.input.sort,
      order: ctx.input.order,
      limit: ctx.input.limit
    });

    let tickers = (response.results || []).map((r: any) => ({
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
        count: response.count,
        tickers
      },
      message: `Found **${tickers.length}** tickers${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}${ctx.input.market ? ` in ${ctx.input.market} market` : ''}.`
    };
  })
  .build();
