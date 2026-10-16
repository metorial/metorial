import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let monitoring = SlateTool.create(spec, {
  name: 'Monitoring',
  key: 'monitoring',
  description: `Check the operational status and performance metrics of Algolia infrastructure. Supports multiple metric types:
- **status**: Current operational status of all Algolia clusters and servers.
- **incidents**: Recent and ongoing incidents affecting Algolia services.
- **latency**: Search latency from external probes for selected clusters.
- **indexingTime**: Indexing latency from external probes for selected clusters.
- **reachability**: Probe results for selected clusters.
- **servers**: Discover the application's servers and cluster names.
- **infrastructure**: Infrastructure metrics for the application. Requires a Monitoring API key and an eligible plan.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      metric: z
        .enum([
          'status',
          'incidents',
          'latency',
          'indexingTime',
          'reachability',
          'infrastructure',
          'servers'
        ])
        .describe(
          'The type of monitoring metric to retrieve. Use "status" for cluster health, "incidents" for ongoing/past issues, "latency" for search response times, "indexingTime" for indexing durations, "reachability" for server probe results, or "infrastructure" for detailed server metrics.'
        ),
      clusters: z
        .array(z.string())
        .optional()
        .describe(
          'Cluster names for latency, indexingTime, and reachability. Discover with metric servers or status. When omitted, resolve the application clusters from servers.'
        ),
      infrastructureMetric: z
        .enum([
          'avg_build_time',
          'ssd_usage',
          'ram_search_usage',
          'ram_indexing_usage',
          'cpu_usage',
          '*'
        ])
        .optional()
        .describe('Infrastructure metric to retrieve. Defaults to all metrics (*).'),
      period: z
        .string()
        .optional()
        .describe(
          'Time period for infrastructure metrics: minute, hour, day, week, or month. Defaults to hour. Only used when metric is infrastructure.'
        )
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let { metric, period } = ctx.input;

    let result: any;
    let message: string;

    switch (metric) {
      case 'status': {
        result = await client.getMonitoringStatus();
        message = 'Retrieved current Algolia cluster status.';
        break;
      }
      case 'incidents': {
        result = await client.getMonitoringIncidents();
        message = 'Retrieved recent Algolia incidents.';
        break;
      }
      case 'latency': {
        result = await client.getLatency(ctx.input.clusters);
        message = 'Retrieved search latency metrics for selected clusters.';
        break;
      }
      case 'indexingTime': {
        result = await client.getIndexingTime(ctx.input.clusters);
        message = 'Retrieved indexing latency metrics for selected clusters.';
        break;
      }
      case 'reachability': {
        result = await client.getReachability(ctx.input.clusters);
        message = 'Retrieved reachability probe results for selected clusters.';
        break;
      }
      case 'servers': {
        result = await client.getServers();
        message = 'Retrieved application servers and clusters.';
        break;
      }
      case 'infrastructure': {
        if (
          period !== undefined &&
          !['minute', 'hour', 'day', 'week', 'month'].includes(period)
        ) {
          throw createApiServiceError('period must be minute, hour, day, week, or month.');
        }
        result = await client.getInfrastructure(ctx.input.infrastructureMetric, period);
        message = `Retrieved infrastructure metrics for your application${period ? ` (period: ${period})` : ''}.`;
        break;
      }
    }

    return {
      output: result,
      message
    };
  })
  .build();
