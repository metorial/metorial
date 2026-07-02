import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let manageWorkspaceUsers = SlateTool.create(spec, {
  name: 'Manage Workspace Users',
  key: 'manage_workspace_users',
  description: `List users in a workspace or invite new users. Manage workspace membership and user roles for collaboration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'invite']).describe('Operation to perform'),
      workspaceId: z.number().describe('Workspace ID'),
      email: z
        .string()
        .optional()
        .describe('Email address of the user to invite (required for invite)'),
      role: z
        .string()
        .optional()
        .describe('Role to assign (e.g., "manager", "tester", "viewer")')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().optional().describe('User ID'),
            email: z.string().optional().describe('User email'),
            displayName: z.string().optional().describe('Display name'),
            roles: z.array(z.string()).optional().describe('Assigned roles')
          })
        )
        .optional()
        .describe('List of workspace users'),
      invited: z.boolean().optional().describe('Whether the invitation was sent'),
      email: z.string().optional().describe('Invited user email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlazeMeterClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    if (ctx.input.action === 'list') {
      let users = await client.listWorkspaceUsers(ctx.input.workspaceId);
      let mapped = users.map((u: any) => ({
        userId: u.id,
        email: u.email,
        displayName: u.displayName,
        roles: u.roles
      }));
      return {
        output: { users: mapped },
        message: `Found **${mapped.length}** user(s) in workspace ${ctx.input.workspaceId}.`
      };
    }

    if (ctx.input.action === 'invite') {
      if (!ctx.input.email) throw new Error('email is required for inviting a user');
      await client.inviteUser(ctx.input.workspaceId, ctx.input.email, ctx.input.role);
      return {
        output: { invited: true, email: ctx.input.email },
        message: `Invited **${ctx.input.email}** to workspace ${ctx.input.workspaceId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
