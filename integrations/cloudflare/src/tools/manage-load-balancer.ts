import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageLoadBalancerTool = SlateTool.create(spec, {
  name: 'Manage Load Balancers',
  key: 'manage_load_balancers',
  description: `List, create, get, or delete load balancers for a zone. Also manage origin pools and health monitors at the account level. Load balancers distribute traffic across origin servers.`,
  instructions: [
    'Create pools first, then reference pool IDs when creating a load balancer.',
    'The fallbackPool is used when all default pools are unhealthy.',
    'Steering policies: off, geo, random, dynamic_latency, proximity, least_outstanding_requests, least_connections.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'delete',
          'list_pools',
          'create_pool',
          'delete_pool',
          'list_monitors',
          'create_monitor'
        ])
        .describe('Operation to perform'),
      zoneId: z.string().optional().describe('Zone ID (for load balancer operations)'),
      accountId: z.string().optional().describe('Account ID (for pool/monitor operations)'),
      loadBalancerId: z.string().optional().describe('Load balancer ID for get/delete'),
      poolId: z.string().optional().describe('Pool ID for delete'),
      name: z.string().optional().describe('Name of the load balancer, pool, or monitor'),
      description: z.string().optional().describe('Description'),
      fallbackPool: z.string().optional().describe('Fallback pool ID'),
      defaultPools: z.array(z.string()).optional().describe('Default pool IDs'),
      proxied: z.boolean().optional().describe('Whether the LB is proxied through Cloudflare'),
      steeringPolicy: z.string().optional().describe('Traffic steering policy'),
      origins: z
        .array(
          z.object({
            name: z.string(),
            address: z.string(),
            enabled: z.boolean().optional(),
            weight: z.number().optional()
          })
        )
        .optional()
        .describe('Origin servers for a pool'),
      monitorType: z.string().optional().describe('Health check type (http, https, tcp)'),
      monitorPath: z.string().optional().describe('Health check path'),
      monitorInterval: z.number().optional().describe('Health check interval in seconds')
    })
  )
  .output(
    z.object({
      loadBalancers: z
        .array(
          z.object({
            loadBalancerId: z.string(),
            name: z.string(),
            description: z.string().optional(),
            enabled: z.boolean().optional()
          })
        )
        .optional(),
      loadBalancer: z
        .object({
          loadBalancerId: z.string(),
          name: z.string()
        })
        .optional(),
      pools: z
        .array(
          z.object({
            poolId: z.string(),
            name: z.string(),
            healthy: z.boolean().optional(),
            enabled: z.boolean().optional()
          })
        )
        .optional(),
      pool: z
        .object({
          poolId: z.string(),
          name: z.string()
        })
        .optional(),
      monitors: z
        .array(
          z.object({
            monitorId: z.string(),
            description: z.string().optional(),
            type: z.string().optional()
          })
        )
        .optional(),
      monitor: z
        .object({
          monitorId: z.string()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action } = ctx.input;
    let accountId = ctx.input.accountId || ctx.config.accountId;

    if (action === 'list') {
      if (!ctx.input.zoneId) throw cloudflareServiceError('zoneId is required');
      let response = await client.listLoadBalancers(ctx.input.zoneId);
      let loadBalancers = response.result.map((lb: any) => ({
        loadBalancerId: lb.id,
        name: lb.name,
        description: lb.description,
        enabled: lb.enabled
      }));
      return {
        output: { loadBalancers },
        message: `Found **${loadBalancers.length}** load balancer(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.zoneId || !ctx.input.loadBalancerId)
        throw cloudflareServiceError('zoneId and loadBalancerId are required');
      let response = await client.getLoadBalancer(ctx.input.zoneId, ctx.input.loadBalancerId);
      let lb = response.result;
      return {
        output: { loadBalancer: { loadBalancerId: lb.id, name: lb.name } },
        message: `Load balancer **${lb.name}**.`
      };
    }

    if (action === 'create') {
      if (
        !ctx.input.zoneId ||
        !ctx.input.name ||
        !ctx.input.fallbackPool ||
        !ctx.input.defaultPools
      ) {
        throw cloudflareServiceError(
          'zoneId, name, fallbackPool, and defaultPools are required'
        );
      }
      let response = await client.createLoadBalancer(ctx.input.zoneId, {
        name: ctx.input.name,
        fallbackPool: ctx.input.fallbackPool,
        defaultPools: ctx.input.defaultPools,
        description: ctx.input.description,
        proxied: ctx.input.proxied,
        steeringPolicy: ctx.input.steeringPolicy
      });
      return {
        output: {
          loadBalancer: { loadBalancerId: response.result.id, name: response.result.name }
        },
        message: `Created load balancer **${response.result.name}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.zoneId || !ctx.input.loadBalancerId)
        throw cloudflareServiceError('zoneId and loadBalancerId are required');
      await client.deleteLoadBalancer(ctx.input.zoneId, ctx.input.loadBalancerId);
      return {
        output: { deleted: true },
        message: `Deleted load balancer \`${ctx.input.loadBalancerId}\`.`
      };
    }

    if (action === 'list_pools') {
      if (!accountId) throw cloudflareServiceError('accountId is required');
      let response = await client.listPools(accountId);
      let pools = response.result.map((p: any) => ({
        poolId: p.id,
        name: p.name,
        healthy: p.healthy,
        enabled: p.enabled
      }));
      return {
        output: { pools },
        message: `Found **${pools.length}** pool(s).`
      };
    }

    if (action === 'create_pool') {
      if (!accountId) throw cloudflareServiceError('accountId is required');
      if (!ctx.input.name || !ctx.input.origins)
        throw cloudflareServiceError('name and origins are required');
      let response = await client.createPool(accountId, {
        name: ctx.input.name,
        origins: ctx.input.origins,
        description: ctx.input.description
      });
      return {
        output: { pool: { poolId: response.result.id, name: response.result.name } },
        message: `Created pool **${response.result.name}** with ${ctx.input.origins.length} origin(s).`
      };
    }

    if (action === 'delete_pool') {
      if (!accountId || !ctx.input.poolId)
        throw cloudflareServiceError('accountId and poolId are required');
      await client.deletePool(accountId, ctx.input.poolId);
      return {
        output: { deleted: true },
        message: `Deleted pool \`${ctx.input.poolId}\`.`
      };
    }

    if (action === 'list_monitors') {
      if (!accountId) throw cloudflareServiceError('accountId is required');
      let response = await client.listMonitors(accountId);
      let monitors = response.result.map((m: any) => ({
        monitorId: m.id,
        description: m.description,
        type: m.type
      }));
      return {
        output: { monitors },
        message: `Found **${monitors.length}** health monitor(s).`
      };
    }

    if (action === 'create_monitor') {
      if (!accountId) throw cloudflareServiceError('accountId is required');
      let response = await client.createMonitor(accountId, {
        type: ctx.input.monitorType,
        description: ctx.input.description,
        path: ctx.input.monitorPath,
        interval: ctx.input.monitorInterval
      });
      return {
        output: { monitor: { monitorId: response.result.id } },
        message: `Created health monitor \`${response.result.id}\`.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
