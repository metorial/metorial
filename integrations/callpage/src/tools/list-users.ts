import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users (agents) in the account. Users have roles: owner, admin, or manager. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)')
    })
  )
  .output(
    z.object({
      users: z.array(z.any()).describe('List of user objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let result = await client.getUsers({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: { users: result.users },
      message: `Retrieved **${result.users.length}** users.`
    };
  })
  .build();
