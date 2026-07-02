import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the Notion workspace, including admins, members, guests, and bot integrations.
Returns user profiles with name, avatar, type, and optionally email addresses (requires user information capability).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startCursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of users to return (max 100)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('ID of the user'),
            name: z.string().nullable().describe('Display name of the user'),
            avatarUrl: z.string().nullable().describe('Avatar image URL'),
            userType: z.string().describe('Type of user: "person" or "bot"'),
            email: z
              .string()
              .optional()
              .describe('Email address (person users only, if capability is enabled)')
          })
        )
        .describe('Array of workspace users'),
      hasMore: z.boolean().describe('Whether more users are available'),
      nextCursor: z.string().nullable().describe('Cursor for the next page of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let result = await client.listUsers(ctx.input.startCursor, ctx.input.pageSize);

    let users = result.results.map((user: any) => ({
      userId: user.id,
      name: user.name ?? null,
      avatarUrl: user.avatar_url ?? null,
      userType: user.type,
      email: user.person?.email
    }));

    return {
      output: {
        users,
        hasMore: result.has_more,
        nextCursor: result.next_cursor
      },
      message: `Retrieved **${users.length}** users${result.has_more ? ' — more available' : ''}`
    };
  })
  .build();
