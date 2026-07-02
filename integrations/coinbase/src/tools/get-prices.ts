import { SlateTool } from 'slates';
import { z } from 'zod';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { CoinbaseClient } from '../lib/client';
import { spec } from '../spec';

export let getPrices = SlateTool.create(spec, {
  name: 'Get Prices',
  key: 'get_prices',
  description: `Retrieve current or historical cryptocurrency prices. Get spot, buy, or sell prices for any currency pair (e.g., BTC-USD). Optionally fetch a historical spot price by date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      currencyPair: z.string().describe('Currency pair (e.g., "BTC-USD", "ETH-EUR")'),
      priceType: z
        .enum(['spot', 'buy', 'sell'])
        .default('spot')
        .describe('Type of price to retrieve'),
      date: z
        .string()
        .optional()
        .describe('Historical date for spot price (YYYY-MM-DD format)')
    })
  )
  .output(
    z.object({
      amount: z.string().describe('Price amount'),
      currency: z.string().describe('Quote currency (e.g., USD)'),
      base: z.string().optional().describe('Base currency (e.g., BTC)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinbaseClient({ token: ctx.auth.token });

    let price: any;
    if (ctx.input.priceType === 'buy') {
      price = await client.getBuyPrice(ctx.input.currencyPair);
    } else if (ctx.input.priceType === 'sell') {
      price = await client.getSellPrice(ctx.input.currencyPair);
    } else {
      price = await client.getSpotPrice(ctx.input.currencyPair, { date: ctx.input.date });
    }

    return {
      output: {
        amount: price.amount,
        currency: price.currency,
        base: price.base
      },
      message: `**${ctx.input.currencyPair}** ${ctx.input.priceType} price: **${price.amount} ${price.currency}**${ctx.input.date ? ` (as of ${ctx.input.date})` : ''}`
    };
  })
  .build();
