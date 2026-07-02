import { SlateTool } from 'slates';
import { z } from 'zod';
import { FomoOpenClient } from '../lib/client';
import { spec } from '../spec';

export let getOpenMetrics = SlateTool.create(spec, {
  name: 'Get Fomo Open Metrics',
  key: 'get_open_metrics',
  description: `Retrieve Fomo's public marketing KPIs via the Fomo Open API. This is a **public, unauthenticated** endpoint that returns Fomo's own platform-level metrics (not your application's data). Available metrics: signups count, customers count, and integrations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      metric: z
        .enum(['signups', 'customers', 'integrations'])
        .describe('The metric to retrieve.'),
      since: z
        .string()
        .optional()
        .describe(
          'Filter results from this date (YYYY-MM-DD format). Only supported for some metrics.'
        )
    })
  )
  .output(
    z.object({
      metric: z.string().describe('The requested metric name.'),
      result: z.any().describe('The metric value or data returned by Fomo.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FomoOpenClient();
    let result = await client.getMetric(ctx.input.metric, ctx.input.since);

    return {
      output: {
        metric: ctx.input.metric,
        result
      },
      message: `Retrieved Fomo Open metric: **${ctx.input.metric}**.`
    };
  })
  .build();
