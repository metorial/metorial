import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the Rootly organization. Search by name or email.
Use this to find user IDs for assigning incidents, action items, or notification targets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search users by name'),
      email: z.string().optional().describe('Filter by email address'),
      include: z
        .string()
        .optional()
        .describe('Include related resources like "teams,notification_rules"'),
      sort: z.string().optional().describe('Sort field'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('List of users'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUsers({
      search: ctx.input.search,
      email: ctx.input.email,
      include: ctx.input.include,
      sort: ctx.input.sort,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let users = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        users,
        totalCount: result.meta?.total_count
      },
      message: `Found **${users.length}** users.`
    };
  })
  .build();
