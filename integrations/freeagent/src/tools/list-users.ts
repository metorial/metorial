import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve users from the FreeAgent account. Can filter by role (staff, advisors, etc.).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum(['all', 'staff', 'active_staff', 'advisors', 'active_advisors'])
        .optional()
        .describe('Filter users by role'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('List of user records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let users = await client.listUsers(ctx.input);
    let count = users.length;

    return {
      output: { users },
      message: `Found **${count}** user${count !== 1 ? 's' : ''}.`
    };
  })
  .build();
