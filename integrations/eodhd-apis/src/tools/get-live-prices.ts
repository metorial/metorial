import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let livePriceSchema = z.object({
  code: z.string().describe('Ticker symbol'),
  timestamp: z.number().describe('Unix timestamp of last update'),
  gmtoffset: z.number().describe('GMT offset'),
  open: z.number().describe('Opening price'),
  high: z.number().describe('Highest price'),
  low: z.number().describe('Lowest price'),
  close: z.number().describe('Current/last price'),
  volume: z.number().describe('Trading volume'),
  previousClose: z.number().describe('Previous day close price'),
  change: z.number().describe('Price change'),
  change_p: z.number().describe('Price change percentage')
});

export let getLivePrices = SlateTool.create(spec, {
  name: 'Get Live Prices',
  key: 'get_live_prices',
  description: `Retrieve current/delayed OHLCV prices for stocks, forex, and crypto. US market data has ~15 min delay for global exchanges. Supports fetching multiple tickers in a single request (up to 15-20 recommended).`,
  instructions: [
    'Provide the primary ticker and optionally additional tickers to fetch multiple prices at once',
    'Ticker format: SYMBOL.EXCHANGE (e.g., AAPL.US, EUR.FOREX, BTC-USD.CC)'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Primary ticker symbol, e.g., AAPL.US'),
      additionalTickers: z
        .array(z.string())
        .optional()
        .describe(
          'Additional tickers to fetch in the same request, e.g., ["TSLA.US", "MSFT.US"]'
        )
    })
  )
  .output(
    z.object({
      prices: z.array(livePriceSchema).describe('Live price data for requested tickers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let result = await client.getLivePrices(ctx.input.ticker, ctx.input.additionalTickers);

    let prices = Array.isArray(result) ? result : [result];

    return {
      output: {
        prices
      },
      message: `Retrieved live prices for **${prices.length}** ticker(s): ${prices.map((p: { code: string; close: number }) => `${p.code}: ${p.close}`).join(', ')}.`
    };
  })
  .build();
