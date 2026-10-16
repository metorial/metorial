import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchNsn = SlateTool.create(spec, {
  name: 'Search National Stock Numbers',
  key: 'search_nsn',
  description:
    'Research National Stock Numbers by NSN, supplier CAGE code, or manufacturer part number. Returns available nomenclature, prices, suppliers, and award information for defense procurement research.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      nsn: z.string().optional().describe('National Stock Number to look up'),
      cageCode: z.string().optional().describe('Supplier CAGE code'),
      partNumber: z.string().optional().describe('Manufacturer part number'),
      ordering: z
        .enum([
          'last_price',
          '-last_price',
          'opp_count',
          '-opp_count',
          'unit_price',
          '-unit_price'
        ])
        .optional()
        .describe('Sort by last price, opportunity count, or unit price'),
      pageNumber: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z.number().optional().describe('Records per page, from 1 to 100; default 10')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.unknown())),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth.token).getNsnData(ctx.input);
    return {
      output: {
        items: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Returned **${response.results.length}** stock number records (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}).`
    };
  })
  .build();
