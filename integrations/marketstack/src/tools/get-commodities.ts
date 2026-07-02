import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCommodities = SlateTool.create(spec, {
  name: 'Get Commodity Prices',
  key: 'get_commodities',
  description: `Retrieve current and historical prices for 70+ commodities including energy, metals, industrial, agricultural, and livestock categories. Supports date range filtering and up to 15 years of historical data.`,
  constraints: ['Available on Professional plan and higher'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
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
      pagination: z.object({
        limit: z.number(),
        offset: z.number(),
        count: z.number(),
        total: z.number()
      }),
      commodities: z.array(
        z.object({
          symbol: z.string(),
          name: z.string(),
          price: z.number().nullable(),
          dayHigh: z.number().nullable(),
          dayLow: z.number().nullable(),
          change: z.number().nullable(),
          changePercent: z.number().nullable(),
          date: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCommodities({
      symbols: ctx.input.symbols,
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
        commodities
      },
      message: `Retrieved ${commodities.length} commodity price records. Total available: ${result.pagination.total}.`
    };
  })
  .build();
