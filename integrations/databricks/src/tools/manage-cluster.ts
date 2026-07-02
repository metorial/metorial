import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let manageCluster = SlateTool.create(spec, {
  name: 'Manage Cluster',
  key: 'manage_cluster',
  description: `Create, edit, start, restart, stop, or permanently delete an Apache Spark cluster.
To **create** a new cluster, omit \`clusterId\` and provide \`clusterName\`, \`sparkVersion\`, and \`nodeTypeId\`.
To **edit** an existing cluster, provide \`clusterId\` along with the fields to update.
To **start/restart/stop/delete**, provide \`clusterId\` and the corresponding \`action\`.`,
  instructions: [
    'When creating a cluster, either set numWorkers for a fixed-size cluster or autoscale for an autoscaling cluster.',
    'Terminating a cluster stops it but preserves its configuration. Use permanentDelete to fully remove it.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      clusterId: z
        .string()
        .optional()
        .describe('Cluster ID. Required for all actions except create.'),
      action: z
        .enum(['create', 'edit', 'start', 'restart', 'terminate', 'permanent_delete'])
        .describe('Action to perform on the cluster'),
      clusterName: z.string().optional().describe('Name of the cluster (required for create)'),
      sparkVersion: z
        .string()
        .optional()
        .describe('Spark runtime version (required for create)'),
      nodeTypeId: z
        .string()
        .optional()
        .describe('Node type ID for workers (required for create)'),
      numWorkers: z.number().optional().describe('Fixed number of workers'),
      autoscale: z
        .object({
          minWorkers: z.number().describe('Minimum number of workers'),
          maxWorkers: z.number().describe('Maximum number of workers')
        })
        .optional()
        .describe('Autoscaling configuration'),
      autoterminationMinutes: z
        .number()
        .optional()
        .describe('Minutes of inactivity before auto-termination'),
      sparkConf: z
        .record(z.string(), z.string())
        .optional()
        .describe('Spark configuration key-value pairs'),
      customTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom tags for the cluster')
    })
  )
  .output(
    z.object({
      clusterId: z.string().describe('ID of the affected cluster')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let { action, clusterId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.clusterName || !ctx.input.sparkVersion || !ctx.input.nodeTypeId) {
        throw new Error('clusterName, sparkVersion, and nodeTypeId are required for create');
      }
      let result = await client.createCluster({
        clusterName: ctx.input.clusterName,
        sparkVersion: ctx.input.sparkVersion,
        nodeTypeId: ctx.input.nodeTypeId,
        numWorkers: ctx.input.numWorkers,
        autoscale: ctx.input.autoscale,
        autoterminationMinutes: ctx.input.autoterminationMinutes,
        sparkConf: ctx.input.sparkConf as Record<string, string> | undefined,
        customTags: ctx.input.customTags as Record<string, string> | undefined
      });
      return {
        output: { clusterId: result.cluster_id },
        message: `Created cluster **${ctx.input.clusterName}** (${result.cluster_id}).`
      };
    }

    if (!clusterId) {
      throw new Error('clusterId is required for this action');
    }

    switch (action) {
      case 'edit':
        await client.editCluster(clusterId, {
          clusterName: ctx.input.clusterName,
          sparkVersion: ctx.input.sparkVersion,
          nodeTypeId: ctx.input.nodeTypeId,
          numWorkers: ctx.input.numWorkers,
          autoscale: ctx.input.autoscale,
          autoterminationMinutes: ctx.input.autoterminationMinutes
        });
        return {
          output: { clusterId },
          message: `Updated cluster **${clusterId}**.`
        };
      case 'start':
        await client.startCluster(clusterId);
        return {
          output: { clusterId },
          message: `Started cluster **${clusterId}**.`
        };
      case 'restart':
        await client.restartCluster(clusterId);
        return {
          output: { clusterId },
          message: `Restarted cluster **${clusterId}**.`
        };
      case 'terminate':
        await client.terminateCluster(clusterId);
        return {
          output: { clusterId },
          message: `Terminated cluster **${clusterId}**.`
        };
      case 'permanent_delete':
        await client.permanentDeleteCluster(clusterId);
        return {
          output: { clusterId },
          message: `Permanently deleted cluster **${clusterId}**.`
        };
    }
  })
  .build();
