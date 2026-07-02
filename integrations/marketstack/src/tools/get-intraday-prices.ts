import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIntradayPrices = SlateTool.create(spec, {
  name: 'Get Intraday Prices',
  key: 'get_intraday_prices',
  description: `Retrieve intraday stock price data with configurable intervals from 1 minute to 24 hours. Returns open, high, low, close, last, and volume for each interval. Use \`latest\` mode to get the most recent intraday prices. Available for US stock tickers on the IEX exchange.`,
  constraints: [
    'Available on Basic plan and higher',
    'Sub-15-minute intervals require Professional plan'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z.string().describe('Comma-separated ticker symbols (e.g. "AAPL,MSFT")'),
      interval: z
        .enum([
          '1min',
          '5min',
          '10min',
          '15min',
          '30min',
          '1hour',
          '3hour',
          '6hour',
          '12hour',
          '24hour'
        ])
        .optional()
        .describe('Data interval. Defaults to 1hour'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date/time in YYYY-MM-DD or ISO 8601 format'),
      dateTo: z.string().optional().describe('End date/time in YYYY-MM-DD or ISO 8601 format'),
      exchange: z.string().optional().describe('Filter by exchange MIC code'),
      sort: z.enum(['ASC', 'DESC']).optional().describe('Sort order by date'),
      latest: z
        .boolean()
        .optional()
        .describe('If true, returns only the most recent intraday prices'),
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
          last: z.number().nullable(),
          volume: z.number().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = ctx.input.latest
      ? await client.getIntradayLatest({
          symbols: ctx.input.symbols,
          exchange: ctx.input.exchange,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        })
      : await client.getIntraday({
          symbols: ctx.input.symbols,
          interval: ctx.input.interval,
          dateFrom: ctx.input.dateFrom,
          dateTo: ctx.input.dateTo,
          exchange: ctx.input.exchange,
          sort: ctx.input.sort,
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
      last: p.last,
      volume: p.volume
    }));

    return {
      output: {
        pagination: result.pagination,
        prices
      },
      message: `Retrieved ${prices.length} intraday price records for **${ctx.input.symbols}**${ctx.input.interval ? ` at ${ctx.input.interval} intervals` : ''}. Total available: ${result.pagination.total}.`
    };
  })
  .build();
