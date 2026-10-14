import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { positiveIntegerSchema } from '../lib/schemas';
import type { BugherdUser } from '../lib/types';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('User ID'),
  email: z.string().describe('User email'),
  displayName: z.string().describe('User display name'),
  avatarUrl: z.string().nullable().describe('URL of the user avatar'),
  createdAt: z.string().optional().describe('When the user was created'),
  updatedAt: z.string().optional().describe('When the user was last updated')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the BugHerd organization. Can filter by role to show all users, only team members, or only guests/clients.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      role: z
        .enum(['all', 'members', 'guests'])
        .default('all')
        .describe(
          'Filter users by role: all users, team members only, or guests/clients only'
        ),
      page: positiveIntegerSchema
        .optional()
        .describe('Page number starting at 1 (up to 100 users per page)'),
      updatedSince: z
        .string()
        .optional()
        .describe('Return users updated after this timestamp; only supported when role is all')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.role !== 'all' && ctx.input.updatedSince !== undefined) {
      throw createApiServiceError('updatedSince is only supported when role is all.');
    }
    let client = new BugherdClient(ctx.auth.token);

    let rawUsers: BugherdUser[];
    if (ctx.input.role === 'members') {
      rawUsers = await client.listMembers(ctx.input.page);
    } else if (ctx.input.role === 'guests') {
      rawUsers = await client.listGuests(ctx.input.page);
    } else {
      rawUsers = await client.listUsers(ctx.input);
    }

    let users = rawUsers.map(u => ({
      userId: u.id,
      email: u.email,
      displayName: u.display_name,
      avatarUrl: u.avatar_url ?? null,
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }));

    return {
      output: { users },
      message: `Found **${users.length}** ${ctx.input.role === 'all' ? '' : `${ctx.input.role} `}user(s).`
    };
  })
  .build();
