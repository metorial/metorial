import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let monitoring = SlateTool.create(spec, {
  name: 'Monitoring',
  key: 'monitoring',
  description: `Check the operational status and performance metrics of Algolia infrastructure. Supports multiple metric types:
- **status**: Current operational status of all Algolia clusters and servers.
- **incidents**: Recent and ongoing incidents affecting Algolia services.
- **latency**: Search latency metrics for your application's clusters.
- **indexingTime**: Time taken to process indexing operations for your application.
- **reachability**: Probe results indicating whether your application's servers are reachable from various locations.
- **infrastructure**: Detailed infrastructure metrics (CPU, RAM, etc.) for your application's clusters. Supports an optional period parameter to control granularity.`,
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
          'infrastructure'
        ])
        .describe(
          'The type of monitoring metric to retrieve. Use "status" for cluster health, "incidents" for ongoing/past issues, "latency" for search response times, "indexingTime" for indexing durations, "reachability" for server probe results, or "infrastructure" for detailed server metrics.'
        ),
      period: z
        .string()
        .optional()
        .describe(
          'Time period granularity for infrastructure metrics (e.g., "minute", "hour", "day", "week", "month"). Only used when metric is "infrastructure".'
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
        result = await client.getLatency();
        message = 'Retrieved search latency metrics for your application.';
        break;
      }
      case 'indexingTime': {
        result = await client.getIndexingTime();
        message = 'Retrieved indexing time metrics for your application.';
        break;
      }
      case 'reachability': {
        result = await client.getReachability();
        message = 'Retrieved reachability probe results for your application.';
        break;
      }
      case 'infrastructure': {
        let params: Record<string, any> = {};
        if (period) {
          params.period = period;
        }
        result = await client.getInfrastructure(params);
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
