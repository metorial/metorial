import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage Metrics',
  key: 'get_usage',
  description: `Query workspace-level API call usage, monthly tracked users (MTU), and delivery metrics. Useful for monitoring consumption and identifying sources of high event volume.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      metricType: z
        .enum(['api_calls', 'mtu', 'delivery'])
        .describe('Type of usage metric to query'),
      period: z
        .string()
        .optional()
        .describe('Usage period (e.g. "current", "2024-01" for API calls/MTU)'),
      destinationId: z
        .string()
        .optional()
        .describe('Destination ID (required for delivery metrics)'),
      sourceId: z.string().optional().describe('Source ID filter (for delivery metrics)'),
      startTime: z.string().optional().describe('Start time ISO 8601 (for delivery metrics)'),
      endTime: z.string().optional().describe('End time ISO 8601 (for delivery metrics)'),
      granularity: z
        .string()
        .optional()
        .describe('Granularity: "DAY" or "HOUR" (for delivery metrics)')
    })
  )
  .output(
    z.object({
      usage: z.any().describe('Usage data (structure varies by metric type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.metricType === 'api_calls') {
      let result = await client.getApiCallUsage({ period: ctx.input.period ?? 'current' });
      return {
        output: { usage: result },
        message: `Retrieved API call usage for period **${ctx.input.period ?? 'current'}**`
      };
    }

    if (ctx.input.metricType === 'mtu') {
      let result = await client.getMtuUsage({ period: ctx.input.period ?? 'current' });
      return {
        output: { usage: result },
        message: `Retrieved MTU usage for period **${ctx.input.period ?? 'current'}**`
      };
    }

    if (ctx.input.metricType === 'delivery') {
      if (!ctx.input.destinationId) {
        throw new Error('destinationId is required for delivery metrics');
      }
      let result = await client.listDeliveryMetrics(ctx.input.destinationId, {
        sourceId: ctx.input.sourceId,
        startTime: ctx.input.startTime,
        endTime: ctx.input.endTime,
        granularity: ctx.input.granularity
      });
      return {
        output: { usage: result },
        message: `Retrieved delivery metrics for destination \`${ctx.input.destinationId}\``
      };
    }

    throw new Error(`Unknown metric type: ${ctx.input.metricType}`);
  })
  .build();
