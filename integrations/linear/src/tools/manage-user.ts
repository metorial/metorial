import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.string().describe('User ID'),
  name: z.string().describe('Full name'),
  displayName: z.string().nullable().describe('Display name'),
  email: z.string().describe('Email address'),
  avatarUrl: z.string().nullable().describe('Avatar image URL'),
  active: z.boolean().describe('Whether the user is active'),
  admin: z.boolean().describe('Whether the user is an admin'),
  guest: z.boolean().describe('Whether the user is a guest'),
  url: z.string().describe('Profile URL'),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastSeen: z.string().nullable().describe('Last seen timestamp')
});

let mapUserToOutput = (user: any) => ({
  userId: user.id,
  name: user.name,
  displayName: user.displayName || null,
  email: user.email,
  avatarUrl: user.avatarUrl || null,
  active: user.active ?? true,
  admin: user.admin ?? false,
  guest: user.guest ?? false,
  url: user.url || '',
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastSeen: user.lastSeen || null
});

export let getViewerTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_viewer',
  description: `Retrieves the profile of the currently authenticated user, including their organization info.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      name: z.string(),
      displayName: z.string().nullable(),
      email: z.string(),
      avatarUrl: z.string().nullable(),
      active: z.boolean(),
      admin: z.boolean(),
      guest: z.boolean(),
      url: z.string(),
      organizationId: z.string().nullable(),
      organizationName: z.string().nullable(),
      organizationUrlKey: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      lastSeen: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let viewer = await client.getViewer();

    return {
      output: {
        ...mapUserToOutput(viewer),
        organizationId: viewer.organization?.id || null,
        organizationName: viewer.organization?.name || null,
        organizationUrlKey: viewer.organization?.urlKey || null
      },
      message: `Authenticated as **${viewer.displayName || viewer.name}** (${viewer.email})`
    };
  })
  .build();

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Lists all users in the workspace. Useful for finding user IDs for assigning issues.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().describe('Number of users to return (default: 50)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema),
      hasNextPage: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let result = await client.listUsers({
      first: ctx.input.first,
      after: ctx.input.after
    });

    let users = (result.nodes || []).map(mapUserToOutput);

    return {
      output: {
        users,
        hasNextPage: result.pageInfo?.hasNextPage || false,
        nextCursor: result.pageInfo?.endCursor || null
      },
      message: `Found **${users.length}** users`
    };
  })
  .build();
