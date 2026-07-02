import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFluctuation = SlateTool.create(spec, {
  name: 'Get Fluctuation',
  key: 'get_fluctuation',
  description: `Retrieve currency fluctuation data between two dates. Shows how currencies changed day-to-day, including the absolute change and percentage change for each currency.`,
  instructions: [
    'Dates must be in YYYY-MM-DD format.',
    'Currency codes must be 3-letter ISO 4217 codes.'
  ],
  constraints: ['Changing the base currency from EUR requires a paid Fixer plan.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date for the fluctuation period (YYYY-MM-DD)'),
      endDate: z.string().describe('End date for the fluctuation period (YYYY-MM-DD)'),
      baseCurrency: z
        .string()
        .optional()
        .describe(
          'Base currency code (e.g., EUR, USD). Defaults to the configured base currency.'
        ),
      symbols: z
        .array(z.string())
        .optional()
        .describe('List of target currency codes to retrieve fluctuation data for.')
    })
  )
  .output(
    z.object({
      baseCurrency: z.string().describe('The base currency used'),
      startDate: z.string().describe('Start date of the fluctuation period'),
      endDate: z.string().describe('End date of the fluctuation period'),
      rates: z
        .record(
          z.string(),
          z.object({
            startRate: z.number().describe('Exchange rate at the start of the period'),
            endRate: z.number().describe('Exchange rate at the end of the period'),
            change: z.number().describe('Absolute change in the exchange rate'),
            changePct: z.number().describe('Percentage change in the exchange rate')
          })
        )
        .describe('Fluctuation data keyed by currency code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let base = ctx.input.baseCurrency || ctx.config.baseCurrency;

    let result = await client.getFluctuation({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      base,
      symbols: ctx.input.symbols
    });

    let currencyCount = Object.keys(result.rates).length;

    let mappedRates: Record<
      string,
      { startRate: number; endRate: number; change: number; changePct: number }
    > = {};
    for (let [code, data] of Object.entries(result.rates)) {
      mappedRates[code] = {
        startRate: data.start_rate,
        endRate: data.end_rate,
        change: data.change,
        changePct: data.change_pct
      };
    }

    return {
      output: {
        baseCurrency: result.base,
        startDate: result.start_date,
        endDate: result.end_date,
        rates: mappedRates
      },
      message: `Retrieved fluctuation data for **${currencyCount}** currencies from ${result.start_date} to ${result.end_date} relative to **${result.base}**.`
    };
  })
  .build();
