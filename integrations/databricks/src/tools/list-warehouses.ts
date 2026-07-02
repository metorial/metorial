import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let listWarehouses = SlateTool.create(spec, {
  name: 'List SQL Warehouses',
  key: 'list_warehouses',
  description: `List all SQL warehouses in the workspace with their status and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      warehouses: z
        .array(
          z.object({
            warehouseId: z.string().describe('Warehouse identifier'),
            name: z.string().describe('Warehouse name'),
            state: z.string().describe('Current state (RUNNING, STOPPED, STARTING, etc.)'),
            clusterSize: z.string().optional().describe('Cluster size'),
            minNumClusters: z.number().optional().describe('Minimum clusters'),
            maxNumClusters: z.number().optional().describe('Maximum clusters'),
            autoStopMins: z.number().optional().describe('Auto-stop timeout in minutes'),
            warehouseType: z.string().optional().describe('Warehouse type'),
            creatorName: z.string().optional().describe('Creator username'),
            numActiveSessions: z.number().optional().describe('Active sessions count')
          })
        )
        .describe('SQL warehouses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let warehouses = await client.listWarehouses();

    let mapped = warehouses.map((w: any) => ({
      warehouseId: w.id,
      name: w.name ?? '',
      state: w.state ?? 'UNKNOWN',
      clusterSize: w.cluster_size,
      minNumClusters: w.min_num_clusters,
      maxNumClusters: w.max_num_clusters,
      autoStopMins: w.auto_stop_mins,
      warehouseType: w.warehouse_type,
      creatorName: w.creator_name,
      numActiveSessions: w.num_active_sessions
    }));

    return {
      output: { warehouses: mapped },
      message: `Found **${mapped.length}** SQL warehouse(s). ${mapped.filter((w: any) => w.state === 'RUNNING').length} running.`
    };
  })
  .build();
