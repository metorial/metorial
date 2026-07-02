import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let getMetrics = SlateTool.create(spec, {
  name: 'Get Metrics',
  key: 'get_metrics',
  description: `Retrieve performance metrics for a Render resource. Supports CPU, memory, HTTP requests, HTTP latency, bandwidth, disk usage, instance count, active database connections, and replication lag.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      metricType: z
        .enum([
          'cpu',
          'cpu-limit',
          'cpu-target',
          'memory',
          'memory-limit',
          'memory-target',
          'http-requests',
          'http-latency',
          'bandwidth',
          'disk-usage',
          'disk-capacity',
          'instance-count',
          'connections',
          'replication-lag'
        ])
        .describe('Type of metric to retrieve'),
      resourceId: z.string().describe('Resource ID (service, postgres, or key-value ID)'),
      start: z.string().optional().describe('Start time (ISO 8601)'),
      end: z.string().optional().describe('End time (ISO 8601)'),
      step: z.string().optional().describe('Data point interval (e.g., "1m", "5m", "1h")'),
      instanceId: z.string().optional().describe('Specific instance ID to filter by')
    })
  )
  .output(
    z.object({
      metricType: z.string().describe('Metric type queried'),
      dataPoints: z.array(
        z.object({
          timestamp: z.string().describe('Data point timestamp'),
          value: z.number().optional().describe('Metric value'),
          labels: z
            .record(z.string(), z.string())
            .optional()
            .describe('Labels for this data point')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);

    let params: Record<string, any> = {
      resource: [ctx.input.resourceId]
    };
    if (ctx.input.start) params.start = ctx.input.start;
    if (ctx.input.end) params.end = ctx.input.end;
    if (ctx.input.step) params.step = ctx.input.step;
    if (ctx.input.instanceId) params.instance = ctx.input.instanceId;

    let data = await client.getMetrics(ctx.input.metricType, params);

    let dataPoints: Array<{
      timestamp: string;
      value?: number;
      labels?: Record<string, string>;
    }> = [];
    if (Array.isArray(data)) {
      for (let series of data) {
        let labels = series.labels || series.metric || {};
        if (Array.isArray(series.values)) {
          for (let point of series.values) {
            dataPoints.push({
              timestamp: point.timestamp || point[0],
              value:
                typeof point.value === 'number' ? point.value : Number.parseFloat(point[1]),
              labels
            });
          }
        }
      }
    }

    return {
      output: { metricType: ctx.input.metricType, dataPoints },
      message: `Retrieved **${dataPoints.length}** data point(s) for **${ctx.input.metricType}** on \`${ctx.input.resourceId}\`.`
    };
  })
  .build();
