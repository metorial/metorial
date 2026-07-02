import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Unique user identifier'),
  name: z.string().describe('User display name'),
  email: z.string().describe('User email address')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users in your ScheduleOnce account.
Useful for understanding booking ownership, looking up user IDs for filtering bookings, or mapping booking owners to team members.`,
  constraints: ['Maximum 100 users per request (default 10).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of users to return (1-100, default 10)'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of users'),
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let users = (result.data || []).map(u => ({
      userId: u.id,
      name: u.name,
      email: u.email
    }));

    return {
      output: {
        count: result.count,
        users
      },
      message: `Found **${result.count}** user(s). Returned **${users.length}** in this page.`
    };
  })
  .build();
