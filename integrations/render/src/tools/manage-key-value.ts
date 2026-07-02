import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageKeyValue = SlateTool.create(spec, {
  name: 'Manage Key Value Store',
  key: 'manage_key_value',
  description: `Manage Render Key Value (Redis-compatible) instances. Perform actions such as **list**, **get**, **create**, **update**, **delete**, **suspend**, **resume**, or retrieve **connection_info**.`
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'suspend',
          'resume',
          'connection_info'
        ])
        .describe('Action to perform'),
      keyValueId: z
        .string()
        .optional()
        .describe('Key Value instance ID (required for all except list/create)'),
      ownerId: z.string().optional().describe('Workspace ID (for list/create)'),
      name: z.string().optional().describe('Instance name (for create/update)'),
      plan: z.string().optional().describe('Instance plan (for create/update)'),
      region: z.string().optional().describe('Region (for create)'),
      maxmemoryPolicy: z
        .string()
        .optional()
        .describe('Max memory eviction policy (for create/update)'),
      limit: z.number().optional().describe('Max results for list'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      instances: z
        .array(
          z.object({
            keyValueId: z.string().describe('Instance ID'),
            name: z.string().describe('Instance name'),
            plan: z.string().optional().describe('Plan'),
            region: z.string().optional().describe('Region'),
            status: z.string().optional().describe('Status'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of instances (for list action)'),
      instance: z
        .object({
          keyValueId: z.string().describe('Instance ID'),
          name: z.string().optional().describe('Instance name'),
          plan: z.string().optional().describe('Plan'),
          region: z.string().optional().describe('Region'),
          status: z.string().optional().describe('Status')
        })
        .optional()
        .describe('Single instance details'),
      connectionInfo: z
        .object({
          internalConnectionString: z.string().optional(),
          externalConnectionString: z.string().optional()
        })
        .optional()
        .describe('Connection info (for connection_info action)'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action, keyValueId } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.ownerId) params.ownerId = [ctx.input.ownerId];
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.cursor) params.cursor = ctx.input.cursor;
      let data = await client.listKeyValue(params);
      let instances = (data as any[]).map((item: any) => {
        let kv = item.keyValue || item;
        return {
          keyValueId: kv.id,
          name: kv.name,
          plan: kv.plan,
          region: kv.region,
          status: kv.status,
          createdAt: kv.createdAt
        };
      });
      return {
        output: { instances, success: true },
        message: `Found **${instances.length}** Key Value instance(s).${instances.map(i => `\n- **${i.name}** (${i.plan || 'N/A'})`).join('')}`
      };
    }

    if (action === 'create') {
      if (!ctx.input.ownerId) throw createApiServiceError('ownerId is required for create');
      let body: Record<string, any> = { ownerId: ctx.input.ownerId };
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.plan) body.plan = ctx.input.plan;
      if (ctx.input.region) body.region = ctx.input.region;
      if (ctx.input.maxmemoryPolicy) body.maxmemoryPolicy = ctx.input.maxmemoryPolicy;
      let kv = await client.createKeyValue(body);
      return {
        output: {
          instance: {
            keyValueId: kv.id,
            name: kv.name,
            plan: kv.plan,
            region: kv.region,
            status: kv.status
          },
          success: true
        },
        message: `Created Key Value instance **${kv.name}** (\`${kv.id}\`).`
      };
    }

    if (!keyValueId) throw createApiServiceError('keyValueId is required');

    if (action === 'get') {
      let kv = await client.getKeyValue(keyValueId);
      return {
        output: {
          instance: {
            keyValueId: kv.id,
            name: kv.name,
            plan: kv.plan,
            region: kv.region,
            status: kv.status
          },
          success: true
        },
        message: `Key Value **${kv.name}** — Plan: ${kv.plan || 'N/A'}, Status: ${kv.status || 'unknown'}.`
      };
    }

    if (action === 'connection_info') {
      let info = await client.getKeyValueConnectionInfo(keyValueId);
      return {
        output: {
          connectionInfo: {
            internalConnectionString: info.internalConnectionString,
            externalConnectionString: info.externalConnectionString
          },
          success: true
        },
        message: `Connection info retrieved for Key Value \`${keyValueId}\`.`
      };
    }

    if (action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.plan) body.plan = ctx.input.plan;
      if (ctx.input.maxmemoryPolicy) body.maxmemoryPolicy = ctx.input.maxmemoryPolicy;
      let kv = await client.updateKeyValue(keyValueId, body);
      return {
        output: {
          instance: { keyValueId: kv.id, name: kv.name, plan: kv.plan },
          success: true
        },
        message: `Updated Key Value **${kv.name}**.`
      };
    }

    let lifecycleActions: Record<string, () => Promise<any>> = {
      delete: () => client.deleteKeyValue(keyValueId!),
      suspend: () => client.suspendKeyValue(keyValueId!),
      resume: () => client.resumeKeyValue(keyValueId!)
    };

    await lifecycleActions[action]!();
    return {
      output: { success: true },
      message: `Successfully performed **${action}** on Key Value \`${keyValueId}\`.`
    };
  })
  .build();
