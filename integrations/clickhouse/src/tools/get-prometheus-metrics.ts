import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

export let getPrometheusMetrics = SlateTool.create(spec, {
  name: 'Get Prometheus Metrics',
  key: 'get_prometheus_metrics',
  description: `Retrieve Prometheus-format metrics for all services or a specific service. Includes metrics from system.metrics, system.events, and system.asynchronous_metrics. Idle services only return the ClickHouse_ServiceInfo gauge.`,
  instructions: [
    'Omit serviceId to get metrics for all services in the organization.',
    'Idle services will only return the ClickHouse_ServiceInfo metric; this endpoint does not wake idle services.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z
        .string()
        .optional()
        .describe('ID of a specific service (omit for organization-wide metrics)')
    })
  )
  .output(
    z.object({
      metrics: z.string().describe('Prometheus text-format metrics data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.getPrometheusMetrics(ctx.input.serviceId);
    let metricsText = typeof result === 'string' ? result : JSON.stringify(result);

    return {
      output: { metrics: metricsText },
      message: ctx.input.serviceId
        ? `Retrieved Prometheus metrics for service ${ctx.input.serviceId}.`
        : `Retrieved Prometheus metrics for all services in the organization.`
    };
  })
  .build();
