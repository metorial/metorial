import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listActiveMetrics = SlateTool.create(spec, {
  name: 'List Active Metrics',
  key: 'list_active_metrics',
  description: `List metric names actively reporting to Datadog since a Unix timestamp. Use this to discover metrics before querying or building monitors.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.number().describe('Unix timestamp in seconds to list active metrics from'),
      host: z.string().optional().describe('Filter metrics by host'),
      tagFilter: z
        .string()
        .optional()
        .describe('Filter metrics by tag query, such as "env:production"')
    })
  )
  .output(
    z.object({
      metrics: z.array(z.string()).describe('Active metric names'),
      count: z.number().describe('Number of metric names returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listActiveMetrics(
      ctx.input.from,
      ctx.input.host,
      ctx.input.tagFilter
    );
    let metrics = result.metrics || [];

    return {
      output: {
        metrics,
        count: metrics.length
      },
      message: `Found **${metrics.length}** active metrics`
    };
  })
  .build();
