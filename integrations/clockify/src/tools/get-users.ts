import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getUsers = SlateTool.create(spec, {
  name: 'Get Workspace Users',
  key: 'get_users',
  description: `List users in the Clockify workspace. Filter by email, name, or status. Returns user IDs, names, email addresses, and status. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
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
      page: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(1)
        .optional()
        .describe('Page number'),
      pageSize: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(1)
        .optional()
        .describe('Entries per page')
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
    let client = createApiClient(ctx);

    let users = await client.getWorkspaceUsers({
      email: ctx.input.email,
      name: ctx.input.name,
      status: ctx.input.status,
      'project-id': ctx.input.projectId,
      page: ctx.input.page,
      'page-size': ctx.input.pageSize
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
    let client = createApiClient(ctx);

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
