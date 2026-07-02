import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMarketIndices = SlateTool.create(spec, {
  name: 'Get Market Indices',
  key: 'get_market_indices',
  description: `Retrieve data for 86+ global stock market indices and benchmarks. Returns current price, daily/weekly/monthly/yearly percentage changes for each index. Use the search parameter to filter by name or country.`,
  constraints: ['Available on Basic plan and higher'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter indices by name or country'),
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
      indices: z.array(
        z.object({
          symbol: z.string(),
          name: z.string(),
          country: z.string(),
          price: z.number().nullable(),
          change: z.number().nullable(),
          changePercent: z.number().nullable(),
          dayChangePercent: z.number().nullable(),
          weekChangePercent: z.number().nullable(),
          monthChangePercent: z.number().nullable(),
          yearChangePercent: z.number().nullable(),
          date: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getIndices({
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let indices = result.data.map(i => ({
      symbol: i.symbol,
      name: i.name,
      country: i.country,
      price: i.price,
      change: i.change,
      changePercent: i.change_percent,
      dayChangePercent: i.day_change_percent,
      weekChangePercent: i.week_change_percent,
      monthChangePercent: i.month_change_percent,
      yearChangePercent: i.year_change_percent,
      date: i.date
    }));

    return {
      output: {
        pagination: result.pagination,
        indices
      },
      message: `Retrieved ${indices.length} market indices${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}. Total available: ${result.pagination.total}.`
    };
  })
  .build();
