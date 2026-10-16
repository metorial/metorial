import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRows, responseText } from '../lib/response';
import { spec } from '../spec';

let indicatorEnum = z.enum([
  'REAL_GDP',
  'REAL_GDP_PER_CAPITA',
  'TREASURY_YIELD',
  'FEDERAL_FUNDS_RATE',
  'CPI',
  'INFLATION',
  'RETAIL_SALES',
  'DURABLES',
  'UNEMPLOYMENT',
  'NONFARM_PAYROLL'
]);

export let getEconomicIndicator = SlateTool.create(spec, {
  name: 'Get Economic Indicator',
  key: 'get_economic_indicator',
  description: `Retrieve US macroeconomic indicator data including GDP, CPI, inflation, treasury yields, federal funds rate, unemployment, retail sales, and more. Returns historical time series data at configurable intervals.`,
  instructions: [
    'For TREASURY_YIELD, use the maturity parameter to specify bond maturity (e.g. "10year", "2year", "3month").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      indicator: indicatorEnum.describe('Economic indicator to retrieve'),
      interval: z
        .enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'semiannual'])
        .optional()
        .describe('Data interval. Not all intervals are available for every indicator.'),
      maturity: z
        .enum(['3month', '2year', '5year', '7year', '10year', '30year'])
        .optional()
        .describe('Bond maturity for TREASURY_YIELD indicator')
    })
  )
  .output(
    z.object({
      indicator: z.string().describe('Indicator name'),
      unit: z.string().describe('Unit of measurement'),
      dataPoints: z
        .array(
          z.object({
            date: z.string().describe('Date of the data point'),
            value: z.string().describe('Indicator value')
          })
        )
        .describe('Data points, most recent first')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { indicator, interval, maturity } = ctx.input;

    let intervals: Record<string, readonly string[]> = {
      REAL_GDP: ['quarterly', 'annual'],
      REAL_GDP_PER_CAPITA: ['quarterly'],
      TREASURY_YIELD: ['daily', 'weekly', 'monthly'],
      FEDERAL_FUNDS_RATE: ['daily', 'weekly', 'monthly'],
      CPI: ['monthly', 'semiannual'],
      INFLATION: ['annual'],
      RETAIL_SALES: ['monthly'],
      DURABLES: ['monthly'],
      UNEMPLOYMENT: ['monthly'],
      NONFARM_PAYROLL: ['monthly']
    };
    if (interval !== undefined && !intervals[indicator]?.includes(interval))
      throw createApiServiceError(
        `${indicator} supports these intervals: ${intervals[indicator]?.join(', ')}.`
      );
    if (maturity !== undefined && indicator !== 'TREASURY_YIELD')
      throw createApiServiceError('maturity applies only to TREASURY_YIELD.');
    let configurableInterval = [
      'REAL_GDP',
      'TREASURY_YIELD',
      'FEDERAL_FUNDS_RATE',
      'CPI'
    ].includes(indicator);
    let data = await client.economicIndicator({
      indicatorFunction: indicator,
      interval: configurableInterval ? interval : undefined,
      maturity
    });

    let rawData: any[] = responseRows(data.data, 'data');

    let dataPoints = rawData
      .filter((d: any) => d.value !== '.')
      .map((d: any) => ({
        date: responseText(d.date, 'date'),
        value: responseText(d.value, 'value')
      }));

    return {
      output: {
        indicator: responseText(data.name, 'indicator name'),
        unit: responseText(data.unit, 'unit'),
        dataPoints
      },
      message: `Retrieved ${dataPoints.length} data points for **${indicator}**.`
    };
  })
  .build();
