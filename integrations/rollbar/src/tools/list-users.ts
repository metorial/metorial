import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the Rollbar account. Requires an **account-level** access token.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter account users by email address')
    })
  )
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
    let client = createClient(ctx);

    let result = await client.listUsers(ctx.input.email);
    let users = result.result.users.map(u => ({
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
