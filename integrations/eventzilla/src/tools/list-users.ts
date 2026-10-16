import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema, readCollection, readPagination } from '../lib/responses';
import { mapUser, userSchema } from '../lib/users';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve organizer and sub-organizer account details including contact information, company, address, timezone, and social media profiles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of records to skip'),
      limit: z.number().optional().describe('Number of records per page')
    })
  )
  .output(
    z.object({
      pagination: paginationSchema
        .optional()
        .describe('Pagination details returned by Eventzilla'),
      raw: z.unknown().optional().describe('Complete response returned by Eventzilla'),
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listUsers({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let rawUsers = readCollection(data, 'users');

    let users = rawUsers.map(mapUser);

    return {
      output: { users, pagination: readPagination(data), raw: data },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
