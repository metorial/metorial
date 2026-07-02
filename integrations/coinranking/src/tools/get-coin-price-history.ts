import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinrankingClient } from '../lib/client';
import { spec } from '../spec';

export let getCoinPriceHistory = SlateTool.create(spec, {
  name: 'Get Coin Price History',
  key: 'get_coin_price_history',
  description: `Retrieve a time series of price data points for a cryptocurrency over a specified period. Useful for charting, trend analysis, and backtesting. Returns the percentage change over the period along with the price history.`,
  instructions: ['Free plan users are limited to a maximum time period of 1 year (1y).'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      coinUuid: z.string().describe('UUID of the coin'),
      referenceCurrencyUuid: z
        .string()
        .optional()
        .describe('UUID of currency for price calculation'),
      timePeriod: z
        .enum(['1h', '3h', '12h', '24h', '7d', '30d', '3m', '1y', '3y', '5y'])
        .optional()
        .describe('Time range for the price history. Defaults to 24h.')
    })
  )
  .output(
    z.object({
      change: z.string().nullable().describe('Percentage change over the time period'),
      history: z
        .array(
          z.object({
            price: z.string().nullable().describe('Price at this point'),
            timestamp: z.number().describe('Epoch timestamp in seconds')
          })
        )
        .describe('Array of price data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinrankingClient({
      token: ctx.auth.token,
      referenceCurrencyUuid: ctx.config.referenceCurrencyUuid
    });

    let result = await client.getCoinPriceHistory({
      coinUuid: ctx.input.coinUuid,
      referenceCurrencyUuid: ctx.input.referenceCurrencyUuid,
      timePeriod: ctx.input.timePeriod
    });

    let data = result.data;
    let history = (data.history || []).map((h: any) => ({
      price: h.price || null,
      timestamp: h.timestamp
    }));

    return {
      output: {
        change: data.change || null,
        history
      },
      message: `Retrieved **${history.length}** price data points for period **${ctx.input.timePeriod || '24h'}**. Change: ${data.change || 'N/A'}%`
    };
  })
  .build();
