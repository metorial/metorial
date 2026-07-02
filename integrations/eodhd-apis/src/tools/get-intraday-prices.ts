import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let intradayPriceSchema = z.object({
  timestamp: z.number().describe('Unix timestamp (UTC)'),
  gmtoffset: z.number().describe('GMT offset'),
  datetime: z.string().describe('Human-readable datetime'),
  open: z.number().describe('Opening price'),
  high: z.number().describe('Highest price'),
  low: z.number().describe('Lowest price'),
  close: z.number().describe('Closing price'),
  volume: z.number().describe('Trading volume')
});

export let getIntradayPrices = SlateTool.create(spec, {
  name: 'Get Intraday Prices',
  key: 'get_intraday_prices',
  description: `Retrieve intraday OHLCV price data at 1-minute, 5-minute, or 1-hour intervals. Data is available for approximately the past year.
All timestamps are in UTC. Use Unix timestamps for the \`from\` and \`to\` date range filters.`,
  instructions: [
    'Ticker format is SYMBOL.EXCHANGE, e.g., AAPL.US',
    'The from/to parameters accept Unix timestamps (seconds since epoch), not date strings'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol with exchange, e.g., AAPL.US'),
      interval: z
        .enum(['1m', '5m', '1h'])
        .optional()
        .describe('Candle interval: 1m, 5m, or 1h (default: 5m)'),
      from: z.number().optional().describe('Start time as Unix timestamp (UTC seconds)'),
      to: z.number().optional().describe('End time as Unix timestamp (UTC seconds)')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Requested ticker symbol'),
      interval: z.string().describe('Candle interval used'),
      prices: z.array(intradayPriceSchema).describe('Array of intraday price records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let prices = await client.getIntradayPrices(ctx.input.ticker, {
      interval: ctx.input.interval,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let priceArray = Array.isArray(prices) ? prices : [];

    return {
      output: {
        ticker: ctx.input.ticker,
        interval: ctx.input.interval || '5m',
        prices: priceArray
      },
      message: `Retrieved **${priceArray.length}** intraday price records for **${ctx.input.ticker}** at **${ctx.input.interval || '5m'}** intervals.`
    };
  })
  .build();
