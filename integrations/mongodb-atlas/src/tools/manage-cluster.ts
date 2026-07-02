import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let replicationSpecSchema = z
  .object({
    numShards: z.number().optional().describe('Number of shards'),
    regionConfigs: z
      .array(
        z.object({
          providerName: z.string().describe('Cloud provider (AWS, AZURE, GCP)'),
          regionName: z.string().describe('Cloud region name'),
          priority: z.number().optional().describe('Election priority (0-7)'),
          electableNodes: z.number().optional().describe('Number of electable nodes'),
          readOnlyNodes: z.number().optional().describe('Number of read-only nodes'),
          analyticsNodes: z.number().optional().describe('Number of analytics nodes'),
          electableSpecs: z
            .object({
              instanceSize: z.string().describe('Instance size (e.g., M10, M20, M30)'),
              diskIOPS: z.number().optional(),
              diskSizeGB: z.number().optional(),
              ebsVolumeType: z.string().optional(),
              nodeCount: z.number().optional()
            })
            .optional(),
          readOnlySpecs: z
            .object({
              instanceSize: z.string(),
              diskIOPS: z.number().optional(),
              diskSizeGB: z.number().optional(),
              nodeCount: z.number().optional()
            })
            .optional(),
          analyticsSpecs: z
            .object({
              instanceSize: z.string(),
              diskIOPS: z.number().optional(),
              diskSizeGB: z.number().optional(),
              nodeCount: z.number().optional()
            })
            .optional(),
          autoScaling: z
            .object({
              compute: z
                .object({
                  enabled: z.boolean().optional(),
                  scaleDownEnabled: z.boolean().optional(),
                  minInstanceSize: z.string().optional(),
                  maxInstanceSize: z.string().optional()
                })
                .optional(),
              diskGB: z
                .object({
                  enabled: z.boolean().optional()
                })
                .optional()
            })
            .optional()
        })
      )
      .optional()
  })
  .optional();

export let manageClusterTool = SlateTool.create(spec, {
  name: 'Manage Cluster',
  key: 'manage_cluster',
  description: `Create, update, or retrieve MongoDB Atlas clusters. Supports dedicated (M10+), and shared-tier clusters. Use this to provision new clusters, scale existing ones, change MongoDB versions, or get cluster details.`,
  instructions: [
    'To create a cluster, provide clusterName and replicationSpecs with at least one region config.',
    'To update a cluster, provide clusterName and any fields you want to change.',
    'To get cluster info, provide clusterName with action "get".',
    'To list all clusters, use action "list".'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      action: z
        .enum(['get', 'list', 'create', 'update', 'delete', 'pause', 'resume'])
        .describe('Action to perform'),
      clusterName: z
        .string()
        .optional()
        .describe('Cluster name (required for get/create/update/delete/pause/resume)'),
      clusterType: z
        .enum(['REPLICASET', 'SHARDED', 'GEOSHARDED'])
        .optional()
        .describe('Cluster type'),
      mongoDBMajorVersion: z
        .string()
        .optional()
        .describe('MongoDB version (e.g., "7.0", "8.0")'),
      replicationSpecs: z
        .array(replicationSpecSchema)
        .optional()
        .describe('Replication specifications'),
      backupEnabled: z.boolean().optional().describe('Enable cloud backup'),
      terminationProtectionEnabled: z
        .boolean()
        .optional()
        .describe('Enable termination protection'),
      tags: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Resource tags')
    })
  )
  .output(
    z.object({
      cluster: z.any().optional().describe('Cluster details'),
      clusters: z.array(z.any()).optional().describe('List of clusters'),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('projectId is required. Provide it in input or config.');

    let { action, clusterName } = ctx.input;

    if (action === 'list') {
      let result = await client.listClusters(projectId);
      let clusters = result.results || [];
      return {
        output: { clusters, totalCount: result.totalCount || clusters.length },
        message: `Found **${clusters.length}** cluster(s) in project.`
      };
    }

    if (!clusterName) throw new Error('clusterName is required for this action.');

    if (action === 'get') {
      let cluster = await client.getCluster(projectId, clusterName);
      return {
        output: { cluster },
        message: `Retrieved cluster **${clusterName}** (state: ${cluster.stateName}).`
      };
    }

    if (action === 'create') {
      let data: any = {
        name: clusterName,
        clusterType: ctx.input.clusterType || 'REPLICASET'
      };
      if (ctx.input.mongoDBMajorVersion)
        data.mongoDBMajorVersion = ctx.input.mongoDBMajorVersion;
      if (ctx.input.replicationSpecs) data.replicationSpecs = ctx.input.replicationSpecs;
      if (ctx.input.backupEnabled !== undefined) data.backupEnabled = ctx.input.backupEnabled;
      if (ctx.input.terminationProtectionEnabled !== undefined)
        data.terminationProtectionEnabled = ctx.input.terminationProtectionEnabled;
      if (ctx.input.tags) data.tags = ctx.input.tags;

      let cluster = await client.createCluster(projectId, data);
      return {
        output: { cluster },
        message: `Cluster **${clusterName}** creation initiated (state: ${cluster.stateName}).`
      };
    }

    if (action === 'update') {
      let data: any = {};
      if (ctx.input.clusterType) data.clusterType = ctx.input.clusterType;
      if (ctx.input.mongoDBMajorVersion)
        data.mongoDBMajorVersion = ctx.input.mongoDBMajorVersion;
      if (ctx.input.replicationSpecs) data.replicationSpecs = ctx.input.replicationSpecs;
      if (ctx.input.backupEnabled !== undefined) data.backupEnabled = ctx.input.backupEnabled;
      if (ctx.input.terminationProtectionEnabled !== undefined)
        data.terminationProtectionEnabled = ctx.input.terminationProtectionEnabled;
      if (ctx.input.tags) data.tags = ctx.input.tags;

      let cluster = await client.updateCluster(projectId, clusterName, data);
      return {
        output: { cluster },
        message: `Cluster **${clusterName}** update initiated.`
      };
    }

    if (action === 'pause') {
      let cluster = await client.updateCluster(projectId, clusterName, { paused: true });
      return {
        output: { cluster },
        message: `Cluster **${clusterName}** pause initiated.`
      };
    }

    if (action === 'resume') {
      let cluster = await client.updateCluster(projectId, clusterName, { paused: false });
      return {
        output: { cluster },
        message: `Cluster **${clusterName}** resume initiated.`
      };
    }

    if (action === 'delete') {
      await client.deleteCluster(projectId, clusterName);
      return {
        output: {},
        message: `Cluster **${clusterName}** deletion initiated.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
