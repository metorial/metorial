import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRole = SlateTool.create(spec, {
  name: 'Manage Role',
  key: 'manage_role',
  description: `Create, update, or delete a role with specific permission sets. Roles control access to features and resources within Klipfolio.`,
  instructions: [
    'Use action "create" to define a new role, "update" to modify, "delete" to remove, or "get" to retrieve details.',
    'Permissions follow the format "category.action" (e.g., "dashboard.library", "klip.build", "user.manage").'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'get']).describe('Operation to perform'),
      roleId: z.string().optional().describe('Role ID (required for update, delete, get)'),
      name: z.string().optional().describe('Role name (required for create)'),
      description: z.string().optional().describe('Role description'),
      permissions: z
        .array(z.string())
        .optional()
        .describe('Permission strings to assign to the role')
    })
  )
  .output(
    z.object({
      roleId: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      permissions: z.array(z.string()).optional(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'get') {
      if (!ctx.input.roleId) throw new Error('roleId is required');
      let role = await client.getRole(ctx.input.roleId, true);
      let permissions = await client.getRolePermissions(ctx.input.roleId);

      return {
        output: {
          roleId: role?.id,
          name: role?.name,
          description: role?.description,
          permissions: permissions
            ? Array.isArray(permissions)
              ? permissions
              : undefined
            : undefined,
          success: true
        },
        message: `Retrieved role **${role?.name || ctx.input.roleId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required when creating a role');

      let result = await client.createRole({
        name: ctx.input.name,
        description: ctx.input.description,
        permissions: ctx.input.permissions
      });

      let location = result?.meta?.location;
      let roleId = location ? location.split('/').pop() : undefined;

      return {
        output: {
          roleId,
          name: ctx.input.name,
          description: ctx.input.description,
          permissions: ctx.input.permissions,
          success: true
        },
        message: `Created role **${ctx.input.name}**${roleId ? ` with ID \`${roleId}\`` : ''}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.roleId) throw new Error('roleId is required when updating');

      await client.updateRole(ctx.input.roleId, {
        name: ctx.input.name,
        description: ctx.input.description,
        permissions: ctx.input.permissions
      });

      return {
        output: {
          roleId: ctx.input.roleId,
          name: ctx.input.name,
          description: ctx.input.description,
          permissions: ctx.input.permissions,
          success: true
        },
        message: `Updated role \`${ctx.input.roleId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.roleId) throw new Error('roleId is required when deleting');
      await client.deleteRole(ctx.input.roleId);

      return {
        output: { roleId: ctx.input.roleId, success: true },
        message: `Deleted role \`${ctx.input.roleId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
