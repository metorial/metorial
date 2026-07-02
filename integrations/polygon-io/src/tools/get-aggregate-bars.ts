import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let barSchema = z.object({
  open: z.number().optional().describe('Open price'),
  high: z.number().optional().describe('High price'),
  low: z.number().optional().describe('Low price'),
  close: z.number().optional().describe('Close price'),
  volume: z.number().optional().describe('Trading volume'),
  volumeWeighted: z.number().optional().describe('Volume weighted average price'),
  timestamp: z
    .number()
    .optional()
    .describe('Unix millisecond timestamp of the start of the aggregate window'),
  transactions: z
    .number()
    .optional()
    .describe('Number of transactions in the aggregate window')
});

export let getAggregateBars = SlateTool.create(spec, {
  name: 'Get Aggregate Bars',
  key: 'get_aggregate_bars',
  description: `Retrieve OHLCV (open, high, low, close, volume) aggregate bars for a ticker over a specified date range. Works across stocks, forex, crypto, options, and indices.
Supports configurable timespans from seconds to years and adjustable multipliers. Results can be adjusted for stock splits.`,
  instructions: [
    'Use ticker format "C:EURUSD" for forex pairs, "X:BTCUSD" for crypto, and "O:" prefix for options.',
    'Date range uses YYYY-MM-DD format or Unix millisecond timestamps.'
  ],
  constraints: ['Maximum of 50,000 results per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol (e.g., "AAPL", "C:EURUSD", "X:BTCUSD")'),
      multiplier: z
        .number()
        .default(1)
        .describe(
          'Size of the timespan multiplier (e.g., 1 for 1-day bars, 5 for 5-minute bars)'
        ),
      timespan: z
        .enum(['second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'])
        .default('day')
        .describe('Timespan of each aggregate bar'),
      from: z.string().describe('Start date (YYYY-MM-DD) or Unix millisecond timestamp'),
      to: z.string().describe('End date (YYYY-MM-DD) or Unix millisecond timestamp'),
      adjusted: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether results are adjusted for splits'),
      sort: z
        .enum(['asc', 'desc'])
        .optional()
        .default('asc')
        .describe('Sort order by timestamp'),
      limit: z
        .number()
        .optional()
        .default(120)
        .describe('Maximum number of results to return (max 50000)')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Ticker symbol'),
      queryCount: z.number().optional().describe('Number of results in the response'),
      resultsCount: z.number().optional().describe('Total number of results for the query'),
      adjusted: z.boolean().optional().describe('Whether results are adjusted for splits'),
      bars: z.array(barSchema).describe('Array of OHLCV aggregate bars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getAggregates({
      ticker: ctx.input.ticker,
      multiplier: ctx.input.multiplier,
      timespan: ctx.input.timespan,
      from: ctx.input.from,
      to: ctx.input.to,
      adjusted: ctx.input.adjusted,
      sort: ctx.input.sort,
      limit: ctx.input.limit
    });

    let bars = (data.results || []).map((r: any) => ({
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
      volumeWeighted: r.vw,
      timestamp: r.t,
      transactions: r.n
    }));

    return {
      output: {
        ticker: data.ticker || ctx.input.ticker,
        queryCount: data.queryCount,
        resultsCount: data.resultsCount,
        adjusted: data.adjusted,
        bars
      },
      message: `Retrieved **${bars.length}** aggregate bars for **${ctx.input.ticker}** (${ctx.input.multiplier} ${ctx.input.timespan}) from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
