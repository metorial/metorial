import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let networkSchema = z.object({
  networkUuid: z.string().describe('Network UUID'),
  name: z.string().optional().describe('Network name'),
  subnet: z.string().optional().describe('Subnet CIDR'),
  vlanId: z.number().optional().describe('VLAN ID'),
  isDefault: z.boolean().optional().describe('Whether this is the default network'),
  vmUuids: z.array(z.string()).optional().describe('UUIDs of VMs in this network')
});

export let manageNetworks = SlateTool.create(spec, {
  name: 'Manage Networks',
  key: 'manage_networks',
  description: `Create, list, rename, set as default, or delete private networks. Networks isolate VMs within a private VLAN segment.`,
  constraints: [
    'A network can only be deleted if it has no attached resources and is not the default.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'rename', 'set_default', 'delete'])
        .describe('Operation to perform'),
      networkUuid: z
        .string()
        .optional()
        .describe('Network UUID (required for get, rename, set_default, delete)'),
      name: z.string().optional().describe('Network name (for create/rename)')
    })
  )
  .output(
    z.object({
      network: networkSchema.optional().describe('Network details'),
      networks: z.array(networkSchema).optional().describe('List of networks'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { action } = ctx.input;

    let mapNet = (n: any) => ({
      networkUuid: n.uuid,
      name: n.name,
      subnet: n.subnet,
      vlanId: n.vlan_id,
      isDefault: n.is_default,
      vmUuids: n.vm_uuids
    });

    switch (action) {
      case 'list': {
        let networks = await client.listNetworks();
        let mapped = (Array.isArray(networks) ? networks : []).map(mapNet);
        return {
          output: { networks: mapped, success: true },
          message: `Found **${mapped.length}** network(s).`
        };
      }

      case 'get': {
        if (!ctx.input.networkUuid) throw new Error('networkUuid is required for get action');
        let network = await client.getNetwork(ctx.input.networkUuid);
        return {
          output: { network: mapNet(network), success: true },
          message: `Network **${network.name || network.uuid}** — subnet: ${network.subnet}.`
        };
      }

      case 'create': {
        let network = await client.createNetwork(ctx.input.name);
        return {
          output: { network: mapNet(network), success: true },
          message: `Created network **${network.name || network.uuid}**.`
        };
      }

      case 'rename': {
        if (!ctx.input.networkUuid || !ctx.input.name)
          throw new Error('networkUuid and name are required for rename action');
        let network = await client.renameNetwork(ctx.input.networkUuid, ctx.input.name);
        return {
          output: { network: mapNet(network), success: true },
          message: `Renamed network **${ctx.input.networkUuid}** to **${ctx.input.name}**.`
        };
      }

      case 'set_default': {
        if (!ctx.input.networkUuid)
          throw new Error('networkUuid is required for set_default action');
        let network = await client.setDefaultNetwork(ctx.input.networkUuid);
        return {
          output: { network: mapNet(network), success: true },
          message: `Set network **${ctx.input.networkUuid}** as default.`
        };
      }

      case 'delete': {
        if (!ctx.input.networkUuid)
          throw new Error('networkUuid is required for delete action');
        await client.deleteNetwork(ctx.input.networkUuid);
        return {
          output: { success: true },
          message: `Deleted network **${ctx.input.networkUuid}**.`
        };
      }
    }
  })
  .build();
