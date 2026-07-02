import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let manageRolesTool = SlateTool.create(spec, {
  name: 'Manage Roles',
  key: 'manage_roles',
  description: `Create, update, delete, or list roles. Roles define sets of permissions that can be assigned to users for role-based access control (RBAC).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      roleId: z.string().optional().describe('Role ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Role name (required for create, optional for update)'),
      description: z.string().optional().describe('Role description'),
      nameFilter: z.string().optional().describe('Filter roles by name (for list action)'),
      page: z.number().optional().describe('Page number (for list action)'),
      perPage: z.number().optional().describe('Results per page (for list action)')
    })
  )
  .output(
    z.object({
      role: z
        .object({
          roleId: z.string(),
          name: z.string(),
          description: z.string().optional()
        })
        .optional()
        .describe('Role details (for get, create, update)'),
      roles: z
        .array(
          z.object({
            roleId: z.string(),
            name: z.string(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('List of roles (for list action)'),
      deleted: z.boolean().optional().describe('Whether role was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let mapRole = (r: any) => ({
      roleId: r.id,
      name: r.name,
      description: r.description
    });

    if (ctx.input.action === 'list') {
      let result = await client.listRoles({
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        nameFilter: ctx.input.nameFilter
      });
      let roles = (Array.isArray(result) ? result : (result.roles ?? [])).map(mapRole);
      return {
        output: { roles },
        message: `Found **${roles.length}** role(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.roleId) throw new Error('roleId is required for get action');
      let role = await client.getRole(ctx.input.roleId);
      return {
        output: { role: mapRole(role) },
        message: `Retrieved role **${role.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let role = await client.createRole({
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: { role: mapRole(role) },
        message: `Created role **${role.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.roleId) throw new Error('roleId is required for update action');
      let role = await client.updateRole(ctx.input.roleId, {
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: { role: mapRole(role) },
        message: `Updated role **${role.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.roleId) throw new Error('roleId is required for delete action');
      await client.deleteRole(ctx.input.roleId);
      return {
        output: { deleted: true },
        message: `Deleted role **${ctx.input.roleId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
