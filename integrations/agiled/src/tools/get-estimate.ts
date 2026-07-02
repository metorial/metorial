import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEstimate = SlateTool.create(spec, {
  name: 'Get Estimate',
  key: 'get_estimate',
  description: `Retrieve an estimate by ID, or list estimates with pagination. Returns estimate details including amounts, client, status, and dates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      estimateId: z
        .string()
        .optional()
        .describe('ID of a specific estimate to retrieve. If omitted, lists estimates.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of estimates per page')
    })
  )
  .output(
    z.object({
      estimates: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of estimate records'),
      totalCount: z.number().optional().describe('Total number of estimates'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.estimateId) {
      let result = await client.getEstimate(ctx.input.estimateId);
      return {
        output: { estimates: [result.data] },
        message: `Retrieved estimate **${result.data.estimate_number ?? ctx.input.estimateId}**.`
      };
    }

    let result = await client.listEstimates(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        estimates: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} estimate(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
