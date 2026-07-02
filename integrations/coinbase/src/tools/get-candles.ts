import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdvancedTradeClient } from '../lib/advanced-trade-client';
import { spec } from '../spec';

export let getCandles = SlateTool.create(spec, {
  name: 'Get Price Candles',
  key: 'get_candles',
  description: `Retrieve OHLCV (open, high, low, close, volume) candlestick data for a trading pair. Useful for charting and technical analysis.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('Trading pair (e.g., "BTC-USD")'),
      start: z.string().describe('Start time (Unix timestamp in seconds)'),
      end: z.string().describe('End time (Unix timestamp in seconds)'),
      granularity: z
        .enum([
          'ONE_MINUTE',
          'FIVE_MINUTE',
          'FIFTEEN_MINUTE',
          'THIRTY_MINUTE',
          'ONE_HOUR',
          'TWO_HOUR',
          'SIX_HOUR',
          'ONE_DAY'
        ])
        .describe('Candle time interval')
    })
  )
  .output(
    z.object({
      candles: z
        .array(
          z.object({
            start: z.string().describe('Candle start time (Unix timestamp)'),
            open: z.string().describe('Opening price'),
            high: z.string().describe('Highest price'),
            low: z.string().describe('Lowest price'),
            close: z.string().describe('Closing price'),
            volume: z.string().describe('Volume traded')
          })
        )
        .describe('OHLCV candle data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdvancedTradeClient({ token: ctx.auth.token });

    let result = await client.getProductCandles(ctx.input.productId, {
      start: ctx.input.start,
      end: ctx.input.end,
      granularity: ctx.input.granularity
    });

    let candles = (result.candles || []).map((c: any) => ({
      start: c.start,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    }));

    return {
      output: { candles },
      message: `Retrieved **${candles.length}** candles for **${ctx.input.productId}** (${ctx.input.granularity})`
    };
  })
  .build();
