import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let macroDataPointSchema = z.object({
  CountryCode: z.string().describe('ISO 3-letter country code'),
  CountryName: z.string().optional().nullable().describe('Country name'),
  Indicator: z.string().optional().nullable().describe('Indicator name'),
  Date: z.string().describe('Data date'),
  Period: z.string().optional().nullable().describe('Period'),
  Value: z.number().optional().nullable().describe('Indicator value')
});

export let getMacroIndicators = SlateTool.create(spec, {
  name: 'Get Macro Indicators',
  key: 'get_macro_indicators',
  description: `Retrieve macroeconomic indicators for any country, including GDP, inflation, unemployment, population, trade balance, and 40+ more indicators. Data available from 1960 onward.`,
  instructions: [
    'Country must be ISO Alpha-3 code: USA, GBR, DEU, FRA, JPN, CHN, etc.',
    'Common indicators: gdp_current_usd, gdp_per_capita_usd, gdp_growth_annual, inflation_consumer_prices_annual, unemployment_total_percent, population_total'
  ],
  constraints: ['Each request consumes 10 API calls'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      country: z.string().describe('ISO Alpha-3 country code, e.g., USA, GBR, DEU'),
      indicator: z
        .string()
        .optional()
        .describe(
          'Specific indicator (default: gdp_current_usd). E.g., inflation_consumer_prices_annual, unemployment_total_percent'
        )
    })
  )
  .output(
    z.object({
      country: z.string().describe('Country code'),
      indicator: z.string().describe('Indicator name'),
      dataPoints: z.array(macroDataPointSchema).describe('Historical data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let data = await client.getMacroIndicator(ctx.input.country, {
      indicator: ctx.input.indicator
    });

    let dataPoints = Array.isArray(data) ? data : [];

    return {
      output: {
        country: ctx.input.country,
        indicator: ctx.input.indicator || 'gdp_current_usd',
        dataPoints
      },
      message: `Retrieved **${dataPoints.length}** data points for **${ctx.input.indicator || 'gdp_current_usd'}** in **${ctx.input.country}**.`
    };
  })
  .build();
