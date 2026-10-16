import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEarningsCallTranscript = SlateTool.create(spec, {
  name: 'Get Earnings Call Transcript',
  key: 'get_earnings_call_transcript',
  description:
    'Retrieve a company earnings-call transcript for a fiscal quarter from 2010Q1 onward, including speaker turns and sentiment signals supplied by the provider.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      symbol: z
        .string()
        .describe('Ticker symbol; use search_symbol to discover the supported symbol'),
      quarter: z
        .string()
        .describe(
          'Fiscal quarter in YYYYQ1 through YYYYQ4 format, for example 2024Q1; earliest supported quarter is 2010Q1'
        )
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Requested ticker symbol'),
      quarter: z.string().describe('Requested fiscal quarter'),
      data: z
        .record(z.string(), z.unknown())
        .describe('Complete Alpha Vantage response with provider field names and values')
    })
  )
  .handleInvocation(async ctx => {
    if (!/^\d{4}Q[1-4]$/.test(ctx.input.quarter) || ctx.input.quarter < '2010Q1')
      throw createApiServiceError(
        'quarter must be in YYYYQ1 through YYYYQ4 format, from 2010Q1 onward.'
      );
    let client = new Client(ctx.auth.token);
    let data = await client.earningsCallTranscript({
      symbol: ctx.input.symbol,
      quarter: ctx.input.quarter
    });
    return {
      output: { symbol: ctx.input.symbol, quarter: ctx.input.quarter, data },
      message: `Retrieved earnings call transcript for **${ctx.input.symbol}**.`
    };
  })
  .build();
