import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRows, responseText } from '../lib/response';
import { spec } from '../spec';

let commodityEnum = z.enum([
  'WTI',
  'BRENT',
  'NATURAL_GAS',
  'COPPER',
  'ALUMINUM',
  'WHEAT',
  'CORN',
  'COTTON',
  'SUGAR',
  'COFFEE',
  'ALL_COMMODITIES'
]);

export let getCommodityPrice = SlateTool.create(spec, {
  name: 'Get Commodity Price',
  key: 'get_commodity_price',
  description: `Retrieve price data for major commodities including crude oil (WTI, Brent), natural gas, copper, aluminum, wheat, corn, cotton, sugar, and coffee. Energy commodities support daily, weekly, and monthly intervals. Other commodities and the global commodities index support monthly, quarterly, and annual intervals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      commodity: commodityEnum.describe('Commodity identifier'),
      interval: z
        .enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual'])
        .optional()
        .default('monthly')
        .describe('Data interval')
    })
  )
  .output(
    z.object({
      commodity: z.string().describe('Commodity name'),
      unit: z.string().describe('Unit of measurement'),
      prices: z
        .array(
          z.object({
            date: z.string().describe('Date of the data point'),
            value: z.string().describe('Commodity price')
          })
        )
        .describe('Price data points, most recent first')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { commodity, interval } = ctx.input;

    let allowed = ['WTI', 'BRENT', 'NATURAL_GAS'].includes(commodity)
      ? ['daily', 'weekly', 'monthly']
      : ['monthly', 'quarterly', 'annual'];
    if (!allowed.includes(interval))
      throw createApiServiceError(
        `${commodity} supports these intervals: ${allowed.join(', ')}.`
      );
    let data = await client.commodity({ commodityFunction: commodity, interval });
    let rawData: any[] = responseRows(data.data, 'data');

    let prices = rawData
      .filter((d: any) => d.value !== '.')
      .map((d: any) => ({
        date: responseText(d.date, 'date'),
        value: responseText(d.value, 'value')
      }));

    return {
      output: {
        commodity: responseText(data.name, 'commodity name'),
        unit: responseText(data.unit, 'unit'),
        prices
      },
      message: `Retrieved ${prices.length} ${interval} price data points for **${commodity}**.`
    };
  })
  .build();
