import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let forwardingRuleSchema = z.object({
  sourcePort: z.number().describe('Source port'),
  targetPort: z.number().describe('Target port'),
  ruleId: z.string().optional().describe('Rule ID')
});

let lbSchema = z.object({
  lbUuid: z.string().describe('Load balancer UUID'),
  name: z.string().optional().describe('Load balancer name'),
  privateAddress: z.string().optional().describe('Private IP address'),
  publicAddress: z.string().optional().describe('Public IP address'),
  networkUuid: z.string().optional().describe('Network UUID'),
  forwardingRules: z.array(forwardingRuleSchema).optional().describe('Forwarding rules'),
  targets: z
    .array(
      z.object({
        vmUuid: z.string().describe('Target VM UUID'),
        privateIp: z.string().optional().describe('Target VM private IP')
      })
    )
    .optional()
    .describe('Target VMs'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let manageLoadBalancers = SlateTool.create(spec, {
  name: 'Manage Load Balancers',
  key: 'manage_load_balancers',
  description: `Create, list, get, rename, delete layer-4 (TCP) network load balancers. Add/remove forwarding rules and VM targets. Load balancers distribute traffic across VMs within a private network.`,
  instructions: [
    'Use "create" with a networkUuid, forwarding rules, and optional target VMs.',
    'Use "add_target" / "remove_target" to manage backend VMs.',
    'Use "add_rule" / "remove_rule" to manage port forwarding rules.'
  ],
  constraints: [
    'Load balancers operate at layer 4 (TCP).',
    'Supports session persistence (source IP) and connection limits.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'rename',
          'delete',
          'add_target',
          'remove_target',
          'add_rule',
          'remove_rule'
        ])
        .describe('Operation to perform'),
      lbUuid: z.string().optional().describe('Load balancer UUID'),
      name: z.string().optional().describe('LB name (for create/rename)'),
      networkUuid: z.string().optional().describe('Private network UUID (for create)'),
      billingAccountId: z.number().optional().describe('Billing account ID (for create)'),
      reservePublicIp: z
        .boolean()
        .optional()
        .describe('Reserve a public IP for the LB (for create)'),
      sessionPersistence: z
        .boolean()
        .optional()
        .describe('Enable session persistence (for create)'),
      connectionLimit: z.number().optional().describe('Connection limit (for create)'),
      forwardingRules: z
        .array(
          z.object({
            sourcePort: z.number().describe('Source port'),
            targetPort: z.number().describe('Target port')
          })
        )
        .optional()
        .describe('Initial forwarding rules (for create)'),
      targetVmUuids: z
        .array(z.string())
        .optional()
        .describe('Initial target VM UUIDs (for create)'),
      vmUuid: z.string().optional().describe('VM UUID (for add_target/remove_target)'),
      sourcePort: z.number().optional().describe('Source port (for add_rule)'),
      targetPort: z.number().optional().describe('Target port (for add_rule)'),
      ruleId: z.string().optional().describe('Rule ID (for remove_rule)')
    })
  )
  .output(
    z.object({
      loadBalancer: lbSchema.optional().describe('Load balancer details'),
      loadBalancers: z.array(lbSchema).optional().describe('List of load balancers'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { action } = ctx.input;

    let mapLb = (lb: any) => ({
      lbUuid: lb.uuid,
      name: lb.name,
      privateAddress: lb.private_address,
      publicAddress: lb.public_address || lb.public_ipv4,
      networkUuid: lb.network_uuid,
      forwardingRules: (lb.forwarding_rules || []).map((r: any) => ({
        sourcePort: r.source_port,
        targetPort: r.target_port,
        ruleId: r.id || r.rule_id
      })),
      targets: (lb.targets || []).map((t: any) => ({
        vmUuid: t.vm_uuid || t.uuid,
        privateIp: t.private_ip || t.private_ipv4
      })),
      createdAt: lb.created_at
    });

    switch (action) {
      case 'list': {
        let lbs = await client.listLoadBalancers();
        let mapped = (Array.isArray(lbs) ? lbs : []).map(mapLb);
        return {
          output: { loadBalancers: mapped, success: true },
          message: `Found **${mapped.length}** load balancer(s).`
        };
      }

      case 'get': {
        if (!ctx.input.lbUuid) throw new Error('lbUuid is required for get action');
        let lb = await client.getLoadBalancer(ctx.input.lbUuid);
        return {
          output: { loadBalancer: mapLb(lb), success: true },
          message: `Load balancer **${lb.name || lb.uuid}** with ${(lb.targets || []).length} target(s).`
        };
      }

      case 'create': {
        if (!ctx.input.name || !ctx.input.networkUuid)
          throw new Error('name and networkUuid are required for create action');
        let lb = await client.createLoadBalancer({
          name: ctx.input.name,
          networkUuid: ctx.input.networkUuid,
          billingAccountId: ctx.input.billingAccountId,
          reservePublicIp: ctx.input.reservePublicIp,
          sessionPersistence: ctx.input.sessionPersistence,
          connectionLimit: ctx.input.connectionLimit,
          forwardingRules: ctx.input.forwardingRules,
          targetVmUuids: ctx.input.targetVmUuids
        });
        return {
          output: { loadBalancer: mapLb(lb), success: true },
          message: `Created load balancer **${ctx.input.name}**.`
        };
      }

      case 'rename': {
        if (!ctx.input.lbUuid || !ctx.input.name)
          throw new Error('lbUuid and name are required for rename action');
        let lb = await client.renameLoadBalancer(ctx.input.lbUuid, ctx.input.name);
        return {
          output: { loadBalancer: mapLb(lb), success: true },
          message: `Renamed load balancer **${ctx.input.lbUuid}** to **${ctx.input.name}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.lbUuid) throw new Error('lbUuid is required for delete action');
        await client.deleteLoadBalancer(ctx.input.lbUuid);
        return {
          output: { success: true },
          message: `Deleted load balancer **${ctx.input.lbUuid}**.`
        };
      }

      case 'add_target': {
        if (!ctx.input.lbUuid || !ctx.input.vmUuid)
          throw new Error('lbUuid and vmUuid are required for add_target action');
        await client.addLoadBalancerTarget(ctx.input.lbUuid, ctx.input.vmUuid);
        return {
          output: { success: true },
          message: `Added VM **${ctx.input.vmUuid}** as target to LB **${ctx.input.lbUuid}**.`
        };
      }

      case 'remove_target': {
        if (!ctx.input.lbUuid || !ctx.input.vmUuid)
          throw new Error('lbUuid and vmUuid are required for remove_target action');
        await client.removeLoadBalancerTarget(ctx.input.lbUuid, ctx.input.vmUuid);
        return {
          output: { success: true },
          message: `Removed VM **${ctx.input.vmUuid}** from LB **${ctx.input.lbUuid}**.`
        };
      }

      case 'add_rule': {
        if (
          !ctx.input.lbUuid ||
          ctx.input.sourcePort === undefined ||
          ctx.input.targetPort === undefined
        ) {
          throw new Error(
            'lbUuid, sourcePort, and targetPort are required for add_rule action'
          );
        }
        await client.addLoadBalancerRule(
          ctx.input.lbUuid,
          ctx.input.sourcePort,
          ctx.input.targetPort
        );
        return {
          output: { success: true },
          message: `Added forwarding rule ${ctx.input.sourcePort} → ${ctx.input.targetPort} to LB **${ctx.input.lbUuid}**.`
        };
      }

      case 'remove_rule': {
        if (!ctx.input.lbUuid || !ctx.input.ruleId)
          throw new Error('lbUuid and ruleId are required for remove_rule action');
        await client.removeLoadBalancerRule(ctx.input.lbUuid, ctx.input.ruleId);
        return {
          output: { success: true },
          message: `Removed forwarding rule **${ctx.input.ruleId}** from LB **${ctx.input.lbUuid}**.`
        };
      }
    }
  })
  .build();
