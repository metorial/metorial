import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve a paginated list of helpdesk agent users. Includes agent names, emails, roles, and team assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of users to return')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.number().describe('User ID'),
          email: z.string().nullable().describe('User email'),
          firstname: z.string().nullable().describe('First name'),
          lastname: z.string().nullable().describe('Last name'),
          role: z.string().nullable().describe('User role'),
          active: z.boolean().describe('Whether the user is active')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.listUsers({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let users = result.data.map((u: any) => ({
      userId: u.id,
      email: u.email || null,
      firstname: u.firstname || null,
      lastname: u.lastname || null,
      role: u.role?.name || u.role || null,
      active: u.active ?? true
    }));

    return {
      output: {
        users,
        nextCursor: result.meta.next_cursor,
        prevCursor: result.meta.prev_cursor
      },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve details of a specific helpdesk agent user. Use user ID 0 to get the currently authenticated user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to retrieve (use 0 for the current user)')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('User ID'),
      email: z.string().nullable().describe('User email'),
      firstname: z.string().nullable().describe('First name'),
      lastname: z.string().nullable().describe('Last name'),
      role: z.string().nullable().describe('User role'),
      active: z.boolean().describe('Whether the user is active'),
      language: z.string().nullable().describe('Preferred language'),
      timezone: z.string().nullable().describe('Timezone')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let u = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: u.id,
        email: u.email || null,
        firstname: u.firstname || null,
        lastname: u.lastname || null,
        role: u.role?.name || u.role || null,
        active: u.active ?? true,
        language: u.language || null,
        timezone: u.timezone || null
      },
      message: `Retrieved user **#${u.id}** — ${u.email || [u.firstname, u.lastname].filter(Boolean).join(' ') || 'Unknown'}.`
    };
  })
  .build();
