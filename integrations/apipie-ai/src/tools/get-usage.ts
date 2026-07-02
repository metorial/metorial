import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage History',
  key: 'get_usage',
  description: `Retrieve API usage history with detailed insights including token counts, response times, costs, source IPs, and model/provider information for each request. Useful for auditing, billing analysis, and optimization.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of records to return per page (default 20)'),
      offset: z.number().optional().describe('Pagination offset to skip records')
    })
  )
  .output(
    z.object({
      queries: z
        .array(
          z.object({
            queryId: z.number().describe('Unique query identifier'),
            timestamp: z.string().describe('ISO timestamp of the request'),
            app: z.string().optional().describe('Application that made the request'),
            provider: z.string().describe('Provider that handled the request'),
            route: z.string().describe('Model route used'),
            unit: z.string().optional().describe('Billing unit type (e.g., "token", "image")'),
            promptTokens: z.number().describe('Number of prompt tokens'),
            promptCharacters: z.number().describe('Number of prompt characters'),
            responseTokens: z.number().describe('Number of response tokens'),
            responseCharacters: z.number().describe('Number of response characters'),
            cost: z.string().describe('Cost of the request in USD'),
            latencyMs: z.number().describe('Response latency in milliseconds'),
            sourceIp: z.string().optional().describe('Source IP of the request')
          })
        )
        .describe('Usage records'),
      limit: z.number().describe('Records per page'),
      offset: z.number().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.getUsage({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let queries = (result.items ?? []).map((item: any) => ({
      queryId: item.id,
      timestamp: item.timestamp,
      app: item.app,
      provider: item.provider,
      route: item.route,
      unit: item.unit,
      promptTokens: item.prompt_tokens ?? 0,
      promptCharacters: item.prompt_char ?? 0,
      responseTokens: item.response_tokens ?? 0,
      responseCharacters: item.response_char ?? 0,
      cost: item.cost ?? '0',
      latencyMs: item.latency_ms ?? 0,
      sourceIp: item.source_ip
    }));

    let totalCost = queries.reduce(
      (sum: number, q: any) => sum + Number.parseFloat(q.cost || '0'),
      0
    );

    return {
      output: {
        queries,
        limit: result.limit ?? ctx.input.limit ?? 20,
        offset: result.offset ?? ctx.input.offset ?? 0
      },
      message: `Retrieved **${queries.length}** usage record${queries.length !== 1 ? 's' : ''}. Total cost: **$${totalCost.toFixed(6)}**.`
    };
  })
  .build();
