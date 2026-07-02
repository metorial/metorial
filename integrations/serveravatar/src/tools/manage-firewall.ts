import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let manageFirewall = SlateTool.create(spec, {
  name: 'Manage Firewall',
  key: 'manage_firewall',
  description: `Manage firewall rules on a server: toggle the firewall on/off, list existing rules, create new rules, or delete rules.
Firewall must be enabled before listing or creating rules.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      serverId: z.string().describe('Server ID'),
      action: z.enum(['toggle', 'list', 'create', 'destroy']).describe('Action to perform'),
      firewallRuleId: z
        .string()
        .optional()
        .describe('Firewall rule ID (required for destroy)'),
      startPort: z.number().optional().describe('Port range start, 1-65534 (for create)'),
      endPort: z
        .number()
        .optional()
        .describe('Port range end, 1-65534 (for create, optional)'),
      traffic: z.enum(['allow', 'deny']).optional().describe('Traffic rule (for create)'),
      protocol: z.enum(['all', 'tcp', 'udp']).optional().describe('Protocol (for create)'),
      ip: z.string().optional().describe('Restrict to specific IPv4 address (for create)'),
      ruleDescription: z.string().optional().describe('Rule description (for create)')
    })
  )
  .output(
    z.object({
      rules: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of firewall rules'),
      rule: z.record(z.string(), z.unknown()).optional().describe('Created firewall rule'),
      responseMessage: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let { serverId, action } = ctx.input;

    if (action === 'toggle') {
      let result = await client.toggleFirewall(orgId, serverId);
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Firewall toggled',
          rules: undefined,
          rule: undefined
        },
        message: `Firewall toggled on server **${serverId}**.`
      };
    }

    if (action === 'list') {
      let rules = await client.listFirewallRules(orgId, serverId);
      return {
        output: { rules, responseMessage: undefined, rule: undefined },
        message: `Found **${rules.length}** firewall rule(s) on server **${serverId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.startPort) throw new Error('startPort is required for create action');
      if (!ctx.input.traffic) throw new Error('traffic is required for create action');
      if (!ctx.input.protocol) throw new Error('protocol is required for create action');

      let result = await client.createFirewallRule(orgId, serverId, {
        startPort: ctx.input.startPort,
        traffic: ctx.input.traffic,
        protocol: ctx.input.protocol,
        endPort: ctx.input.endPort,
        ip: ctx.input.ip,
        description: ctx.input.ruleDescription
      });
      return {
        output: {
          rule:
            ((result as Record<string, unknown>).firewallRule as Record<string, unknown>) ||
            result,
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Firewall rule created',
          rules: undefined
        },
        message: `Firewall rule created: ${ctx.input.traffic} ${ctx.input.protocol} on port ${ctx.input.startPort}${ctx.input.endPort ? `-${ctx.input.endPort}` : ''}.`
      };
    }

    if (action === 'destroy') {
      if (!ctx.input.firewallRuleId)
        throw new Error('firewallRuleId is required for destroy action');

      let result = await client.destroyFirewallRule(orgId, serverId, ctx.input.firewallRuleId);
      return {
        output: {
          responseMessage:
            ((result as Record<string, unknown>).message as string) || 'Firewall rule deleted',
          rules: undefined,
          rule: undefined
        },
        message: `Firewall rule **${ctx.input.firewallRuleId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
