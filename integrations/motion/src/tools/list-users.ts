import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in a workspace or team. Returns paginated user profiles with name and email. Also retrieves the authenticated user's own profile.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('Filter users by workspace membership'),
      teamId: z.string().optional().describe('Filter users by team membership'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      includeMe: z
        .boolean()
        .optional()
        .describe("Also return the authenticated user's profile separately")
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('Unique identifier of the user'),
            name: z.string().optional().describe('User display name'),
            email: z.string().optional().describe('User email address')
          })
        )
        .describe('List of users'),
      me: z
        .object({
          userId: z.string().describe('Authenticated user ID'),
          name: z.string().optional().describe('Authenticated user name'),
          email: z.string().optional().describe('Authenticated user email')
        })
        .optional()
        .describe('Authenticated user profile (when includeMe is true)'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      pageSize: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let result = await client.listUsers({
      workspaceId: ctx.input.workspaceId,
      teamId: ctx.input.teamId,
      cursor: ctx.input.cursor
    });

    let users = (result.users || []).map((u: any) => ({
      userId: u.id,
      name: u.name,
      email: u.email
    }));

    let me: any;
    if (ctx.input.includeMe) {
      let profile = await client.getMe();
      me = {
        userId: profile.id,
        name: profile.name,
        email: profile.email
      };
    }

    return {
      output: {
        users,
        me,
        nextCursor: result.meta?.nextCursor,
        pageSize: result.meta?.pageSize
      },
      message: `Found **${users.length}** user(s)${me ? ` (including authenticated user: ${me.name || me.email})` : ''}`
    };
  })
  .build();
