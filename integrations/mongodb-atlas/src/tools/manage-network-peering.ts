import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { invalidAction, requireString, resolveProjectId } from '../lib/validation';
import { spec } from '../spec';

export let manageNetworkPeeringTool = SlateTool.create(spec, {
  name: 'Manage Network Peering',
  key: 'manage_network_peering',
  description: `Manage VPC/VNet network peering connections between MongoDB Atlas and your cloud provider (AWS, Azure, GCP). List, create, view, or delete peering connections to enable private network communication with your clusters.`,
  instructions: [
    'AWS peering requires: accepterRegionName, awsAccountId, routeTableCidrBlock, vpcId, containerId.',
    'Azure peering requires: azureDirectoryId, azureSubscriptionId, resourceGroupName, vNetName, containerId.',
    'GCP peering requires: gcpProjectId, networkName, containerId.',
    'Use the Atlas container ID (get from Atlas network container settings) for the containerId.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Action to perform'),
      peerId: z.string().optional().describe('Peering connection ID (for get/delete)'),
      providerName: z
        .enum(['AWS', 'AZURE', 'GCP'])
        .optional()
        .describe('Cloud provider name (for list filter or create)'),
      containerId: z.string().optional().describe('Atlas network container ID'),
      // AWS-specific
      accepterRegionName: z
        .string()
        .optional()
        .describe('AWS region for the peering connection'),
      awsAccountId: z.string().optional().describe('AWS account ID'),
      routeTableCidrBlock: z.string().optional().describe('CIDR block for route table'),
      vpcId: z.string().optional().describe('AWS VPC ID'),
      // Azure-specific
      azureDirectoryId: z.string().optional().describe('Azure Active Directory ID'),
      azureSubscriptionId: z.string().optional().describe('Azure subscription ID'),
      resourceGroupName: z.string().optional().describe('Azure resource group name'),
      vNetName: z.string().optional().describe('Azure VNet name'),
      // GCP-specific
      gcpProjectId: z.string().optional().describe('GCP project ID'),
      networkName: z.string().optional().describe('GCP network name')
    })
  )
  .output(
    z.object({
      peering: z.any().optional(),
      peerings: z.array(z.any()).optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listNetworkPeering(projectId, {
        providerName: ctx.input.providerName
      });
      let peerings = result.results || [];
      return {
        output: { peerings, totalCount: result.totalCount || peerings.length },
        message: `Found **${peerings.length}** network peering connection(s).`
      };
    }

    if (action === 'get') {
      let peerId = requireString(ctx.input.peerId, 'peerId');
      let peering = await client.getNetworkPeering(projectId, peerId);
      return {
        output: { peering },
        message: `Retrieved network peering **${peerId}** (status: ${peering.statusName}).`
      };
    }

    if (action === 'create') {
      let containerId = requireString(
        ctx.input.containerId,
        'containerId',
        'for creating a peering connection'
      );
      let providerName = requireString(
        ctx.input.providerName,
        'providerName',
        'for creating a peering connection'
      );

      let data: any = {
        containerId,
        providerName
      };

      if (providerName === 'AWS') {
        data.accepterRegionName = ctx.input.accepterRegionName;
        data.awsAccountId = ctx.input.awsAccountId;
        data.routeTableCidrBlock = ctx.input.routeTableCidrBlock;
        data.vpcId = ctx.input.vpcId;
      } else if (providerName === 'AZURE') {
        data.azureDirectoryId = ctx.input.azureDirectoryId;
        data.azureSubscriptionId = ctx.input.azureSubscriptionId;
        data.resourceGroupName = ctx.input.resourceGroupName;
        data.vNetName = ctx.input.vNetName;
      } else if (providerName === 'GCP') {
        data.gcpProjectId = ctx.input.gcpProjectId;
        data.networkName = ctx.input.networkName;
      }

      let peering = await client.createNetworkPeering(projectId, data);
      return {
        output: { peering },
        message: `Created network peering connection on **${ctx.input.providerName}**.`
      };
    }

    if (action === 'delete') {
      let peerId = requireString(ctx.input.peerId, 'peerId');
      await client.deleteNetworkPeering(projectId, peerId);
      return {
        output: {},
        message: `Deleted network peering **${peerId}**.`
      };
    }

    return invalidAction(action);
  })
  .build();
