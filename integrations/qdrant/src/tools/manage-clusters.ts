import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { resolveCloudClient } from '../lib/cloud-client';
import { accountIdSchema } from '../lib/schemas';
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
  description: `Manages Qdrant Cloud clusters. List, get details, create, delete, restart, suspend, or unsuspend clusters. Requires a Cloud Management API key. Call list_accounts to discover account IDs and list_cloud_options to discover creation options.`,
  instructions: [
    'Call list_accounts to discover accountId. It may be omitted when the key has access to exactly one account.',
    'For `create`: provide `clusterName`, `cloudProvider`, `region`, `nodeCount`, and `packageId`.',
    'For `delete`, `restart`, `suspend`, `unsuspend`: provide `clusterId`.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountId: accountIdSchema.optional(),
      action: z
        .enum(['list', 'get', 'create', 'delete', 'restart', 'suspend', 'unsuspend'])
        .describe('Cluster operation to perform'),
      clusterId: z
        .string()
        .optional()
        .describe(
          'Cluster ID from manage_clusters with action list. Required for get, delete, restart, suspend, unsuspend.'
        ),
      clusterName: z
        .string()
        .optional()
        .describe('Name for the new cluster (required for create)'),
      cloudProvider: z
        .string()
        .optional()
        .describe('Cloud provider ID (e.g., "aws", "gcp") for create'),
      region: z.string().optional().describe('Cloud provider region ID for create'),
      nodeCount: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of nodes for create (default: 1)'),
      packageId: z
        .string()
        .optional()
        .describe(
          'Package ID for create. Call list_cloud_options with action packages to discover it.'
        ),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .describe('Maximum clusters per page for list'),
      pageToken: z
        .string()
        .optional()
        .describe('Continuation token returned by a previous list call'),
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
      nextPageToken: z
        .string()
        .optional()
        .describe('Pass as pageToken to retrieve the next list page'),
      totalSize: z
        .number()
        .optional()
        .describe('Total matching clusters when pagination is requested'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.managementToken) {
      throw createApiServiceError(
        'Cloud Management API key is required for cluster operations. Configure it in authentication.'
      );
    }
    let cloudClient = await resolveCloudClient(
      ctx.auth,
      ctx.input.accountId,
      (ctx.config as { accountId?: string }).accountId
    );

    let mapCluster = (c: any) => {
      if (!c?.id || !c?.name) {
        throw createApiServiceError('Qdrant Cloud returned incomplete cluster details.');
      }
      return {
        clusterId: c.id,
        clusterName: c.name,
        createdAt: c.createdAt ?? c.created_at,
        cloudProvider: c.cloudProviderId ?? c.cloud_provider_id,
        region: c.cloudProviderRegionId ?? c.cloud_provider_region_id,
        nodeCount: c.configuration?.numberOfNodes ?? c.configuration?.number_of_nodes,
        phase: c.state?.phase,
        endpoint: (() => {
          if (!c.state?.endpoint?.url) return undefined;
          try {
            let endpoint = new URL(c.state.endpoint.url);
            if (c.state.endpoint.restPort) endpoint.port = String(c.state.endpoint.restPort);
            return endpoint.toString().replace(/\/+$/, '');
          } catch {
            throw createApiServiceError('Qdrant Cloud returned an invalid cluster endpoint.');
          }
        })()
      };
    };

    if (ctx.input.action === 'list') {
      let result = await cloudClient.listClusters({
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });
      let clusters = (result.items ?? []).map(mapCluster);
      return {
        output: {
          clusters,
          nextPageToken: result.nextPageToken,
          totalSize: result.totalSize,
          success: true
        },
        message: `Found **${clusters.length}** cluster(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.clusterId) throw createApiServiceError('clusterId is required');
      let result = await cloudClient.getCluster(ctx.input.clusterId);
      return {
        output: { cluster: mapCluster(result.cluster), success: true },
        message: `Cluster \`${result.cluster.name ?? ctx.input.clusterId}\` is **${result.cluster.state?.phase ?? 'unknown'}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (
        !ctx.input.clusterName ||
        !ctx.input.cloudProvider ||
        !ctx.input.region ||
        !ctx.input.packageId
      ) {
        throw createApiServiceError(
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
        output: { cluster: mapCluster(result.cluster), success: true },
        message: `Cluster \`${ctx.input.clusterName}\` creation initiated.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.clusterId) throw createApiServiceError('clusterId is required');
      await cloudClient.deleteCluster(ctx.input.clusterId, ctx.input.deleteBackups);
      return {
        output: { success: true },
        message: `Cluster \`${ctx.input.clusterId}\` deletion initiated.`
      };
    }

    if (ctx.input.action === 'restart') {
      if (!ctx.input.clusterId) throw createApiServiceError('clusterId is required');
      await cloudClient.restartCluster(ctx.input.clusterId);
      return {
        output: { success: true },
        message: `Cluster \`${ctx.input.clusterId}\` restart initiated.`
      };
    }

    if (ctx.input.action === 'suspend') {
      if (!ctx.input.clusterId) throw createApiServiceError('clusterId is required');
      await cloudClient.suspendCluster(ctx.input.clusterId);
      return {
        output: { success: true },
        message: `Cluster \`${ctx.input.clusterId}\` suspension initiated.`
      };
    }

    if (ctx.input.action === 'unsuspend') {
      if (!ctx.input.clusterId) throw createApiServiceError('clusterId is required');
      await cloudClient.unsuspendCluster(ctx.input.clusterId);
      return {
        output: { success: true },
        message: `Cluster \`${ctx.input.clusterId}\` resumption initiated.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
