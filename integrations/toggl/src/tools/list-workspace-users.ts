import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { workspaceIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let listWorkspaceUsers = SlateTool.create(spec, {
  name: 'List Workspace Users',
  key: 'list_workspace_users',
  description: `List all users (members) in a Toggl workspace. Returns user IDs, names, emails, and their workspace roles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdInput
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            name: z.string().nullable().describe('User display name'),
            email: z.string().nullable().describe('User email'),
            admin: z.boolean().describe('Whether the user is a workspace admin'),
            active: z.boolean().describe('Whether the user is active'),
            inactive: z.boolean().describe('Whether the user is inactive/deactivated'),
            avatarUrl: z.string().nullable().describe('User avatar URL')
          })
        )
        .describe('List of workspace members'),
      totalCount: z.number().describe('Number of users returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token, ctx.auth.defaultWorkspaceId);
    let wsId = await client.resolveWorkspaceId(ctx.input.workspaceId, ctx.config);

    let raw = await client.listWorkspaceUsers(wsId);

    let users = (raw ?? []).map((u: any) => ({
      userId: u.user_id ?? u.id,
      name: u.name ?? u.fullname ?? null,
      email: u.email ?? null,
      admin: u.is_admin ?? u.admin ?? u.role === 'admin',
      active: u.is_active ?? u.active ?? !u.inactive,
      inactive: u.inactive ?? false,
      avatarUrl: u.avatar_url ?? u.image_url ?? null
    }));

    return {
      output: { users, totalCount: users.length },
      message: `Found **${users.length}** users in the workspace`
    };
  })
  .build();
