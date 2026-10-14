import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'List account team members and their user IDs for assigning tasks and sales representatives.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          isActive: z.boolean().optional()
        })
      ),
      dateUpdated: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listUsers();
    let users = (result.users ?? []).map((user: any) => ({
      userId: user.id,
      firstName: user.first_name ?? undefined,
      lastName: user.last_name ?? undefined,
      email: user.email ?? undefined,
      isActive: user.is_active ?? undefined
    }));
    return {
      output: { users, dateUpdated: result.date_updated ?? undefined },
      message: `Retrieved ${users.length} JobNimbus team members.`
    };
  })
  .build();
