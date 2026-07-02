import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageIpAddresses = SlateTool.create(spec, {
  name: 'Manage IP Addresses',
  key: 'manage_ip_addresses',
  description: `List, create, update, or delete IP addresses associated with networks. Also supports verifying whether an IP is already registered and retrieving your current public IP.
- **list**: Get all registered IP addresses.
- **create**: Register a new IP address for a network.
- **update**: Modify an existing IP address entry.
- **delete**: Remove an IP address.
- **verify**: Check if an IP is already in the system.
- **my_ip**: Get the requester's current public IP.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete', 'verify', 'my_ip'])
        .describe('Operation to perform'),
      ipAddressId: z
        .string()
        .optional()
        .describe('IP address record ID (required for update/delete)'),
      ipAddress: z.string().optional().describe('IP address value (for create)'),
      networkId: z.string().optional().describe('Network ID to associate with (for create)'),
      attributes: z.record(z.string(), z.any()).optional().describe('Additional attributes')
    })
  )
  .output(
    z.object({
      ipAddresses: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of IP address records (for list)'),
      ipAddress: z.record(z.string(), z.any()).optional().describe('IP address details'),
      deleted: z.boolean().optional().describe('Whether the IP address was deleted'),
      currentIp: z.string().optional().describe('Current public IP (for my_ip)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      let ipAddresses = await client.listIpAddresses();
      return {
        output: { ipAddresses },
        message: `Found **${ipAddresses.length}** IP address(es).`
      };
    }

    if (action === 'my_ip') {
      let result = await client.getMyIp();
      let currentIp =
        typeof result === 'string' ? result : (result?.ip ?? JSON.stringify(result));
      return {
        output: { currentIp },
        message: `Your current IP is **${currentIp}**.`
      };
    }

    if (action === 'verify') {
      let result = await client.verifyIpAddress();
      return {
        output: { ipAddress: result },
        message: `IP verification result retrieved.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.ipAddressId) throw new Error('ipAddressId is required for delete');
      await client.deleteIpAddress(ctx.input.ipAddressId);
      return {
        output: { deleted: true },
        message: `Deleted IP address **${ctx.input.ipAddressId}**.`
      };
    }

    if (action === 'create') {
      let params: Record<string, any> = {};
      if (ctx.input.ipAddress) params.ip_address = ctx.input.ipAddress;
      if (ctx.input.networkId) params.network_id = ctx.input.networkId;
      if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);
      let ipAddress = await client.createIpAddress(params);
      return {
        output: { ipAddress },
        message: `Created IP address **${ctx.input.ipAddress ?? ''}**.`
      };
    }

    // update
    if (!ctx.input.ipAddressId) throw new Error('ipAddressId is required for update');
    let params: Record<string, any> = {};
    if (ctx.input.ipAddress) params.ip_address = ctx.input.ipAddress;
    if (ctx.input.networkId) params.network_id = ctx.input.networkId;
    if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);
    let ipAddress = await client.updateIpAddress(ctx.input.ipAddressId, params);
    return {
      output: { ipAddress },
      message: `Updated IP address **${ctx.input.ipAddressId}**.`
    };
  })
  .build();
