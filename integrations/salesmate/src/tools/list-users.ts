import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the Salesmate account. Returns user details including names, emails, and roles. Useful for finding owner IDs when creating or assigning records.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.unknown())).describe('Array of user records')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getUsers();
    let users = result?.Data ?? [];

    return {
      output: { users: Array.isArray(users) ? users : [users] },
      message: `Found **${Array.isArray(users) ? users.length : 1}** users.`
    };
  })
  .build();
