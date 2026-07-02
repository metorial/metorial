import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getHistoricalRates = SlateTool.create(spec, {
  name: 'Get Historical Rates',
  key: 'get_historical_rates',
  description: `Retrieve exchange rates for a specific historical date. Data is available back to January 1, 1996.
Useful for auditing, accounting, back-testing, and trend analysis.`,
  constraints: ['Historical data is available from January 1, 1996 onwards.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z.string().describe('Historical date in YYYY-MM-DD format (e.g., "2023-12-25")'),
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
          'List of target currency codes to retrieve rates for. Returns all available currencies if omitted.'
        )
    })
  )
  .output(
    z.object({
      date: z.string().describe('The date for which rates were retrieved'),
      baseCurrency: z.string().describe('Base currency code used for the rates'),
      rates: z
        .record(z.string(), z.number())
        .describe('Map of currency codes to their exchange rates on the specified date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let base = ctx.input.baseCurrency || ctx.config.baseCurrency;

    let result = await client.getHistoricalRates({
      date: ctx.input.date,
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
      message: `Retrieved **${rateCount}** historical exchange rates for **${result.base}** on **${result.date}**.`
    };
  })
  .build();
