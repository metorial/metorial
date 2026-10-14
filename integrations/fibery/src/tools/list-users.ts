import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'List workspace users with their IDs and names. Use these IDs when assigning users through entity relation fields.',
  instructions: [
    'Pass a returned userId as {"fibery/id": "user-id"} when updating a user relation field.',
    'Use limit and offset to page through users.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().int().positive().default(50).describe('Maximum users to return'),
      offset: z.number().int().nonnegative().default(0).describe('Number of users to skip')
    })
  )
  .output(
    z.object({
      users: z.array(z.object({ userId: z.string(), name: z.string() })),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });
    let entities = await client.queryEntities({
      typeName: 'fibery/user',
      select: ['fibery/id', 'user/name'],
      orderBy: [[['fibery/id'], 'q/asc']],
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let users = entities.map(entity => ({
      userId: entity['fibery/id'],
      name: entity['user/name']
    }));
    return {
      output: { users, count: users.length },
      message: `Returned **${users.length}** workspace users.`
    };
  })
  .build();
