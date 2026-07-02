import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let manageRoles = SlateTool.create(spec, {
  name: 'Manage Roles',
  key: 'manage_roles',
  description: `List, get, create, update, or delete roles in the AppVeyor account. Roles define permission sets for users and collaborators. Every account has built-in "Administrator" and "User" roles. Custom roles can be created with granular permissions.`,
  instructions: [
    'For **list**: no additional parameters needed.',
    'For **get**: provide roleId.',
    'For **create**: provide roleName.',
    'For **update**: provide the full role object in roleSettings (including roleId and permissions).',
    'For **delete**: provide roleId. Built-in roles cannot be deleted.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      roleId: z.number().optional().describe('Role ID (required for get, delete)'),
      roleName: z.string().optional().describe('Role name (required for create)'),
      roleSettings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full role settings for update, including permission groups')
    })
  )
  .output(
    z.object({
      roles: z.array(z.record(z.string(), z.unknown())).optional().describe('List of roles'),
      role: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Role details with permissions'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    switch (ctx.input.action) {
      case 'list': {
        let roles = await client.listRoles();
        return {
          output: { roles, success: true },
          message: `Found **${roles.length}** role(s).`
        };
      }

      case 'get': {
        if (ctx.input.roleId === undefined) {
          throw new Error('roleId is required for get');
        }
        let role = await client.getRole(ctx.input.roleId);
        return {
          output: { role, success: true },
          message: `Retrieved role **${ctx.input.roleId}**.`
        };
      }

      case 'create': {
        if (!ctx.input.roleName) {
          throw new Error('roleName is required for create');
        }
        let role = await client.createRole({ name: ctx.input.roleName });
        return {
          output: { role, success: true },
          message: `Created role **${ctx.input.roleName}**.`
        };
      }

      case 'update': {
        if (!ctx.input.roleSettings) {
          throw new Error('roleSettings is required for update');
        }
        let role = await client.updateRole(ctx.input.roleSettings);
        return {
          output: { role, success: true },
          message: `Updated role settings.`
        };
      }

      case 'delete': {
        if (ctx.input.roleId === undefined) {
          throw new Error('roleId is required for delete');
        }
        await client.deleteRole(ctx.input.roleId);
        return {
          output: { success: true },
          message: `Deleted role **${ctx.input.roleId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
