import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTechnicalAnalysis = SlateTool.create(spec, {
  name: 'Get Technical Analysis',
  key: 'get_technical_analysis',
  description: `Retrieve technical analysis data for tokens including **resistance & support levels** and **correlation analysis**.
- Resistance & support returns historical price levels for a given token.
- Correlation shows the top 10 and bottom 10 correlations with the top 100 market cap tokens.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      analysisType: z
        .enum(['resistance_support', 'correlation'])
        .describe('Type of technical analysis'),
      tokenId: z.string().optional().describe('Comma-separated Token Metrics IDs'),
      symbol: z.string().optional().describe('Comma-separated token symbols, e.g. "BTC,ETH"'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      analysis: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of technical analysis records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.analysisType === 'resistance_support') {
      result = await client.getResistanceSupport({
        tokenId: ctx.input.tokenId,
        symbol: ctx.input.symbol,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    } else {
      result = await client.getCorrelation({
        tokenId: ctx.input.tokenId,
        symbol: ctx.input.symbol,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let analysis = result?.data ?? [];

    return {
      output: { analysis },
      message: `Retrieved **${analysis.length}** ${ctx.input.analysisType.replace('_', ' & ')} record(s).`
    };
  })
  .build();
