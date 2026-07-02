import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getHistoricalRates = SlateTool.create(spec, {
  name: 'Get Historical Rates',
  key: 'get_historical_rates',
  description: `Retrieve end-of-day exchange rates for a specific historical date. Historical data is available back to January 1, 1999. Rates become available at 00:05 AM GMT for the previous day.`,
  instructions: [
    'Date must be in YYYY-MM-DD format.',
    'Currency codes must be 3-letter ISO 4217 codes.',
    'Historical data is available from 1999-01-01 onwards.'
  ],
  constraints: ['Changing the base currency from EUR requires a paid Fixer plan.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      date: z.string().describe('Historical date to retrieve rates for (YYYY-MM-DD)'),
      baseCurrency: z
        .string()
        .optional()
        .describe(
          'Base currency code (e.g., EUR, USD). Defaults to the configured base currency.'
        ),
      symbols: z
        .array(z.string())
        .optional()
        .describe('List of target currency codes to retrieve rates for.')
    })
  )
  .output(
    z.object({
      baseCurrency: z.string().describe('The base currency used for rates'),
      date: z.string().describe('The historical date of the rates (YYYY-MM-DD)'),
      timestamp: z.number().describe('Unix timestamp of when the rates were collected'),
      rates: z.record(z.string(), z.number()).describe('Exchange rates keyed by currency code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let base = ctx.input.baseCurrency || ctx.config.baseCurrency;

    let result = await client.getHistoricalRates({
      date: ctx.input.date,
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
      message: `Retrieved **${rateCount}** historical exchange rates relative to **${result.base}** for ${result.date}.`
    };
  })
  .build();
