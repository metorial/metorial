import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `Lists members of your Heartbeat community with optional filtering by group, role, or creation date. Returns a paginated list of users.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of users per page (1-100)'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination — pass the last user ID from the previous page'),
      groupId: z.string().optional().describe('Filter users by group ID'),
      role: z.string().optional().describe('Filter users by role'),
      createdAfter: z
        .string()
        .optional()
        .describe('ISO date string — only return users created after this date'),
      createdBefore: z
        .string()
        .optional()
        .describe('ISO date string — only return users created before this date')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            email: z.string().describe('User email'),
            firstName: z.string().describe('First name'),
            lastName: z.string().describe('Last name'),
            roleId: z.string().describe('Role ID'),
            groups: z.array(z.string()).nullable().describe('Group IDs'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of community members'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      groupId: ctx.input.groupId,
      role: ctx.input.role,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore
    });

    let users = result.data.map(u => ({
      userId: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      roleId: u.roleId,
      groups: u.groups,
      createdAt: u.createdAt
    }));

    return {
      output: {
        users,
        hasMore: result.hasMore
      },
      message: `Found ${users.length} member(s).${result.hasMore ? ' More results are available.' : ''}`
    };
  })
  .build();
