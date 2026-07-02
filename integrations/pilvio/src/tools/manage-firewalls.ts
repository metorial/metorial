import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let firewallRuleSchema = z.object({
  protocol: z.enum(['TCP', 'UDP', 'ICMP']).describe('Protocol'),
  direction: z.enum(['inbound', 'outbound']).describe('Traffic direction'),
  portStart: z.number().optional().describe('Start port (1-65535)'),
  portEnd: z.number().optional().describe('End port (1-65535)'),
  endpointSpecType: z.enum(['any', 'ip_prefixes']).describe('Endpoint filter type'),
  endpointSpec: z
    .string()
    .optional()
    .describe('CIDR notation IP prefix (when endpointSpecType is "ip_prefixes")')
});

let firewallSchema = z.object({
  firewallUuid: z.string().describe('Firewall UUID'),
  name: z.string().optional().describe('Firewall name'),
  description: z.string().optional().describe('Firewall description'),
  rules: z.array(firewallRuleSchema).optional().describe('Firewall rules'),
  assignedResources: z
    .array(
      z.object({
        resourceType: z.string().optional().describe('Resource type'),
        resourceUuid: z.string().optional().describe('Resource UUID')
      })
    )
    .optional()
    .describe('Resources this firewall is assigned to'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let manageFirewalls = SlateTool.create(spec, {
  name: 'Manage Firewalls',
  key: 'manage_firewalls',
  description: `Create, list, update, delete firewalls, and assign/unassign them to VMs. Firewalls define inbound/outbound rules with protocol, port range, and IP prefix filtering.`,
  instructions: [
    'When creating or updating, provide rules as an array of rule objects.',
    'Use "assign" or "unassign" to bind/unbind a firewall to a VM.'
  ],
  constraints: [
    'Port range: 1-65535.',
    'Supported protocols: TCP, UDP, ICMP.',
    'Endpoint filter: "any" or specific CIDR IP prefixes.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete', 'assign', 'unassign'])
        .describe('Operation to perform'),
      firewallUuid: z
        .string()
        .optional()
        .describe('Firewall UUID (required for update, delete, assign, unassign)'),
      displayName: z.string().optional().describe('Firewall name (for create/update)'),
      description: z.string().optional().describe('Firewall description (for update)'),
      billingAccountId: z.number().optional().describe('Billing account ID (for create)'),
      rules: z
        .array(firewallRuleSchema)
        .optional()
        .describe('Firewall rules (for create/update)'),
      vmUuid: z.string().optional().describe('VM UUID (required for assign/unassign)')
    })
  )
  .output(
    z.object({
      firewall: firewallSchema.optional().describe('Firewall details'),
      firewalls: z.array(firewallSchema).optional().describe('List of firewalls'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { action } = ctx.input;

    let mapRule = (r: any) => ({
      protocol: r.protocol,
      direction: r.direction,
      portStart: r.port_start,
      portEnd: r.port_end,
      endpointSpecType: r.endpoint_spec_type,
      endpointSpec: r.endpoint_spec
    });

    let mapFirewall = (fw: any) => ({
      firewallUuid: fw.uuid,
      name: fw.name || fw.display_name,
      description: fw.description,
      rules: (fw.rules || []).map(mapRule),
      assignedResources: (fw.resources_assigned || []).map((r: any) => ({
        resourceType: r.resource_type,
        resourceUuid: r.resource_uuid
      })),
      createdAt: fw.created_at
    });

    switch (action) {
      case 'list': {
        let firewalls = await client.listFirewalls();
        let mapped = (Array.isArray(firewalls) ? firewalls : []).map(mapFirewall);
        return {
          output: { firewalls: mapped, success: true },
          message: `Found **${mapped.length}** firewall(s).`
        };
      }

      case 'create': {
        if (!ctx.input.displayName)
          throw new Error('displayName is required for create action');
        let fw = await client.createFirewall({
          displayName: ctx.input.displayName,
          billingAccountId: ctx.input.billingAccountId,
          rules: ctx.input.rules?.map(r => ({
            protocol: r.protocol,
            direction: r.direction,
            portStart: r.portStart,
            portEnd: r.portEnd,
            endpointSpecType: r.endpointSpecType,
            endpointSpec: r.endpointSpec
          }))
        });
        return {
          output: { firewall: mapFirewall(fw), success: true },
          message: `Created firewall **${ctx.input.displayName}**.`
        };
      }

      case 'update': {
        if (!ctx.input.firewallUuid)
          throw new Error('firewallUuid is required for update action');
        let fw = await client.updateFirewall(ctx.input.firewallUuid, {
          name: ctx.input.displayName,
          description: ctx.input.description,
          rules: ctx.input.rules?.map(r => ({
            protocol: r.protocol,
            direction: r.direction,
            portStart: r.portStart,
            portEnd: r.portEnd,
            endpointSpecType: r.endpointSpecType,
            endpointSpec: r.endpointSpec
          }))
        });
        return {
          output: { firewall: mapFirewall(fw), success: true },
          message: `Updated firewall **${ctx.input.firewallUuid}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.firewallUuid)
          throw new Error('firewallUuid is required for delete action');
        await client.deleteFirewall(ctx.input.firewallUuid);
        return {
          output: { success: true },
          message: `Deleted firewall **${ctx.input.firewallUuid}**.`
        };
      }

      case 'assign': {
        if (!ctx.input.firewallUuid || !ctx.input.vmUuid)
          throw new Error('firewallUuid and vmUuid are required for assign action');
        await client.assignFirewallToVm(ctx.input.firewallUuid, ctx.input.vmUuid);
        return {
          output: { success: true },
          message: `Assigned firewall **${ctx.input.firewallUuid}** to VM **${ctx.input.vmUuid}**.`
        };
      }

      case 'unassign': {
        if (!ctx.input.firewallUuid || !ctx.input.vmUuid)
          throw new Error('firewallUuid and vmUuid are required for unassign action');
        await client.unassignFirewallFromVm(ctx.input.firewallUuid, ctx.input.vmUuid);
        return {
          output: { success: true },
          message: `Unassigned firewall **${ctx.input.firewallUuid}** from VM **${ctx.input.vmUuid}**.`
        };
      }
    }
  })
  .build();
