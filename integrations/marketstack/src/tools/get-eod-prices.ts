import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEodPrices = SlateTool.create(spec, {
  name: 'Get End-of-Day Prices',
  key: 'get_eod_prices',
  description: `Retrieve end-of-day (closing) stock prices including open, high, low, close, volume, and adjusted values. Supports historical data up to 15 years with filtering by date range, exchange, and multiple symbols. Use \`latest\` mode to get the most recent closing prices.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z.string().describe('Comma-separated ticker symbols (e.g. "AAPL,MSFT,GOOGL")'),
      dateFrom: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      dateTo: z.string().optional().describe('End date in YYYY-MM-DD format'),
      exchange: z
        .string()
        .optional()
        .describe('Filter by stock exchange MIC code (e.g. "XNAS" for NASDAQ)'),
      sort: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Sort order by date. Defaults to DESC'),
      latest: z
        .boolean()
        .optional()
        .describe('If true, returns only the most recent end-of-day prices'),
      limit: z.number().optional().describe('Number of results to return (max 1000)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      pagination: z.object({
        limit: z.number(),
        offset: z.number(),
        count: z.number(),
        total: z.number()
      }),
      prices: z.array(
        z.object({
          symbol: z.string(),
          exchange: z.string(),
          date: z.string(),
          open: z.number().nullable(),
          high: z.number().nullable(),
          low: z.number().nullable(),
          close: z.number().nullable(),
          volume: z.number().nullable(),
          adjOpen: z.number().nullable(),
          adjHigh: z.number().nullable(),
          adjLow: z.number().nullable(),
          adjClose: z.number().nullable(),
          adjVolume: z.number().nullable(),
          splitFactor: z.number().nullable(),
          dividend: z.number().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = ctx.input.latest
      ? await client.getEodLatest({
          symbols: ctx.input.symbols,
          exchange: ctx.input.exchange,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        })
      : await client.getEod({
          symbols: ctx.input.symbols,
          dateFrom: ctx.input.dateFrom,
          dateTo: ctx.input.dateTo,
          sort: ctx.input.sort,
          exchange: ctx.input.exchange,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });

    let prices = result.data.map(p => ({
      symbol: p.symbol,
      exchange: p.exchange,
      date: p.date,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume,
      adjOpen: p.adj_open,
      adjHigh: p.adj_high,
      adjLow: p.adj_low,
      adjClose: p.adj_close,
      adjVolume: p.adj_volume,
      splitFactor: p.split_factor,
      dividend: p.dividend
    }));

    return {
      output: {
        pagination: result.pagination,
        prices
      },
      message: `Retrieved ${prices.length} end-of-day price records for **${ctx.input.symbols}**${ctx.input.latest ? ' (latest)' : ''}. Total available: ${result.pagination.total}.`
    };
  })
  .build();
