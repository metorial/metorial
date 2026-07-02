import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the Rollbar account. Requires an **account-level** access token.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            username: z.string().optional().describe('Username'),
            email: z.string().optional().describe('Email address')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUsers();
    let users = (result?.result?.users || result?.result || []).map((u: any) => ({
      userId: u.id,
      username: u.username,
      email: u.email
    }));

    return {
      output: { users },
      message: `Found **${users.length}** users in the account.`
    };
  })
  .build();
