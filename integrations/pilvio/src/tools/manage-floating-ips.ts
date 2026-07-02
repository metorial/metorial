import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let floatingIpSchema = z.object({
  address: z.string().describe('Public IPv4 address'),
  name: z.string().optional().describe('IP label/name'),
  assignedTo: z.string().optional().describe('UUID of the resource this IP is assigned to'),
  assignedToResourceType: z
    .string()
    .optional()
    .describe('Type of resource (e.g., "vm", "load_balancer")')
});

export let manageFloatingIps = SlateTool.create(spec, {
  name: 'Manage Floating IPs',
  key: 'manage_floating_ips',
  description: `Create, list, update, assign, unassign, or delete floating (public) IPv4 addresses. Floating IPs can be assigned to VMs or load balancers.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'assign', 'unassign', 'delete'])
        .describe('Operation to perform'),
      ipAddress: z
        .string()
        .optional()
        .describe('Public IPv4 address (required for get, update, assign, unassign, delete)'),
      vmUuid: z
        .string()
        .optional()
        .describe('VM UUID to assign the IP to (required for "assign")'),
      billingAccountId: z
        .number()
        .optional()
        .describe('Billing account ID (required for "create")'),
      name: z
        .string()
        .optional()
        .describe('Label/name for the floating IP (for create/update)')
    })
  )
  .output(
    z.object({
      floatingIp: floatingIpSchema.optional().describe('Floating IP details'),
      floatingIps: z.array(floatingIpSchema).optional().describe('List of floating IPs'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { action } = ctx.input;

    let mapIp = (ip: any) => ({
      address: ip.address || ip.ip_address,
      name: ip.name,
      assignedTo: ip.assigned_to,
      assignedToResourceType: ip.assigned_to_resource_type
    });

    switch (action) {
      case 'list': {
        let ips = await client.listFloatingIps({
          billingAccountId: ctx.input.billingAccountId,
          vmUuid: ctx.input.vmUuid
        });
        let mapped = (Array.isArray(ips) ? ips : []).map(mapIp);
        return {
          output: { floatingIps: mapped, success: true },
          message: `Found **${mapped.length}** floating IP(s).`
        };
      }

      case 'get': {
        if (!ctx.input.ipAddress) throw new Error('ipAddress is required for get action');
        let ip = await client.getFloatingIp(ctx.input.ipAddress);
        return {
          output: { floatingIp: mapIp(ip), success: true },
          message: `Floating IP **${ip.address || ctx.input.ipAddress}**${ip.assigned_to ? ` → assigned to ${ip.assigned_to}` : ' (unassigned)'}.`
        };
      }

      case 'create': {
        if (ctx.input.billingAccountId === undefined)
          throw new Error('billingAccountId is required for create action');
        let ip = await client.createFloatingIp({
          billingAccountId: ctx.input.billingAccountId,
          name: ctx.input.name
        });
        return {
          output: { floatingIp: mapIp(ip), success: true },
          message: `Created floating IP **${ip.address || ip.ip_address}**.`
        };
      }

      case 'update': {
        if (!ctx.input.ipAddress) throw new Error('ipAddress is required for update action');
        let ip = await client.updateFloatingIp(ctx.input.ipAddress, {
          billingAccountId: ctx.input.billingAccountId,
          name: ctx.input.name
        });
        return {
          output: { floatingIp: mapIp(ip), success: true },
          message: `Updated floating IP **${ctx.input.ipAddress}**.`
        };
      }

      case 'assign': {
        if (!ctx.input.ipAddress || !ctx.input.vmUuid)
          throw new Error('ipAddress and vmUuid are required for assign action');
        let ip = await client.assignFloatingIp(ctx.input.ipAddress, ctx.input.vmUuid);
        return {
          output: { floatingIp: mapIp(ip), success: true },
          message: `Assigned **${ctx.input.ipAddress}** to VM **${ctx.input.vmUuid}**.`
        };
      }

      case 'unassign': {
        if (!ctx.input.ipAddress) throw new Error('ipAddress is required for unassign action');
        let ip = await client.unassignFloatingIp(ctx.input.ipAddress);
        return {
          output: { floatingIp: mapIp(ip), success: true },
          message: `Unassigned floating IP **${ctx.input.ipAddress}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.ipAddress) throw new Error('ipAddress is required for delete action');
        await client.deleteFloatingIp(ctx.input.ipAddress);
        return {
          output: { success: true },
          message: `Deleted floating IP **${ctx.input.ipAddress}**.`
        };
      }
    }
  })
  .build();
