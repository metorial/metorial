import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { mapUser, paginationSchema, userOutput } from '../lib/schemas';
import { spec } from '../spec';
export const listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'List one page of authorized workspace members by name, role or status. total counts this page only.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search users by name'),
      role: z.enum(['admin', 'member', 'viewer']).optional().describe('Filter by role'),
      filter: z
        .enum(['all', 'invited', 'active', 'suspended'])
        .optional()
        .describe('Filter by account status'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe('Maximum number of users to return'),
      offset: z.number().int().min(0).optional().default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(userOutput),
      total: z.number().describe('Number of records on this page'),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    const result = await client.listUsers(ctx.input);
    const users = result.data.map(mapUser);
    return {
      output: { users, total: users.length, pagination: result.pagination },
      message: `Returned ${users.length} users on this page.`
    };
  })
  .build();
