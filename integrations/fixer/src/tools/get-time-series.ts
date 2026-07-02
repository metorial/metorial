import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimeSeries = SlateTool.create(spec, {
  name: 'Get Time Series',
  key: 'get_time_series',
  description: `Retrieve daily exchange rate data between two dates. Returns rates for each day in the specified range, useful for charting and trend analysis.`,
  instructions: [
    'Dates must be in YYYY-MM-DD format.',
    'Currency codes must be 3-letter ISO 4217 codes.'
  ],
  constraints: [
    'Maximum time frame is 365 days between start and end dates.',
    'Changing the base currency from EUR requires a paid Fixer plan.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date for the time series (YYYY-MM-DD)'),
      endDate: z.string().describe('End date for the time series (YYYY-MM-DD)'),
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
      startDate: z.string().describe('Start date of the time series'),
      endDate: z.string().describe('End date of the time series'),
      rates: z
        .record(z.string(), z.record(z.string(), z.number()))
        .describe('Daily exchange rates keyed by date, then by currency code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let base = ctx.input.baseCurrency || ctx.config.baseCurrency;

    let result = await client.getTimeSeries({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      base,
      symbols: ctx.input.symbols
    });

    let dayCount = Object.keys(result.rates).length;

    return {
      output: {
        baseCurrency: result.base,
        startDate: result.start_date,
        endDate: result.end_date,
        rates: result.rates
      },
      message: `Retrieved time series data for **${dayCount}** days from ${result.start_date} to ${result.end_date} relative to **${result.base}**.`
    };
  })
  .build();
