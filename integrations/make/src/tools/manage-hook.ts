import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let manageHook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_hook',
  description: `Get details, create, rename, enable, disable, ping, or delete a webhook (hook). Use "ping" to check if the hook endpoint is responsive. Use "enable"/"disable" to control whether the hook accepts incoming data.`,
  instructions: [
    'For "create", provide teamId, name, and typeName (e.g. "gateway-webhook").',
    'For "rename", provide hookId and name.',
    '"ping" checks if the hook is active and operational.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'rename', 'enable', 'disable', 'ping', 'delete'])
        .describe('Action to perform'),
      hookId: z
        .number()
        .optional()
        .describe('Hook ID (required for get, rename, enable, disable, ping, delete)'),
      teamId: z.number().optional().describe('Team ID (required for create)'),
      name: z.string().optional().describe('Hook name (required for create and rename)'),
      typeName: z
        .string()
        .optional()
        .describe(
          'Hook type, e.g. "gateway-webhook" or "gateway-mailhook" (required for create)'
        )
    })
  )
  .output(
    z.object({
      hookId: z.number().optional().describe('Hook ID'),
      name: z.string().optional().describe('Hook name'),
      url: z.string().optional().describe('Hook URL'),
      typeName: z.string().optional().describe('Hook type'),
      enabled: z.boolean().optional().describe('Whether the hook is enabled'),
      alive: z.boolean().optional().describe('Whether the hook responded to ping'),
      deleted: z.boolean().optional().describe('Whether the hook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.hookId) throw new Error('hookId is required for get action');
      let result = await client.getHook(ctx.input.hookId);
      let h = result.hook ?? result;
      return {
        output: {
          hookId: h.id,
          name: h.name,
          url: h.url,
          typeName: h.typeName,
          enabled: h.enabled
        },
        message: `Webhook **${h.name}** (ID: ${h.id}) — ${h.enabled ? 'Enabled' : 'Disabled'}.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.teamId) throw new Error('teamId is required for create action');
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (!ctx.input.typeName) throw new Error('typeName is required for create action');

      let result = await client.createHook({
        name: ctx.input.name,
        teamId: ctx.input.teamId,
        typeName: ctx.input.typeName
      });
      let h = result.hook ?? result;
      return {
        output: {
          hookId: h.id,
          name: h.name,
          url: h.url,
          typeName: h.typeName,
          enabled: h.enabled
        },
        message: `Created webhook **${h.name}** (ID: ${h.id}).`
      };
    }

    if (action === 'rename') {
      if (!ctx.input.hookId) throw new Error('hookId is required for rename action');
      if (!ctx.input.name) throw new Error('name is required for rename action');
      let result = await client.updateHook(ctx.input.hookId, { name: ctx.input.name });
      let h = result.hook ?? result;
      return {
        output: {
          hookId: h.id ?? ctx.input.hookId,
          name: h.name ?? ctx.input.name
        },
        message: `Webhook ${ctx.input.hookId} renamed to **${ctx.input.name}**.`
      };
    }

    if (action === 'enable') {
      if (!ctx.input.hookId) throw new Error('hookId is required for enable action');
      await client.enableHook(ctx.input.hookId);
      return {
        output: {
          hookId: ctx.input.hookId,
          enabled: true
        },
        message: `Webhook ${ctx.input.hookId} **enabled**.`
      };
    }

    if (action === 'disable') {
      if (!ctx.input.hookId) throw new Error('hookId is required for disable action');
      await client.disableHook(ctx.input.hookId);
      return {
        output: {
          hookId: ctx.input.hookId,
          enabled: false
        },
        message: `Webhook ${ctx.input.hookId} **disabled**.`
      };
    }

    if (action === 'ping') {
      if (!ctx.input.hookId) throw new Error('hookId is required for ping action');
      let result = await client.pingHook(ctx.input.hookId);
      return {
        output: {
          hookId: ctx.input.hookId,
          alive: Boolean(result)
        },
        message: `Webhook ${ctx.input.hookId} ping: **${result ? 'Alive' : 'Unresponsive'}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.hookId) throw new Error('hookId is required for delete action');
      await client.deleteHook(ctx.input.hookId);
      return {
        output: {
          hookId: ctx.input.hookId,
          deleted: true
        },
        message: `Webhook ${ctx.input.hookId} **deleted**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
