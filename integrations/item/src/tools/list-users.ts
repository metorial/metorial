import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'List organization users in item, including their IDs and access levels. Useful for mapping owner fields or assigning records.',
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('User ID'),
          fullName: z.string().nullable().optional().describe('User full name when available'),
          accessLevel: z.enum(['admin', 'member']).describe('Organization access level')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let users = await client.listUsers();

    return {
      output: {
        users: users.map((user: any) => ({
          userId: user.id,
          fullName: user.full_name ?? null,
          accessLevel: user.access_level
        }))
      },
      message: `Retrieved **${users.length}** organization user(s).`
    };
  })
  .build();
