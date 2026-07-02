import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve tenant/customer accounts. Search by name or email, filter by update time, or fetch specific users by IDs. Supports pagination for large user bases. Use **updatedAfter** for incremental syncing.`,
  instructions: [
    'Use the ids parameter to fetch up to 50 specific users in a single request.',
    'Avoid using include on large lists for performance reasons.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter users by name, email, or other attributes'),
      ids: z
        .string()
        .optional()
        .describe('Comma-separated list of user IDs to fetch (up to 50)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return users updated after this UTC timestamp'),
      limit: z.number().optional().describe('Maximum number of users to return'),
      offset: z.number().optional().describe('Number of users to skip for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('List of user accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let users = await client.listUsers({
      search: ctx.input.search,
      ids: ctx.input.ids,
      updatedAfter: ctx.input.updatedAfter,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: { users },
      message: `Retrieved ${users.length} user(s).`
    };
  })
  .build();
