import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cursorSchema, getNextCursor, nextCursorSchema } from '../lib/pagination';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().optional().describe('ID of the user'),
  email: z.string().describe('Email address of the user'),
  username: z.string().describe('Username of the user')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the organization. Use this to find user emails for assigning tasks or workflow runs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ cursor: cursorSchema }))
  .output(
    z.object({
      nextCursor: nextCursorSchema,
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listUsers(ctx.input.cursor);
    let users = (data.users || []).map((u: any) => ({
      userId: u.id,
      email: u.email,
      username: u.username
    }));
    return {
      output: { users, nextCursor: getNextCursor(data) },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
