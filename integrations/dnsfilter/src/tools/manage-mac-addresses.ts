import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMacAddresses = SlateTool.create(spec, {
  name: 'Manage MAC Addresses',
  key: 'manage_mac_addresses',
  description: `List, create, update, or delete MAC addresses associated with organizations for device-level identification.
- **list**: Get all registered MAC addresses.
- **create**: Register a new MAC address.
- **update**: Modify an existing MAC address entry.
- **delete**: Remove a MAC address.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      macAddressId: z
        .string()
        .optional()
        .describe('MAC address record ID (required for update/delete)'),
      macAddress: z.string().optional().describe('MAC address value (for create/update)'),
      organizationId: z.string().optional().describe('Organization ID (for create)'),
      attributes: z.record(z.string(), z.any()).optional().describe('Additional attributes')
    })
  )
  .output(
    z.object({
      macAddresses: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of MAC address records (for list)'),
      macAddress: z
        .record(z.string(), z.any())
        .optional()
        .describe('MAC address details (for create/update)'),
      deleted: z.boolean().optional().describe('Whether the MAC address was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      let macAddresses = await client.listMacAddresses();
      return {
        output: { macAddresses },
        message: `Found **${macAddresses.length}** MAC address(es).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.macAddressId) throw new Error('macAddressId is required for delete');
      await client.deleteMacAddress(ctx.input.macAddressId);
      return {
        output: { deleted: true },
        message: `Deleted MAC address **${ctx.input.macAddressId}**.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.macAddress) params.mac_address = ctx.input.macAddress;
    if (ctx.input.organizationId) params.organization_id = ctx.input.organizationId;
    if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);

    if (action === 'create') {
      let macAddress = await client.createMacAddress(params);
      return {
        output: { macAddress },
        message: `Created MAC address **${ctx.input.macAddress ?? ''}**.`
      };
    }

    if (!ctx.input.macAddressId) throw new Error('macAddressId is required for update');
    let macAddress = await client.updateMacAddress(ctx.input.macAddressId, params);
    return {
      output: { macAddress },
      message: `Updated MAC address **${ctx.input.macAddressId}**.`
    };
  })
  .build();
