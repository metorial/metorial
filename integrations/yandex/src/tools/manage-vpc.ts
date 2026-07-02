import { SlateTool } from 'slates';
import { z } from 'zod';
import * as vpc from '../lib/vpc';
import { spec } from '../spec';

export let listNetworks = SlateTool.create(spec, {
  name: 'List Networks',
  key: 'list_networks',
  description: `List virtual networks in a Yandex VPC folder. Returns network metadata including associated subnets.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID to list networks from'),
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      networks: z
        .array(
          z.object({
            networkId: z.string().describe('Network ID'),
            name: z.string().optional().describe('Network name'),
            description: z.string().optional().describe('Network description'),
            folderId: z.string().optional().describe('Folder ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            labels: z.record(z.string(), z.string()).optional().describe('Labels')
          })
        )
        .describe('List of networks'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await vpc.listNetworks(
      ctx.auth,
      folderId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let networks = (result.networks || []).map((n: any) => ({
      networkId: n.id,
      name: n.name,
      description: n.description,
      folderId: n.folderId,
      createdAt: n.createdAt,
      labels: n.labels
    }));

    return {
      output: {
        networks,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${networks.length} network(s) in folder ${folderId}.`
    };
  })
  .build();

export let listSubnets = SlateTool.create(spec, {
  name: 'List Subnets',
  key: 'list_subnets',
  description: `List subnets in a Yandex VPC folder. Returns subnet details including CIDR blocks, zone, and associated network.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID to list subnets from'),
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      subnets: z
        .array(
          z.object({
            subnetId: z.string().describe('Subnet ID'),
            name: z.string().optional().describe('Subnet name'),
            description: z.string().optional().describe('Subnet description'),
            folderId: z.string().optional().describe('Folder ID'),
            networkId: z.string().optional().describe('Associated network ID'),
            zoneId: z.string().optional().describe('Availability zone'),
            v4CidrBlocks: z.array(z.string()).optional().describe('IPv4 CIDR blocks'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            labels: z.record(z.string(), z.string()).optional().describe('Labels')
          })
        )
        .describe('List of subnets'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await vpc.listSubnets(
      ctx.auth,
      folderId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let subnets = (result.subnets || []).map((s: any) => ({
      subnetId: s.id,
      name: s.name,
      description: s.description,
      folderId: s.folderId,
      networkId: s.networkId,
      zoneId: s.zoneId,
      v4CidrBlocks: s.v4CidrBlocks,
      createdAt: s.createdAt,
      labels: s.labels
    }));

    return {
      output: {
        subnets,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${subnets.length} subnet(s) in folder ${folderId}.`
    };
  })
  .build();

export let manageNetwork = SlateTool.create(spec, {
  name: 'Manage Network',
  key: 'manage_network',
  description: `Create or delete a virtual network in Yandex VPC. Networks provide isolation for your cloud resources and serve as containers for subnets.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      networkId: z.string().optional().describe('Network ID (required for delete)'),
      folderId: z.string().optional().describe('Folder ID (required for create)'),
      name: z.string().optional().describe('Network name (required for create)'),
      description: z.string().optional().describe('Network description'),
      labels: z.record(z.string(), z.string()).optional().describe('Labels')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID'),
      networkId: z.string().optional().describe('Network ID'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create') {
      let folderId = ctx.input.folderId || ctx.config.folderId;
      if (!folderId) throw new Error('folderId is required for network creation');
      if (!ctx.input.name) throw new Error('name is required for network creation');

      let result = await vpc.createNetwork(ctx.auth, {
        folderId,
        name: ctx.input.name,
        description: ctx.input.description,
        labels: ctx.input.labels
      });

      return {
        output: {
          operationId: result.id,
          networkId: result.metadata?.networkId,
          done: result.done || false
        },
        message: `Network **${ctx.input.name}** creation initiated.`
      };
    } else {
      if (!ctx.input.networkId) throw new Error('networkId is required for deletion');

      let result = await vpc.deleteNetwork(ctx.auth, ctx.input.networkId);

      return {
        output: {
          operationId: result.id,
          done: result.done || false
        },
        message: `Network **${ctx.input.networkId}** deletion initiated.`
      };
    }
  })
  .build();

export let manageSubnet = SlateTool.create(spec, {
  name: 'Manage Subnet',
  key: 'manage_subnet',
  description: `Create or delete a subnet in Yandex VPC. Subnets define IP address ranges within a network and are zone-specific.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      subnetId: z.string().optional().describe('Subnet ID (required for delete)'),
      folderId: z.string().optional().describe('Folder ID (required for create)'),
      name: z.string().optional().describe('Subnet name (required for create)'),
      description: z.string().optional().describe('Subnet description'),
      networkId: z.string().optional().describe('Network ID (required for create)'),
      zoneId: z
        .string()
        .optional()
        .describe('Availability zone (required for create, e.g. ru-central1-a)'),
      v4CidrBlocks: z
        .array(z.string())
        .optional()
        .describe('IPv4 CIDR blocks (required for create, e.g. ["10.1.0.0/24"])'),
      labels: z.record(z.string(), z.string()).optional().describe('Labels'),
      routeTableId: z.string().optional().describe('Route table ID')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID'),
      subnetId: z.string().optional().describe('Subnet ID'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create') {
      let folderId = ctx.input.folderId || ctx.config.folderId;
      if (!folderId) throw new Error('folderId is required for subnet creation');
      if (!ctx.input.name) throw new Error('name is required for subnet creation');
      if (!ctx.input.networkId) throw new Error('networkId is required for subnet creation');
      if (!ctx.input.zoneId) throw new Error('zoneId is required for subnet creation');
      if (!ctx.input.v4CidrBlocks)
        throw new Error('v4CidrBlocks is required for subnet creation');

      let result = await vpc.createSubnet(ctx.auth, {
        folderId,
        name: ctx.input.name,
        description: ctx.input.description,
        networkId: ctx.input.networkId,
        zoneId: ctx.input.zoneId,
        v4CidrBlocks: ctx.input.v4CidrBlocks,
        labels: ctx.input.labels,
        routeTableId: ctx.input.routeTableId
      });

      return {
        output: {
          operationId: result.id,
          subnetId: result.metadata?.subnetId,
          done: result.done || false
        },
        message: `Subnet **${ctx.input.name}** creation initiated in zone ${ctx.input.zoneId}.`
      };
    } else {
      if (!ctx.input.subnetId) throw new Error('subnetId is required for deletion');

      let result = await vpc.deleteSubnet(ctx.auth, ctx.input.subnetId);

      return {
        output: {
          operationId: result.id,
          done: result.done || false
        },
        message: `Subnet **${ctx.input.subnetId}** deletion initiated.`
      };
    }
  })
  .build();
