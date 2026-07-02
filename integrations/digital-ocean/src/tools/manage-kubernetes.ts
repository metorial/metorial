import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

let nodePoolSchema = z.object({
  nodePoolId: z.string().describe('Node pool ID'),
  name: z.string().describe('Node pool name'),
  size: z.string().describe('Droplet size slug'),
  count: z.number().describe('Current number of nodes'),
  autoScale: z.boolean().optional().describe('Whether auto-scaling is enabled'),
  minNodes: z.number().optional().describe('Minimum nodes for auto-scaling'),
  maxNodes: z.number().optional().describe('Maximum nodes for auto-scaling'),
  tags: z.array(z.string()).optional().describe('Tags')
});

let clusterSchema = z.object({
  clusterId: z.string().describe('Kubernetes cluster ID'),
  name: z.string().describe('Cluster name'),
  region: z.string().describe('Region slug'),
  version: z.string().describe('Kubernetes version'),
  status: z.string().describe('Cluster state'),
  endpoint: z.string().optional().describe('Cluster API endpoint'),
  nodePools: z.array(nodePoolSchema).describe('Node pools'),
  createdAt: z.string().describe('Creation timestamp'),
  tags: z.array(z.string()).describe('Tags')
});

export let listKubernetesClusters = SlateTool.create(spec, {
  name: 'List Kubernetes Clusters',
  key: 'list_kubernetes_clusters',
  description: `List all managed Kubernetes clusters in your DigitalOcean account. Returns cluster details including version, endpoint, node pools, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      clusters: z.array(clusterSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let clusters = await client.listKubernetesClusters();

    return {
      output: {
        clusters: clusters.map((c: any) => ({
          clusterId: c.id,
          name: c.name,
          region: c.region_slug,
          version: c.version,
          status: c.status?.state || 'unknown',
          endpoint: c.endpoint,
          nodePools: (c.node_pools || []).map((np: any) => ({
            nodePoolId: np.id,
            name: np.name,
            size: np.size,
            count: np.count,
            autoScale: np.auto_scale,
            minNodes: np.min_nodes,
            maxNodes: np.max_nodes,
            tags: np.tags
          })),
          createdAt: c.created_at,
          tags: c.tags || []
        }))
      },
      message: `Found **${clusters.length}** Kubernetes cluster(s).`
    };
  })
  .build();

export let createKubernetesCluster = SlateTool.create(spec, {
  name: 'Create Kubernetes Cluster',
  key: 'create_kubernetes_cluster',
  description: `Create a new managed Kubernetes cluster with specified node pools. Configure auto-scaling, maintenance windows, and networking.`,
  instructions: [
    'Use "latest" or a specific version like "1.29.1-do.0" for the Kubernetes version',
    'Node pool sizes are Droplet sizes (e.g., "s-2vcpu-4gb")',
    'At least one node pool is required'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Cluster name'),
      region: z.string().describe('Region slug'),
      version: z.string().describe('Kubernetes version'),
      nodePools: z
        .array(
          z.object({
            name: z.string().describe('Node pool name'),
            size: z.string().describe('Droplet size slug'),
            count: z.number().describe('Number of nodes'),
            tags: z.array(z.string()).optional().describe('Tags for the node pool'),
            autoScale: z.boolean().optional().describe('Enable auto-scaling'),
            minNodes: z.number().optional().describe('Minimum nodes when auto-scaling'),
            maxNodes: z.number().optional().describe('Maximum nodes when auto-scaling')
          })
        )
        .describe('Node pools configuration'),
      tags: z.array(z.string()).optional().describe('Tags for the cluster'),
      vpcUuid: z.string().optional().describe('VPC UUID'),
      maintenanceDay: z
        .string()
        .optional()
        .describe('Day of week for maintenance (e.g., "monday")'),
      maintenanceStartTime: z
        .string()
        .optional()
        .describe('Start time for maintenance window (e.g., "04:00")')
    })
  )
  .output(clusterSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let maintenancePolicy =
      ctx.input.maintenanceDay && ctx.input.maintenanceStartTime
        ? { day: ctx.input.maintenanceDay, startTime: ctx.input.maintenanceStartTime }
        : undefined;

    let c = await client.createKubernetesCluster({
      name: ctx.input.name,
      region: ctx.input.region,
      version: ctx.input.version,
      nodePools: ctx.input.nodePools,
      tags: ctx.input.tags,
      vpcUuid: ctx.input.vpcUuid,
      maintenancePolicy
    });

    return {
      output: {
        clusterId: c.id,
        name: c.name,
        region: c.region_slug,
        version: c.version,
        status: c.status?.state || 'provisioning',
        endpoint: c.endpoint,
        nodePools: (c.node_pools || []).map((np: any) => ({
          nodePoolId: np.id,
          name: np.name,
          size: np.size,
          count: np.count,
          autoScale: np.auto_scale,
          minNodes: np.min_nodes,
          maxNodes: np.max_nodes,
          tags: np.tags
        })),
        createdAt: c.created_at,
        tags: c.tags || []
      },
      message: `Created Kubernetes cluster **${c.name}** (ID: ${c.id}) in **${ctx.input.region}** with **${ctx.input.nodePools.length}** node pool(s).`
    };
  })
  .build();

export let deleteKubernetesCluster = SlateTool.create(spec, {
  name: 'Delete Kubernetes Cluster',
  key: 'delete_kubernetes_cluster',
  description: `Permanently delete a managed Kubernetes cluster and all its node pools. Associated volumes and load balancers are not automatically deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      clusterId: z.string().describe('ID of the Kubernetes cluster to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the cluster was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteKubernetesCluster(ctx.input.clusterId);

    return {
      output: { deleted: true },
      message: `Deleted Kubernetes cluster **${ctx.input.clusterId}**.`
    };
  })
  .build();

export let getKubeconfig = SlateTool.create(spec, {
  name: 'Get Kubeconfig',
  key: 'get_kubeconfig',
  description: `Download the kubeconfig file for a Kubernetes cluster. Use this to configure kubectl or other Kubernetes tools for cluster access.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clusterId: z.string().describe('ID of the Kubernetes cluster')
    })
  )
  .output(
    z.object({
      kubeconfig: z.string().describe('Kubeconfig YAML content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let kubeconfig = await client.getKubernetesKubeconfig(ctx.input.clusterId);

    return {
      output: {
        kubeconfig: typeof kubeconfig === 'string' ? kubeconfig : JSON.stringify(kubeconfig)
      },
      message: `Retrieved kubeconfig for Kubernetes cluster **${ctx.input.clusterId}**.`
    };
  })
  .build();

export let manageNodePools = SlateTool.create(spec, {
  name: 'Manage Node Pools',
  key: 'manage_node_pools',
  description: `List, add, or remove node pools in a Kubernetes cluster. Node pools define groups of worker nodes with specific sizes and scaling configurations.`
})
  .input(
    z.object({
      clusterId: z.string().describe('Kubernetes cluster ID'),
      action: z.enum(['list', 'add', 'delete']).describe('Action to perform'),
      nodePoolId: z.string().optional().describe('Node pool ID (required for delete)'),
      name: z.string().optional().describe('Node pool name (required for add)'),
      size: z.string().optional().describe('Droplet size slug (required for add)'),
      count: z.number().optional().describe('Number of nodes (required for add)'),
      tags: z.array(z.string()).optional().describe('Tags for the new node pool'),
      autoScale: z.boolean().optional().describe('Enable auto-scaling'),
      minNodes: z.number().optional().describe('Minimum nodes for auto-scaling'),
      maxNodes: z.number().optional().describe('Maximum nodes for auto-scaling')
    })
  )
  .output(
    z.object({
      nodePools: z.array(nodePoolSchema).optional().describe('List of node pools'),
      nodePool: nodePoolSchema.optional().describe('Created node pool'),
      deleted: z.boolean().optional().describe('Whether the node pool was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let nodePools = await client.listKubernetesNodePools(ctx.input.clusterId);
      return {
        output: {
          nodePools: nodePools.map((np: any) => ({
            nodePoolId: np.id,
            name: np.name,
            size: np.size,
            count: np.count,
            autoScale: np.auto_scale,
            minNodes: np.min_nodes,
            maxNodes: np.max_nodes,
            tags: np.tags
          }))
        },
        message: `Found **${nodePools.length}** node pool(s) in cluster **${ctx.input.clusterId}**.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.name || !ctx.input.size || ctx.input.count === undefined) {
        throw digitalOceanValidationError('name, size, and count are required for add action');
      }

      let np = await client.addKubernetesNodePool(ctx.input.clusterId, {
        name: ctx.input.name,
        size: ctx.input.size,
        count: ctx.input.count,
        tags: ctx.input.tags,
        autoScale: ctx.input.autoScale,
        minNodes: ctx.input.minNodes,
        maxNodes: ctx.input.maxNodes
      });

      return {
        output: {
          nodePool: {
            nodePoolId: np.id,
            name: np.name,
            size: np.size,
            count: np.count,
            autoScale: np.auto_scale,
            minNodes: np.min_nodes,
            maxNodes: np.max_nodes,
            tags: np.tags
          }
        },
        message: `Added node pool **${np.name}** with **${np.count}** node(s) to cluster **${ctx.input.clusterId}**.`
      };
    }

    // delete
    if (!ctx.input.nodePoolId) {
      throw digitalOceanValidationError('nodePoolId is required for delete action');
    }
    await client.deleteKubernetesNodePool(ctx.input.clusterId, ctx.input.nodePoolId);

    return {
      output: { deleted: true },
      message: `Deleted node pool **${ctx.input.nodePoolId}** from cluster **${ctx.input.clusterId}**.`
    };
  })
  .build();
