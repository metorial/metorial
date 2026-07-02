import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
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
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listUsers();
    let users = (data.users || []).map((u: any) => ({
      email: u.email,
      username: u.username
    }));
    return {
      output: { users },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
