import { SlateTool } from 'slates';
import { z } from 'zod';
import { QdrantCloudClient } from '../lib/cloud-client';
import { spec } from '../spec';

let clusterSchema = z.object({
  clusterId: z.string().describe('Cluster ID'),
  clusterName: z.string().describe('Cluster name'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  cloudProvider: z.string().optional().describe('Cloud provider (e.g., aws, gcp, azure)'),
  region: z.string().optional().describe('Cloud provider region'),
  nodeCount: z.number().optional().describe('Number of nodes'),
  phase: z.string().optional().describe('Cluster phase (e.g., Running, Suspended)'),
  endpoint: z.string().optional().describe('Cluster REST API endpoint URL')
});

export let manageClusters = SlateTool.create(spec, {
  name: 'Manage Cloud Clusters',
  key: 'manage_clusters',
  description: `Manages Qdrant Cloud clusters. List, get details, create, delete, restart, suspend, or unsuspend clusters. Requires a Cloud Management API key and account ID in the configuration.`,
  instructions: [
    'Ensure `managementToken` is configured in authentication and `accountId` is set in configuration.',
    'For `create`: provide `clusterName`, `cloudProvider`, `region`, `nodeCount`, and `packageId`.',
    'For `delete`, `restart`, `suspend`, `unsuspend`: provide `clusterId`.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'delete', 'restart', 'suspend', 'unsuspend'])
        .describe('Cluster operation to perform'),
      clusterId: z
        .string()
        .optional()
        .describe('Cluster ID (required for get, delete, restart, suspend, unsuspend)'),
      clusterName: z
        .string()
        .optional()
        .describe('Name for the new cluster (required for create)'),
      cloudProvider: z
        .string()
        .optional()
        .describe('Cloud provider ID (e.g., "aws", "gcp") for create'),
      region: z.string().optional().describe('Cloud provider region ID for create'),
      nodeCount: z.number().optional().describe('Number of nodes for create'),
      packageId: z.string().optional().describe('Package ID for create'),
      version: z.string().optional().describe('Qdrant version for create'),
      deleteBackups: z
        .boolean()
        .optional()
        .describe('Also delete backups when deleting cluster')
    })
  )
  .output(
    z.object({
      cluster: clusterSchema.optional().describe('Cluster details (for get/create actions)'),
      clusters: z
        .array(clusterSchema)
        .optional()
        .describe('List of clusters (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.managementToken) {
      throw new Error(
        'Cloud Management API key is required for cluster operations. Configure it in authentication.'
      );
    }
    if (!ctx.config.accountId) {
      throw new Error(
        'Account ID is required for cluster operations. Configure it in settings.'
      );
    }

    let cloudClient = new QdrantCloudClient({
      managementToken: ctx.auth.managementToken,
      accountId: ctx.config.accountId
    });

    let mapCluster = (c: any) => ({
      clusterId: c.id,
      clusterName: c.name,
      createdAt: c.createdAt ?? c.created_at,
      cloudProvider: c.cloudProviderId ?? c.cloud_provider_id,
      region: c.cloudProviderRegionId ?? c.cloud_provider_region_id,
      nodeCount: c.configuration?.numberOfNodes ?? c.configuration?.number_of_nodes,
      phase: c.state?.phase,
      endpoint: c.state?.endpoint
    });

    if (ctx.input.action === 'list') {
      let result = await cloudClient.listClusters();
      let clusters = (result.clusters ?? []).map(mapCluster);
      return {
        output: { clusters, success: true },
        message: `Found **${clusters.length}** cluster(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.clusterId) throw new Error('clusterId is required');
      let result = await cloudClient.getCluster(ctx.input.clusterId);
      return {
        output: { cluster: mapCluster(result), success: true },
        message: `Cluster \`${result.name ?? ctx.input.clusterId}\` is **${result.state?.phase ?? 'unknown'}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (
        !ctx.input.clusterName ||
        !ctx.input.cloudProvider ||
        !ctx.input.region ||
        !ctx.input.packageId
      ) {
        throw new Error(
          'clusterName, cloudProvider, region, and packageId are required for create'
        );
      }
      let result = await cloudClient.createCluster({
        name: ctx.input.clusterName,
        cloudProviderId: ctx.input.cloudProvider,
        cloudProviderRegionId: ctx.input.region,
        configuration: {
          numberOfNodes: ctx.input.nodeCount ?? 1,
          packageId: ctx.input.packageId,
          version: ctx.input.version
        }
      });
      return {
        output: { cluster: mapCluster(result), success: true },
        message: `Cluster \`${ctx.input.clusterName}\` creation initiated.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.clusterId) throw new Error('clusterId is required');
      await cloudClient.deleteCluster(ctx.input.clusterId, ctx.input.deleteBackups);
      return {
        output: { success: true },
        message: `Cluster \`${ctx.input.clusterId}\` deletion initiated.`
      };
    }

    if (ctx.input.action === 'restart') {
      if (!ctx.input.clusterId) throw new Error('clusterId is required');
      await cloudClient.restartCluster(ctx.input.clusterId);
      return {
        output: { success: true },
        message: `Cluster \`${ctx.input.clusterId}\` restart initiated.`
      };
    }

    if (ctx.input.action === 'suspend') {
      if (!ctx.input.clusterId) throw new Error('clusterId is required');
      await cloudClient.suspendCluster(ctx.input.clusterId);
      return {
        output: { success: true },
        message: `Cluster \`${ctx.input.clusterId}\` suspended.`
      };
    }

    if (ctx.input.action === 'unsuspend') {
      if (!ctx.input.clusterId) throw new Error('clusterId is required');
      await cloudClient.unsuspendCluster(ctx.input.clusterId);
      return {
        output: { success: true },
        message: `Cluster \`${ctx.input.clusterId}\` unsuspended.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
