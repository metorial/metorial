import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExchangeRates = SlateTool.create(spec, {
  name: 'Get Exchange Rates',
  key: 'get_exchange_rates',
  description: `Retrieve the latest real-time exchange rates for world currencies. Returns rates relative to a base currency (defaults to EUR).
You can filter the response to specific target currencies by providing a list of currency symbols.`,
  instructions: [
    'Currency codes must be 3-letter ISO 4217 codes (e.g., USD, GBP, JPY).',
    'If no symbols are specified, rates for all available currencies are returned.'
  ],
  constraints: ['Changing the base currency from EUR requires a paid Fixer plan.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      baseCurrency: z
        .string()
        .optional()
        .describe(
          'Base currency code (e.g., EUR, USD). Defaults to the configured base currency.'
        ),
      symbols: z
        .array(z.string())
        .optional()
        .describe(
          'List of target currency codes to retrieve rates for (e.g., ["USD", "GBP", "JPY"]).'
        )
    })
  )
  .output(
    z.object({
      baseCurrency: z.string().describe('The base currency used for rates'),
      date: z.string().describe('Date of the exchange rates (YYYY-MM-DD)'),
      timestamp: z.number().describe('Unix timestamp of when the rates were collected'),
      rates: z.record(z.string(), z.number()).describe('Exchange rates keyed by currency code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let base = ctx.input.baseCurrency || ctx.config.baseCurrency;

    let result = await client.getLatestRates({
      base,
      symbols: ctx.input.symbols
    });

    let rateCount = Object.keys(result.rates).length;

    return {
      output: {
        baseCurrency: result.base,
        date: result.date,
        timestamp: result.timestamp,
        rates: result.rates
      },
      message: `Retrieved **${rateCount}** exchange rates relative to **${result.base}** as of ${result.date}.`
    };
  })
  .build();
