import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieve a deal by ID, or list deals with pagination. Returns deal details including name, value, stage, and associated contact.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dealId: z
        .string()
        .optional()
        .describe('ID of a specific deal to retrieve. If omitted, lists deals.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of deals per page')
    })
  )
  .output(
    z.object({
      deals: z.array(z.record(z.string(), z.unknown())).describe('Array of deal records'),
      totalCount: z.number().optional().describe('Total number of deals'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.dealId) {
      let result = await client.getDeal(ctx.input.dealId);
      return {
        output: { deals: [result.data] },
        message: `Retrieved deal **${result.data.name ?? ctx.input.dealId}**.`
      };
    }

    let result = await client.listDeals(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        deals: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} deal(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
