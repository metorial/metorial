import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all team members/users in the Streamtime organisation. Returns user IDs, names, roles, and other profile information. Useful for looking up user IDs for assigning to jobs, time entries, and items.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('Array of user objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let users = await client.listUsers();

    return {
      output: {
        users: Array.isArray(users) ? users : []
      },
      message: `Found **${Array.isArray(users) ? users.length : 0}** user(s).`
    };
  })
  .build();
