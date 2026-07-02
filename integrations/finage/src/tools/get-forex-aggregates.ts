import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

export let getForexAggregates = SlateTool.create(spec, {
  name: 'Get Forex OHLC Aggregates',
  key: 'get_forex_aggregates',
  description: `Retrieve historical OHLCV aggregate bars for a forex currency pair over a date range. Supports timeframes from minute to month. Useful for forex charting, trend analysis, and backtesting.`,
  constraints: ['Maximum 50,000 results per request.', 'Multiplier values: 1, 3, 5, 15, 30.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Forex pair symbol (e.g. "EURUSD")'),
      multiplier: z.number().default(1).describe('Time multiplier (1, 3, 5, 15, or 30)'),
      timespan: z
        .enum(['minute', 'hour', 'day', 'week', 'month'])
        .default('day')
        .describe('Size of time period'),
      from: z.string().describe('Start date in YYYY-MM-DD format'),
      to: z.string().describe('End date in YYYY-MM-DD format'),
      limit: z.number().optional().describe('Max results to return (default 100, max 50000)'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort order by timestamp')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Forex pair symbol'),
      totalResults: z.number().optional().describe('Total number of results'),
      bars: z
        .array(
          z.object({
            open: z.number().optional().describe('Open price'),
            high: z.number().optional().describe('High price'),
            low: z.number().optional().describe('Low price'),
            close: z.number().optional().describe('Close price'),
            volume: z.number().optional().describe('Volume'),
            timestamp: z.number().optional().describe('Timestamp in milliseconds')
          })
        )
        .describe('OHLCV aggregate bars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let symbol = ctx.input.symbol.toUpperCase();

    let data = await client.getForexAggregates({
      symbol,
      multiplier: ctx.input.multiplier,
      timespan: ctx.input.timespan,
      from: ctx.input.from,
      to: ctx.input.to,
      limit: ctx.input.limit,
      sort: ctx.input.sort
    });

    let results = data.results || [];
    let bars = results.map((r: any) => ({
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
      timestamp: r.t
    }));

    return {
      output: {
        symbol,
        totalResults: data.totalResults ?? bars.length,
        bars
      },
      message: `Retrieved **${bars.length}** ${ctx.input.timespan} bars for **${symbol}** from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
