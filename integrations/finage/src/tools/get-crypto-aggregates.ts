import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import {
  finageBar,
  finageNumber,
  finageRecord,
  finageRecords,
  finageSymbol,
  validateFinageLimit,
  validateFinageRange
} from '../lib/response';
import { spec } from '../spec';

export let getCryptoAggregates = SlateTool.create(spec, {
  name: 'Get Crypto OHLC Aggregates',
  key: 'get_crypto_aggregates',
  description: `Retrieve historical OHLCV aggregate bars for a cryptocurrency pair over a specified date range. Supports 8+ years of historical data. Available 24/7 with timeframes from minute to month.`,
  constraints: ['Maximum 50,000 results per request.', 'Multiplier values: 1, 3, 5, 15, 30.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Crypto pair symbol (e.g. "BTCUSD")'),
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
      raw: z.unknown().optional().describe('Original provider response'),
      symbol: z.string().describe('Crypto pair symbol'),
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
    let symbol = finageSymbol(ctx.input.symbol);
    validateFinageRange(ctx.input.from, ctx.input.to);
    validateFinageLimit(ctx.input.limit, 'Limit', 50000);
    validateFinageLimit(ctx.input.multiplier, 'Multiplier');
    if (![1, 3, 5, 15, 30].includes(ctx.input.multiplier))
      throw createApiServiceError('Crypto multipliers must be 1, 3, 5, 15, or 30.');
    let data = await client.getCryptoAggregates({
      ...ctx.input,
      symbol
    });
    let response = finageRecord(data);
    let bars = finageRecords(data, ['results']).map(finageBar);
    return {
      output: {
        symbol,
        totalResults: finageNumber(response.totalResults),
        bars,
        raw: data
      },
      message: `Retrieved **${bars.length}** ${ctx.input.timespan} bars for **${symbol}** from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
