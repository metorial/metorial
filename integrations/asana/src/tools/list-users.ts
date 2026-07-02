import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in a workspace. Returns user GIDs and names for referencing in other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace GID'),
      limit: z.number().optional().describe('Maximum number of users to return')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          name: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listUsersInWorkspace(ctx.input.workspaceId, {
      limit: ctx.input.limit
    });
    let users = (result.data || []).map((u: any) => ({
      userId: u.gid,
      name: u.name
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Get details for a specific user by their GID, or use "me" to get the authenticated user's profile.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('User GID or "me"')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      name: z.string(),
      email: z.string().optional(),
      photo: z.any().optional(),
      workspaces: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user =
      ctx.input.userId === 'me'
        ? await client.getMe()
        : await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: user.gid,
        name: user.name,
        email: user.email,
        photo: user.photo,
        workspaces: user.workspaces
      },
      message: `Retrieved user **${user.name}** (${user.gid}).`
    };
  })
  .build();
