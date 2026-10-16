import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateDate } from '../lib/response';
import { spec } from '../spec';

export let getInsiderTransactions = SlateTool.create(spec, {
  name: 'Get Insider Transactions',
  key: 'get_insider_transactions',
  description:
    'Retrieve the latest and historical insider transactions reported for a US-listed company, including executive identities, acquisition or disposal details, share quantities, and prices where supplied.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      symbol: z
        .string()
        .describe('Ticker symbol; use search_symbol to discover the supported symbol'),
      from: z
        .string()
        .optional()
        .describe('Include transactions on or after this YYYY-MM-DD date')
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
    validateDate(ctx.input.from, 'from');
    let client = new Client(ctx.auth.token);
    let data = await client.insiderTransactions({
      symbol: ctx.input.symbol,
      from: ctx.input.from
    });
    return {
      output: { symbol: ctx.input.symbol, data },
      message: `Retrieved insider transactions for **${ctx.input.symbol}**.`
    };
  })
  .build();
