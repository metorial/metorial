import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a user account by ID, or list all users in the Agiled workspace. Returns user details including name, email, and role.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('ID of a specific user to retrieve. If omitted, lists all users.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of users per page')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.unknown())).describe('Array of user records'),
      totalCount: z.number().optional().describe('Total number of users'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.userId) {
      let result = await client.getUser(ctx.input.userId);
      return {
        output: { users: [result.data] },
        message: `Retrieved user **${result.data.name ?? ctx.input.userId}**.`
      };
    }

    let result = await client.listUsers(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        users: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} user(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
