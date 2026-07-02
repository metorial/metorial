import { SlateTool } from 'slates';
import { z } from 'zod';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { CoinbaseClient } from '../lib/client';
import { spec } from '../spec';

export let getExchangeRates = SlateTool.create(spec, {
  name: 'Get Exchange Rates',
  key: 'get_exchange_rates',
  description: `Retrieve current exchange rates for a base currency against all other supported currencies. Defaults to USD if no currency specified.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      currency: z
        .string()
        .optional()
        .describe('Base currency code (default "USD"). E.g., "BTC", "ETH", "EUR"')
    })
  )
  .output(
    z.object({
      baseCurrency: z.string().describe('Base currency code'),
      rates: z.record(z.string(), z.string()).describe('Exchange rates keyed by currency code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinbaseClient({ token: ctx.auth.token });

    let result = await client.getExchangeRates(ctx.input.currency);

    return {
      output: {
        baseCurrency: result.currency,
        rates: result.rates
      },
      message: `Retrieved exchange rates for **${result.currency}** against **${Object.keys(result.rates).length}** currencies`
    };
  })
  .build();
