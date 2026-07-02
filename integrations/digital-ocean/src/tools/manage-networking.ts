import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

export let listLoadBalancers = SlateTool.create(spec, {
  name: 'List Load Balancers',
  key: 'list_load_balancers',
  description: `List all load balancers in your DigitalOcean account. Returns configuration, health status, forwarding rules, and associated Droplets.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      loadBalancers: z.array(
        z.object({
          loadBalancerId: z.string().describe('Load balancer ID'),
          name: z.string().describe('Load balancer name'),
          ip: z.string().optional().describe('Load balancer IP address'),
          status: z.string().describe('Status (new, active, errored)'),
          region: z.string().describe('Region slug'),
          dropletIds: z.array(z.number()).describe('Backend Droplet IDs'),
          algorithm: z.string().optional().describe('Balancing algorithm'),
          createdAt: z.string().describe('Creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let lbs = await client.listLoadBalancers();

    return {
      output: {
        loadBalancers: lbs.map((lb: any) => ({
          loadBalancerId: lb.id,
          name: lb.name,
          ip: lb.ip,
          status: lb.status,
          region: lb.region?.slug || '',
          dropletIds: lb.droplet_ids || [],
          algorithm: lb.algorithm,
          createdAt: lb.created_at
        }))
      },
      message: `Found **${lbs.length}** load balancer(s).`
    };
  })
  .build();

export let manageFirewall = SlateTool.create(spec, {
  name: 'Manage Firewall',
  key: 'manage_firewall',
  description: `List, create, or delete cloud firewalls. Firewalls define inbound and outbound traffic rules applied to Droplets by ID or tag.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      firewallId: z.string().optional().describe('Firewall ID (required for delete)'),
      name: z.string().optional().describe('Firewall name (required for create)'),
      inboundRules: z
        .array(
          z.object({
            protocol: z.string().describe('Protocol: tcp, udp, icmp'),
            ports: z.string().describe('Port or range (e.g., "80", "8000-9000", "all")'),
            sourceAddresses: z
              .array(z.string())
              .optional()
              .describe('Allowed source CIDR addresses'),
            sourceDropletIds: z
              .array(z.number())
              .optional()
              .describe('Allowed source Droplet IDs'),
            sourceTags: z.array(z.string()).optional().describe('Allowed source tags')
          })
        )
        .optional()
        .describe('Inbound rules (for create)'),
      outboundRules: z
        .array(
          z.object({
            protocol: z.string().describe('Protocol: tcp, udp, icmp'),
            ports: z.string().describe('Port or range'),
            destinationAddresses: z
              .array(z.string())
              .optional()
              .describe('Allowed destination CIDR addresses'),
            destinationDropletIds: z
              .array(z.number())
              .optional()
              .describe('Allowed destination Droplet IDs'),
            destinationTags: z
              .array(z.string())
              .optional()
              .describe('Allowed destination tags')
          })
        )
        .optional()
        .describe('Outbound rules (for create)'),
      dropletIds: z.array(z.number()).optional().describe('Droplet IDs to apply firewall to'),
      tags: z.array(z.string()).optional().describe('Tags to apply firewall to')
    })
  )
  .output(
    z.object({
      firewalls: z
        .array(
          z.object({
            firewallId: z.string().describe('Firewall ID'),
            name: z.string().describe('Firewall name'),
            status: z.string().describe('Firewall status'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of firewalls'),
      firewall: z
        .object({
          firewallId: z.string().describe('Firewall ID'),
          name: z.string().describe('Firewall name'),
          status: z.string().describe('Firewall status'),
          createdAt: z.string().describe('Creation timestamp')
        })
        .optional()
        .describe('Created firewall'),
      deleted: z.boolean().optional().describe('Whether the firewall was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let firewalls = await client.listFirewalls();
      return {
        output: {
          firewalls: firewalls.map((f: any) => ({
            firewallId: f.id,
            name: f.name,
            status: f.status,
            createdAt: f.created_at
          }))
        },
        message: `Found **${firewalls.length}** firewall(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw digitalOceanValidationError('name is required for create action');
      }

      let firewall = await client.createFirewall({
        name: ctx.input.name,
        inboundRules: ctx.input.inboundRules?.map(r => ({
          protocol: r.protocol,
          ports: r.ports,
          sources: {
            addresses: r.sourceAddresses,
            dropletIds: r.sourceDropletIds,
            tags: r.sourceTags
          }
        })),
        outboundRules: ctx.input.outboundRules?.map(r => ({
          protocol: r.protocol,
          ports: r.ports,
          destinations: {
            addresses: r.destinationAddresses,
            dropletIds: r.destinationDropletIds,
            tags: r.destinationTags
          }
        })),
        dropletIds: ctx.input.dropletIds,
        tags: ctx.input.tags
      });

      return {
        output: {
          firewall: {
            firewallId: firewall.id,
            name: firewall.name,
            status: firewall.status,
            createdAt: firewall.created_at
          }
        },
        message: `Created firewall **${firewall.name}** (ID: ${firewall.id}).`
      };
    }

    // delete
    if (!ctx.input.firewallId) {
      throw digitalOceanValidationError('firewallId is required for delete action');
    }
    await client.deleteFirewall(ctx.input.firewallId);

    return {
      output: { deleted: true },
      message: `Deleted firewall **${ctx.input.firewallId}**.`
    };
  })
  .build();

export let manageVPC = SlateTool.create(spec, {
  name: 'Manage VPCs',
  key: 'manage_vpcs',
  description: `List, create, update, or delete Virtual Private Clouds (VPCs). VPCs provide network isolation for Droplets and other resources.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      vpcId: z.string().optional().describe('VPC ID (required for update/delete)'),
      name: z
        .string()
        .optional()
        .describe('VPC name (required for create, optional for update)'),
      region: z.string().optional().describe('Region slug (required for create)'),
      description: z.string().optional().describe('VPC description'),
      ipRange: z
        .string()
        .optional()
        .describe('IP range in CIDR notation (e.g., "10.10.10.0/24")')
    })
  )
  .output(
    z.object({
      vpcs: z
        .array(
          z.object({
            vpcId: z.string().describe('VPC ID'),
            name: z.string().describe('VPC name'),
            region: z.string().describe('Region slug'),
            description: z.string().optional().describe('Description'),
            ipRange: z.string().describe('IP range'),
            isDefault: z.boolean().describe('Whether this is the default VPC'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of VPCs'),
      vpc: z
        .object({
          vpcId: z.string().describe('VPC ID'),
          name: z.string().describe('VPC name'),
          region: z.string().describe('Region slug'),
          description: z.string().optional().describe('Description'),
          ipRange: z.string().describe('IP range'),
          isDefault: z.boolean().describe('Whether this is the default VPC'),
          createdAt: z.string().describe('Creation timestamp')
        })
        .optional()
        .describe('Created/updated VPC'),
      deleted: z.boolean().optional().describe('Whether the VPC was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapVpc = (v: any) => ({
      vpcId: v.id,
      name: v.name,
      region: v.region,
      description: v.description,
      ipRange: v.ip_range,
      isDefault: v.default,
      createdAt: v.created_at
    });

    if (ctx.input.action === 'list') {
      let vpcs = await client.listVPCs();
      return {
        output: { vpcs: vpcs.map(mapVpc) },
        message: `Found **${vpcs.length}** VPC(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.region) {
        throw digitalOceanValidationError('name and region are required for create action');
      }
      let vpc = await client.createVPC({
        name: ctx.input.name,
        region: ctx.input.region,
        description: ctx.input.description,
        ipRange: ctx.input.ipRange
      });
      return {
        output: { vpc: mapVpc(vpc) },
        message: `Created VPC **${vpc.name}** in **${vpc.region}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.vpcId) {
        throw digitalOceanValidationError('vpcId is required for update action');
      }
      let vpc = await client.updateVPC(ctx.input.vpcId, {
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: { vpc: mapVpc(vpc) },
        message: `Updated VPC **${ctx.input.vpcId}**.`
      };
    }

    // delete
    if (!ctx.input.vpcId) {
      throw digitalOceanValidationError('vpcId is required for delete action');
    }
    await client.deleteVPC(ctx.input.vpcId);

    return {
      output: { deleted: true },
      message: `Deleted VPC **${ctx.input.vpcId}**.`
    };
  })
  .build();

export let manageReservedIPs = SlateTool.create(spec, {
  name: 'Manage Reserved IPs',
  key: 'manage_reserved_ips',
  description: `List, create, assign, unassign, or delete reserved (static) IP addresses. Reserved IPs persist across Droplet destruction and can be reassigned.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'assign', 'unassign', 'delete'])
        .describe('Action to perform'),
      reservedIp: z
        .string()
        .optional()
        .describe('Reserved IP address (for assign/unassign/delete)'),
      dropletId: z
        .number()
        .optional()
        .describe('Droplet ID (for create with Droplet or assign)'),
      region: z.string().optional().describe('Region slug (for create without Droplet)'),
      projectId: z.string().optional().describe('Project UUID for a region-reserved IP')
    })
  )
  .output(
    z.object({
      reservedIps: z
        .array(
          z.object({
            ip: z.string().describe('IP address'),
            region: z.string().describe('Region slug'),
            dropletId: z.number().optional().describe('Assigned Droplet ID')
          })
        )
        .optional()
        .describe('List of reserved IPs'),
      reservedIp: z
        .object({
          ip: z.string().describe('IP address'),
          region: z.string().describe('Region slug'),
          dropletId: z.number().optional().describe('Assigned Droplet ID')
        })
        .optional()
        .describe('Created/updated reserved IP'),
      deleted: z.boolean().optional().describe('Whether the IP was deleted'),
      actionId: z.number().optional().describe('Action ID for assign/unassign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapIp = (ip: any) => ({
      ip: ip.ip,
      region: ip.region?.slug || '',
      dropletId: ip.droplet?.id
    });

    if (ctx.input.action === 'list') {
      let ips = await client.listReservedIPs();
      return {
        output: { reservedIps: ips.map(mapIp) },
        message: `Found **${ips.length}** reserved IP(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.region && !ctx.input.dropletId) {
        throw digitalOceanValidationError('region or dropletId is required for create action');
      }

      let ip = await client.createReservedIP({
        region: ctx.input.region,
        dropletId: ctx.input.dropletId,
        projectId: ctx.input.projectId
      });
      return {
        output: { reservedIp: mapIp(ip) },
        message: `Created reserved IP **${ip.ip}**${ctx.input.dropletId ? ` assigned to Droplet ${ctx.input.dropletId}` : ''}.`
      };
    }

    if (ctx.input.action === 'assign') {
      if (!ctx.input.reservedIp || !ctx.input.dropletId) {
        throw digitalOceanValidationError(
          'reservedIp and dropletId are required for assign action'
        );
      }
      let action = await client.assignReservedIP(ctx.input.reservedIp, ctx.input.dropletId);
      return {
        output: { actionId: action.id },
        message: `Assigned **${ctx.input.reservedIp}** to Droplet **${ctx.input.dropletId}**.`
      };
    }

    if (ctx.input.action === 'unassign') {
      if (!ctx.input.reservedIp) {
        throw digitalOceanValidationError('reservedIp is required for unassign action');
      }
      let action = await client.unassignReservedIP(ctx.input.reservedIp);
      return {
        output: { actionId: action.id },
        message: `Unassigned reserved IP **${ctx.input.reservedIp}**.`
      };
    }

    // delete
    if (!ctx.input.reservedIp) {
      throw digitalOceanValidationError('reservedIp is required for delete action');
    }
    await client.deleteReservedIP(ctx.input.reservedIp);

    return {
      output: { deleted: true },
      message: `Deleted reserved IP **${ctx.input.reservedIp}**.`
    };
  })
  .build();
