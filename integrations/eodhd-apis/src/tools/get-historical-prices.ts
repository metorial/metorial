import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let priceSchema = z.object({
  date: z.string().describe('Trading date (YYYY-MM-DD)'),
  open: z.number().describe('Opening price'),
  high: z.number().describe('Highest price'),
  low: z.number().describe('Lowest price'),
  close: z.number().describe('Closing price (unadjusted)'),
  adjusted_close: z.number().describe('Price adjusted for splits and dividends'),
  volume: z.number().describe('Trading volume')
});

export let getHistoricalPrices = SlateTool.create(spec, {
  name: 'Get Historical Prices',
  key: 'get_historical_prices',
  description: `Retrieve historical end-of-day OHLCV price data for stocks, ETFs, mutual funds, forex, and cryptocurrencies. Covers 150,000+ tickers across 70+ global exchanges with data going back decades.
Use the ticker format \`SYMBOL.EXCHANGE\` (e.g., \`AAPL.US\`, \`BMW.XETRA\`, \`BTC-USD.CC\`, \`EURUSD.FOREX\`). Supports daily, weekly, and monthly aggregation periods.`,
  instructions: [
    'Ticker format is SYMBOL.EXCHANGE, e.g., AAPL.US, TSLA.US, BTC-USD.CC, EURUSD.FOREX',
    'Use period "w" for weekly or "m" for monthly aggregation'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol with exchange, e.g., AAPL.US, BTC-USD.CC'),
      from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      to: z.string().optional().describe('End date in YYYY-MM-DD format'),
      period: z
        .enum(['d', 'w', 'm'])
        .optional()
        .describe('Aggregation period: d=daily, w=weekly, m=monthly'),
      order: z.enum(['a', 'd']).optional().describe('Sort order: a=ascending, d=descending')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Requested ticker symbol'),
      prices: z.array(priceSchema).describe('Array of historical price records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let prices = await client.getEndOfDayPrices(ctx.input.ticker, {
      from: ctx.input.from,
      to: ctx.input.to,
      period: ctx.input.period,
      order: ctx.input.order
    });

    let priceArray = Array.isArray(prices) ? prices : [];

    return {
      output: {
        ticker: ctx.input.ticker,
        prices: priceArray
      },
      message: `Retrieved **${priceArray.length}** historical price records for **${ctx.input.ticker}**${ctx.input.from ? ` from ${ctx.input.from}` : ''}${ctx.input.to ? ` to ${ctx.input.to}` : ''}.`
    };
  })
  .build();
