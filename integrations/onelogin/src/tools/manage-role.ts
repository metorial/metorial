import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let manageRole = SlateTool.create(spec, {
  name: 'Manage Role',
  key: 'manage_role',
  description: `Create, update, or delete a role in OneLogin. Roles control which applications users have access to. When creating, provide a name and optionally associate apps, users, and admins. When updating, provide the role ID and fields to change. When deleting, provide the role ID and set action to "delete".`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      roleId: z.number().optional().describe('Role ID (required for update and delete)'),
      name: z.string().optional().describe('Role name (required for create)'),
      apps: z.array(z.number()).optional().describe('App IDs to associate with the role'),
      users: z.array(z.number()).optional().describe('User IDs to assign to the role'),
      admins: z.array(z.number()).optional().describe('Admin user IDs for the role')
    })
  )
  .output(
    z.object({
      roleId: z.number().optional().describe('Role ID'),
      name: z.string().optional().describe('Role name'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = { name: ctx.input.name };
      if (ctx.input.apps) body.apps = ctx.input.apps;
      if (ctx.input.users) body.users = ctx.input.users;
      if (ctx.input.admins) body.admins = ctx.input.admins;

      let result = await client.createRole(body);
      return {
        output: { roleId: result.id, name: ctx.input.name, success: true },
        message: `Created role **${ctx.input.name}** (ID: ${result.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.roleId) throw new Error('roleId is required for update');
      let body: Record<string, any> = {};
      if (ctx.input.name !== undefined) body.name = ctx.input.name;
      if (ctx.input.apps !== undefined) body.apps = ctx.input.apps;
      if (ctx.input.users !== undefined) body.users = ctx.input.users;
      if (ctx.input.admins !== undefined) body.admins = ctx.input.admins;

      await client.updateRole(ctx.input.roleId, body);
      return {
        output: { roleId: ctx.input.roleId, name: ctx.input.name, success: true },
        message: `Updated role **${ctx.input.roleId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.roleId) throw new Error('roleId is required for delete');
      await client.deleteRole(ctx.input.roleId);
      return {
        output: { roleId: ctx.input.roleId, success: true },
        message: `Deleted role **${ctx.input.roleId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  });
