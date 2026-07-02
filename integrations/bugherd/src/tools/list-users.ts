import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('User ID'),
  email: z.string().describe('User email'),
  displayName: z.string().describe('User display name'),
  avatarUrl: z.string().nullable().describe('URL of the user avatar'),
  createdAt: z.string().describe('When the user was created'),
  updatedAt: z.string().describe('When the user was last updated')
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
        .describe('Filter users by role: all users, team members only, or guests/clients only')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);

    let rawUsers: any;
    if (ctx.input.role === 'members') {
      rawUsers = await client.listMembers();
    } else if (ctx.input.role === 'guests') {
      rawUsers = await client.listGuests();
    } else {
      rawUsers = await client.listUsers();
    }

    let users = rawUsers.map((u: any) => ({
      userId: u.id,
      email: u.email,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }));

    return {
      output: { users },
      message: `Found **${users.length}** ${ctx.input.role === 'all' ? '' : `${ctx.input.role} `}user(s).`
    };
  })
  .build();
