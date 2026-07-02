import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageOrganizationUsers = SlateTool.create(spec, {
  name: 'Manage Organization Users',
  key: 'manage_organization_users',
  description: `List, add, update, or remove users in an organization.
- **list**: Get all users in the organization.
- **add**: Add a new or existing user by email.
- **update**: Change a user's role/permissions (Admin, Read-Only).
- **remove**: Remove a user from the organization (does not delete their account).`
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'update', 'remove']).describe('Operation to perform'),
      organizationId: z.string().describe('Organization ID'),
      userId: z.string().optional().describe('User ID (required for update/remove)'),
      email: z.string().optional().describe('User email (for add)'),
      role: z
        .string()
        .optional()
        .describe('User role, e.g. "admin" or "read_only" (for add/update)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional user attributes')
    })
  )
  .output(
    z.object({
      users: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of users (for list)'),
      user: z.record(z.string(), z.any()).optional().describe('User details (for add/update)'),
      removed: z.boolean().optional().describe('Whether the user was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, organizationId, userId } = ctx.input;

    if (action === 'list') {
      let users = await client.listOrganizationUsers(organizationId);
      return {
        output: { users },
        message: `Found **${users.length}** user(s) in organization **${organizationId}**.`
      };
    }

    if (action === 'add') {
      let params: Record<string, any> = {};
      if (ctx.input.email) params.email = ctx.input.email;
      if (ctx.input.role) params.role = ctx.input.role;
      if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);
      let user = await client.addOrganizationUser(organizationId, params);
      return {
        output: { user },
        message: `Added user **${ctx.input.email ?? ''}** to organization **${organizationId}**.`
      };
    }

    if (action === 'update') {
      if (!userId) throw new Error('userId is required for update');
      let params: Record<string, any> = {};
      if (ctx.input.role) params.role = ctx.input.role;
      if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);
      let user = await client.updateOrganizationUser(organizationId, userId, params);
      return {
        output: { user },
        message: `Updated user **${userId}** in organization **${organizationId}**.`
      };
    }

    if (!userId) throw new Error('userId is required for remove');
    await client.removeOrganizationUser(organizationId, userId);
    return {
      output: { removed: true },
      message: `Removed user **${userId}** from organization **${organizationId}**.`
    };
  })
  .build();
