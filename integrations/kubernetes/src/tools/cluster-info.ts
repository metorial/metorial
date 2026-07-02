import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { spec } from '../spec';

export let clusterInfo = SlateTool.create(spec, {
  name: 'Cluster Info',
  key: 'cluster_info',
  description: `Retrieve general information about the Kubernetes cluster, including the API server version and a summary of all worker nodes with their status, capacity, and versions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      serverVersion: z
        .object({
          major: z.string().optional(),
          minor: z.string().optional(),
          gitVersion: z.string().optional(),
          platform: z.string().optional()
        })
        .describe('Kubernetes server version info'),
      nodeCount: z.number().describe('Total number of nodes'),
      nodes: z
        .array(
          z.object({
            nodeName: z.string().describe('Node name'),
            nodeStatus: z.string().describe('Ready or NotReady'),
            kubeletVersion: z.string().optional(),
            osImage: z.string().optional(),
            architecture: z.string().optional(),
            capacity: z.any().optional().describe('Node total capacity (cpu, memory, pods)'),
            allocatable: z.any().optional().describe('Node allocatable resources')
          })
        )
        .describe('List of cluster nodes')
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);
    let info = await client.getClusterInfo();

    return {
      output: {
        serverVersion: {
          major: info.version.major,
          minor: info.version.minor,
          gitVersion: info.version.gitVersion,
          platform: info.version.platform
        },
        nodeCount: info.nodeCount,
        nodes: info.nodes.map((n: any) => ({
          nodeName: n.name,
          nodeStatus: n.status,
          kubeletVersion: n.kubeletVersion,
          osImage: n.osImage,
          architecture: n.architecture,
          capacity: n.capacity,
          allocatable: n.allocatable
        }))
      },
      message: `Cluster running **Kubernetes ${info.version.gitVersion || `${info.version.major}.${info.version.minor}`}** with **${info.nodeCount} node(s)**. ${info.nodes.filter((n: any) => n.status === 'Ready').length} nodes are Ready.`
    };
  })
  .build();
