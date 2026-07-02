import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { mongodbServiceError } from '../lib/errors';
import { spec } from '../spec';

let peeringConnectionSchema = z.object({
  peerId: z.string().describe('Unique identifier of the peering connection'),
  providerName: z.string().optional().describe('Cloud provider (AWS, AZURE, GCP)'),
  statusName: z.string().optional().describe('Current status of the peering connection'),
  containerName: z.string().optional().describe('Network container name'),
  vpcId: z.string().optional().describe('VPC/VNet identifier'),
  azureDirectoryId: z.string().optional().describe('Azure directory ID'),
  azureSubscriptionId: z.string().optional().describe('Azure subscription ID'),
  awsAccountId: z.string().optional().describe('AWS account ID'),
  routeTableCidrBlock: z.string().optional().describe('CIDR block for routing'),
  gcpProjectId: z.string().optional().describe('GCP project ID'),
  networkName: z.string().optional().describe('GCP network name')
});

export let getNetworkInfoTool = SlateTool.create(spec, {
  name: 'Get Network Info',
  key: 'get_network_info',
  description: `List network peering connections and private endpoint services for a MongoDB Atlas project. Use this to review the network security configuration of your clusters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_peering', 'get_peering', 'list_private_endpoints'])
        .describe('Action to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Falls back to configured projectId.'),
      peerId: z.string().optional().describe('Peering connection ID (for get_peering)'),
      cloudProvider: z
        .enum(['AWS', 'AZURE', 'GCP'])
        .optional()
        .describe('Cloud provider filter')
    })
  )
  .output(
    z.object({
      peeringConnections: z
        .array(peeringConnectionSchema)
        .optional()
        .describe('List of peering connections'),
      peeringConnection: peeringConnectionSchema
        .optional()
        .describe('Single peering connection'),
      privateEndpoints: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of private endpoint services'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw mongodbServiceError('projectId is required');

    let client = new AtlasClient(ctx.auth);

    if (ctx.input.action === 'list_peering') {
      let result = await client.listNetworkPeeringConnections(projectId, {
        providerName: ctx.input.cloudProvider
      });
      let connections = (result.results || []).map((p: any) => ({
        peerId: p.id,
        providerName: p.providerName,
        statusName: p.statusName,
        containerName: p.containerName,
        vpcId: p.vpcId || p.azureVNetName || p.networkName,
        azureDirectoryId: p.azureDirectoryId,
        azureSubscriptionId: p.azureSubscriptionId,
        awsAccountId: p.awsAccountId,
        routeTableCidrBlock: p.routeTableCidrBlock,
        gcpProjectId: p.gcpProjectId,
        networkName: p.networkName
      }));
      return {
        output: {
          peeringConnections: connections,
          totalCount: result.totalCount ?? connections.length
        },
        message: `Found **${connections.length}** peering connection(s).`
      };
    }

    if (ctx.input.action === 'get_peering') {
      if (!ctx.input.peerId) throw mongodbServiceError('peerId is required');
      let p = await client.getNetworkPeeringConnection(projectId, ctx.input.peerId);
      return {
        output: {
          peeringConnection: {
            peerId: p.id,
            providerName: p.providerName,
            statusName: p.statusName,
            containerName: p.containerName,
            vpcId: p.vpcId || p.azureVNetName || p.networkName,
            azureDirectoryId: p.azureDirectoryId,
            azureSubscriptionId: p.azureSubscriptionId,
            awsAccountId: p.awsAccountId,
            routeTableCidrBlock: p.routeTableCidrBlock,
            gcpProjectId: p.gcpProjectId,
            networkName: p.networkName
          }
        },
        message: `Peering connection **${p.id}**: ${p.statusName}.`
      };
    }

    if (ctx.input.action === 'list_private_endpoints') {
      let provider = ctx.input.cloudProvider || 'AWS';
      let result = await client.listPrivateEndpoints(projectId, provider);
      let endpoints = Array.isArray(result) ? result : result.results || [];
      return {
        output: { privateEndpoints: endpoints, totalCount: endpoints.length },
        message: `Found **${endpoints.length}** private endpoint service(s) for ${provider}.`
      };
    }

    throw mongodbServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
