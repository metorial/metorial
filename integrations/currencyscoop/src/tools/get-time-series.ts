import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimeSeries = SlateTool.create(spec, {
  name: 'Get Time Series',
  key: 'get_time_series',
  description: `Retrieve daily exchange rates between two dates for a base currency. Returns a rate for each day in the specified range.
Ideal for plotting currency charts, analyzing volatility, and performing trend analysis over time.`,
  constraints: ['Available on Startup and Pro subscription plans only.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date of the range in YYYY-MM-DD format'),
      endDate: z.string().describe('End date of the range in YYYY-MM-DD format'),
      baseCurrency: z
        .string()
        .optional()
        .describe(
          'Base currency code (e.g., USD). Falls back to configured default if not provided.'
        ),
      targetCurrencies: z
        .array(z.string())
        .optional()
        .describe(
          'List of target currency codes to include in the time series. Returns all available currencies if omitted.'
        )
    })
  )
  .output(
    z.object({
      baseCurrency: z.string().describe('Base currency code used'),
      startDate: z.string().describe('Start date of the returned range'),
      endDate: z.string().describe('End date of the returned range'),
      rates: z
        .record(z.string(), z.record(z.string(), z.number()))
        .describe(
          'Map of dates to currency rate objects. Each date maps to a record of currency codes and their rates.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let base = ctx.input.baseCurrency || ctx.config.baseCurrency;

    let result = await client.getTimeSeries({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      base,
      symbols: ctx.input.targetCurrencies
    });

    let dayCount = Object.keys(result.rates).length;

    return {
      output: {
        baseCurrency: result.base,
        startDate: result.startDate,
        endDate: result.endDate,
        rates: result.rates
      },
      message: `Retrieved time-series data for **${result.base}** covering **${dayCount}** days from ${result.startDate} to ${result.endDate}.`
    };
  })
  .build();
