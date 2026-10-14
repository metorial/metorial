import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let computeMetric = SlateTool.create(spec, {
  name: 'Compute Event Metric',
  key: 'compute_metric',
  description:
    'Compute the number of sessions containing a named custom event over a date range, aggregated in a histogram. Call list_websites to discover the website ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      websiteId: z
        .string()
        .describe('Website ID. Call list_websites to discover website IDs.'),
      eventName: z.string().describe('Exact custom event name, such as Signup Form: filled'),
      dateRange: z.object({
        from: z.string().describe('Start date, for example 2024-01-01'),
        to: z.string().describe('End date, for example 2024-12-31')
      }),
      interval: z.string().optional().describe('Histogram interval; defaults to week'),
      aggregation: z.string().optional().describe('Histogram aggregation; defaults to sum')
    })
  )
  .output(
    z.object({
      result: z
        .unknown()
        .describe('Complete metric computation response returned by LiveSession')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.computeMetric({
      website_id: ctx.input.websiteId,
      compute: {
        date_range: ctx.input.dateRange,
        filters: {
          must: [
            {
              name: 'event.custom_name',
              data: {
                string: { operator: 'eq', values: [ctx.input.eventName] }
              }
            }
          ]
        },
        type: 'sessions',
        histogram: {
          aggs_func: ctx.input.aggregation ?? 'sum',
          interval: ctx.input.interval ?? 'week'
        }
      }
    });
    return {
      output: { result },
      message: `Computed session metric for custom event **${ctx.input.eventName}**.`
    };
  })
  .build();
