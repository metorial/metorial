import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import type { MetricSeriesInput } from '../lib/types';
import { spec } from '../spec';

export let submitMetrics = SlateTool.create(spec, {
  name: 'Submit Metrics',
  key: 'submit_metrics',
  description: `Submit custom metric data points to Datadog. Send one or more metric series with their values, timestamps, tags, and hosts.`,
  instructions: [
    'Each point is a tuple of [timestamp_in_seconds, value].',
    'If no timestamp is provided, use the current time: Math.floor(Date.now() / 1000).',
    'Metric types: 0 = unspecified, 1 = count, 2 = rate, 3 = gauge.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      series: z
        .array(
          z.object({
            metric: z.string().describe('The metric name, e.g. "custom.my_metric"'),
            type: z
              .number()
              .optional()
              .describe('Metric type: 0=unspecified, 1=count, 2=rate, 3=gauge'),
            points: z
              .array(z.tuple([z.number(), z.number()]))
              .describe('Array of [timestamp, value] tuples'),
            host: z.string().optional().describe('Hostname to associate with the metric'),
            tags: z
              .array(z.string())
              .optional()
              .describe('Tags to associate, e.g. ["env:production", "service:web"]'),
            resources: z
              .array(
                z.object({
                  name: z.string().describe('Resource name, such as a host name'),
                  type: z.string().describe('Resource type, such as "host"')
                })
              )
              .optional()
              .describe('Datadog v2 metric resources to associate with the metric'),
            unit: z.string().optional().describe('Metric unit, such as "request" or "second"')
          })
        )
        .describe('One or more metric series to submit')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Submission status from Datadog'),
      errors: z.array(z.string()).optional().describe('Datadog intake errors, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.submitMetrics(ctx.input.series as MetricSeriesInput[]);

    return {
      output: {
        status: 'accepted',
        errors: result.errors
      },
      message: `Submitted **${ctx.input.series.length}** metric series to Datadog`
    };
  })
  .build();
