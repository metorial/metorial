import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  'COFFEE'
]);

export let getCommodityPrice = SlateTool.create(spec, {
  name: 'Get Commodity Price',
  key: 'get_commodity_price',
  description: `Retrieve price data for major commodities including crude oil (WTI, Brent), natural gas, copper, aluminum, wheat, corn, cotton, sugar, and coffee. Returns historical prices at daily or monthly intervals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      commodity: commodityEnum.describe('Commodity identifier'),
      interval: z
        .enum(['daily', 'weekly', 'monthly'])
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

    let data = await client.commodity({ commodityFunction: commodity, interval });
    let rawData: any[] = data.data || [];

    let prices = rawData
      .filter((d: any) => d.value !== '.')
      .map((d: any) => ({
        date: d.date || '',
        value: d.value || ''
      }));

    return {
      output: {
        commodity: data.name || commodity,
        unit: data.unit || '',
        prices
      },
      message: `Retrieved ${prices.length} ${interval} price data points for **${commodity}**.`
    };
  })
  .build();
