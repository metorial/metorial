import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in your Canny account with cursor-based pagination. Returns user details including name, email, admin status, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of users to return (max 100)'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            cannyUserId: z.string().describe('Canny-internal user ID'),
            userId: z.string().nullable().describe('Application user ID'),
            name: z.string().describe('User name'),
            email: z.string().nullable().describe('User email'),
            isAdmin: z.boolean().describe('Whether the user is an admin'),
            url: z.string().describe('Profile URL'),
            created: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of users'),
      cursor: z.string().nullable().describe('Cursor for the next page'),
      hasNextPage: z.boolean().describe('Whether more users are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.listUsers({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let users = (result.items || []).map((u: any) => ({
      cannyUserId: u.id,
      userId: u.userID || null,
      name: u.name,
      email: u.email || null,
      isAdmin: u.isAdmin,
      url: u.url,
      created: u.created
    }));

    return {
      output: {
        users,
        cursor: result.cursor || null,
        hasNextPage: result.hasNextPage
      },
      message: `Found **${users.length}** user(s)${result.hasNextPage ? ' (more available)' : ''}.`
    };
  })
  .build();
