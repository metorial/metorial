import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEtfProfile = SlateTool.create(spec, {
  name: 'Get ETF Profile',
  key: 'get_etf_profile',
  description:
    'Retrieve an ETF profile with its metrics, sector allocations, and holdings. Returns all fields supplied by Alpha Vantage, including net assets, expense ratio, and portfolio weights where available.',
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
    let data = await client.etfProfile({ symbol: ctx.input.symbol });
    return {
      output: { symbol: ctx.input.symbol, data },
      message: `Retrieved etf profile for **${ctx.input.symbol}**.`
    };
  })
  .build();
