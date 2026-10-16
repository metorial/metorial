import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCommodities = SlateTool.create(spec, {
  name: 'Get Commodity Prices',
  key: 'get_commodities',
  description: `Retrieve current or historical commodity prices by commodityName, including energy, metals, agriculture, and livestock. Use download_catalog to discover supported names. Dates or frequency select history; limit, offset, and sort apply locally to the returned commodity records. The legacy symbols-only request is retained, but is not described by the current API reference.`,
  constraints: ['Available on Professional plan and higher'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      commodityName: z
        .string()
        .optional()
        .describe(
          'Commodity name from the commodities catalog, for example aluminum. Selects the documented commodity-price API.'
        ),
      frequency: z
        .enum(['day', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
        .optional()
        .describe('Historical frequency; requires commodityName.'),
      symbols: z
        .string()
        .optional()
        .describe('Comma-separated commodity symbols to filter (e.g. "GCUSD,SIUSD")'),
      dateFrom: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      dateTo: z.string().optional().describe('End date in YYYY-MM-DD format'),
      sort: z.enum(['ASC', 'DESC']).optional().describe('Sort order by date'),
      limit: z.number().optional().describe('Number of results to return (max 1000)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional(),
      pagination: z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        count: z.number().optional(),
        total: z.number().optional()
      }),
      commodities: z.array(
        z.object({
          symbol: z.string().optional(),
          name: z.string(),
          price: z.number().nullable(),
          dayHigh: z.number().nullable().optional(),
          dayLow: z.number().nullable().optional(),
          change: z.number().nullable().optional(),
          changePercent: z.number().nullable().optional(),
          date: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCommodities({
      symbols: ctx.input.symbols,
      commodityName: ctx.input.commodityName,
      frequency: ctx.input.frequency,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let commodities = result.data.map(c => ({
      symbol: c.symbol,
      name: c.name,
      price: c.price,
      dayHigh: c.day_high,
      dayLow: c.day_low,
      change: c.change,
      changePercent: c.change_percent,
      date: c.date
    }));

    return {
      output: {
        pagination: result.pagination,
        raw: result.raw,
        commodities
      },
      message: `Retrieved ${commodities.length} commodity price records.`
    };
  })
  .build();
