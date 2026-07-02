import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users (agents and admins) in your Helpwise account. Returns user details including names, emails, and roles.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('List of Helpwise users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUsers();
    let users = Array.isArray(result) ? result : (result.users ?? result.data ?? []);

    return {
      output: { users },
      message: `Retrieved ${users.length} user(s).`
    };
  })
  .build();
