import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getMetricMetadata = SlateTool.create(spec, {
  name: 'Get Metric Metadata',
  key: 'get_metric_metadata',
  description: `Get Datadog metadata for a metric, including type, unit, per-unit, description, integration, and StatsD interval when available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      metricName: z.string().describe('Metric name to retrieve metadata for')
    })
  )
  .output(
    z.object({
      metricName: z.string().describe('Metric name'),
      type: z.string().optional().describe('Metric type'),
      unit: z.string().optional().describe('Metric unit'),
      perUnit: z.string().optional().describe('Metric per-unit'),
      description: z.string().optional().describe('Metric description'),
      shortName: z.string().optional().describe('Metric short name'),
      integration: z.string().optional().describe('Integration that owns the metric'),
      statsdInterval: z.number().optional().describe('StatsD flush interval')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let metadata = await client.getMetricMetadata(ctx.input.metricName);

    return {
      output: {
        metricName: ctx.input.metricName,
        type: metadata.type,
        unit: metadata.unit,
        perUnit: metadata.per_unit,
        description: metadata.description,
        shortName: metadata.short_name,
        integration: metadata.integration,
        statsdInterval: metadata.statsd_interval
      },
      message: `Retrieved metadata for metric **${ctx.input.metricName}**`
    };
  })
  .build();
