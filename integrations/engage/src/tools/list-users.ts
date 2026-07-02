import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieves a paginated list of users from Engage. Supports filtering by email and cursor-based pagination. Returns up to 30 users per page.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(30)
        .optional()
        .describe('Number of users per page (1-30, default 10)'),
      email: z.string().optional().describe('Filter users by email address'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results'),
      previousCursor: z.string().optional().describe('Cursor for the previous page of results')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('Internal Engage user ID'),
          uid: z.string().describe('Application-supplied unique identifier'),
          firstName: z.string().nullable(),
          lastName: z.string().nullable(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
          isAccount: z.boolean(),
          createdAt: z.string()
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page'),
      previousCursor: z.string().optional().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      email: ctx.input.email,
      nextCursor: ctx.input.nextCursor,
      previousCursor: ctx.input.previousCursor
    });

    let users = (result.data || []).map(u => ({
      userId: u.id,
      uid: u.uid,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.number,
      isAccount: u.is_account,
      createdAt: u.created_at
    }));

    return {
      output: {
        users,
        nextCursor: result.next_cursor,
        previousCursor: result.previous_cursor
      },
      message: `Found **${users.length}** user(s).${result.next_cursor ? ' More results available.' : ''}`
    };
  })
  .build();
