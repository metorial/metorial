import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let manageUserRoles = SlateTool.create(spec, {
  name: 'Manage User Roles',
  key: 'manage_user_roles',
  description: `Assign or remove roles from a OneLogin user. Roles control which applications a user can access. You can assign multiple roles at once or remove specific roles.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to modify'),
      action: z.enum(['assign', 'remove']).describe('Whether to assign or remove roles'),
      roleIds: z.array(z.number()).describe('Array of role IDs to assign or remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.action === 'assign') {
      await client.assignRolesToUser(ctx.input.userId, ctx.input.roleIds);
      return {
        output: { success: true },
        message: `Assigned **${ctx.input.roleIds.length}** role(s) to user **${ctx.input.userId}**.`
      };
    }

    await client.removeRolesFromUser(ctx.input.userId, ctx.input.roleIds);
    return {
      output: { success: true },
      message: `Removed **${ctx.input.roleIds.length}** role(s) from user **${ctx.input.userId}**.`
    };
  });
