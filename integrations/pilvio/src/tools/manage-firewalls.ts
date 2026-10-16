import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let firewallRuleSchema = z.object({
  ruleUuid: z.string().optional().describe('Existing rule UUID when updating a rule'),
  endpointPrefixes: z
    .array(z.string())
    .optional()
    .describe(
      'IP addresses or CIDR ranges for ip_prefixes rules; use this for multiple prefixes'
    ),
  protocol: z.enum(['TCP', 'UDP', 'ICMP']).describe('Protocol'),
  direction: z.enum(['inbound', 'outbound']).describe('Traffic direction'),
  portStart: z.number().optional().describe('Start port (1-65535)'),
  portEnd: z.number().optional().describe('End port (1-65535)'),
  endpointSpecType: z.enum(['any', 'ip_prefixes']).describe('Endpoint filter type'),
  endpointSpec: z
    .string()
    .optional()
    .describe(
      'IP address, CIDR prefix, or JSON array of prefixes (when endpointSpecType is "ip_prefixes"). Prefer endpointPrefixes for multiple prefixes.'
    )
});

let firewallSchema = z.object({
  raw: z.unknown().optional().describe('Complete provider firewall response'),
  firewallUuid: z.string().describe('Firewall UUID'),
  name: z.string().optional().describe('Firewall name'),
  description: z.string().optional().describe('Firewall description'),
  rules: z
    .array(
      firewallRuleSchema.extend({
        raw: z.unknown().optional().describe('Complete provider rule response')
      })
    )
    .optional()
    .describe('Firewall rules'),
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
      billingAccountId: z
        .number()
        .optional()
        .describe(
          'Call list_billing_accounts to discover billing account IDs. Billing account ID (for create)'
        ),
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

    let mapRule = (r: any) => {
      if (typeof r.protocol !== 'string')
        throw createApiServiceError('Pilvio returned a firewall rule without a protocol.');
      return {
        protocol: r.protocol.toUpperCase(),
        direction: r.direction,
        raw: r,
        ruleUuid: r.uuid ?? undefined,
        portStart: r.port_start ?? undefined,
        portEnd: r.port_end ?? undefined,
        endpointSpecType: r.endpoint_spec_type,
        endpointSpec: Array.isArray(r.endpoint_spec)
          ? r.endpoint_spec.length === 1
            ? r.endpoint_spec[0]
            : JSON.stringify(r.endpoint_spec)
          : (r.endpoint_spec ?? undefined),
        endpointPrefixes: Array.isArray(r.endpoint_spec) ? r.endpoint_spec : undefined
      };
    };

    let mapFirewall = (fw: any) => ({
      raw: fw,
      firewallUuid: fw.uuid,
      name: fw.name ?? fw.display_name ?? undefined,
      description: fw.description ?? undefined,
      rules: (fw.rules || []).map(mapRule),
      assignedResources: (fw.resources_assigned || []).map((r: any) => ({
        resourceType: r.resource_type,
        resourceUuid: r.resource_uuid
      })),
      createdAt: fw.created_at ?? undefined
    });

    switch (action) {
      case 'list': {
        let firewalls = await client.listFirewalls();
        let mapped = firewalls.map(mapFirewall);
        return {
          output: { firewalls: mapped, success: true },
          message: `Found **${mapped.length}** firewall(s).`
        };
      }

      case 'create': {
        if (!ctx.input.displayName)
          throw createApiServiceError('displayName is required for create action');
        let fw = await client.createFirewall({
          displayName: ctx.input.displayName,
          billingAccountId: ctx.input.billingAccountId,
          rules: ctx.input.rules?.map(r => ({
            protocol: r.protocol,
            direction: r.direction,
            portStart: r.portStart,
            portEnd: r.portEnd,
            endpointSpecType: r.endpointSpecType,
            endpointPrefixes: r.endpointPrefixes,
            ruleUuid: r.ruleUuid,
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
          throw createApiServiceError('firewallUuid is required for update action');
        let fw = await client.updateFirewall(ctx.input.firewallUuid, {
          name: ctx.input.displayName,
          description: ctx.input.description,
          rules: ctx.input.rules?.map(r => ({
            protocol: r.protocol,
            direction: r.direction,
            portStart: r.portStart,
            portEnd: r.portEnd,
            endpointSpecType: r.endpointSpecType,
            endpointPrefixes: r.endpointPrefixes,
            ruleUuid: r.ruleUuid,
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
          throw createApiServiceError('firewallUuid is required for delete action');
        await client.deleteFirewall(ctx.input.firewallUuid);
        return {
          output: { success: true },
          message: `Deleted firewall **${ctx.input.firewallUuid}**.`
        };
      }

      case 'assign': {
        if (!ctx.input.firewallUuid || !ctx.input.vmUuid)
          throw createApiServiceError(
            'firewallUuid and vmUuid are required for assign action'
          );
        await client.assignFirewallToVm(ctx.input.firewallUuid, ctx.input.vmUuid);
        return {
          output: { success: true },
          message: `Assigned firewall **${ctx.input.firewallUuid}** to VM **${ctx.input.vmUuid}**.`
        };
      }

      case 'unassign': {
        if (!ctx.input.firewallUuid || !ctx.input.vmUuid)
          throw createApiServiceError(
            'firewallUuid and vmUuid are required for unassign action'
          );
        await client.unassignFirewallFromVm(ctx.input.firewallUuid, ctx.input.vmUuid);
        return {
          output: { success: true },
          message: `Unassigned firewall **${ctx.input.firewallUuid}** from VM **${ctx.input.vmUuid}**.`
        };
      }
    }
  })
  .build();
