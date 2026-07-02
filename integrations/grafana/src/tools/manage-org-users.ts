import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let listOrgUsers = SlateTool.create(spec, {
  name: 'List Organization Users',
  key: 'list_org_users',
  description: `List all users in the current organization with their roles. Shows login, email, and assigned organizational role (Admin, Editor, or Viewer).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.number().describe('User ID'),
          login: z.string().optional().describe('User login name'),
          email: z.string().optional().describe('User email'),
          name: z.string().optional().describe('User display name'),
          role: z.string().optional().describe('Organizational role (Admin, Editor, Viewer)'),
          lastSeenAt: z.string().optional().describe('Last activity timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let results = await client.getOrgUsers();

    let users = results.map((u: any) => ({
      userId: u.userId,
      login: u.login,
      email: u.email,
      name: u.name,
      role: u.role,
      lastSeenAt: u.lastSeenAt
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s) in the organization.`
    };
  })
  .build();

export let addOrgUser = SlateTool.create(spec, {
  name: 'Add Organization User',
  key: 'add_org_user',
  description: `Add a user to the current organization with a specified role.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      loginOrEmail: z.string().describe('Login name or email of the user to add'),
      role: z.enum(['Admin', 'Editor', 'Viewer']).describe('Organizational role to assign')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.addOrgUser(ctx.input.loginOrEmail, ctx.input.role);

    return {
      output: {
        message: result.message || `User ${ctx.input.loginOrEmail} added as ${ctx.input.role}.`
      },
      message: `User **${ctx.input.loginOrEmail}** added to organization as **${ctx.input.role}**.`
    };
  })
  .build();

export let updateOrgUserRole = SlateTool.create(spec, {
  name: 'Update Organization User Role',
  key: 'update_org_user_role',
  description: `Change a user's role within the current organization.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to update'),
      role: z.enum(['Admin', 'Editor', 'Viewer']).describe('New organizational role')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.updateOrgUserRole(ctx.input.userId, ctx.input.role);

    return {
      output: {
        message: `User ${ctx.input.userId} role updated to ${ctx.input.role}.`
      },
      message: `User **${ctx.input.userId}** role updated to **${ctx.input.role}**.`
    };
  })
  .build();

export let removeOrgUser = SlateTool.create(spec, {
  name: 'Remove Organization User',
  key: 'remove_org_user',
  description: `Remove a user from the current organization.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to remove from the organization')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.removeOrgUser(ctx.input.userId);

    return {
      output: {
        message: `User ${ctx.input.userId} removed from organization.`
      },
      message: `User **${ctx.input.userId}** removed from the organization.`
    };
  })
  .build();
