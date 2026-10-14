import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve users in projects managed by the authenticated user. Returns user profile information including name, email, login, and timezone.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.unknown())).describe('List of user accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let users = await client.listUsers();

    return {
      output: { users },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
