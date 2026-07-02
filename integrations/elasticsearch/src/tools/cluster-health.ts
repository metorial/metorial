import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { spec } from '../spec';

export let clusterHealthTool = SlateTool.create(spec, {
  name: 'Cluster Health',
  key: 'cluster_health',
  description: `Get the health status and key metrics of the Elasticsearch cluster including node count, shard allocation status, and pending tasks. Optionally include node-level statistics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeNodeStats: z
        .boolean()
        .optional()
        .describe('Include detailed node-level statistics'),
      nodeId: z
        .string()
        .optional()
        .describe(
          'Specific node ID to get stats for (only used when includeNodeStats is true)'
        )
    })
  )
  .output(
    z.object({
      clusterName: z.string().describe('Name of the cluster'),
      status: z.string().describe('Cluster health status (green, yellow, red)'),
      timedOut: z.boolean().describe('Whether the health request timed out'),
      numberOfNodes: z.number().describe('Total number of nodes'),
      numberOfDataNodes: z.number().describe('Number of data nodes'),
      activePrimaryShards: z.number().describe('Number of active primary shards'),
      activeShards: z.number().describe('Total number of active shards'),
      relocatingShards: z.number().describe('Number of shards being relocated'),
      initializingShards: z.number().describe('Number of shards being initialized'),
      unassignedShards: z.number().describe('Number of unassigned shards'),
      activeShardsPercent: z.string().describe('Percentage of active shards'),
      nodeStats: z
        .record(z.string(), z.any())
        .optional()
        .describe('Node-level statistics (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    let health = await client.clusterHealth();
    let nodeStats: any;

    if (ctx.input.includeNodeStats) {
      nodeStats = await client.nodeStats(ctx.input.nodeId);
    }

    return {
      output: {
        clusterName: health.cluster_name,
        status: health.status,
        timedOut: health.timed_out,
        numberOfNodes: health.number_of_nodes,
        numberOfDataNodes: health.number_of_data_nodes,
        activePrimaryShards: health.active_primary_shards,
        activeShards: health.active_shards,
        relocatingShards: health.relocating_shards,
        initializingShards: health.initializing_shards,
        unassignedShards: health.unassigned_shards,
        activeShardsPercent: String(health.active_shards_percent_as_number),
        nodeStats: nodeStats?.nodes
      },
      message: `Cluster **${health.cluster_name}** is **${health.status}** — ${health.number_of_nodes} nodes, ${health.active_shards} active shards (${health.unassigned_shards} unassigned).`
    };
  })
  .build();
