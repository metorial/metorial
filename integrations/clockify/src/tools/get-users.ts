import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsers = SlateTool.create(spec, {
  name: 'Get Workspace Users',
  key: 'get_users',
  description: `List users in the Clockify workspace. Filter by email, name, or status. Returns user profiles with roles and membership info.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by email address'),
      name: z.string().optional().describe('Filter by name (partial match)'),
      status: z
        .enum(['ACTIVE', 'PENDING', 'DECLINED', 'INACTIVE'])
        .optional()
        .describe('Filter by user status'),
      projectId: z
        .string()
        .optional()
        .describe('Filter users who have access to this project'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Entries per page')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          name: z.string(),
          email: z.string(),
          status: z.string().optional(),
          profilePicture: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let users = await client.getWorkspaceUsers({
      email: ctx.input.email,
      name: ctx.input.name,
      status: ctx.input.status,
      projectId: ctx.input.projectId,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let mapped = (users as any[]).map((u: any) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      status: u.status || undefined,
      profilePicture: u.profilePicture || undefined
    }));

    return {
      output: { users: mapped, count: mapped.length },
      message: `Retrieved **${mapped.length}** workspace users.`
    };
  })
  .build();

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Get the profile of the currently authenticated user, including their default workspace and settings.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      name: z.string(),
      email: z.string(),
      profilePicture: z.string().optional(),
      activeWorkspace: z.string().optional(),
      defaultWorkspace: z.string().optional(),
      timezone: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture || undefined,
        activeWorkspace: user.activeWorkspace || undefined,
        defaultWorkspace: user.defaultWorkspace || undefined,
        timezone: user.settings?.timeZone || undefined
      },
      message: `Current user: **${user.name}** (${user.email}).`
    };
  })
  .build();
