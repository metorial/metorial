import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List supporter/user records in your Raisely organization. Users are shared across campaigns. Search by name or email, or filter by campaign association.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of users to return (default 20)'),
      offset: z.number().optional().describe('Number of users to skip for pagination'),
      sort: z.string().optional().describe('Field to sort by, e.g. "createdAt", "email"'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      search: z.string().optional().describe('Search users by name or email'),
      campaignUuid: z
        .string()
        .optional()
        .describe('Filter users associated with a specific campaign'),
      includePrivateData: z.boolean().optional().describe('Include private/custom field data')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('List of user objects'),
      pagination: z
        .object({
          total: z.number().optional(),
          offset: z.number().optional(),
          limit: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      order: ctx.input.order,
      q: ctx.input.search,
      campaign: ctx.input.campaignUuid,
      private: ctx.input.includePrivateData
    });

    let users = result.data || [];
    let pagination = result.pagination;

    return {
      output: { users, pagination },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
