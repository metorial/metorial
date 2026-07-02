import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinrankingClient } from '../lib/client';
import { spec } from '../spec';

export let getCoinPrice = SlateTool.create(spec, {
  name: 'Get Coin Price',
  key: 'get_coin_price',
  description: `Fetch the current or historical price of a cryptocurrency. Omit the timestamp to get the latest price, or provide an epoch timestamp (in seconds) to get a historical price point. The API finds the nearest available data point.`,
  instructions: [
    'Timestamps must be in epoch seconds (Unix time), not milliseconds.',
    'For historical prices: minute-level data is available for the last 24 hours, hourly data for up to 30 days, and daily data beyond that.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      coinUuid: z.string().describe('UUID of the coin to get the price for'),
      referenceCurrencyUuid: z
        .string()
        .optional()
        .describe('UUID of currency for price calculation'),
      timestamp: z
        .number()
        .optional()
        .describe('Epoch timestamp in seconds. Omit for current price.')
    })
  )
  .output(
    z.object({
      price: z.string().describe('Price of the coin in the reference currency'),
      timestamp: z.number().describe('Epoch timestamp of the price data point')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinrankingClient({
      token: ctx.auth.token,
      referenceCurrencyUuid: ctx.config.referenceCurrencyUuid
    });

    let result = await client.getCoinPrice({
      coinUuid: ctx.input.coinUuid,
      referenceCurrencyUuid: ctx.input.referenceCurrencyUuid,
      timestamp: ctx.input.timestamp
    });

    let price = result.data.price;
    let timestamp = result.data.timestamp;

    return {
      output: {
        price: price,
        timestamp: timestamp
      },
      message: ctx.input.timestamp
        ? `Price at timestamp ${timestamp}: **${price}**`
        : `Current price: **${price}**`
    };
  })
  .build();
