import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkspaces = SlateTool.create(spec, {
  name: 'Get Workspaces',
  key: 'get_workspaces',
  description: `Retrieve all ClickUp workspaces (teams) accessible to the authenticated user. Useful for discovering workspace IDs and understanding account structure.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string(),
          workspaceName: z.string(),
          memberCount: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let teams = await client.getWorkspaces();

    return {
      output: {
        workspaces: teams.map((t: any) => ({
          workspaceId: t.id,
          workspaceName: t.name,
          memberCount: t.members?.length
        }))
      },
      message: `Found **${teams.length}** workspace(s).`
    };
  })
  .build();

export let getWorkspaceMembers = SlateTool.create(spec, {
  name: 'Get Workspace Members',
  key: 'get_workspace_members',
  description: `Retrieve all members of the configured ClickUp workspace. Returns user IDs, names, emails, and roles.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z.array(
        z.object({
          userId: z.string(),
          username: z.string(),
          email: z.string().optional(),
          role: z.number().optional(),
          profilePicture: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let members = await client.getWorkspaceMembers(ctx.config.workspaceId);

    return {
      output: {
        members: members.map((m: any) => ({
          userId: String(m.user?.id ?? m.id),
          username: m.user?.username ?? m.username,
          email: m.user?.email ?? m.email,
          role: m.role,
          profilePicture: m.user?.profilePicture
        }))
      },
      message: `Found **${members.length}** member(s) in workspace.`
    };
  })
  .build();
