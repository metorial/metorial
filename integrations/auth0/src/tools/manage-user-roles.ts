import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let manageUserRolesTool = SlateTool.create(spec, {
  name: 'Manage User Roles',
  key: 'manage_user_roles',
  description: `List, assign, or remove roles for a user. Use the action parameter to specify the operation: "list" to get current roles, "assign" to add roles, or "remove" to remove roles.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The Auth0 user ID'),
      action: z.enum(['list', 'assign', 'remove']).describe('Action to perform'),
      roleIds: z
        .array(z.string())
        .optional()
        .describe('Role IDs to assign or remove (required for assign/remove)')
    })
  )
  .output(
    z.object({
      roles: z
        .array(
          z.object({
            roleId: z.string().describe('Role ID'),
            name: z.string().describe('Role name'),
            description: z.string().optional().describe('Role description')
          })
        )
        .optional()
        .describe('Current roles (returned for "list" action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    if (ctx.input.action === 'list') {
      let roles = await client.getUserRoles(ctx.input.userId);
      let mapped = (Array.isArray(roles) ? roles : (roles.roles ?? [])).map((r: any) => ({
        roleId: r.id,
        name: r.name,
        description: r.description
      }));
      return {
        output: { roles: mapped, success: true },
        message: `User has **${mapped.length}** role(s) assigned.`
      };
    }

    if (ctx.input.action === 'assign') {
      if (!ctx.input.roleIds?.length) {
        throw new Error('roleIds are required for assign action');
      }
      await client.assignUserRoles(ctx.input.userId, ctx.input.roleIds);
      return {
        output: { success: true },
        message: `Assigned **${ctx.input.roleIds.length}** role(s) to user.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.roleIds?.length) {
        throw new Error('roleIds are required for remove action');
      }
      await client.removeUserRoles(ctx.input.userId, ctx.input.roleIds);
      return {
        output: { success: true },
        message: `Removed **${ctx.input.roleIds.length}** role(s) from user.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
