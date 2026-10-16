import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEarningsEstimates = SlateTool.create(spec, {
  name: 'Get Earnings Estimates',
  key: 'get_earnings_estimates',
  description:
    'Retrieve annual and quarterly analyst EPS and revenue estimates, analyst counts, and revision history for a company. Returns the complete provider response without replacing unavailable values with zero.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      symbol: z
        .string()
        .describe('Ticker symbol; use search_symbol to discover the supported symbol')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Requested ticker symbol'),
      data: z
        .record(z.string(), z.unknown())
        .describe('Complete Alpha Vantage response with provider field names and values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.earningsEstimates({ symbol: ctx.input.symbol });
    return {
      output: { symbol: ctx.input.symbol, data },
      message: `Retrieved earnings estimates for **${ctx.input.symbol}**.`
    };
  })
  .build();
