import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List workspace users with their name, email, role, and last login date. Results are paginated and can be sorted.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100)'),
      after: z.string().optional().describe('Pagination cursor for the next page'),
      sortBy: z.enum(['CREATED_AT', 'NAME']).optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          name: z.string(),
          email: z.string(),
          role: z.string(),
          lastLoginAt: z.string().nullable(),
          createdAt: z.string()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      after: ctx.input.after,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let users = result.values ?? [];

    return {
      output: {
        users,
        nextCursor: result.pagination?.after
      },
      message: `Found **${users.length}** user(s).${result.pagination?.after ? ' More results available.' : ''}`
    };
  })
  .build();
