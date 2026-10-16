import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getRecords } from '../lib/client';
import { spec } from '../spec';

export let getMoonshotTokens = SlateTool.create(spec, {
  name: 'Get Moonshot Tokens',
  key: 'get_moonshot_tokens',
  description:
    'Retrieve active or past tokens selected by the Token Metrics Moonshot model, including the provider-returned grades, signals, market data, dates, and performance metrics.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      type: z
        .enum(['active', 'past'])
        .optional()
        .describe('Selection status (provider default: active)'),
      sortBy: z
        .enum(['moonshot_at', 'roi_pct', 'tm_grade', 'market_cap_usd'])
        .optional()
        .describe('Provider field to sort by'),
      limit: z.number().int().positive().optional().describe('Results per page (default: 50)'),
      page: z.number().int().positive().optional().describe('Page number (default: 1)')
    })
  )
  .output(
    z.object({
      tokens: z
        .array(z.record(z.string(), z.any()))
        .describe('Actual Moonshot token records returned by the provider'),
      raw: z
        .record(z.string(), z.any())
        .describe('Complete provider response with pagination and original null values')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getMoonshotTokens(ctx.input);
    let tokens = getRecords(result);
    return {
      output: { tokens, raw: result },
      message: `Retrieved **${tokens.length}** Moonshot token record(s).`
    };
  })
  .build();
