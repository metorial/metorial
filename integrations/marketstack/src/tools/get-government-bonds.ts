import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGovernmentBonds = SlateTool.create(spec, {
  name: 'Get Government Bonds',
  key: 'get_government_bonds',
  description: `Retrieve 10-year government bond yield data for 53+ countries. Returns yield, daily price change, and weekly/monthly/yearly percentage changes. Use the search parameter to filter by country name.`,
  constraints: ['Available on Basic plan and higher'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query to filter bonds by country name'),
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
      bonds: z.array(
        z.object({
          symbol: z.string(),
          name: z.string(),
          country: z.string(),
          yield: z.number().nullable(),
          change: z.number().nullable(),
          changePercent: z.number().nullable(),
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

    let result = await client.getBonds({
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let bonds = result.data.map(b => ({
      symbol: b.symbol,
      name: b.name,
      country: b.country,
      yield: b.yield,
      change: b.change,
      changePercent: b.change_percent,
      weekChangePercent: b.week_change_percent,
      monthChangePercent: b.month_change_percent,
      yearChangePercent: b.year_change_percent,
      date: b.date
    }));

    return {
      output: {
        pagination: result.pagination,
        bonds
      },
      message: `Retrieved ${bonds.length} government bond records${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}. Total available: ${result.pagination.total}.`
    };
  })
  .build();
