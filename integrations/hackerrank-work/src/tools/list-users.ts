import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List or search users in your HackerRank for Work account. Returns user details including name, email, role, and status. Optionally filter by a search query to find specific users.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query to filter users by name or email'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of users to return (1-100, default 100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('Array of user objects'),
      total: z.number().describe('Total number of users matching the query'),
      offset: z.number().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = ctx.input.search
      ? await client.searchUsers(ctx.input.search, {
          limit: ctx.input.limit,
          offset: ctx.input.offset
        })
      : await client.listUsers({
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });

    return {
      output: {
        users: result.data,
        total: result.total,
        offset: result.offset
      },
      message: `Found **${result.total}** users (showing ${result.data.length}).`
    };
  });
