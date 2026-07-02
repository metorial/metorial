import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAiMetrics = SlateTool.create(spec, {
  name: 'Get AI Visibility Metrics',
  key: 'get_ai_metrics',
  description: `Retrieve comprehensive AI visibility metrics for a tracked domain, including visibility scores, sentiment, mentions, citations, position metrics, and detection rates across AI search platforms (ChatGPT, Perplexity, AI Mode, Gemini). Filter by topics, search terms, engines, and timeframes.`,
  instructions: [
    'Timeframe options: "24h", "7d", "30d" (default), "3m", "1y".',
    'Aggregation options: "hourly", "daily" (default), "weekly", "monthly".',
    'Use periodOffset (-1 to -365) to compare with a previous period.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('AI Visibility domain ID'),
      topics: z.array(z.string()).optional().describe('Filter by specific topic names'),
      searchTerms: z
        .array(z.string())
        .optional()
        .describe('Filter by specific search queries'),
      engines: z
        .array(z.string())
        .optional()
        .describe('Filter by AI engines (e.g., "chatgpt", "perplexity", "gemini")'),
      timeframe: z
        .enum(['24h', '7d', '30d', '3m', '1y'])
        .optional()
        .describe('Time period for metrics'),
      periodOffset: z
        .number()
        .optional()
        .describe('Period offset for comparison (-1 to -365)'),
      aggregation: z
        .enum(['hourly', 'daily', 'weekly', 'monthly'])
        .optional()
        .describe('Data aggregation level')
    })
  )
  .output(
    z.object({
      metrics: z
        .any()
        .describe(
          'Comprehensive AI visibility metrics including visibility scores, sentiment, mentions, citations, competitor data, and historical trends'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getAiMetrics({
      domainId: ctx.input.domainId,
      topics: ctx.input.topics,
      searchTerms: ctx.input.searchTerms,
      engines: ctx.input.engines,
      timeframe: ctx.input.timeframe,
      periodOffset: ctx.input.periodOffset,
      aggregation: ctx.input.aggregation
    });

    return {
      output: { metrics: data },
      message: `Retrieved AI visibility metrics for domain **${ctx.input.domainId}**${ctx.input.timeframe ? ` (${ctx.input.timeframe})` : ''}.`
    };
  })
  .build();
