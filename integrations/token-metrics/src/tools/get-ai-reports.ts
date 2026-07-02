import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAiReports = SlateTool.create(spec, {
  name: 'Get AI Reports',
  key: 'get_ai_reports',
  description: `Retrieve AI-generated reports providing comprehensive analyses of cryptocurrency tokens. Reports include deep dives, investment analyses, and code reviews for individual tokens.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tokenId: z.string().optional().describe('Comma-separated Token Metrics IDs'),
      symbol: z.string().optional().describe('Comma-separated token symbols, e.g. "BTC,ETH"'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      reports: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of AI-generated report records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAiReports({
      tokenId: ctx.input.tokenId,
      symbol: ctx.input.symbol,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let reports = result?.data ?? [];

    return {
      output: { reports },
      message: `Retrieved **${reports.length}** AI report(s).`
    };
  })
  .build();
