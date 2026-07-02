import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

let aggregateBarSchema = z.object({
  open: z.number().optional().describe('Open price'),
  high: z.number().optional().describe('High price'),
  low: z.number().optional().describe('Low price'),
  close: z.number().optional().describe('Close price'),
  volume: z.number().optional().describe('Trading volume'),
  volumeWeightedAvgPrice: z.number().optional().describe('Volume-weighted average price'),
  timestamp: z
    .number()
    .optional()
    .describe('Unix millisecond timestamp for the start of the aggregate window'),
  transactionCount: z
    .number()
    .optional()
    .describe('Number of transactions in the aggregate window'),
  otc: z.boolean().optional().describe('Whether this is an OTC ticker')
});

export let getAggregateBars = SlateTool.create(spec, {
  name: 'Get Aggregate Bars',
  key: 'get_aggregate_bars',
  description: `Retrieve OHLCV (open, high, low, close, volume) aggregate bars for any ticker (stocks, forex, crypto, options, indices) over a specified date range and time interval. Supports configurable multiplier and timespan (second, minute, hour, day, week, month, quarter, year). Forex pairs use the \`C:\` prefix (e.g., \`C:EURUSD\`), crypto uses \`X:\` prefix (e.g., \`X:BTCUSD\`), and indices use \`I:\` prefix (e.g., \`I:SPX\`).`,
  instructions: [
    'Use YYYY-MM-DD format for date strings or Unix millisecond timestamps.',
    'For forex pairs, prefix the ticker with C: (e.g., C:EURUSD). For crypto, use X: (e.g., X:BTCUSD). For indices, use I: (e.g., I:SPX).'
  ],
  constraints: ['Maximum of 50,000 results per request (default 5,000).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol (e.g., AAPL, C:EURUSD, X:BTCUSD, I:SPX)'),
      multiplier: z
        .number()
        .int()
        .positive()
        .describe(
          'The size of the timespan multiplier (e.g., 1 for 1-minute bars, 5 for 5-minute bars)'
        ),
      timespan: z
        .enum(['second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'])
        .describe('The size of the time window'),
      from: z
        .string()
        .describe('Start of the aggregate time window (YYYY-MM-DD or Unix ms timestamp)'),
      to: z
        .string()
        .describe('End of the aggregate time window (YYYY-MM-DD or Unix ms timestamp)'),
      adjusted: z
        .boolean()
        .optional()
        .describe('Whether results are adjusted for splits. Defaults to true.'),
      sort: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by timestamp. Defaults to asc.'),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Max number of results (max 50000, default 5000)')
    })
  )
  .output(
    z.object({
      ticker: z.string().optional().describe('The ticker symbol'),
      adjusted: z.boolean().optional().describe('Whether results are adjusted for splits'),
      queryCount: z
        .number()
        .optional()
        .describe('Number of aggregates used to generate the response'),
      resultsCount: z.number().optional().describe('Total number of results'),
      bars: z.array(aggregateBarSchema).describe('OHLCV aggregate bars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let response = await client.getAggregateBars({
      ticker: ctx.input.ticker,
      multiplier: ctx.input.multiplier,
      timespan: ctx.input.timespan,
      from: ctx.input.from,
      to: ctx.input.to,
      adjusted: ctx.input.adjusted,
      sort: ctx.input.sort,
      limit: ctx.input.limit
    });

    let bars = (response.results || []).map((r: any) => ({
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
      volumeWeightedAvgPrice: r.vw,
      timestamp: r.t,
      transactionCount: r.n,
      otc: r.otc
    }));

    return {
      output: {
        ticker: response.ticker,
        adjusted: response.adjusted,
        queryCount: response.queryCount,
        resultsCount: response.resultsCount,
        bars
      },
      message: `Retrieved **${bars.length}** aggregate bars for **${ctx.input.ticker}** (${ctx.input.multiplier} ${ctx.input.timespan}) from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
