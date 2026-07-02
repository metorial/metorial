import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExchangeRates = SlateTool.create(spec, {
  name: 'Get Exchange Rates',
  key: 'get_exchange_rates',
  description: `Retrieve real-time exchange rates for currencies relative to a base currency. Rates are updated frequently based on subscription plan.
Use this to get current mid-market exchange rates for one or more currencies. Optionally filter by specific target currencies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      baseCurrency: z
        .string()
        .optional()
        .describe(
          'Base currency code (e.g., USD, EUR). Falls back to configured default if not provided.'
        ),
      targetCurrencies: z
        .array(z.string())
        .optional()
        .describe(
          'List of target currency codes to retrieve rates for (e.g., ["EUR", "GBP", "JPY"]). Returns all available currencies if omitted.'
        )
    })
  )
  .output(
    z.object({
      date: z.string().describe('Timestamp of the exchange rate data'),
      baseCurrency: z.string().describe('Base currency code used for the rates'),
      rates: z
        .record(z.string(), z.number())
        .describe(
          'Map of currency codes to their exchange rates relative to the base currency'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let base = ctx.input.baseCurrency || ctx.config.baseCurrency;

    let result = await client.getLatestRates({
      base,
      symbols: ctx.input.targetCurrencies
    });

    let rateCount = Object.keys(result.rates).length;

    return {
      output: {
        date: result.date,
        baseCurrency: result.base,
        rates: result.rates
      },
      message: `Retrieved **${rateCount}** real-time exchange rates with base currency **${result.base}** as of ${result.date}.`
    };
  })
  .build();
