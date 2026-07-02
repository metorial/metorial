import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the organization with optional search. Returns paginated results with user details including name, email, role, and team assignment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Number of users per page (default 10)'),
      searchKey: z.string().optional().describe('Search by user name or email')
    })
  )
  .output(
    z.object({
      pageDetails: z.record(z.string(), z.any()).describe('Pagination metadata'),
      result: z.array(z.record(z.string(), z.any())).describe('Array of user objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listUsers(ctx.input);

    return {
      output: result,
      message: `Found **${result.result.length}** users.`
    };
  })
  .build();
