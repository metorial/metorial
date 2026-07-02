import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

let barSchema = z.object({
  open: z.number().optional().describe('Open price'),
  high: z.number().optional().describe('High price'),
  low: z.number().optional().describe('Low price'),
  close: z.number().optional().describe('Close price'),
  volume: z.number().optional().describe('Volume'),
  timestamp: z.number().optional().describe('Timestamp in milliseconds')
});

export let getStockAggregates = SlateTool.create(spec, {
  name: 'Get Stock OHLC Aggregates',
  key: 'get_stock_aggregates',
  description: `Retrieve historical OHLCV (open, high, low, close, volume) aggregate bars for a US stock over a specified date range. Supports multiple timeframes from minute to month. Useful for charting, backtesting, and time-series analysis.`,
  constraints: [
    'Maximum 50,000 results per request.',
    'Multiplier values: 1, 3, 5, 15, 30.',
    'Free API keys limited to aggregate size of 20.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol (e.g. "AAPL")'),
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
      symbol: z.string().describe('Stock ticker symbol'),
      totalResults: z.number().optional().describe('Total number of results'),
      bars: z.array(barSchema).describe('OHLCV aggregate bars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let symbol = ctx.input.symbol.toUpperCase();

    let data = await client.getStockAggregates({
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
