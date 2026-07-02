import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

let clusterSchema = z.object({
  clusterId: z.string().describe('Unique identifier for the cluster'),
  clusterName: z.string().describe('Name of the cluster'),
  state: z.string().describe('Current state (e.g., RUNNING, TERMINATED, PENDING)'),
  sparkVersion: z.string().describe('Spark version used by the cluster'),
  nodeTypeId: z.string().describe('Node type ID for worker nodes'),
  driverNodeTypeId: z.string().optional().describe('Node type ID for the driver node'),
  numWorkers: z.number().optional().describe('Fixed number of workers'),
  autoscaleMinWorkers: z.number().optional().describe('Minimum workers when autoscaling'),
  autoscaleMaxWorkers: z.number().optional().describe('Maximum workers when autoscaling'),
  autoterminationMinutes: z
    .number()
    .optional()
    .describe('Minutes of inactivity before auto-termination'),
  creatorUserName: z.string().optional().describe('User who created the cluster'),
  startTime: z.string().optional().describe('Cluster start time in epoch ms'),
  clusterSource: z.string().optional().describe('Source of the cluster (UI, API, JOB)')
});

export let listClusters = SlateTool.create(spec, {
  name: 'List Clusters',
  key: 'list_clusters',
  description: `List all available Apache Spark clusters in the workspace. Returns cluster details including state, configuration, and scaling settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      clusters: z.array(clusterSchema).describe('List of clusters in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let clusters = await client.listClusters();

    let mapped = clusters.map((c: any) => ({
      clusterId: c.cluster_id,
      clusterName: c.cluster_name ?? '',
      state: c.state ?? 'UNKNOWN',
      sparkVersion: c.spark_version ?? '',
      nodeTypeId: c.node_type_id ?? '',
      driverNodeTypeId: c.driver_node_type_id,
      numWorkers: c.num_workers,
      autoscaleMinWorkers: c.autoscale?.min_workers,
      autoscaleMaxWorkers: c.autoscale?.max_workers,
      autoterminationMinutes: c.autotermination_minutes,
      creatorUserName: c.creator_user_name,
      startTime: c.start_time ? String(c.start_time) : undefined,
      clusterSource: c.cluster_source
    }));

    return {
      output: { clusters: mapped },
      message: `Found **${mapped.length}** cluster(s). ${mapped.filter((c: any) => c.state === 'RUNNING').length} running.`
    };
  })
  .build();
