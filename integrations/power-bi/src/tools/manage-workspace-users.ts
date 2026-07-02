import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  emailAddress: z.string().describe('Email address of the user'),
  displayName: z.string().optional().describe('Display name'),
  groupUserAccessRight: z
    .string()
    .describe('Access role: Admin, Member, Contributor, or Viewer'),
  identifier: z.string().optional().describe('User principal identifier'),
  principalType: z.string().optional().describe('Principal type (User, Group, App)')
});

export let manageWorkspaceUsers = SlateTool.create(spec, {
  name: 'Manage Workspace Users',
  key: 'manage_workspace_users',
  description: `List, add, update, or remove users from a Power BI workspace. Manage workspace membership and roles (Admin, Member, Contributor, Viewer).`,
  instructions: [
    'Use "list" to see current workspace members and their roles.',
    'Use "add" to grant a user access. Use "update" to change an existing user\'s role.',
    'Use "remove" to revoke a user\'s access — requires the user ID (not email). List users first to find the ID.'
  ]
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace'),
      action: z.enum(['list', 'add', 'update', 'remove']).describe('Action to perform'),
      emailAddress: z
        .string()
        .optional()
        .describe('Email of the user (required for add/update)'),
      role: z
        .enum(['Admin', 'Member', 'Contributor', 'Viewer'])
        .optional()
        .describe('Role to assign (required for add/update)'),
      userId: z.string().optional().describe('User ID to remove (required for remove)')
    })
  )
  .output(
    z.object({
      users: z
        .array(userSchema)
        .optional()
        .describe('List of workspace users (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let { workspaceId, action, emailAddress, role, userId } = ctx.input;

    if (action === 'list') {
      let users = await client.listWorkspaceUsers(workspaceId);
      let mapped = users.map((u: any) => ({
        emailAddress: u.emailAddress,
        displayName: u.displayName,
        groupUserAccessRight: u.groupUserAccessRight,
        identifier: u.identifier,
        principalType: u.principalType
      }));
      return {
        output: { users: mapped, success: true },
        message: `Found **${mapped.length}** user(s) in workspace.`
      };
    }

    if (action === 'add') {
      if (!emailAddress || !role)
        throw new Error('emailAddress and role are required for add');
      await client.addWorkspaceUser(workspaceId, emailAddress, role);
      return {
        output: { success: true },
        message: `Added **${emailAddress}** as **${role}** to workspace.`
      };
    }

    if (action === 'update') {
      if (!emailAddress || !role)
        throw new Error('emailAddress and role are required for update');
      await client.updateWorkspaceUser(workspaceId, emailAddress, role);
      return {
        output: { success: true },
        message: `Updated **${emailAddress}** to **${role}** in workspace.`
      };
    }

    if (action === 'remove') {
      if (!userId) throw new Error('userId is required for remove');
      await client.deleteWorkspaceUser(workspaceId, userId);
      return {
        output: { success: true },
        message: `Removed user **${userId}** from workspace.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
